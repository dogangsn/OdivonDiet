import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormField, form, max, min, required, submit } from '@angular/forms/signals';
import { DietStore } from '../../core/data/diet-store';
import { isoDate, round1 } from '../../domain/diet-calc';
import { SlideOver } from '../../shared/ui/slide-over';
import { QuickActions } from './quick-actions';
import { Notify } from '../../core/notify/notify';

interface MeasurementDraft {
  clientId: string;
  date: string;
  weightKg: number | null;
  waistCm: number | null;
  hipCm: number | null;
  bodyFatPct: number | null;
  muscleMassKg: number | null;
  visceralFatRating: number | null;
  bodyWaterPct: number | null;
  ecwTbwRatio: number | null;
  metabolicAge: number | null;
  phaseAngleDeg: number | null;
  neckCm: number | null;
  note: string;
}

@Component({
  selector: 'app-measurement-form',
  imports: [SlideOver, FormField],
  template: `
    <app-slide-over
      [open]="open()"
      [dirty]="model().weightKg !== null || !!model().note"
      icon="monitor_weight"
      eyebrow="Ölçüm"
      title="Yeni ölçüm ekle"
      description="Kilo ve çevre ölçümleri ilerleme grafiğine otomatik eklenir."
      submitLabel="Ölçümü kaydet"
      (closed)="qa.close()"
      (submitted)="save()"
    >
      <div class="odv-card space-y-4 p-5">
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="block">
            <span class="odv-label">Danışan <b class="text-rose-500">*</b></span>
            <select class="odv-input" [formField]="f.clientId">
              <option value="" disabled>Danışan seçin</option>
              @for (view of store.activeClients(); track view.client.id) {
                <option [value]="view.client.id">{{ view.fullName }}</option>
              }
            </select>
            @if (f.clientId().touched() && f.clientId().invalid()) {
              <span class="odv-error">Danışan seçin.</span>
            }
          </label>
          <label class="block">
            <span class="odv-label">Tarih <b class="text-rose-500">*</b></span>
            <input class="odv-input" type="date" [formField]="f.date" />
          </label>
        </div>
        <label class="block">
          <span class="odv-label">Kilo (kg) <b class="text-rose-500">*</b></span>
          <input
            class="odv-input tabular !text-lg !font-bold"
            type="number"
            step="0.1"
            [formField]="f.weightKg"
            placeholder="0,0"
          />
          @if (f.weightKg().touched() && f.weightKg().invalid()) {
            <span class="odv-error">30–300 kg arası bir değer girin.</span>
          }
          @if (delta(); as d) {
            <span
              class="mt-2 inline-flex items-center gap-1 text-xs font-semibold"
              [class.text-emerald-600]="d.good"
              [class.text-amber-600]="!d.good"
            >
              <span class="material-symbols-rounded !text-base">{{
                d.value < 0 ? 'south' : 'north'
              }}</span>
              Son ölçüme göre {{ d.value > 0 ? '+' : '' }}{{ d.value }} kg ({{ d.previous }} kg)
            </span>
          }
        </label>
        <div class="grid gap-4 sm:grid-cols-3">
          <label class="block">
            <span class="odv-label">Bel (cm)</span>
            <input class="odv-input tabular" type="number" step="0.1" [formField]="f.waistCm" />
          </label>
          <label class="block">
            <span class="odv-label">Kalça (cm)</span>
            <input class="odv-input tabular" type="number" step="0.1" [formField]="f.hipCm" />
          </label>
          <label class="block">
            <span class="odv-label">Yağ oranı (%)</span>
            <input class="odv-input tabular" type="number" step="0.1" [formField]="f.bodyFatPct" />
          </label>
        </div>

        <div class="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/50">
          <span class="odv-eyebrow">InBody / Tanita Segmental BIA & Antropometri</span>
          <div class="mt-3 grid gap-3 sm:grid-cols-3">
            <label class="block">
              <span class="odv-label">İskelet Kası SMM (kg)</span>
              <input class="odv-input tabular" type="number" step="0.1" [formField]="f.muscleMassKg" placeholder="28,4" />
            </label>
            <label class="block">
              <span class="odv-label">Visseral Yağ (1–20)</span>
              <input class="odv-input tabular" type="number" step="1" [formField]="f.visceralFatRating" placeholder="8" />
            </label>
            <label class="block">
              <span class="odv-label">Vücut Suyu TBW (%)</span>
              <input class="odv-input tabular" type="number" step="0.1" [formField]="f.bodyWaterPct" placeholder="54,2" />
            </label>
            <label class="block">
              <span class="odv-label">ECW/TBW Ödem Oranı</span>
              <input class="odv-input tabular" type="number" step="0.001" [formField]="f.ecwTbwRatio" placeholder="0,380" />
            </label>
            <label class="block">
              <span class="odv-label">Faz Açısı (°)</span>
              <input class="odv-input tabular" type="number" step="0.1" [formField]="f.phaseAngleDeg" placeholder="6,1" />
            </label>
            <label class="block">
              <span class="odv-label">Boyun Çevresi (cm)</span>
              <input class="odv-input tabular" type="number" step="0.1" [formField]="f.neckCm" placeholder="34,5" />
            </label>
          </div>
        </div>
        <label class="block">
          <span class="odv-label">Not</span>
          <textarea
            class="odv-input min-h-20 resize-y"
            [formField]="f.note"
            placeholder="Ölçüm koşulu (açlık, BIA cihazı vb.)"
          ></textarea>
        </label>
      </div>
    </app-slide-over>
  `,
})
export class MeasurementForm {
  readonly qa = inject(QuickActions);
  readonly store = inject(DietStore);
  private readonly notify = inject(Notify);
  readonly open = computed(() => this.qa.state()?.kind === 'measurement');
  readonly model = signal<MeasurementDraft>(this.empty());
  readonly f = form(this.model, (p) => {
    required(p.clientId);
    required(p.date);
    required(p.weightKg);
    min(p.weightKg, 30);
    max(p.weightKg, 300);
    min(p.waistCm, 35);
    max(p.waistCm, 250);
    min(p.hipCm, 40);
    max(p.hipCm, 250);
    min(p.bodyFatPct, 2);
    max(p.bodyFatPct, 70);
    min(p.muscleMassKg, 10);
    max(p.muscleMassKg, 120);
    min(p.visceralFatRating, 1);
    max(p.visceralFatRating, 30);
    min(p.bodyWaterPct, 25);
    max(p.bodyWaterPct, 85);
    min(p.ecwTbwRatio, 0.3);
    max(p.ecwTbwRatio, 0.5);
    min(p.phaseAngleDeg, 2);
    max(p.phaseAngleDeg, 15);
    min(p.neckCm, 20);
    max(p.neckCm, 70);
  });
  readonly delta = computed(() => {
    const v = this.model();
    if (!v.clientId || !v.weightKg) return null;
    const view = this.store.view(v.clientId);
    const previous = view?.lastMeasurement?.weightKg;
    if (!view || previous === undefined) return null;
    const value = round1(v.weightKg - previous);
    const wantsLoss = view.client.targetWeightKg < view.client.startWeightKg;
    return { value, previous, good: wantsLoss ? value <= 0 : value >= 0 };
  });

