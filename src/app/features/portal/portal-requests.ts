import { DatePipe } from '@angular/common';
import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { FormField, form, maxLength, required, submit } from '@angular/forms/signals';
import { MemberPortal } from '../../core/data/member-portal';
import {
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_TONES,
  REQUEST_TYPE_ICONS,
  REQUEST_TYPE_LABELS,
  RequestStatus,
  RequestType,
} from '../../domain/portal.models';
import { AttachmentList } from '../../shared/ui/attachment-list';
import { EmptyState } from '../../shared/ui/empty-state';
import { FilePicker, PickedFiles } from '../../shared/ui/file-picker';
import { PageHeader } from '../../shared/ui/page-header';
import { toneClass } from '../../shared/ui/tone';
import { Notify } from '../../core/notify/notify';

interface RequestDraft {
  type: RequestType;
  subject: string;
  detail: string;
}

@Component({
  selector: 'app-portal-requests',
  imports: [PageHeader, EmptyState, AttachmentList, FilePicker, PickedFiles, FormField, DatePipe],
  template: `
    <div class="animate-fade-up space-y-6">
      <app-page-header
        eyebrow="Destek"
        title="Taleplerim"
        description="Randevu, plan değişikliği, rapor veya sorularınızı diyetisyeninize iletin."
      >
        @if (!formOpen()) {
          <button actions type="button" class="odv-btn-primary" (click)="openForm('question')">
            <span class="material-symbols-rounded !text-lg">add</span>Yeni talep
          </button>
        }
      </app-page-header>

      @if (formOpen()) {
        <form class="odv-card space-y-4 p-5" (submit)="send($event)" novalidate aria-label="Yeni talep">
          <fieldset>
            <legend class="odv-label">Talep türü</legend>
            <div class="flex flex-wrap gap-1.5">
              @for (type of types; track type) {
                <button
                  type="button"
                  class="odv-segment-item border border-slate-200 dark:border-slate-700"
                  [attr.aria-pressed]="model().type === type"
                  (click)="setType(type)"
                >
                  <span class="material-symbols-rounded !text-base" aria-hidden="true">{{ typeIcons[type] }}</span>{{ typeLabels[type] }}
                </button>
              }
            </div>
          </fieldset>
          <label class="block">
            <span class="odv-label">Konu <b class="text-rose-500">*</b></span>
            <input class="odv-input" [formField]="f.subject" placeholder="Kısaca talebiniz" />
            @if (f.subject().touched() && f.subject().invalid()) {
              <span class="odv-error">Konu zorunludur (en fazla 120 karakter).</span>
            }
          </label>
          <label class="block">
            <span class="odv-label">Açıklama</span>
            <textarea class="odv-input min-h-28 resize-y" [formField]="f.detail" [placeholder]="hint()"></textarea>
          </label>
          <app-file-picker label="Tahlil, fotoğraf veya belge ekle" [(files)]="files" [(errors)]="errors" />
          <app-picked-files [(files)]="files" [errors]="errors()" />
          <div class="flex gap-2">
            <button type="submit" class="odv-btn-primary"><span class="material-symbols-rounded !text-lg">send</span>Gönder</button>
            <button type="button" class="odv-btn-ghost" (click)="formOpen.set(false)">Vazgeç</button>
          </div>
        </form>
      }

      <ul class="space-y-3">
        @for (r of member.requests(); track r.id) {
          <li class="odv-card p-5" [class.ring-2]="r.id === id()" [class.ring-emerald-300]="r.id === id()">
            <div class="flex items-start gap-3">
              <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300"
                ><span class="material-symbols-rounded" aria-hidden="true">{{ typeIcons[r.type] }}</span></span
              >
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <strong class="text-sm">{{ r.subject }}</strong>
                  <span class="odv-badge" [class]="tone(r.status)">{{ statusLabels[r.status] }}</span>
                </div>
                <p class="text-xs text-slate-500">{{ typeLabels[r.type] }} · {{ r.createdAt | date: 'd MMM y, HH:mm' }}</p>
                @if (r.detail) {
                  <p class="mt-2 whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">{{ r.detail }}</p>
                }
                @if (r.attachments.length) {
                  <app-attachment-list class="mt-2" [attachments]="r.attachments" />
                }
                @if (r.response) {
                  <div class="mt-3 rounded-xl bg-violet-50 p-3 text-sm dark:bg-violet-950/40">
                    <span class="odv-eyebrow">Diyetisyeninizin yanıtı · {{ r.updatedAt | date: 'd MMM' }}</span>
                    <p class="mt-1 whitespace-pre-line">{{ r.response }}</p>
                  </div>
                }
              </div>
            </div>
          </li>
        } @empty {
          <li class="odv-card"><app-empty-state icon="inbox" title="Henüz talebiniz yok" body="Yeni talep oluşturduğunuzda durumunu buradan takip edebilirsiniz." /></li>
        }
      </ul>
    </div>
  `,
})
export class PortalRequests {
  /** `?id=` highlights a request; `?new=<type>` opens the form with that type. */
  readonly id = input<string>();
  readonly new = input<string>();
  readonly member = inject(MemberPortal);
  private readonly notify = inject(Notify);
  readonly typeIcons = REQUEST_TYPE_ICONS;
  readonly typeLabels = REQUEST_TYPE_LABELS;
  readonly statusLabels = REQUEST_STATUS_LABELS;
  readonly types = Object.keys(REQUEST_TYPE_LABELS) as RequestType[];
  readonly formOpen = signal(false);
  readonly files = signal<File[]>([]);
  readonly errors = signal<string[]>([]);
  readonly model = signal<RequestDraft>({ type: 'question', subject: '', detail: '' });
  readonly f = form(this.model, (p) => {
    required(p.subject);
    maxLength(p.subject, 120);
    maxLength(p.detail, 2000);
  });

  private readonly hints: Record<RequestType, string> = {
    appointment: 'Uygun olduğunuz gün ve saatleri yazın.',
    plan_change: 'Hangi öğün veya besinle ilgili değişiklik istiyorsunuz?',
    question: 'Sorunuzu yazın.',
    document: 'Hangi rapor veya belgeye, ne amaçla ihtiyacınız var?',
    other: 'Talebinizi açıklayın.',
  };
  readonly hint = () => this.hints[this.model().type];

  constructor() {
    effect(() => {
      const type = this.new();
      untracked(() => {
        if (type && type in REQUEST_TYPE_LABELS) this.openForm(type as RequestType);
      });
    });
  }

  tone(status: RequestStatus): string {
    return toneClass(REQUEST_STATUS_TONES[status]);
  }

  openForm(type: RequestType): void {
    this.model.set({ type, subject: '', detail: '' });
    this.f().reset();
    this.files.set([]);
    this.errors.set([]);
    this.formOpen.set(true);
  }

  setType(type: RequestType): void {
    this.model.update((m) => ({ ...m, type }));
  }

  send(event: Event): void {
    event.preventDefault();
    void submit(this.f, async () => {
      const v = this.model();
      this.member.createRequest(v.type, v.subject, v.detail, this.files());
      this.notify.success('Talebiniz iletildi', 'Diyetisyeniniz en kısa sürede yanıtlayacak.');
      this.formOpen.set(false);
      this.files.set([]);
    });
  }
}
