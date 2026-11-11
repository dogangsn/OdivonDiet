import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { DietStore } from '../../core/data/diet-store';
import { Notify } from '../../core/notify/notify';
import { isoDate } from '../../domain/diet-calc';
import { CHANNEL_ICONS, CHANNEL_LABELS, ConsultationChannel } from '../../domain/diet.models';
import { SlideOver } from '../../shared/ui/slide-over';
import { QuickActions } from './quick-actions';

interface ScheduleDraft {
  clientId: string;
  date: string;
  time: string;
  channel: ConsultationChannel;
  notes: string;
}

interface CompleteDraft {
  adherence: number;
  notes: string;
  nextAction: string;
}

const CHANNELS = Object.keys(CHANNEL_LABELS) as ConsultationChannel[];

const CLINIC_TIME_SLOTS = [
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
  '17:30',
] as const;

@Component({
  selector: 'app-consultation-form',
  imports: [SlideOver, FormField, DatePipe],
  template: `
    <app-slide-over
      [open]="scheduleOpen()"
      [wide]="true"
      [dirty]="!!schedule().notes"
      icon="calendar_month"
      eyebrow="Klinik randevu & takvim"
      title="Görsel takvimden randevu planla"
      description="Danışan seçin, görsel gün ve saat dilimlerinden uygun boşluğu işaretleyin."
      submitLabel="Randevuyu oluştur"
      (closed)="qa.close()"
      (submitted)="saveSchedule()"
    >
      <div class="odv-card space-y-5 p-5">
        <label class="block">
          <span class="odv-label">Danışan <b class="text-rose-500">*</b></span>
          <select class="odv-input" [formField]="sf.clientId">
            <option value="" disabled>Danışan seçin</option>
            @for (view of store.activeClients(); track view.client.id) {
              <option [value]="view.client.id">
                {{ view.fullName }} ({{ view.currentWeightKg }} kg)
              </option>
            }
          </select>
          @if (sf.clientId().touched() && sf.clientId().invalid()) {
            <span class="odv-error">Danışan seçin.</span>
          }
        </label>

        <!-- Görsel 7 Günlük Hızlı Tarih Seçici -->
        <div>
          <div class="mb-2 flex items-center justify-between">
            <span class="odv-label !mb-0">Hızlı gün seçimi</span>
            <span class="text-xs text-slate-500">Seçili: {{ schedule().date | date: 'd MMMM y, EEEE' }}</span>
          </div>
          <div class="grid grid-cols-7 gap-1.5" role="group" aria-label="Hızlı gün seçici">
            @for (day of quickDays(); track day.iso) {
              <button
                type="button"
                (click)="selectDate(day.iso)"
                [attr.aria-pressed]="schedule().date === day.iso"
                class="flex flex-col items-center rounded-xl border p-2 text-center transition"
                [class]="
                  schedule().date === day.iso
                    ? 'border-violet-500 bg-violet-600 text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-violet-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
                "
              >
                <span class="text-[10px] font-semibold uppercase opacity-80">{{
                  day.weekdayShort
                }}</span>
                <strong class="tabular mt-0.5 text-base font-extrabold">{{ day.dayNum }}</strong>
                <span
                  class="mt-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                  [class]="
                    schedule().date === day.iso
                      ? 'bg-white/20 text-white'
                      : day.count > 0
                        ? 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300'
                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                  "
                >
                  {{ day.count > 0 ? day.count + ' dolu' : 'Müsait' }}
                </span>
              </button>
            }
          </div>
        </div>

        <!-- Görsel Saat Slotu Matrisi -->
        <div>
          <div class="mb-2 flex items-center justify-between">
            <span class="odv-label !mb-0">Seans saat dilimleri (Klinik çalışma saatleri)</span>
            <span class="text-xs text-slate-500">Dolu saatler danışan adıyla işaretlidir</span>
          </div>
          <div
            class="grid grid-cols-4 gap-2 sm:grid-cols-4"
            role="group"
            aria-label="Saat dilimleri"
          >
            @for (slot of daySlots(); track slot.time) {
              <button
                type="button"
                (click)="selectTime(slot.time)"
                [attr.aria-pressed]="schedule().time === slot.time"
                class="flex flex-col items-start rounded-xl border px-3 py-2 text-start text-xs transition"
                [class]="
                  schedule().time === slot.time
                    ? 'border-violet-500 bg-violet-600 text-white shadow-sm'
                    : slot.bookedBy
                      ? 'border-amber-300 bg-amber-50/70 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-violet-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
                "
              >
                <div class="flex w-full items-center justify-between">
                  <strong class="tabular text-xs font-extrabold">{{ slot.time }}</strong>
                  <span class="material-symbols-rounded !text-sm">
                    {{
                      schedule().time === slot.time
                        ? 'check_circle'
                        : slot.bookedBy
                          ? 'event_busy'
                          : 'schedule'
                    }}
                  </span>
                </div>
                <span class="mt-0.5 w-full truncate text-[10px] opacity-85">
                  {{ slot.bookedBy ? slot.bookedBy : 'Boş slot' }}
                </span>
              </button>
            }
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <label class="block">
            <span class="odv-label">Özel tarih seçimi <b class="text-rose-500">*</b></span>
            <input class="odv-input" type="date" [formField]="sf.date" />
          </label>
          <label class="block">
            <span class="odv-label">Özel saat seçimi <b class="text-rose-500">*</b></span>
            <input class="odv-input tabular" type="time" step="900" [formField]="sf.time" />
          </label>
        </div>

        <div>
          <span class="odv-label" id="channel-label">Görüşme kanalı</span>
          <div
            class="grid grid-cols-2 gap-2 sm:grid-cols-4"
            role="group"
            aria-labelledby="channel-label"
          >
            @for (channel of channels; track channel) {
              <button
                type="button"
                class="flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-xs font-bold transition"
                [class]="
                  schedule().channel === channel
                    ? 'border-violet-400 bg-violet-50 text-violet-700 dark:border-violet-500 dark:bg-violet-950/50 dark:text-violet-200'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700'
                "
                [attr.aria-pressed]="schedule().channel === channel"
                (click)="setChannel(channel)"
              >
                <span class="material-symbols-rounded">{{ icons[channel] }}</span
                >{{ labels[channel] }}
              </button>
            }
          </div>
        </div>
        <label class="block">
          <span class="odv-label">Randevu gündemi & ön hazırlık notu</span>
          <textarea
            class="odv-input min-h-20 resize-y"
            [formField]="sf.notes"
            placeholder="InBody ölçümü, kan tahlili değerlendirmesi, yeni liste geçişi…"
          ></textarea>
        </label>
      </div>
    </app-slide-over>

    <app-slide-over
      [open]="completeOpen()"
      [dirty]="!!complete().notes || !!complete().nextAction"
      icon="task_alt"
      eyebrow="Görüşmeyi tamamla"
      [title]="completeTitle()"
      description="Uyum puanı danışanın takip listesindeki önceliğini belirler."
      submitLabel="Tamamlandı olarak kaydet"
      (closed)="qa.close()"
      (submitted)="saveComplete()"
    >
      <div class="odv-card space-y-5 p-5">
        <div>
          <span class="odv-label" id="adherence-label">Plana uyum</span>
          <div class="flex gap-2" role="group" aria-labelledby="adherence-label">
            @for (n of [1, 2, 3, 4, 5]; track n) {
              <button
                type="button"
                class="grid size-11 place-items-center rounded-xl border text-sm font-extrabold transition"
                [class]="
                  complete().adherence >= n
                    ? 'border-amber-300 bg-amber-50 text-amber-600 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                    : 'border-slate-200 text-slate-400 dark:border-slate-700'
                "
                [attr.aria-pressed]="complete().adherence === n"
                [attr.aria-label]="n + ' / 5'"
                (click)="setAdherence(n)"
              >
                <span class="material-symbols-rounded" [class.icon-fill]="complete().adherence >= n"
                  >star</span
                >
              </button>
            }
          </div>
          <span class="odv-hint">{{ adherenceText() }}</span>
        </div>
        <label class="block">
          <span class="odv-label">Görüşme notları <b class="text-rose-500">*</b></span>
          <textarea
            class="odv-input min-h-28 resize-y"
            [formField]="cf.notes"
            placeholder="Bulgular, zorlanılan noktalar, danışanın geri bildirimi"
          ></textarea>
          @if (cf.notes().touched() && cf.notes().invalid()) {
            <span class="odv-error">Kısa bir not yazın.</span>
          }
        </label>
        <label class="block">
          <span class="odv-label">Sonraki aksiyon</span>
          <input
            class="odv-input"
            [formField]="cf.nextAction"
            placeholder="Örn. akşam ara öğününü güncelle"
          />
        </label>
      </div>
    </app-slide-over>
  `,
})
export class ConsultationForm {
  readonly qa = inject(QuickActions);
  readonly store = inject(DietStore);
  private readonly notify = inject(Notify);
  readonly channels = CHANNELS;
  readonly labels = CHANNEL_LABELS;
  readonly icons = CHANNEL_ICONS;
  readonly scheduleOpen = computed(() => this.qa.state()?.kind === 'consultation');
  readonly completeOpen = computed(() => this.qa.state()?.kind === 'consultation-complete');
  readonly schedule = signal<ScheduleDraft>(this.emptySchedule());
  readonly complete = signal<CompleteDraft>({ adherence: 4, notes: '', nextAction: '' });
  readonly sf = form(this.schedule, (p) => {
    required(p.clientId);
    required(p.date);
    required(p.time);
  });
  readonly cf = form(this.complete, (p) => {
    required(p.notes);
  });