  constructor() {
    effect(() => {
      if (!this.open()) return;
      const clientId = this.qa.state()?.clientId;
      untracked(() => {
        this.model.set({ ...this.empty(), clientId: clientId ?? '' });
        this.f().reset();
      });
    });
  }

  save(): void {
    void submit(this.f, async () => {
      const v = this.model();
      this.store.addMeasurement({
        clientId: v.clientId,
        date: v.date,
        weightKg: v.weightKg!,
        waistCm: v.waistCm,
        hipCm: v.hipCm,
        bodyFatPct: v.bodyFatPct,
        muscleMassKg: v.muscleMassKg,
        visceralFatRating: v.visceralFatRating,
        bodyWaterPct: v.bodyWaterPct,
        ecwTbwRatio: v.ecwTbwRatio,
        metabolicAge: v.metabolicAge,
        phaseAngleDeg: v.phaseAngleDeg,
        neckCm: v.neckCm,
        note: v.note.trim(),
      });
      this.notify.success('Ölçüm kaydedildi', `${this.store.clientName(v.clientId)} · ${v.weightKg} kg`);
      this.qa.close();
    });
  }

  private empty(): MeasurementDraft {
    return {
      clientId: '',
      date: isoDate(new Date()),
      weightKg: null,
      waistCm: null,
      hipCm: null,
      bodyFatPct: null,
      muscleMassKg: null,
      visceralFatRating: null,
      bodyWaterPct: null,
      ecwTbwRatio: null,
      metabolicAge: null,
      phaseAngleDeg: null,
      neckCm: null,
      note: '',
    };
  }
}
