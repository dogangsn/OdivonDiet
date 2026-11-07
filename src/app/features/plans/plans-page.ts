import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { DietStore } from '../../core/data/diet-store';
import { daysBetween } from '../../domain/diet-calc';
import { MealPlan, PLAN_STATUS_LABELS, PlanStatus } from '../../domain/diet.models';
import { Avatar } from '../../shared/ui/avatar';
import { EmptyState } from '../../shared/ui/empty-state';
import { KpiCard } from '../../shared/ui/kpi-card';
import { MacroBar } from '../../shared/ui/macro-bar';
import { PageHeader } from '../../shared/ui/page-header';
import { QuickActions } from '../forms/quick-actions';

const STATUS_TONE: Record<PlanStatus, string> = {
  active: 'odv-tone-positive',
  draft: 'odv-tone-neutral',
  completed: 'odv-tone-info',
};

@Component({
  selector: 'app-plans-page',
  imports: [PageHeader, Avatar, MacroBar, EmptyState, KpiCard, DatePipe],
  template: `
    <div class="animate-fade-up space-y-6">
      <app-page-header
        eyebrow="Danışan takibi"
        title="Beslenme planları"
        description="Enerji hedefi, makro dağılımı ve öğün düzeni danışana özel hazırlanır."
      >
        <button actions type="button" class="odv-btn-primary" (click)="qa.open('plan')">
          <span class="material-symbols-rounded !text-lg">add</span>Yeni plan
        </button>
      </app-page-header>

      <section class="grid gap-4 sm:grid-cols-3" aria-label="Plan özeti">
        <app-kpi-card
          label="Aktif plan"
          [value]="count('active')"
          icon="restaurant_menu"
          tone="positive"
          [hint]="withoutPlan() + ' aktif danışanın planı yok'"
        />
        <app-kpi-card
          label="Taslak"
          [value]="count('draft')"
          icon="edit_note"
          tone="neutral"
          hint="Onay ve aktivasyon bekliyor"
        />
        <app-kpi-card
          label="Bu hafta bitecek"
          [value]="endingSoon()"
          icon="hourglass_bottom"
          tone="warning"
          hint="Yenilenmesi gereken planlar"
        />
      </section>

      <section class="odv-card overflow-hidden">
        <div
          class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 dark:border-slate-800"
        >
          <div class="odv-segment" role="group" aria-label="Plan durumu">
            @for (option of filters; track option.value) {
              <button
                type="button"
                class="odv-segment-item"
                [attr.aria-pressed]="filter() === option.value"
                (click)="filter.set(option.value)"
              >
                {{ option.label }}
              </button>
            }
          </div>
          <span class="text-xs text-slate-500">{{ rows().length }} plan</span>
        </div>
        @if (rows().length) {
          <div class="custom-scroll overflow-x-auto">
            <table class="w-full min-w-[820px]">
              <thead>
                <tr>
                  <th class="odv-th">Danışan / plan</th>
                  <th class="odv-th">Enerji</th>
                  <th class="odv-th w-56">Makrolar (P / K / Y)</th>
                  <th class="odv-th">Dönem</th>
                  <th class="odv-th">Durum</th>
                  <th class="odv-th"><span class="sr-only">İşlem</span></th>
                </tr>
              </thead>
              <tbody>
                @for (plan of rows(); track plan.id) {
                  <tr class="transition hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td class="odv-td">
                      <button
                        type="button"
                        class="flex items-center gap-3 text-start"
                        (click)="qa.open('client-detail', plan.clientId)"
                      >
                        <app-avatar [name]="store.clientName(plan.clientId)" size="sm" />
                        <span>
                          <strong class="block text-sm">{{
                            store.clientName(plan.clientId)
                          }}</strong>
                          <span class="text-xs text-slate-500">{{ plan.title }}</span>
                        </span>
                      </button>
                    </td>
                    <td class="odv-td">
                      <strong class="tabular">{{ plan.kcal }}</strong>
                      <span class="text-xs text-slate-400">kcal</span>
                    </td>
                    <td class="odv-td">
                      <app-macro-bar
                        [protein]="plan.proteinPct"
                        [carb]="plan.carbPct"
                        [fat]="plan.fatPct"
                      />
                      <span class="tabular mt-1 block text-[11px] text-slate-500"
                        >%{{ plan.proteinPct }} / %{{ plan.carbPct }} / %{{ plan.fatPct }} ·
                        {{ plan.meals.length }} öğün</span
                      >
                    </td>
                    <td class="odv-td text-xs">
                      <span class="block font-semibold"
                        >{{ plan.startDate | date: 'd MMM' }} –
                        {{ plan.endDate | date: 'd MMM' }}</span
                      >
                      <span class="text-slate-500">{{ remaining(plan) }}</span>
                    </td>
                    <td class="odv-td">
                      <span class="odv-badge" [class]="tone[plan.status]">{{
                        labels[plan.status]
                      }}</span>
                    </td>
                    <td class="odv-td text-end">
                      @if (plan.status === 'draft') {
                        <button
                          type="button"
                          class="odv-btn-soft"
                          (click)="store.setPlanStatus(plan.id, 'active')"
                        >
                          Aktifleştir
                        </button>
                      } @else if (plan.status === 'active') {
                        <button
                          type="button"
                          class="odv-btn-ghost !min-h-9 text-xs"
                          (click)="store.setPlanStatus(plan.id, 'completed')"
                        >
                          Tamamla
                        </button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <app-empty-state
            icon="restaurant_menu"
            title="Bu filtrede plan yok"
            body="Yeni bir beslenme planı oluşturun."
          />
        }
      </section>
    </div>
  `,
})
export class PlansPage {
  readonly store = inject(DietStore);
  readonly qa = inject(QuickActions);
  readonly labels = PLAN_STATUS_LABELS;
  readonly tone = STATUS_TONE;
  readonly filters: { value: PlanStatus | 'all'; label: string }[] = [
    { value: 'active', label: 'Aktif' },
    { value: 'draft', label: 'Taslak' },
    { value: 'completed', label: 'Tamamlanan' },
    { value: 'all', label: 'Tümü' },
  ];
  readonly filter = signal<PlanStatus | 'all'>('active');
  readonly rows = computed(() =>
    this.store
      .plans()
      .filter((p) => this.filter() === 'all' || p.status === this.filter())
      .sort((a, b) => b.startDate.localeCompare(a.startDate)),
  );
  readonly withoutPlan = computed(
    () => this.store.activeClients().filter((v) => !v.activePlan).length,
  );
  readonly endingSoon = computed(
    () =>
      this.store.plans().filter((p) => {
        if (p.status !== 'active') return false;
        const left = daysBetween(new Date(), p.endDate);
        return left >= 0 && left <= 7;
      }).length,
  );

  count(status: PlanStatus): number {
    return this.store.plans().filter((p) => p.status === status).length;
  }

  remaining(plan: MealPlan): string {
    const left = daysBetween(new Date(), plan.endDate);
    if (plan.status === 'completed') return 'Sona erdi';
    if (left < 0) return `${-left} gün önce bitti`;
    if (left === 0) return 'Bugün bitiyor';
    return `${left} gün kaldı`;
  }
}
