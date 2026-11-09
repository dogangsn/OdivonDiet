import { DecimalPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { DietStore } from '../../core/data/diet-store';
import { round1 } from '../../domain/diet-calc';
import { PROGRAM_LABELS } from '../../domain/diet.models';
import { Avatar } from '../../shared/ui/avatar';
import { KpiCard } from '../../shared/ui/kpi-card';
import { PageHeader } from '../../shared/ui/page-header';
import { ProgressBar } from '../../shared/ui/progress-bar';
import { QuickActions } from '../forms/quick-actions';

@Component({
  selector: 'app-reports-page',
  imports: [PageHeader, KpiCard, Avatar, ProgressBar, DecimalPipe],
  template: `
    <div class="animate-fade-up space-y-6">
      <app-page-header
        eyebrow="Analiz"
        title="İlerleme raporları"
        description="Danışanlarınızın başlangıçtan bugüne değişimi ve plana uyumu."
      >
        <button actions type="button" class="odv-btn-secondary" (click)="print()">
          <span class="material-symbols-rounded !text-lg">print</span>Yazdır / PDF
        </button>
      </app-page-header>

      <section class="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4" aria-label="Rapor özeti">
        <app-kpi-card
          label="Toplam değişim"
          [value]="totals().change"
          unit="kg"
          icon="scale"
          tone="positive"
          hint="Aktif danışanların toplamı"
        />
        <app-kpi-card
          label="Ort. hedef ilerlemesi"
          [value]="'%' + totals().progress"
          icon="flag"
          tone="primary"
        />
        <app-kpi-card
          label="Ort. plan uyumu"
          [value]="totals().adherence"
          unit="/ 5"
          icon="star"
          tone="warning"
        />
        <app-kpi-card
          label="Tamamlanan görüşme"
          [value]="totals().done"
          icon="task_alt"
          tone="info"
        />
      </section>

      <section class="odv-card overflow-hidden">
        <header class="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <h2 class="odv-section-title">Danışan bazında sonuçlar</h2>
        </header>
        <div class="custom-scroll overflow-x-auto">
          <table class="w-full min-w-[860px]">
            <thead>
              <tr>
                <th class="odv-th">Danışan</th>
                <th class="odv-th">Program</th>
                <th class="odv-th">Başlangıç → Güncel</th>
                <th class="odv-th">Değişim</th>
                <th class="odv-th w-48">Hedef</th>
                <th class="odv-th">Uyum</th>
                <th class="odv-th">Görüşme</th>
              </tr>
            </thead>
            <tbody>
              @for (row of rows(); track row.v.client.id) {
                <tr
                  class="cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                  (click)="qa.open('client-detail', row.v.client.id)"
                >
                  <td class="odv-td">
                    <div class="flex items-center gap-3">
                      <app-avatar [name]="row.v.fullName" size="sm" />
                      <strong class="text-sm">{{ row.v.fullName }}</strong>
                    </div>
                  </td>
                  <td class="odv-td text-xs text-slate-500">
                    {{ programLabels[row.v.client.program] }}
                  </td>
                  <td class="odv-td tabular text-sm">
                    {{ row.v.client.startWeightKg | number: '1.0-1' }} →
                    <b>{{ row.v.currentWeightKg | number: '1.0-1' }}</b> kg
                  </td>
                  <td
                    class="odv-td tabular text-sm font-bold"
                    [class.text-emerald-600]="row.good"
                    [class.text-amber-600]="!row.good"
                  >
                    {{ row.v.changeKg > 0 ? '+' : '' }}{{ row.v.changeKg | number: '1.0-1' }} kg
                  </td>
                  <td class="odv-td">
                    <div class="flex items-center gap-2">
                      <app-progress-bar
                        class="flex-1"
                        [value]="row.v.progress"
                        [label]="row.v.fullName + ' hedef ilerlemesi'"
                      />
                      <span class="tabular w-9 text-end text-xs font-bold"
                        >%{{ row.v.progress }}</span
                      >
                    </div>
                  </td>
                  <td class="odv-td tabular text-sm">
                    {{
                      row.v.avgAdherence === null
                        ? '—'
                        : (row.v.avgAdherence | number: '1.1-1') + ' / 5'
                    }}
                  </td>
                  <td class="odv-td tabular text-sm">{{ row.done }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `,
})
export class ReportsPage {
  readonly store = inject(DietStore);
  readonly qa = inject(QuickActions);
  readonly programLabels = PROGRAM_LABELS;
  readonly rows = computed(() =>
    this.store
      .activeClients()
      .map((v) => {
        const wantsLoss = v.client.targetWeightKg < v.client.startWeightKg;
        return {
          v,
          good: wantsLoss ? v.changeKg <= 0 : v.changeKg >= 0,
          done: this.store
            .consultations()
            .filter((c) => c.clientId === v.client.id && c.status === 'done').length,
        };
      })
      .sort((a, b) => b.v.progress - a.v.progress),
  );
  readonly totals = computed(() => {
    const rows = this.rows();
    const rated = rows.filter((r) => r.v.avgAdherence !== null);
    return {
      change: round1(rows.reduce((s, r) => s + r.v.changeKg, 0)).toLocaleString('tr-TR'),
      progress: rows.length
        ? Math.round(rows.reduce((s, r) => s + r.v.progress, 0) / rows.length)
        : 0,
      adherence: rated.length
        ? round1(
            rated.reduce((s, r) => s + (r.v.avgAdherence ?? 0), 0) / rated.length,
          ).toLocaleString('tr-TR')
        : '—',
      done: rows.reduce((s, r) => s + r.done, 0),
    };
  });

  print(): void {
    window.print();
  }
}