  readonly quickDays = computed(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const weekdayFmt = new Intl.DateTimeFormat('tr-TR', { weekday: 'short' });
    const all = this.store.consultations().filter((c) => c.status !== 'cancelled');
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const iso = isoDate(d);
      const count = all.filter((c) => isoDate(new Date(c.at)) === iso).length;
      return {
        iso,
        dayNum: d.getDate(),
        weekdayShort: weekdayFmt.format(d),
        count,
      };
    });
  });

  readonly daySlots = computed(() => {
    const selectedDate = this.schedule().date;
    const sameDay = this.store
      .consultations()
      .filter((c) => c.status !== 'cancelled' && isoDate(new Date(c.at)) === selectedDate);

    return CLINIC_TIME_SLOTS.map((time) => {
      const match = sameDay.find((c) => {
        const dt = new Date(c.at);
        const hh = String(dt.getHours()).padStart(2, '0');
        const mm = String(dt.getMinutes()).padStart(2, '0');
        return `${hh}:${mm}` === time;
      });
      return {
        time,
        bookedBy: match ? this.store.clientName(match.clientId) : null,
      };
    });
  });

  readonly completeTitle = computed(() => {
    const id = this.qa.state()?.consultationId;
    const item = this.store.consultations().find((c) => c.id === id);
    return item ? this.store.clientName(item.clientId) : 'Görüşme';
  });
  readonly adherenceText = computed(
    () =>
      [
        '',
        'Plana neredeyse hiç uyulmadı',
        'Uyum zayıf',
        'Kısmen uyuldu',
        'Büyük ölçüde uyuldu',
        'Tam uyum',
      ][this.complete().adherence],
  );

  constructor() {
    effect(() => {
      const state = this.qa.state();
      untracked(() => {
        if (state?.kind === 'consultation') {
          const base = this.emptySchedule();
          this.schedule.set({
            ...base,
            clientId: state.clientId ?? '',
            date: state.date ?? base.date,
            time: state.time ?? base.time,
          });
          this.sf().reset();
        } else if (state?.kind === 'consultation-complete') {
          const item = this.store.consultations().find((c) => c.id === state.consultationId);
          this.complete.set({ adherence: 4, notes: item?.notes ?? '', nextAction: '' });
          this.cf().reset();
        }
      });
    });
  }

  selectDate(date: string): void {
    this.schedule.update((v) => ({ ...v, date }));
  }

  selectTime(time: string): void {
    this.schedule.update((v) => ({ ...v, time }));
  }

  setChannel(channel: ConsultationChannel): void {
    this.schedule.update((v) => ({ ...v, channel }));
  }

  setAdherence(adherence: number): void {
    this.complete.update((v) => ({ ...v, adherence }));
  }

  saveSchedule(): void {
    void submit(this.sf, async () => {
      const v = this.schedule();
      this.store.addConsultation({
        clientId: v.clientId,
        at: new Date(`${v.date}T${v.time}`).toISOString(),
        channel: v.channel,
        status: 'scheduled',
        adherence: null,
        notes: v.notes.trim(),
        nextAction: '',
      });
      this.notify.success(
        'Görüşme planlandı',
        `${this.store.clientName(v.clientId)} · ${v.date} ${v.time}`,
      );
      this.qa.close();
    });
  }

  saveComplete(): void {
    const id = this.qa.state()?.consultationId;
    if (!id) return;
    void submit(this.cf, async () => {
      const v = this.complete();
      this.store.completeConsultation(id, v.adherence, v.notes.trim(), v.nextAction.trim());
      this.notify.success('Görüşme tamamlandı');
      this.qa.close();
    });
  }

  private emptySchedule(): ScheduleDraft {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return { clientId: '', date: isoDate(tomorrow), time: '10:00', channel: 'clinic', notes: '' };
  }
}
