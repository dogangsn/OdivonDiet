import { DatePipe } from '@angular/common';
import {
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStore } from '../../core/auth/auth-store';
import { MemberPortal } from '../../core/data/member-portal';
import { PortalStore } from '../../core/data/portal-store';
import { startOfDay } from '../../domain/diet-calc';
import {
  Message,
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_TONES,
  REQUEST_TYPE_ICONS,
  REQUEST_TYPE_LABELS,
  TASK_CATEGORY_ICONS,
  TASK_CATEGORY_LABELS,
  UserRole,
} from '../../domain/portal.models';
import { AttachmentList } from '../../shared/ui/attachment-list';
import { FilePicker, PickedFiles } from '../../shared/ui/file-picker';
import { toneClass } from '../../shared/ui/tone';

interface DayGroup {
  readonly key: string;
  readonly label: string;
  readonly messages: readonly Message[];
}

/**
 * The conversation between a dietitian and one client. Used by both sides:
 * `viewer` decides which bubbles are "mine" and which actions are offered.
 */
@Component({
  selector: 'app-chat-thread',
  imports: [DatePipe, RouterLink, AttachmentList, FilePicker, PickedFiles],
  host: { class: 'flex min-h-0 flex-col' },
  template: `
    <div
      #scroller
      class="custom-scroll min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6"
      role="log"
      aria-live="polite"
      aria-label="Mesajlar"
      tabindex="0"
    >
      @for (group of groups(); track group.key) {
        <section [attr.aria-label]="group.label" class="space-y-2.5">
          <div class="flex justify-center">
            <span
              class="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400"
              >{{ group.label }}</span
            >
          </div>
          @for (m of group.messages; track m.id) {
            @if (m.author === 'system') {
              <div class="flex justify-center">
                <div
                  class="max-w-md rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-center text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200"
                >
                  <span class="material-symbols-rounded icon-fill !text-base align-middle" aria-hidden="true"
                    >task_alt</span
                  >
                  <span class="whitespace-pre-line">{{ m.body }}</span>
                  <span class="mt-0.5 block text-[10px] opacity-70">{{ m.at | date: 'HH:mm' }}</span>
                  @if (m.attachments.length) {
                    <app-attachment-list class="mt-2" [attachments]="m.attachments" />
                  }
                </div>
              </div>
            } @else {
              <div class="flex" [class.justify-end]="mine(m)">
                <div class="flex max-w-[85%] flex-col gap-1 sm:max-w-[70%]" [class.items-end]="mine(m)">
                  @if (!mine(m)) {
                    <span class="px-1 text-[11px] font-bold text-slate-500">{{ m.authorName }}</span>
                  }
                  @if (m.body) {
                    <div
                      class="whitespace-pre-line break-words rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed"
                      [class]="
                        mine(m)
                          ? 'rounded-ee-md bg-violet-600 text-white'
                          : 'rounded-es-md bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100'
                      "
                    >
                      {{ m.body }}
                    </div>
                  }
                  @if (m.taskId && portal.task(m.taskId); as task) {
                    <div
                      class="w-72 max-w-full rounded-2xl border border-violet-200 bg-white p-3.5 dark:border-violet-900 dark:bg-slate-900"
                    >
                      <div class="flex items-start gap-2.5">
                        <span
                          class="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300"
                          ><span class="material-symbols-rounded" aria-hidden="true">{{
                            taskIcons[task.category]
                          }}</span></span
                        >
                        <div class="min-w-0 flex-1">
                          <span class="odv-eyebrow">Görev · {{ taskLabels[task.category] }}</span>
                          <strong class="block text-sm">{{ task.title }}</strong>
                          @if (task.description) {
                            <p class="mt-0.5 text-xs text-slate-500">{{ task.description }}</p>
                          }
                          <div class="mt-2 flex flex-wrap items-center gap-1.5">
                            @if (task.status === 'done') {
                              <span class="odv-badge odv-tone-positive">Tamamlandı</span>
                            } @else {
                              <span class="odv-badge odv-tone-warning">Bekliyor</span>
                            }
                            @if (task.dueDate) {
                              <span class="text-[11px] text-slate-500"
                                >Son tarih {{ task.dueDate | date: 'd MMM' }}</span
                              >
                            }
                          </div>
                        </div>
                      </div>
                      @if (viewer() === 'member' && task.status === 'open') {
                        <a
                          class="odv-btn-soft mt-3 w-full"
                          routerLink="/portal/tasks"
                          [queryParams]="{ task: task.id }"
                          >Görevi tamamla</a
                        >
                      }
                    </div>
                  }
                  @if (m.requestId && portal.request(m.requestId); as request) {
                    <div
                      class="w-72 max-w-full rounded-2xl border border-amber-200 bg-white p-3.5 dark:border-amber-900 dark:bg-slate-900"
                    >
                      <div class="flex items-start gap-2.5">
                        <span
                          class="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300"
                          ><span class="material-symbols-rounded" aria-hidden="true">{{
                            requestIcons[request.type]
                          }}</span></span
                        >
                        <div class="min-w-0 flex-1">
                          <span class="odv-eyebrow">{{ requestLabels[request.type] }}</span>
                          <strong class="block text-sm">{{ request.subject }}</strong>
                          <span class="odv-badge mt-2" [class]="statusTone(request.status)">{{
                            statusLabels[request.status]
                          }}</span>
                        </div>
                      </div>
                      <a
                        class="odv-btn-soft mt-3 w-full"
                        [routerLink]="viewer() === 'member' ? '/portal/requests' : '/requests'"
                        [queryParams]="{ id: request.id }"
                        >{{ viewer() === 'member' ? 'Talebi gör' : 'Talebi yanıtla' }}</a
                      >
                    </div>
                  }
                  @if (m.attachments.length) {
                    <app-attachment-list [attachments]="m.attachments" />
                  }
                  <span class="px-1 text-[10px] text-slate-400">
                    {{ m.at | date: 'HH:mm' }}
                    @if (mine(m) && seenByOther(m)) {
                      · Görüldü
                    }
                  </span>
                </div>
              </div>
            }
          }
        </section>
      } @empty {
        <div class="grid h-full place-items-center py-16 text-center">
          <div>
            <span
              class="mx-auto grid size-14 place-items-center rounded-2xl bg-violet-50 text-violet-500 dark:bg-violet-950/60"
              ><span class="material-symbols-rounded !text-3xl" aria-hidden="true">forum</span></span
            >
            <p class="mt-3 text-sm font-bold">Henüz mesaj yok</p>
            <p class="mt-1 text-xs text-slate-500">İlk mesajı yazarak sohbeti başlatın.</p>
          </div>
        </div>
      }
    </div>

    @if (blocked()) {
      <p
        class="border-t border-slate-100 px-4 py-3 text-center text-xs text-slate-500 dark:border-slate-800"
      >
        Bu danışanın portal erişimi yok. Mesajları görebilmesi için profilinden portala davet edin.
      </p>
    }

    <form
      class="border-t border-slate-100 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-900/80 sm:p-4"
      (submit)="send($event)"
    >
      <app-picked-files class="mb-2" [(files)]="files" [errors]="fileErrors()" />
      <div class="flex items-end gap-2">
        <app-file-picker [compact]="true" [(files)]="files" [(errors)]="fileErrors" />
        @if (viewer() === 'dietitian') {
          <button
            type="button"
            class="odv-icon-btn"
            aria-label="Görev ata"
            title="Görev ata"
            (click)="assignTask.emit()"
          >
            <span class="material-symbols-rounded">add_task</span>
          </button>
        }
        <label class="sr-only" [attr.for]="inputId">Mesaj</label>
        <textarea
          [id]="inputId"
          class="odv-input custom-scroll max-h-40 min-h-11 flex-1 resize-none !py-2.5"
          rows="1"
          placeholder="Mesaj yazın… (Enter gönderir, Shift+Enter yeni satır)"
          [value]="draft()"
          (input)="draft.set($any($event.target).value)"
          (keydown.enter)="onEnter($event)"
        ></textarea>
        <button type="submit" class="odv-btn-primary !size-11 !p-0" aria-label="Gönder" [disabled]="!canSend()">
          <span class="material-symbols-rounded directional-icon">send</span>
        </button>
      </div>
    </form>
  `,
})
export class ChatThread {
  readonly clientId = input.required<string>();
  readonly viewer = input.required<UserRole>();
  /** Shown when the dietitian opens a chat with a client who has no portal login. */
  readonly blocked = input(false);
  readonly assignTask = output<void>();

