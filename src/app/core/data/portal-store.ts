import { HttpClient } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AuthStore } from '../auth/auth-store';
import { partitionAttachments } from '../../domain/attachment-rules';
import { isoDate } from '../../domain/diet-calc';
import { Client } from '../../domain/diet.models';
import {
  Attachment,
  CareTask,
  MemberRequest,
  Message,
  MessageAuthor,
  PortalAccess,
  ReadMarker,
  RequestStatus,
  RequestType,
  TaskCategory,
  REQUEST_STATUS_LABELS,
  REQUEST_TYPE_LABELS,
  UserRole,
} from '../../domain/portal.models';
import { DietStore } from './diet-store';
import { createPortalSeed } from './portal-seed';
import { SAMPLE_WORKSPACE, loadWorkspacePart, saveWorkspacePart } from './workspace';

export interface PortalData {
  readonly access: PortalAccess[];
  readonly messages: Message[];
  readonly tasks: CareTask[];
  readonly requests: MemberRequest[];
  readonly readMarkers: ReadMarker[];
}

export function emptyPortalData(): PortalData {
  return { access: [], messages: [], tasks: [], requests: [], readMarkers: [] };
}

/** Login lookup without Firebase: an invited or active client whose e-mail matches. */
export function memberClientId(
  email: string,
  clients: readonly Client[],
  access: readonly PortalAccess[],
): string | undefined {
  const normalized = email.trim().toLocaleLowerCase('tr');
  const client = clients.find(
    (c) => c.email.toLocaleLowerCase('tr') === normalized && c.status !== 'archived',
  );
  if (!client) return undefined;
  const status = access.find((a) => a.clientId === client.id)?.status;
  return status === 'active' || status === 'invited' ? client.id : undefined;
}

export interface ConversationSummary {
  readonly clientId: string;
  readonly name: string;
  readonly access: PortalAccess;
  readonly lastMessage: Message | null;
  readonly unread: number;
  readonly openRequests: number;
  readonly openTasks: number;
}

export interface NewTask {
  readonly clientId: string;
  readonly title: string;
  readonly description: string;
  readonly category: TaskCategory;
  readonly dueDate: string | null;
}

export interface NewRequest {
  readonly clientId: string;
  readonly type: RequestType;
  readonly subject: string;
  readonly detail: string;
}

/**
 * Messages, tasks, requests and portal logins shared by the dietitian workspace and the
 * member portal. Like `DietStore`, data is in memory and the mutation methods are the seam
 * for MainAPI calls (see `portal-contract.ts`).
 *
 * This store is not scoped to a user. Members must go through `MemberPortal`, which only
 * ever passes the signed-in member's own `clientId`.
 */
@Injectable({ providedIn: 'root' })
export class PortalStore {
  private readonly diet = inject(DietStore);
  private readonly auth = inject(AuthStore);
  private readonly http = inject(HttpClient, { optional: true });
  private loadedWorkspace: string | null = null;
  private hydratingFromRemote = false;
  readonly access = signal<PortalAccess[]>([]);
  readonly messages = signal<Message[]>([]);
  readonly tasks = signal<CareTask[]>([]);
  readonly requests = signal<MemberRequest[]>([]);
  readonly readMarkers = signal<ReadMarker[]>([]);

  constructor() {
    this.useWorkspace(untracked(this.diet.workspace));
    effect(() => {
      const key = this.diet.workspace();
      untracked(() => this.useWorkspace(key));
    });
    effect(() => {
      const data: PortalData = {
        access: this.access(),
        messages: this.messages(),
        tasks: this.tasks(),
        requests: this.requests(),
        readMarkers: this.readMarkers(),
      };
      const key = this.loadedWorkspace;
      if (key) {
        saveWorkspacePart(key, 'portal', data);
        if (!this.hydratingFromRemote) {
          this.pushRemotePortal(key, data);
        }
      }
    });
  }

  /** Loads a workspace's portal records (no-op when it is already loaded). */
  useWorkspace(key: string): void {
    if (key === this.loadedWorkspace) return;
    this.loadedWorkspace = key;
    const data =
      key === SAMPLE_WORKSPACE
        ? createPortalSeed(new Date())
        : (loadWorkspacePart<PortalData>(key, 'portal') ?? emptyPortalData());
    this.applyPortalData(data);
    this.pullRemotePortal(key);
  }

