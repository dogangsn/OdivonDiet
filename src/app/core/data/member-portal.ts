import { Injectable, computed, inject } from '@angular/core';
import { isoDate } from '../../domain/diet-calc';
import { Consultation, MealPlan } from '../../domain/diet.models';
import { RequestType } from '../../domain/portal.models';
import { AuthStore } from '../auth/auth-store';
import { DietStore } from './diet-store';
import { PortalStore } from './portal-store';

/** What a member sees of a consultation: the dietitian's private notes are left out. */
export type MemberConsultation = Omit<Consultation, 'notes'>;

/**
 * The member portal's only door to data. Every read and write is scoped to the signed-in
 * member's own `clientId`, mirroring the row-level checks MainAPI does on `/portal/*`.
 */
@Injectable({ providedIn: 'root' })
export class MemberPortal {
  private readonly auth = inject(AuthStore);
  private readonly diet = inject(DietStore);
  private readonly portal = inject(PortalStore);

  readonly clientId = computed(() => {
    const session = this.auth.session();
    return session?.role === 'member' ? (session.clientId ?? null) : null;
  });

  readonly view = computed(() => {
    const id = this.clientId();
    return id ? (this.diet.view(id) ?? null) : null;
  });

  readonly firstName = computed(() => this.view()?.client.firstName ?? '');

  readonly plans = computed<MealPlan[]>(() => {
    const id = this.clientId();
    // Drafts are work in progress for the dietitian and stay hidden.
    return this.diet
      .plans()
      .filter((p) => p.clientId === id && p.status !== 'draft')
      .sort((a, b) => b.startDate.localeCompare(a.startDate));
  });

  readonly measurements = computed(() => {
    const id = this.clientId();
    return id ? this.diet.measurementsFor(id) : [];
  });

  readonly consultations = computed<MemberConsultation[]>(() => {
    const id = this.clientId();
    return this.diet
      .consultations()
      .filter((c) => c.clientId === id)
      .map(({ notes: _private, ...rest }) => rest)
      .sort((a, b) => b.at.localeCompare(a.at));
  });

  readonly upcoming = computed(() => {
    const now = new Date().toISOString();
    return this.consultations()
      .filter((c) => c.status === 'scheduled' && c.at >= now)
      .sort((a, b) => a.at.localeCompare(b.at));
  });

  readonly tasks = computed(() => {
    const id = this.clientId();
    return id ? this.portal.tasksFor(id) : [];
  });

  readonly openTasks = computed(() => this.tasks().filter((t) => t.status === 'open'));

  readonly requests = computed(() => {
    const id = this.clientId();
    return id ? this.portal.requestsFor(id) : [];
  });

  readonly messages = computed(() => {
    const id = this.clientId();
    return id ? this.portal.messagesFor(id) : [];
  });

  readonly unread = computed(() => {
    const id = this.clientId();
    return id ? this.portal.unreadCount(id, 'member') : 0;
  });

  send(body: string, files: readonly File[] = []): void {
    const id = this.requireClient();
    this.portal.sendMessage(id, 'member', this.diet.clientName(id), body, files);
  }

  markRead(): void {
    const id = this.clientId();
    if (id) this.portal.markRead(id, 'member');
  }

  completeTask(taskId: string, note: string, files: readonly File[] = []): void {
    const id = this.requireClient();
    if (this.portal.task(taskId)?.clientId !== id) throw new Error('Bu görev size ait değil.');
    this.portal.completeTask(taskId, note, files);
  }

  createRequest(type: RequestType, subject: string, detail: string, files: readonly File[] = []) {
    const clientId = this.requireClient();
    return this.portal.createRequest({ clientId, type, subject, detail }, files);
  }

  logWeight(weightKg: number, note: string): void {
    const clientId = this.requireClient();
    this.diet.addMeasurement({
      clientId,
      date: isoDate(new Date()),
      weightKg,
      waistCm: null,
      hipCm: null,
      bodyFatPct: null,
      note: note.trim(),
      source: 'member',
    });
  }

  giveConsent(): void {
    this.diet.recordConsent(this.requireClient());
  }

  private requireClient(): string {
    const id = this.clientId();
    if (!id) throw new Error('Danışan oturumu bulunamadı.');
    return id;
  }
}