  readonly portal = inject(PortalStore);
  private readonly member = inject(MemberPortal);
  private readonly auth = inject(AuthStore);
  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');

  readonly inputId = `chat-input-${Math.random().toString(36).slice(2, 8)}`;
  readonly draft = signal('');
  readonly files = signal<File[]>([]);
  readonly fileErrors = signal<string[]>([]);
  readonly canSend = computed(() => !!this.draft().trim() || this.files().length > 0);

  readonly taskIcons = TASK_CATEGORY_ICONS;
  readonly taskLabels = TASK_CATEGORY_LABELS;
  readonly requestIcons = REQUEST_TYPE_ICONS;
  readonly requestLabels = REQUEST_TYPE_LABELS;
  readonly statusLabels = REQUEST_STATUS_LABELS;

  readonly messages = computed(() =>
    this.viewer() === 'member' ? this.member.messages() : this.portal.messagesFor(this.clientId()),
  );

  readonly groups = computed<DayGroup[]>(() => {
    const groups: DayGroup[] = [];
    for (const m of this.messages()) {
      const key = startOfDay(m.at).toISOString();
      const last = groups.at(-1);
      if (last?.key === key) (last.messages as Message[]).push(m);
      else groups.push({ key, label: dayLabel(m.at), messages: [m] });
    }
    return groups;
  });