  private applyPortalData(data: PortalData): void {
    const empty = emptyPortalData();
    this.access.set(data.access ?? empty.access);
    this.messages.set(data.messages ?? empty.messages);
    this.tasks.set(data.tasks ?? empty.tasks);
    this.requests.set(data.requests ?? empty.requests);
    this.readMarkers.set(data.readMarkers ?? empty.readMarkers);
  }

  private pullRemotePortal(key: string): void {
    const session = untracked(this.auth.session);
    if (!this.http || !session || session.demo || key === SAMPLE_WORKSPACE) return;
    this.http.get<PortalData>(`${environment.apiBaseUrl}/diet/portal/workspace`).subscribe({
      next: (remote) => {
        if (!remote || this.loadedWorkspace !== key) return;
        this.hydratingFromRemote = true;
        try {
          this.applyPortalData(remote);
          saveWorkspacePart(key, 'portal', remote);
        } finally {
          this.hydratingFromRemote = false;
        }
      },
      error: () => {
        // Offline / local fallback remains active
      },
    });
  }

  private pushRemotePortal(key: string, data: PortalData): void {
    const session = untracked(this.auth.session);
    if (!this.http || !session || session.demo || key === SAMPLE_WORKSPACE) return;
    this.http.put(`${environment.apiBaseUrl}/diet/portal/workspace`, data).subscribe({
      error: () => {
        // Local storage already saved
      },
    });
  }

  /** Every client the dietitian can chat with, newest conversation first. */
  readonly conversations = computed<ConversationSummary[]>(() => {
    const messages = this.messages();
    const tasks = this.tasks();
    const requests = this.requests();
    return this.diet
      .clients()
      .filter((c) => c.status !== 'archived')
      .map((client) => {
        const own = messages.filter((m) => m.clientId === client.id);
        return {
          clientId: client.id,
          name: `${client.firstName} ${client.lastName}`,
          access: this.accessFor(client.id),
          lastMessage: own.reduce<Message | null>(
            (latest, m) => (!latest || m.at > latest.at ? m : latest),
            null,
          ),
          unread: this.unreadCount(client.id, 'dietitian'),
          openRequests: requests.filter(
            (r) => r.clientId === client.id && (r.status === 'open' || r.status === 'in_progress'),
          ).length,
          openTasks: tasks.filter((t) => t.clientId === client.id && t.status === 'open').length,
        };
      })
      .sort((a, b) => (b.lastMessage?.at ?? '').localeCompare(a.lastMessage?.at ?? ''));
  });

  readonly dietitianUnread = computed(() =>
    this.conversations().reduce((sum, c) => sum + c.unread, 0),
  );

  readonly openRequestCount = computed(
    () => this.requests().filter((r) => r.status === 'open').length,
  );

  readonly overdueTaskCount = computed(() => {
    const today = isoDate(new Date());
    return this.tasks().filter((t) => t.status === 'open' && t.dueDate && t.dueDate < today)
      .length;
  });

  // ---- Portal access -------------------------------------------------------------------

  accessFor(clientId: string): PortalAccess {
    return (
      this.access().find((a) => a.clientId === clientId) ?? {
        clientId,
        status: 'none',
        invitedAt: null,
        activatedAt: null,
      }
    );
  }

  /** Sends (or re-sends) the portal invitation. MainAPI e-mails the client a sign-up link. */
  invite(clientId: string): void {
    const now = new Date().toISOString();
    const current = this.accessFor(clientId);
    const next: PortalAccess = {
      clientId,
      status: current.activatedAt ? 'active' : 'invited',
      invitedAt: now,
      activatedAt: current.activatedAt,
    };
    this.upsertAccess(next);
    this.diet.log('mail', 'primary', 'Portal daveti gönderildi', this.diet.clientName(clientId));
    const session = untracked(this.auth.session);
    const client = this.diet.clients().find((c) => c.id === clientId);
    if (this.http && session && !session.demo && client?.email) {
      this.http
        .post(`${environment.apiBaseUrl}/diet/clients/${clientId}/portal/invite`, {
          email: client.email,
        })
        .subscribe({ error: () => {} });
    }
  }

