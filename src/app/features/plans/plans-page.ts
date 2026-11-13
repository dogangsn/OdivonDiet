import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DietStore } from '../../core/data/diet-store';
import { Notify } from '../../core/notify/notify';
import {
  analyzeChronoNutrition,
  buildGroceryList,
  daysBetween,
  isoDate,
  round1,
  summarizeMeals,
} from '../../domain/diet-calc';
import {
  EXCHANGE_GROUP_LABELS,
  ExchangeGroup,
  MealFoodItem,
  MealPlan,
  PLAN_STATUS_LABELS,
  PlanStatus,
} from '../../domain/diet.models';
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
  imports: [PageHeader, Avatar, MacroBar, EmptyState, KpiCard, DatePipe, DecimalPipe, RouterLink],
  template: `
    <div class="animate-fade-up space-y-6">
      <app-page-header
        eyebrow="Danışan takibi & menü mühendisliği"
        title="Beslenme planları ve kalori analizi"
        description="Enerji hedefi, makro dağılımı (g ve g/kg), BeBis değişim listeleri ve öğün bazlı yemek/ürün içerikleri."
      >
        <div actions class="flex flex-wrap items-center gap-2">
          <a routerLink="/clinical-lab" class="odv-btn-ghost">
            <span class="material-symbols-rounded !text-lg">biotech</span>Klinik & İlaç-Besin Analizi
          </a>
          <a routerLink="/foods" class="odv-btn-soft">
            <span class="material-symbols-rounded !text-lg">grocery</span>Besin & yemek kütüphanesi
          </a>
          <button type="button" class="odv-btn-primary" (click)="qa.open('plan')">
            <span class="material-symbols-rounded !text-lg">add</span>Yeni diyet programı
          </button>
        </div>
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
                  <th class="odv-th">Hedef / Menü Enerji</th>
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
                      <span class="text-xs text-slate-400">kcal hedef</span>
                      @if (planSummary(plan).itemCount > 0) {
                        <span class="tabular block text-[11px] text-emerald-600">
                          Menü: {{ planSummary(plan).kcal }} kcal · Lif
                          {{ planSummary(plan).fiberG }}g
                        </span>
                      }
                    </td>
                    <td class="odv-td">
                      <app-macro-bar
                        [protein]="plan.proteinPct"
                        [carb]="plan.carbPct"
                        [fat]="plan.fatPct"
                      />
                      <span class="tabular mt-1 block text-[11px] text-slate-500"
                        >%{{ plan.proteinPct }} / %{{ plan.carbPct }} / %{{ plan.fatPct }} ·
                        {{ plan.meals.length }} öğün ({{ planSummary(plan).itemCount }} besin)</span
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
                      <div class="inline-flex flex-wrap items-center justify-end gap-1.5">
                        <button
                          type="button"
                          class="odv-btn-ghost !min-h-8 !px-2.5 text-xs"
                          (click)="toggleInspect(plan.id)"
                          [attr.aria-expanded]="inspectedPlanId() === plan.id"
                        >
                          <span class="material-symbols-rounded !text-base">
                            {{ inspectedPlanId() === plan.id ? 'expand_less' : 'visibility' }}
                          </span>
                          {{ inspectedPlanId() === plan.id ? 'Menüyü gizle' : 'Menü & kalori analizi' }}
                        </button>
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
                      </div>
                    </td>
                  </tr>

                  @if (inspectedPlanId() === plan.id) {
                    <tr>
                      <td colspan="6" class="bg-slate-50/80 p-5 dark:bg-slate-900/60">
                        <div class="space-y-4">
                          <div class="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <h3 class="text-sm font-bold">
                                {{ store.clientName(plan.clientId) }} — {{ plan.title }} (Öğün &
                                Kalori Hesaplama Tablosu)
                              </h3>
                              @if (plan.notes) {
                                <p class="mt-0.5 text-xs text-slate-500">{{ plan.notes }}</p>
                              }
                            </div>
                            <div class="flex flex-wrap items-center gap-2 text-xs">
                              <span class="odv-badge odv-tone-primary">
                                Hedef: {{ plan.kcal }} kcal
                              </span>
                              <span class="odv-badge odv-tone-positive">
                                Hesaplanan Menü: {{ planSummary(plan).kcal }} kcal
                              </span>
                              <span class="odv-badge odv-tone-info">
                                Protein: {{ planSummary(plan).proteinG }} g ({{
                                  clientPerKg(plan.clientId, planSummary(plan).proteinG)
                                }}
                                g/kg)
                              </span>
                              <span class="odv-badge odv-tone-neutral">
                                Karb: {{ planSummary(plan).carbG }} g · Yağ:
                                {{ planSummary(plan).fatG }} g · Lif:
                                {{ planSummary(plan).fiberG }} g
                              </span>
                              <span class="odv-badge odv-tone-primary">
                                Sirkadiyen Açlık: {{ chronoFor(plan).fastingWindowHours }}s ({{
                                  chronoFor(plan).firstMealTime
                                }}–{{ chronoFor(plan).lastMealTime }})
                              </span>
                            </div>
                          </div>

                          <!-- Hızlı Aksiyon Barı: WhatsApp Özeti, PDF Yazdır ve Başka Danışana Kopyala/Ölçekle -->
                          <div
                            class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
                          >
                            <div class="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                class="odv-btn-soft !min-h-8 !px-3 text-xs font-bold"
                                (click)="copyWhatsAppSummary(plan)"
                              >
                                <span class="material-symbols-rounded !text-base" aria-hidden="true"
                                  >share</span
                                >
                                WhatsApp Reçete Özeti Kopyala
                              </button>
                              <button
                                type="button"
                                class="odv-btn-ghost !min-h-8 !px-3 text-xs"
                                (click)="printPlan()"
                              >
                                <span class="material-symbols-rounded !text-base" aria-hidden="true"
                                  >print</span
                                >
                                Reçete PDF / Yazdır
                              </button>
                            </div>

                            <div class="flex flex-wrap items-center gap-2">
                              <label class="sr-only" [attr.for]="'clone-client-' + plan.id"
                                >Hedef danışan seçin</label
                              >
                              <select
                                [id]="'clone-client-' + plan.id"
                                class="odv-input !w-auto !py-1.5 text-xs"
                                [value]="cloneTargetClientId()"
                                (change)="onCloneClientChange($any($event.target).value)"
                              >
                                <option value="">Başka danışana kopyala & ölçekle…</option>
                                @for (c of store.activeClients(); track c.client.id) {
                                  <option [value]="c.client.id">
                                    {{ c.fullName }} (TDEE {{ c.tdee }} kcal)
                                  </option>
                                }
                              </select>
                              @if (cloneTargetClientId()) {
                                <label class="sr-only" [attr.for]="'clone-kcal-' + plan.id"
                                  >Hedef kalori</label
                                >
                                <input
                                  [id]="'clone-kcal-' + plan.id"
                                  type="number"
                                  step="50"
                                  min="1000"
                                  max="4500"
                                  class="odv-input !w-24 !py-1.5 text-xs tabular"
                                  [value]="cloneTargetKcal()"
                                  (input)="cloneTargetKcal.set(+$any($event.target).value || plan.kcal)"
                                />
                                <button
                                  type="button"
                                  class="odv-btn-primary !min-h-8 !px-3 text-xs"
                                  (click)="cloneAndScalePlan(plan)"
                                >
                                  <span class="material-symbols-rounded !text-base" aria-hidden="true"
                                    >content_copy</span
                                  >
                                  Gramajları Ölçekle & Kaydet
                                </button>
                              }
                            </div>
                          </div>

                          @if (exchangeBadges(plan).length) {
                            <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
                              <div class="flex flex-wrap items-center gap-1.5">
                                <span class="font-semibold text-slate-500"
                                  >Günlük BeBis Değişim Özeti:</span
                                >
                                @for (ex of exchangeBadges(plan); track ex.key) {
                                  <span class="odv-badge odv-tone-neutral">
                                    {{ ex.label }}: {{ ex.count }} porsiyon
                                  </span>
                                }
                              </div>
                              <button
                                type="button"
                                class="odv-btn-soft !min-h-8 !px-3 text-xs"
                                (click)="showGrocery.update((x) => !x)"
                              >
                                <span class="material-symbols-rounded !text-base">shopping_cart</span>
                                {{
                                  showGrocery()
                                    ? 'Alışveriş Listesini Gizle'
                                    : '7 Günlük Akıllı Alışveriş & Prep Listesi'
                                }}
                              </button>
                            </div>
                          }

                          @if (showGrocery()) {
                            <div
                              class="rounded-2xl border border-violet-200 bg-white p-4 dark:border-violet-900/40 dark:bg-slate-900"
                            >
                              <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <span class="odv-eyebrow">Otomatik Mutfak & Market Hesabı</span>
                                  <h4 class="text-sm font-extrabold">
                                    {{ groceryDays() }} Günlük Toplam Gramaj & Alışveriş Listesi
                                  </h4>
                                </div>
                                <div class="odv-segment" role="group" aria-label="Alışveriş listesi gün sayısı">
                                  @for (d of [1, 3, 7, 14]; track d) {
                                    <button
                                      type="button"
                                      class="odv-segment-item !px-2.5 !py-1 text-xs"
                                      [attr.aria-pressed]="groceryDays() === d"
                                      (click)="groceryDays.set(d)"
                                    >
                                      {{ d }} Gün
                                    </button>
                                  }
                                </div>
                              </div>
                              <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                @for (g of groceryListFor(plan); track g.foodId) {
                                  <div
                                    class="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs dark:bg-slate-800/60"
                                  >
                                    <div>
                                      <strong class="block text-slate-800 dark:text-white">{{
                                        g.name
                                      }}</strong>
                                      <span class="text-[11px] text-slate-500"
                                        >{{ g.totalPortions }} × {{ g.unit }}</span
                                      >
                                    </div>
                                    <span class="tabular font-extrabold text-violet-600">
                                      {{
                                        g.totalGrams >= 1000
                                          ? (g.totalGrams / 1000 | number: '1.1-2') + ' kg'
                                          : g.totalGrams + ' g'
                                      }}
                                    </span>
                                  </div>
                                }
                              </div>
                            </div>
                          }

                          <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            @for (meal of plan.meals; track $index) {
                              <div
                                class="rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900"
                              >
                                <div
                                  class="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800"
                                >
                                  <div>
                                    <span class="tabular text-xs font-bold text-violet-600">{{
                                      meal.time
                                    }}</span>
                                    <strong class="ms-1.5 text-sm">{{ meal.name }}</strong>
                                  </div>
                                  <span class="tabular text-xs font-extrabold"
                                    >{{ meal.kcal }} kcal</span
                                  >
                                </div>

                                @if (meal.items && meal.items.length) {
                                  <ul class="mt-2.5 space-y-1.5 text-xs">
                                    @for (item of meal.items; track $index) {
                                      <li class="flex items-start justify-between gap-2">
                                        <div>
                                          <span class="font-medium text-slate-800 dark:text-slate-100">
                                            {{ item.name }}
                                          </span>
                                          <span class="block text-[11px] text-slate-500">
                                            {{ item.portions }} × {{ item.unit }} ({{ item.grams }}
                                            g)
                                            @if (autoExchangeHint(item); as altText) {
                                              <em class="text-violet-600 dark:text-violet-300">
                                                · veya {{ altText }}
                                              </em>
                                            }
                                          </span>
                                        </div>
                                        <span class="tabular shrink-0 font-semibold text-slate-600 dark:text-slate-300">
                                          {{ item.kcal }} kcal
                                        </span>
                                      </li>
                                    }
                                  </ul>
                                  <div
                                    class="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-500 dark:border-slate-800"
                                  >
                                    <span
                                      >P: {{ meal.proteinG ?? 0 | number: '1.0-1' }}g · K:
                                      {{ meal.carbG ?? 0 | number: '1.0-1' }}g · Y:
                                      {{ meal.fatG ?? 0 | number: '1.0-1' }}g</span
                                    >
                                    <span>Lif: {{ meal.fiberG ?? 0 | number: '1.0-1' }}g</span>
                                  </div>
                                } @else {
                                  <p class="mt-2 text-xs text-slate-400">
                                    Hedef öğün enerjisi: {{ meal.kcal }} kcal
                                  </p>
                                }
                              </div>
                            }
                          </div>
                        </div>
                      </td>
                    </tr>
                  }
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
  private readonly notify = inject(Notify);
  readonly labels = PLAN_STATUS_LABELS;
  readonly tone = STATUS_TONE;
  readonly filters: { value: PlanStatus | 'all'; label: string }[] = [
    { value: 'active', label: 'Aktif' },
    { value: 'draft', label: 'Taslak' },
    { value: 'completed', label: 'Tamamlanan' },
    { value: 'all', label: 'Tümü' },
  ];
  readonly filter = signal<PlanStatus | 'all'>('active');
  readonly inspectedPlanId = signal<string | null>('p-1');
  readonly showGrocery = signal(false);
  readonly groceryDays = signal(7);
  readonly cloneTargetClientId = signal('');
  readonly cloneTargetKcal = signal(1600);

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

  toggleInspect(planId: string): void {
    this.inspectedPlanId.update((cur) => (cur === planId ? null : planId));
  }

  planSummary(plan: MealPlan) {
    return summarizeMeals(plan.meals);
  }

  chronoFor(plan: MealPlan) {
    return analyzeChronoNutrition(plan.meals);
  }

  groceryListFor(plan: MealPlan) {
    return buildGroceryList(plan.meals, this.groceryDays());
  }

  clientPerKg(clientId: string, grams: number): number {
    const w = this.store.view(clientId)?.currentWeightKg ?? 70;
    return w > 0 ? round1(grams / w) : 0;
  }

  exchangeBadges(plan: MealPlan) {
    const counts = summarizeMeals(plan.meals).exchangeCounts;
    return (Object.entries(EXCHANGE_GROUP_LABELS) as [ExchangeGroup, string][])
      .map(([key, label]) => ({ key, label, count: round1(counts[key] ?? 0) }))
      .filter((x) => x.count > 0);
  }

  remaining(plan: MealPlan): string {
    const left = daysBetween(new Date(), plan.endDate);
    if (plan.status === 'completed') return 'Sona erdi';
    if (left < 0) return `${-left} gün önce bitti`;
    if (left === 0) return 'Bugün bitiyor';
    return `${left} gün kaldı`;
  }

  autoExchangeHint(item: MealFoodItem): string | null {
    if (item.alternative) return item.alternative;
    const match = this.store
      .foods()
      .find((f) => f.exchange === item.exchange && f.id !== item.foodId && f.name !== item.name);
    return match ? `${item.portions} × ${match.unit} ${match.name}` : null;
  }

  onCloneClientChange(clientId: string): void {
    this.cloneTargetClientId.set(clientId);
    const view = this.store.view(clientId);
    if (view) {
      this.cloneTargetKcal.set(Math.max(1200, Math.round((view.tdee - 350) / 50) * 50));
    }
  }

  cloneAndScalePlan(source: MealPlan): void {
    const targetClientId = this.cloneTargetClientId();
    if (!targetClientId) return;
    const targetKcal = Math.max(1000, this.cloneTargetKcal() || source.kcal);
    const ratio = source.kcal > 0 ? targetKcal / source.kcal : 1;
    const scaledMeals = source.meals.map((meal) => ({
      ...meal,
      kcal: Math.round(meal.kcal * ratio),
      proteinG: meal.proteinG ? round1(meal.proteinG * ratio) : undefined,
      carbG: meal.carbG ? round1(meal.carbG * ratio) : undefined,
      fatG: meal.fatG ? round1(meal.fatG * ratio) : undefined,
      fiberG: meal.fiberG ? round1(meal.fiberG * ratio) : undefined,
      items: meal.items?.map((it) => ({
        ...it,
        portions: round1(Math.max(0.5, it.portions * ratio)),
        grams: Math.round(it.grams * ratio),
        kcal: Math.round(it.kcal * ratio),
        proteinG: round1(it.proteinG * ratio),
        carbG: round1(it.carbG * ratio),
        fatG: round1(it.fatG * ratio),
        fiberG: round1(it.fiberG * ratio),
      })),
    }));

    const start = isoDate(new Date());
    const endObj = new Date();
    endObj.setDate(endObj.getDate() + 14);

    this.store.savePlan({
      clientId: targetClientId,
      title: `${source.title} (${targetKcal} kcal Ölçekli)`,
      startDate: start,
      endDate: isoDate(endObj),
      kcal: targetKcal,
      proteinPct: source.proteinPct,
      carbPct: source.carbPct,
      fatPct: source.fatPct,
      meals: scaledMeals,
      status: 'active',
      notes: source.notes,
    });

    this.cloneTargetClientId.set('');
    this.notify.success(
      `Plan ${this.store.clientName(targetClientId)} için ${targetKcal} kcal'ye ölçeklenerek aktifleştirildi.`,
    );
  }

  copyWhatsAppSummary(plan: MealPlan): void {
    const clientName = this.store.clientName(plan.clientId);
    const lines: string[] = [
      `🌿 *OdivonDiet Klinik Beslenme Reçetesi*`,
      `👤 *Danışan:* ${clientName}`,
      `📋 *Program:* ${plan.title} (${plan.kcal} kcal)`,
      `⚖️ *Makro Dağılımı:* %${plan.proteinPct} P / %${plan.carbPct} K / %${plan.fatPct} Y`,
      ``,
    ];
    for (const meal of plan.meals) {
      lines.push(`⏰ *${meal.time} — ${meal.name}* (${meal.kcal} kcal)`);
      for (const item of meal.items ?? []) {
        const alt = this.autoExchangeHint(item);
        lines.push(
          `  • ${item.name}: ${item.portions} × ${item.unit} (${item.grams}g)${alt ? ` _[Muadil: ${alt}]_` : ''}`,
        );
      }
    }
    if (plan.notes) {
      lines.push(``, `📌 *Klinik Not:* ${plan.notes}`);
    }
    const text = lines.join('\n');
    void globalThis.navigator?.clipboard?.writeText(text);
    this.notify.success('WhatsApp beslenme reçetesi panoya kopyalandı.');
  }

  printPlan(): void {
    globalThis.print?.();
  }
}
