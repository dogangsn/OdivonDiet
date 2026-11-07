import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ClientView, DietStore } from '../../core/data/diet-store';
import { round1 } from '../../domain/diet-calc';
import { Measurement } from '../../domain/diet.models';
import { Avatar } from '../../shared/ui/avatar';
import { EmptyState } from '../../shared/ui/empty-state';
import { PageHeader } from '../../shared/ui/page-header';
import { TrendChart } from '../../shared/ui/trend-chart';
import { QuickActions } from '../forms/quick-actions';

type Metric = 'weightKg' | 'waistCm' | 'bodyFatPct';

const METRICS: { key: Metric; label: string; unit: string }[] = [
  { key: 'weightKg', label: 'Kilo', unit: 'kg' },
  { key: 'waistCm', label: 'Bel', unit: 'cm' },
  { key: 'bodyFatPct', label: 'Yağ oranı', unit: '%' },
];

@Component({
  selector: 'app-measurements-page',
  imports: [PageHeader, Avatar, TrendChart, EmptyState, DatePipe, DecimalPipe],
  template: `
    <div class="animate-fade-up space-y-6">
      <app-page-header
        eyebrow="Danışan takibi"
        title="Ölçümler"
        description="Kilo, çevre ve vücut kompozisyonu değişimini danışan bazında izleyin."
      >
        <button
          actions
          type="button"
          class="odv-btn-primary"
          (click)="qa.open('measurement', selectedId())"
        >
          <span class="material-symbols-rounded !text-lg">add</span>Yeni ölçüm
        </button>
      </app-page-header>

      <div class="grid gap-6 lg:grid-cols-[280px_1fr]">
        <nav class="odv-card h-fit p-2" aria-label="Danışan seçimi">
          <p class="odv-eyebrow px-3 pb-1 pt-2">Danışanlar</p>
          <ul class="custom-scroll max-h-[520px] space-y-0.5 overflow-y-auto">
            @for (v of store.activeClients(); track v.client.id) {
              <li>
                <button
                  type="button"
                  class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start transition"
                  [class]="
                    v.client.id === selectedId()
                      ? 'bg-violet-50 dark:bg-violet-950/40'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  "
                  [attr.aria-current]="v.client.id === selectedId() ? 'true' : null"
                  (click)="picked.set(v.client.id)"
                >
                  <app-avatar [name]="v.fullName" size="sm" />
                  <span class="min-w-0 flex-1">
                    <strong class="block truncate text-sm">{{ v.fullName }}</strong>
                    <span class="tabular text-xs text-slate-500"
                      >{{ v.currentWeightKg | number: '1.0-1' }} kg</span
                    >
                  </span>
                  <span
                    class="tabular text-xs font-bold"
                    [class.text-emerald-600]="onTrack(v)"
                    [class.text-amber-600]="!onTrack(v)"
                  >
                    {{ v.changeKg > 0 ? '+' : '' }}{{ v.changeKg | number: '1.0-1' }}
                  </span>
                </button>
              </li>
            }
          </ul>
        </nav>

        @if (selected(); as v) {
          <div class="min-w-0 space-y-6">
            <section class="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Ölçüm özeti">
              <div class="odv-card p-4">
                <span class="odv-eyebrow">Güncel</span>
                <strong class="tabular mt-1 block text-2xl font-extrabold"
                  >{{ v.currentWeightKg | number: '1.0-1' }}
                  <small class="text-xs text-slate-400">kg</small></strong
                >
              </div>
              <div class="odv-card p-4">
                <span class="odv-eyebrow">Toplam değişim</span>
                <strong class="tabular mt-1 block text-2xl font-extrabold"
                  >{{ v.changeKg > 0 ? '+' : '' }}{{ v.changeKg | number: '1.0-1' }}
                  <small class="text-xs text-slate-400">kg</small></strong
                >
              </div>
              <div class="odv-card p-4">
                <span class="odv-eyebrow">Hedefe kalan</span>
                <strong class="tabular mt-1 block text-2xl font-extrabold"
                  >{{ toGoal() | number: '1.0-1' }}
                  <small class="text-xs text-slate-400">kg</small></strong
                >
              </div>
              <div class="odv-card p-4">
                <span class="odv-eyebrow">BKİ</span>
                <strong class="tabular mt-1 block text-2xl font-extrabold">{{
                  v.bmi | number: '1.1-1'
                }}</strong>
              </div>
            </section>

            <section class="odv-card p-5">
              <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 class="odv-section-title">{{ v.fullName }}</h2>
                  <p class="text-xs text-slate-500">{{ rows().length }} ölçüm</p>
                </div>
                <div class="odv-segment" role="group" aria-label="Gösterilen ölçü">
                  @for (m of metrics; track m.key) {
                    <button
                      type="button"
                      class="odv-segment-item"
                      [attr.aria-pressed]="metric() === m.key"
                      (click)="metric.set(m.key)"
                    >
                      {{ m.label }}
                    </button>
                  }
                </div>
              </div>
              <app-trend-chart
                [points]="points()"
                [target]="metric() === 'weightKg' ? v.client.targetWeightKg : null"
                [unit]="unit()"
              />
            </section>

            <section class="odv-card overflow-hidden">
              <div class="custom-scroll overflow-x-auto">
                <table class="w-full min-w-[640px]">
                  <thead>
                    <tr>
                      <th class="odv-th">Tarih</th>
                      <th class="odv-th">Kilo</th>
                      <th class="odv-th">Değişim</th>
                      <th class="odv-th">Bel</th>
                      <th class="odv-th">Kalça</th>
                      <th class="odv-th">Yağ %</th>
                      <th class="odv-th">Not</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of rowsDesc(); track row.m.id) {
                      <tr>
                        <td class="odv-td font-semibold">{{ row.m.date | date: 'd MMM y' }}</td>
                        <td class="odv-td tabular font-bold">
                          {{ row.m.weightKg | number: '1.0-1' }} kg
                        </td>
                        <td class="odv-td tabular text-xs font-bold">
                          @if (row.delta !== null) {
                            <span
                              [class.text-emerald-600]="row.good"
                              [class.text-amber-600]="!row.good"
                              >{{ row.delta > 0 ? '+' : '' }}{{ row.delta | number: '1.0-1' }}</span
                            >
                          } @else {
                            <span class="text-slate-400">—</span>
                          }
                        </td>
                        <td class="odv-td tabular text-slate-600 dark:text-slate-300">
                          {{ row.m.waistCm === null ? '—' : (row.m.waistCm | number: '1.0-1') }}
                        </td>
                        <td class="odv-td tabular text-slate-600 dark:text-slate-300">
                          {{ row.m.hipCm === null ? '—' : (row.m.hipCm | number: '1.0-1') }}
                        </td>
                        <td class="odv-td tabular text-slate-600 dark:text-slate-300">
                          {{
                            row.m.bodyFatPct === null ? '—' : (row.m.bodyFatPct | number: '1.0-1')
                          }}
                        </td>
                        <td class="odv-td max-w-56 truncate text-xs text-slate-500">
                          {{ row.m.note }}
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        } @else {
          <div class="odv-card">
            <app-empty-state
              icon="monitor_weight"
              title="Aktif danışan yok"
              body="Ölçüm takibi için önce danışan ekleyin."
            />
          </div>
        }
      </div>
    </div>
  `,
})
export class MeasurementsPage {
  readonly store = inject(DietStore);
  readonly qa = inject(QuickActions);
  readonly metrics = METRICS;
  readonly picked = signal<string | null>(null);
  readonly metric = signal<Metric>('weightKg');
  readonly selectedId = computed(() => this.picked() ?? this.store.activeClients()[0]?.client.id);
  readonly selected = computed(() => {
    const id = this.selectedId();
    return id ? this.store.view(id) : undefined;
  });
  readonly rows = computed(() => {
    const id = this.selectedId();
    return id ? this.store.measurementsFor(id) : [];
  });
  readonly rowsDesc = computed(() => {
    const wantsLoss = (() => {
      const v = this.selected();
      return v ? v.client.targetWeightKg < v.client.startWeightKg : true;
    })();
    const list = this.rows();
    return list
      .map((m: Measurement, i) => {
        const delta = i ? round1(m.weightKg - list[i - 1].weightKg) : null;
        return { m, delta, good: delta === null || (wantsLoss ? delta <= 0 : delta >= 0) };
      })
      .reverse();
  });
  readonly unit = computed(() => METRICS.find((m) => m.key === this.metric())!.unit);
  readonly points = computed(() => {
    const key = this.metric();
    return this.rows()
      .filter((m) => m[key] !== null)
      .map((m) => ({ date: m.date, value: m[key] as number }));
  });
  onTrack(v: ClientView): boolean {
    const wantsLoss = v.client.targetWeightKg < v.client.startWeightKg;
    return wantsLoss ? v.changeKg <= 0 : v.changeKg >= 0;
  }

  readonly toGoal = computed(() => {
    const v = this.selected();
    return v ? round1(Math.abs(v.currentWeightKg - v.client.targetWeightKg)) : 0;
  });
}
