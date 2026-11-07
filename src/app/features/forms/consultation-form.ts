import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { DietStore } from '../../core/data/diet-store';
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

@Component({
  selector: 'app-consultation-form',
  imports: [SlideOver, FormField],
  template: `
    <app-slide-over
      [open]="scheduleOpen()"
      [dirty]="!!schedule().notes"
      icon="event"
      eyebrow="Takip görüşmesi"
      title="Görüşme planla"
      submitLabel="Görüşmeyi planla"
      (closed)="qa.close()"
      (submitted)="saveSchedule()"
    >
      <div class="odv-card space-y-4 p-5">
        <label class="block">
          <span class="odv-label">Danışan <b class="text-rose-500">*</b></span>
          <select class="odv-input" [formField]="sf.clientId">
            <option value="" disabled>Danışan seçin</option>
            @for (view of store.activeClients(); track view.client.id) {
              <option [value]="view.client.id">{{ view.fullName }}</option>
            }
          </select>
          @if (sf.clientId().touched() && sf.clientId().invalid()) {
            <span class="odv-error">Danışan seçin.</span>
          }
        </label>
        <div class="grid grid-cols-2 gap-4">
          <label class="block">
            <span class="odv-label">Tarih <b class="text-rose-500">*</b></span>
            <input class="odv-input" type="date" [formField]="sf.date" />
          </label>
          <label class="block">
            <span class="odv-label">Saat <b class="text-rose-500">*</b></span>
            <input class="odv-input" type="time" step="900" [formField]="sf.time" />
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
          <span class="odv-label">Gündem</span>
          <textarea
            class="odv-input min-h-20 resize-y"
            [formField]="sf.notes"
            placeholder="Bu görüşmede konuşulacaklar"
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
          this.schedule.set({ ...this.emptySchedule(), clientId: state.clientId ?? '' });
          this.sf().reset();
        } else if (state?.kind === 'consultation-complete') {
          const item = this.store.consultations().find((c) => c.id === state.consultationId);
          this.complete.set({ adherence: 4, notes: item?.notes ?? '', nextAction: '' });
          this.cf().reset();
        }
      });
    });
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
      this.qa.close();
    });
  }

  saveComplete(): void {
    const id = this.qa.state()?.consultationId;
    if (!id) return;
    void submit(this.cf, async () => {
      const v = this.complete();
      this.store.completeConsultation(id, v.adherence, v.notes.trim(), v.nextAction.trim());
      this.qa.close();
    });
  }

  private emptySchedule(): ScheduleDraft {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return { clientId: '', date: isoDate(tomorrow), time: '10:00', channel: 'clinic', notes: '' };
  }
}