  private readonly otherReadAt = computed(() => {
    const marker = this.portal.readMarkers().find((r) => r.clientId === this.clientId());
    return (this.viewer() === 'dietitian' ? marker?.memberReadAt : marker?.dietitianReadAt) ?? '';
  });

  constructor() {
    // Opening the thread (and every new incoming message while open) marks it read.
    effect(() => {
      this.messages();
      const clientId = this.clientId();
      const viewer = this.viewer();
      untracked(() => {
        if (viewer === 'member') this.member.markRead();
        else this.portal.markRead(clientId, 'dietitian');
      });
    });
    // Reset the composer when switching conversations.
    effect(() => {
      this.clientId();
      untracked(() => {
        this.draft.set('');
        this.files.set([]);
        this.fileErrors.set([]);
      });
    });
    afterRenderEffect(() => {
      this.messages();
      const el = this.scroller()?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }

  mine(m: Message): boolean {
    return m.author === this.viewer();
  }

  seenByOther(m: Message): boolean {
    return this.otherReadAt() >= m.at;
  }

  statusTone(status: keyof typeof REQUEST_STATUS_TONES): string {
    return toneClass(REQUEST_STATUS_TONES[status]);
  }

  onEnter(event: Event): void {
    if ((event as KeyboardEvent).shiftKey) return;
    event.preventDefault();
    this.send(event);
  }

  send(event: Event): void {
    event.preventDefault();
    if (!this.canSend()) return;
    if (this.viewer() === 'member') {
      this.member.send(this.draft(), this.files());
    } else {
      const name = this.auth.session()?.name ?? 'Diyetisyen';
      this.portal.sendMessage(this.clientId(), 'dietitian', name, this.draft(), this.files());
    }
    this.draft.set('');
    this.files.set([]);
    this.fileErrors.set([]);
  }
}

function dayLabel(at: string): string {
  const days = Math.round(
    (startOfDay(new Date()).getTime() - startOfDay(at).getTime()) / 86_400_000,
  );
  if (days === 0) return 'Bugün';
  if (days === 1) return 'Dün';
  return new Date(at).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: days > 300 ? 'numeric' : undefined,
  });
}
