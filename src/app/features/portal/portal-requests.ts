import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormField, form, maxLength, required, submit } from '@angular/forms/signals';
import { MemberPortal } from '../../core/data/member-portal';
import { isoDate } from '../../domain/diet-calc';
import { CHANNEL_ICONS, CHANNEL_LABELS, ConsultationChannel } from '../../domain/diet.models';
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
          <div actions class="flex flex-wrap gap-2">
            <button type="button" class="odv-btn-soft !border-emerald-300 !bg-emerald-50 !text-emerald-900 dark:!border-emerald-800 dark:!bg-emerald-950/60 dark:!text-emerald-200" (click)="openForm('appointment')">
              <span class="material-symbols-rounded !text-lg">calendar_add_on</span>Randevu talep et
            </button>
            <button type="button" class="odv-btn-primary" (click)="openForm('question')">
              <span class="material-symbols-rounded !text-lg">add</span>Yeni talep
            </button>
          </div>
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

          @if (model().type === 'appointment') {
            <div class="rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-4 space-y-4 dark:border-emerald-900/60 dark:bg-emerald-950/20">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span class="odv-eyebrow text-emerald-700 dark:text-emerald-300">Canlı Klinik Ajanda</span>
                  <h3 class="text-sm font-extrabold text-slate-900 dark:text-white">Görüşme günü, müsait saat ve kanal seçin</h3>
                </div>
                <span class="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
                  Dolu saatler otomatik filtrelenir
                </span>
              </div>

              <!-- Görüşme Kanalı -->
              <div>
                <span class="odv-label">Görüşme kanalı</span>
                <div class="mt-1 grid gap-2 sm:grid-cols-3">
                  @for (ch of appointmentChannels; track ch) {
                    <button
                      type="button"
                      class="flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition"
                      [class.border-emerald-600]="preferredChannel() === ch"
                      [class.bg-emerald-600]="preferredChannel() === ch"
                      [class.text-white]="preferredChannel() === ch"
                      [class.border-slate-200]="preferredChannel() !== ch"
                      [class.bg-white]="preferredChannel() !== ch"
                      [class.text-slate-700]="preferredChannel() !== ch"
                      [class.dark:border-slate-700]="preferredChannel() !== ch"
                      [class.dark:bg-slate-900]="preferredChannel() !== ch"
                      [class.dark:text-slate-200]="preferredChannel() !== ch"
                      (click)="selectChannel(ch)"
                    >
                      <span class="material-symbols-rounded !text-base" aria-hidden="true">{{ channelIcons[ch] }}</span>
                      {{ channelLabels[ch] }}
                    </button>
                  }
                </div>
              </div>

              <!-- Gün Seçimi -->
              <div class="grid gap-3 sm:grid-cols-[1fr_200px] sm:items-end">
                <div>
                  <span class="odv-label">Hızlı gün seçimi</span>
                  <div class="mt-1 flex flex-wrap gap-1.5">
                    @for (d of quickDays(); track d.iso) {
                      <button
                        type="button"
                        class="rounded-xl border px-3 py-1.5 text-xs font-bold transition"
                        [class.border-emerald-600]="preferredDate() === d.iso"
                        [class.bg-emerald-600]="preferredDate() === d.iso"
                        [class.text-white]="preferredDate() === d.iso"
                        [class.border-slate-200]="preferredDate() !== d.iso"
                        [class.bg-white]="preferredDate() !== d.iso"
                        [class.text-slate-700]="preferredDate() !== d.iso"
                        [class.dark:border-slate-700]="preferredDate() !== d.iso"
                        [class.dark:bg-slate-900]="preferredDate() !== d.iso"
                        [class.dark:text-slate-200]="preferredDate() !== d.iso"
                        (click)="selectDate(d.iso)"
                      >
                        {{ d.label }}
                      </button>
                    }
                  </div>
                </div>
                <label class="block">
                  <span class="odv-label">Veya takvimden seçin</span>
                  <input
                    type="date"
                    class="odv-input !py-1.5 text-xs"
                    [min]="todayIso"
                    [value]="preferredDate()"
                    (change)="selectDate($any($event.target).value)"
                  />
                </label>
              </div>

              <!-- Saat Dilimleri -->
              <div>
                <span class="odv-label">Müsait saat dilimleri ({{ preferredDate() | date: 'd MMMM EEEE' }})</span>
                <div class="mt-1.5 grid grid-cols-3 gap-2 sm:grid-cols-6">
                  @for (slot of availableSlots(); track slot.time) {
                    <button
                      type="button"
                      [disabled]="slot.busy"
                      class="flex items-center justify-center gap-1 rounded-xl border px-2.5 py-2 text-xs font-bold tabular transition disabled:cursor-not-allowed disabled:opacity-45"
                      [class.border-emerald-600]="preferredTime() === slot.time && !slot.busy"
                      [class.bg-emerald-600]="preferredTime() === slot.time && !slot.busy"
                      [class.text-white]="preferredTime() === slot.time && !slot.busy"
                      [class.border-slate-200]="preferredTime() !== slot.time || slot.busy"
                      [class.bg-white]="preferredTime() !== slot.time && !slot.busy"
                      [class.bg-slate-100]="slot.busy"
                      [class.text-slate-700]="preferredTime() !== slot.time && !slot.busy"
                      [class.text-slate-400]="slot.busy"
                      [class.dark:border-slate-700]="preferredTime() !== slot.time || slot.busy"
                      [class.dark:bg-slate-900]="preferredTime() !== slot.time && !slot.busy"
                      [class.dark:text-slate-200]="preferredTime() !== slot.time && !slot.busy"
                      (click)="selectTime(slot.time)"
                    >
                      <span>{{ slot.time }}</span>
                      @if (slot.busy) {
                        <span class="text-[10px] font-semibold">(Dolu)</span>
                      }
                    </button>
                  }
                </div>
              </div>
            </div>
          }
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
                  @if (r.preferredDate) {
                    <span class="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
                      <span class="material-symbols-rounded !text-sm" aria-hidden="true">event_available</span>
                      {{ r.preferredDate | date: 'd MMM' }} · {{ r.preferredTime || '14:00' }} · {{ channelLabels[r.preferredChannel || 'video'] }}
                    </span>
                  }
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
  readonly channelLabels = CHANNEL_LABELS;
  readonly channelIcons = CHANNEL_ICONS;
  readonly appointmentChannels: ConsultationChannel[] = ['video', 'clinic', 'phone'];
  readonly types = Object.keys(REQUEST_TYPE_LABELS) as RequestType[];
  readonly formOpen = signal(false);
  readonly files = signal<File[]>([]);
  readonly errors = signal<string[]>([]);
  readonly todayIso = isoDate(new Date());
  readonly preferredDate = signal<string>(this.defaultTomorrowIso());
  readonly preferredTime = signal<string>('14:00');
  readonly preferredChannel = signal<ConsultationChannel>('video');
  readonly availableSlots = computed(() =>
    this.member.availableSlotsForDate(this.preferredDate()),
  );
  readonly quickDays = computed(() => {
    const fmt = new Intl.DateTimeFormat('tr-TR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
    const list: { iso: string; label: string }[] = [];
    const cursor = new Date();
    for (let i = 1; i <= 7 && list.length < 5; i++) {
      const d = new Date(cursor);
      d.setDate(cursor.getDate() + i);
      if (d.getDay() === 0) continue; // Pazar hariç hızlı günler
      list.push({ iso: isoDate(d), label: fmt.format(d) });
    }
    return list;
  });
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
    if (type === 'appointment') {
      this.syncAppointmentSubject();
    }
    this.formOpen.set(true);
  }

  setType(type: RequestType): void {
    this.model.update((m) => ({ ...m, type }));
    if (type === 'appointment') {
      this.syncAppointmentSubject();
    }
  }

  selectDate(dateIso: string): void {
    if (!dateIso) return;
    this.preferredDate.set(dateIso);
    const slots = this.member.availableSlotsForDate(dateIso);
    const current = this.preferredTime();
    if (slots.find((s) => s.time === current)?.busy) {
      const firstFree = slots.find((s) => !s.busy);
      if (firstFree) this.preferredTime.set(firstFree.time);
    }
    this.syncAppointmentSubject();
  }

  selectTime(time: string): void {
    this.preferredTime.set(time);
    this.syncAppointmentSubject();
  }

  selectChannel(ch: ConsultationChannel): void {
    this.preferredChannel.set(ch);
    this.syncAppointmentSubject();
  }

  private syncAppointmentSubject(): void {
    const cur = this.model().subject.trim();
    if (cur && !cur.startsWith('Randevu talebi ·')) return;
    const dt = new Date(`${this.preferredDate()}T12:00:00`);
    const dateLabel = dt.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    const chLabel = this.channelLabels[this.preferredChannel()];
    const nextSubject = `Randevu talebi · ${dateLabel} ${this.preferredTime()} (${chLabel})`;
    this.model.update((m) => ({ ...m, subject: nextSubject }));
  }

  private defaultTomorrowIso(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    if (d.getDay() === 0) d.setDate(d.getDate() + 1);
    return isoDate(d);
  }

  send(event: Event): void {
    event.preventDefault();
    void submit(this.f, async () => {
      const v = this.model();
      this.member.createRequest(
        v.type,
        v.subject,
        v.detail,
        this.files(),
        v.type === 'appointment'
          ? {
              preferredDate: this.preferredDate(),
              preferredTime: this.preferredTime(),
              preferredChannel: this.preferredChannel(),
            }
          : undefined,
      );
      this.notify.success(
        v.type === 'appointment' ? 'Randevu talebiniz iletildi' : 'Talebiniz iletildi',
        v.type === 'appointment'
          ? 'Diyetisyeniniz onayladığında randevunuz takviminize eklenecek.'
          : 'Diyetisyeniniz en kısa sürede yanıtlayacak.',
      );
      this.formOpen.set(false);
      this.files.set([]);
    });
  }
}