  disable(clientId: string): void {
    this.upsertAccess({ ...this.accessFor(clientId), status: 'disabled' });
    this.diet.log('block', 'warning', 'Portal erişimi kapatıldı', this.diet.clientName(clientId));
    const session = untracked(this.auth.session);
    if (this.http && session && !session.demo) {
      this.http
        .post(`${environment.apiBaseUrl}/diet/clients/${clientId}/portal/disable`, {})
        .subscribe({ error: () => {} });
    }
  }

  markActivated(clientId: string): void {
    const current = this.accessFor(clientId);
    if (current.status === 'active') return;
    this.upsertAccess({ ...current, status: 'active', activatedAt: new Date().toISOString() });
  }

  /** Demo-mode lookup: an invited or active client whose e-mail matches the login. */
  clientIdForLogin(email: string, clients: readonly Client[]): string | undefined {
    return memberClientId(email, clients, this.access());
  }

  demoMemberId(): string {
    return this.access().find((a) => a.status === 'active')?.clientId ?? 'c-1';
  }

  canUsePortal(clientId: string): boolean {
    const status = this.accessFor(clientId).status;
    return status === 'active' || status === 'invited';
  }

  // ---- Messages ------------------------------------------------------------------------

  messagesFor(clientId: string): Message[] {
    return this.messages()
      .filter((m) => m.clientId === clientId)
      .sort((a, b) => a.at.localeCompare(b.at));
  }

  unreadCount(clientId: string, reader: UserRole): number {
    const marker = this.readMarkers().find((r) => r.clientId === clientId);
    const since = (reader === 'dietitian' ? marker?.dietitianReadAt : marker?.memberReadAt) ?? '';
    const otherSide: MessageAuthor[] = reader === 'dietitian' ? ['member'] : ['dietitian', 'system'];
    return this.messages().filter(
      (m) => m.clientId === clientId && otherSide.includes(m.author) && m.at > since,
    ).length;
  }

  markRead(clientId: string, reader: UserRole): void {
    if (this.unreadCount(clientId, reader) === 0) return;
    const now = new Date().toISOString();
    this.readMarkers.update((list) => {
      const existing = list.find((r) => r.clientId === clientId) ?? {
        clientId,
        dietitianReadAt: null,
        memberReadAt: null,
      };
      const updated: ReadMarker =
        reader === 'dietitian'
          ? { ...existing, dietitianReadAt: now }
          : { ...existing, memberReadAt: now };
      return [...list.filter((r) => r.clientId !== clientId), updated];
    });
  }

  sendMessage(
    clientId: string,
    author: Exclude<MessageAuthor, 'system'>,
    authorName: string,
    body: string,
    files: readonly File[] = [],
  ): Message | null {
    const text = body.trim();
    const attachments = toAttachments(files);
    if (!text && !attachments.length) return null;
    const message = this.push({ clientId, author, authorName, body: text, attachments });
    // Writing in a conversation means you have read it.
    this.markRead(clientId, author);
    return message;
  }

  // ---- Tasks ---------------------------------------------------------------------------

  tasksFor(clientId: string): CareTask[] {
    return this.tasks()
      .filter((t) => t.clientId === clientId)
      .sort(byOpenThenDue);
  }

  task(taskId: string): CareTask | undefined {
    return this.tasks().find((t) => t.id === taskId);
  }

  assignTask(input: NewTask, dietitianName: string): CareTask {
    const task: CareTask = {
      ...input,
      title: input.title.trim(),
      description: input.description.trim(),
      id: newId('t'),
      status: 'open',
      createdAt: new Date().toISOString(),
      completedAt: null,
      completionNote: '',
      attachments: [],
    };
    this.tasks.update((list) => [task, ...list]);
    this.push({
      clientId: input.clientId,
      author: 'dietitian',
      authorName: dietitianName,
      body: 'Size yeni bir görev atadım.',
      attachments: [],
      taskId: task.id,
    });
    this.diet.log(
      'assignment',
      'primary',
      'Görev atandı',
      `${this.diet.clientName(input.clientId)} · ${task.title}`,
    );
    return task;
  }

  completeTask(taskId: string, note: string, files: readonly File[] = []): void {
    const task = this.task(taskId);
    if (!task || task.status === 'done') return;
    const attachments = toAttachments(files);
    this.tasks.update((list) =>
      list.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: 'done',
              completedAt: new Date().toISOString(),
              completionNote: note.trim(),
              attachments,
            }
          : t,
      ),
    );
    const name = this.diet.clientName(task.clientId);
    this.push({
      clientId: task.clientId,
      author: 'system',
      authorName: name,
      body: `${name} “${task.title}” görevini tamamladı.${note.trim() ? `\n${note.trim()}` : ''}`,
      attachments,
      taskId,
    });
    this.diet.log('task_alt', 'positive', 'Görev tamamlandı', `${name} · ${task.title}`);
  }

  reopenTask(taskId: string): void {
    this.tasks.update((list) =>
      list.map((t) =>
        t.id === taskId ? { ...t, status: 'open', completedAt: null, completionNote: '' } : t,
      ),
    );
  }

  deleteTask(taskId: string): void {
    this.tasks.update((list) => list.filter((t) => t.id !== taskId));
  }

  // ---- Requests ------------------------------------------------------------------------

  requestsFor(clientId: string): MemberRequest[] {
    return this.requests()
      .filter((r) => r.clientId === clientId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  request(requestId: string): MemberRequest | undefined {
    return this.requests().find((r) => r.id === requestId);
  }

  createRequest(input: NewRequest, files: readonly File[] = []): MemberRequest {
    const now = new Date().toISOString();
    const request: MemberRequest = {
      ...input,
      subject: input.subject.trim(),
      detail: input.detail.trim(),
      id: newId('r'),
      status: 'open',
      createdAt: now,
      updatedAt: now,
      response: '',
      attachments: toAttachments(files),
    };
    this.requests.update((list) => [request, ...list]);
    const name = this.diet.clientName(input.clientId);
    this.push({
      clientId: input.clientId,
      author: 'member',
      authorName: name,
      body: 'Yeni bir talep oluşturdum.',
      attachments: [],
      requestId: request.id,
    });
    this.markRead(input.clientId, 'member');
    this.diet.log(
      'inbox',
      'warning',
      'Yeni danışan talebi',
      `${name} · ${REQUEST_TYPE_LABELS[input.type]}`,
    );
    return request;
  }

  respondToRequest(
    requestId: string,
    status: RequestStatus,
    response: string,
    dietitianName: string,
  ): void {
    const request = this.request(requestId);
    if (!request) return;
    const text = response.trim();
    this.requests.update((list) =>
      list.map((r) =>
        r.id === requestId
          ? { ...r, status, response: text || r.response, updatedAt: new Date().toISOString() }
          : r,
      ),
    );
    this.push({
      clientId: request.clientId,
      author: 'dietitian',
      authorName: dietitianName,
      body: text || `Talebinizin durumu: ${REQUEST_STATUS_LABELS[status]}.`,
      attachments: [],
      requestId,
    });
    this.markRead(request.clientId, 'dietitian');
    this.diet.log(
      'inbox',
      status === 'resolved' ? 'positive' : 'info',
      `Talep: ${REQUEST_STATUS_LABELS[status]}`,
      `${this.diet.clientName(request.clientId)} · ${request.subject}`,
    );
  }

  private push(message: Omit<Message, 'id' | 'at'>): Message {
    const created: Message = { ...message, id: newId('g'), at: new Date().toISOString() };
    this.messages.update((list) => [...list, created]);
    return created;
  }

  private upsertAccess(next: PortalAccess): void {
    this.access.update((list) => [...list.filter((a) => a.clientId !== next.clientId), next]);
  }
}

/**
 * Turns picked files into attachments. Invalid files are dropped here as a safety net;
 * the composer already shows the reasons to the user before sending.
 */
export function toAttachments(files: readonly File[]): Attachment[] {
  const { accepted } = partitionAttachments(files, 0);
  return accepted.map(({ file, kind }) => ({
    id: newId('f'),
    name: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    kind,
    url: typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : '',
  }));
}

function byOpenThenDue(a: CareTask, b: CareTask): number {
  if (a.status !== b.status) return a.status === 'open' ? -1 : 1;
  return (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999');
}

let counter = 0;
function newId(prefix: string): string {
  counter++;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}
