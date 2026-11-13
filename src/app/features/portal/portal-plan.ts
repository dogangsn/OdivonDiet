import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DietStore } from '../../core/data/diet-store';
import { MemberPortal } from '../../core/data/member-portal';
import { buildGroceryList, daysBetween } from '../../domain/diet-calc';
import {
  EXCHANGE_GROUP_LABELS,
  FoodItem,
  GI_LABELS,
  PLAN_STATUS_LABELS,
} from '../../domain/diet.models';
import { EmptyState } from '../../shared/ui/empty-state';
import { MacroBar } from '../../shared/ui/macro-bar';
import { PageHeader } from '../../shared/ui/page-header';
import { ProgressBar } from '../../shared/ui/progress-bar';

@Component({
  selector: 'app-portal-plan',
  imports: [PageHeader, MacroBar, ProgressBar, EmptyState, DatePipe, DecimalPipe, RouterLink],
  template: `
    <div class="animate-fade-up space-y-6">
      <app-page-header
        eyebrow="Beslenme"
        title="Beslenme planım"
        description="Diyetisyeninizin sizin için hazırladığı güncel plan, market sepeti ve besin sorgulama rehberi."
      >
        <a
          actions
          routerLink="/portal/requests"
          [queryParams]="{ new: 'plan_change' }"
          class="odv-btn-secondary"
        >
          <span class="material-symbols-rounded !text-lg">edit_note</span>Değişiklik iste
        </a>
      </app-page-header>

      @if (active(); as plan) {
        <section class="odv-card p-5 sm:p-6">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span class="odv-badge odv-tone-positive">Aktif plan</span>
              <h2 class="mt-2 text-xl font-extrabold tracking-tight">{{ plan.title }}</h2>
              <p class="text-xs text-slate-500">
                {{ plan.startDate | date: 'd MMMM' }} – {{ plan.endDate | date: 'd MMMM y' }}
              </p>
            </div>
            <p class="tabular text-3xl font-extrabold">
              {{ plan.kcal }} <small class="text-sm text-slate-400">kcal / gün</small>
            </p>
          </div>
          <div class="mt-4">
            <div class="mb-1 flex justify-between text-xs text-slate-500">
              <span>Plan süresi</span><span>{{ timeline().label }}</span>
            </div>
            <app-progress-bar [value]="timeline().pct" label="Plan süresinin geçen kısmı" />
          </div>
          <app-macro-bar
            class="mt-5 block"
            [kcal]="plan.kcal"
            [protein]="plan.proteinPct"
            [carb]="plan.carbPct"
            [fat]="plan.fatPct"
            [detailed]="true"
          />
          <h3 class="odv-section-title mt-6 text-sm">Günlük öğün programı ve porsiyonlar</h3>
          <ol class="mt-3 grid gap-3 sm:grid-cols-2">
            @for (meal of plan.meals; track $index) {
              <li class="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
                <div class="flex items-center gap-3">
                  <span
                    class="tabular w-12 text-sm font-semibold text-violet-600 dark:text-violet-300"
                    >{{ meal.time }}</span
                  >
                  <strong class="flex-1 text-sm">{{ meal.name }}</strong>
                  <span class="tabular text-xs font-bold text-slate-600 dark:text-slate-300"
                    >{{ meal.kcal }} kcal</span
                  >
                </div>
                @if (meal.items && meal.items.length) {
                  <ul
                    class="mt-2.5 space-y-1 border-t border-slate-200/70 pt-2 text-xs dark:border-slate-700/70"
                  >
                    @for (item of meal.items; track $index) {
                      <li class="flex items-start justify-between gap-2">
                        <span>
                          <strong class="font-medium">{{ item.name }}</strong>
                          <span class="text-slate-500">
                            · {{ item.portions }} × {{ item.unit }} ({{ item.grams }}g)</span
                          >
                          @if (item.alternative) {
                            <em class="block text-[11px] text-violet-600 dark:text-violet-300"
                              >Alternatif: {{ item.alternative }}</em
                            >
                          }
                        </span>
                        <span class="tabular text-slate-500">{{ item.kcal }} kcal</span>
                      </li>
                    }
                  </ul>
                }
              </li>
            }
          </ol>
          @if (plan.notes) {
            <div class="mt-5 rounded-xl bg-violet-50 p-4 text-sm dark:bg-violet-950/40">
              <span class="odv-eyebrow">Diyetisyeninizin notu</span>
              <p class="mt-1 whitespace-pre-line">{{ plan.notes }}</p>
            </div>
          }
          @if (allergies().length) {
            <p class="mt-4 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
              Planınız şu hassasiyetler dikkate alınarak hazırlandı:
              @for (a of allergies(); track a) {
                <span class="odv-badge odv-tone-danger">{{ a }}</span>
              }
            </p>
          }
          <button type="button" class="odv-btn-ghost no-print mt-4" (click)="print()">
            <span class="material-symbols-rounded !text-lg">print</span>Yazdır
          </button>
        </section>

        <!-- İnteraktif 7 Günlük Market Sepeti ve "Bunu Yiyebilir miyim?" Rehberi -->
        <div class="grid gap-6 lg:grid-cols-2">
          <!-- 1. "Bunu Yiyebilir miyim?" & 48 Saatlik Kaçamak Telafi Rehberi -->
          <section class="odv-card space-y-4 p-5">
            <div>
              <span class="odv-eyebrow">Canlı Besin & Porsiyon Rehberi</span>
              <h2 class="odv-section-title">“Bunu Yiyebilir miyim?” Sorgula</h2>
              <p class="text-xs text-slate-500">
                Dışarıda veya markette merak ettiğiniz bir besini aratın; alerjen, glisemik indeks
                ve değişim karşılığını anında görün.
              </p>
            </div>

            <label class="relative block">
              <span class="sr-only">Besin veya yemek ara</span>
              <span
                class="material-symbols-rounded pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-400"
                >search</span
              >
              <input
                type="search"
                class="odv-input ps-10 text-xs"
                placeholder="Örn. Somon, Avokado, Karabuğday, Mercimek…"
                [value]="foodQuery()"
                (input)="foodQuery.set($any($event.target).value)"
              />
            </label>

            <ul class="space-y-2">
              @for (f of matchedFoods(); track f.id) {
                <li
                  class="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/50"
                >
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <strong class="text-slate-900 dark:text-white">{{ f.name }}</strong>
                      <span class="ms-1 text-slate-500">({{ f.unit }} · {{ f.grams }}g)</span>
                    </div>
                    @if (hasClientAllergen(f)) {
                      <span class="odv-badge odv-tone-danger">Alerjen Uyarısı!</span>
                    } @else if (f.gi === 'high') {
                      <span class="odv-badge odv-tone-warning">Porsiyon Kontrollü (Yüksek Gİ)</span>
                    } @else {
                      <span class="odv-badge odv-tone-positive">Planınıza Uygun</span>
                    }
                  </div>
                  <div class="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                    <span>
                      {{ f.kcal }} kcal · P: {{ f.proteinG }}g · K: {{ f.carbG }}g · Y: {{ f.fatG }}g
                    </span>
                    <span class="font-semibold text-violet-600 dark:text-violet-300">
                      1 {{ exchangeLabels[f.exchange] }} değişimi · {{ giLabels[f.gi] }}
                    </span>
                  </div>
                </li>
              }
            </ul>

            <div class="border-t border-slate-100 pt-4 dark:border-slate-800">
              <span class="odv-eyebrow">Suçluluk Yok · Bilimsel Denge</span>
              <h3 class="text-sm font-extrabold">48 Saatlik Kaçamak Telafi Asistanı</h3>
              <p class="mt-0.5 text-xs text-slate-500">
                Plan dışı bir öğün tükettiyseniz seçin; 48 saatlik dengeleme protokolünüzü görün:
              </p>
              <div class="mt-2.5 flex flex-wrap gap-1.5" role="group" aria-label="Kaçamak türü">
                @for (c of cheatPresets; track c.key) {
                  <button
                    type="button"
                    (click)="selectedCheat.set(c.key)"
                    [attr.aria-pressed]="selectedCheat() === c.key"
                    class="rounded-xl border px-3 py-1.5 text-xs font-bold transition"
                    [class]="
                      selectedCheat() === c.key
                        ? 'border-violet-600 bg-violet-600 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                    "
                  >
                    {{ c.label }}
                  </button>
                }
              </div>
              @if (activeCheatProtocol(); as proto) {
                <div
                  class="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"
                >
                  <strong class="block">{{ proto.title }}</strong>
                  <p class="mt-1">{{ proto.steps }}</p>
                </div>
              }
            </div>
          </section>

          <!-- 2. İnteraktif 7 Günlük Market Alışveriş Sepeti -->
          <section class="odv-card space-y-4 p-5">
            <div class="flex items-start justify-between gap-2">
              <div>
                <span class="odv-eyebrow">Akıllı Market Sepeti</span>
                <h2 class="odv-section-title">7 Günlük Alışveriş Listem</h2>
                <p class="text-xs text-slate-500">
                  Markette aldığınız malzemeleri işaretleyin; porsiyonlar 7 güne göre otomatik
                  hesaplandı.
                </p>
              </div>
              <span class="odv-badge odv-tone-info">
                {{ checkedGrocery().length }} / {{ groceryList().length }} alındı
              </span>
            </div>

            @if (groceryList().length) {
              <ul class="space-y-2">
                @for (g of groceryList(); track g.foodId) {
                  <li>
                    <button
                      type="button"
                      (click)="toggleGrocery(g.foodId)"
                      [attr.aria-pressed]="isGroceryChecked(g.foodId)"
                      class="flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-start text-xs transition"
                      [class]="
                        isGroceryChecked(g.foodId)
                          ? 'border-emerald-200 bg-emerald-50/60 text-slate-400 dark:border-emerald-900/50 dark:bg-emerald-950/20'
                          : 'border-slate-100 bg-slate-50/70 text-slate-800 hover:border-violet-200 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-100'
                      "
                    >
                      <span class="flex items-center gap-2.5">
                        <span
                          class="grid size-5 shrink-0 place-items-center rounded border"
                          [class]="
                            isGroceryChecked(g.foodId)
                              ? 'border-emerald-600 bg-emerald-600 text-white'
                              : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900'
                          "
                        >
                          @if (isGroceryChecked(g.foodId)) {
                            <span class="material-symbols-rounded !text-sm" aria-hidden="true"
                              >check</span
                            >
                          }
                        </span>
                        <span [class.line-through]="isGroceryChecked(g.foodId)">
                          <strong class="block">{{ g.name }}</strong>
                          <span class="text-[11px] text-slate-500"
                            >{{ g.totalPortions }} × {{ g.unit }}</span
                          >
                        </span>
                      </span>
                      <span class="tabular font-extrabold text-violet-600 dark:text-violet-300">
                        {{
                          g.totalGrams >= 1000
                            ? (g.totalGrams / 1000 | number: '1.1-2') + ' kg'
                            : g.totalGrams + ' g'
                        }}
                      </span>
                    </button>
                  </li>
                }
              </ul>
            } @else {
              <p class="text-xs text-slate-500">Bu planda henüz detaylı malzeme listesi yok.</p>
            }
          </section>
        </div>
      } @else {
        <div class="odv-card">
          <app-empty-state
            icon="restaurant_menu"
            title="Aktif planınız yok"
            body="Diyetisyeniniz planınızı yayınladığında burada görünecek."
          />
        </div>
      }

      @if (past().length) {
        <section>
          <h2 class="odv-section-title mb-3">Önceki planlar</h2>
          <ul class="odv-card divide-y divide-slate-100 dark:divide-slate-800">
            @for (p of past(); track p.id) {
              <li class="flex flex-wrap items-center gap-3 px-5 py-3.5 text-sm">
                <strong class="flex-1">{{ p.title }}</strong>
                <span class="text-xs text-slate-500"
                  >{{ p.startDate | date: 'd MMM' }} – {{ p.endDate | date: 'd MMM y' }}</span
                >
                <span class="tabular text-xs">{{ p.kcal }} kcal</span>
                <span class="odv-badge odv-tone-neutral">{{ statusLabels[p.status] }}</span>
              </li>
            }
          </ul>
        </section>
      }
    </div>
  `,
})
export class PortalPlan {
  private readonly member = inject(MemberPortal);
  private readonly diet = inject(DietStore);
  readonly statusLabels = PLAN_STATUS_LABELS;
  readonly exchangeLabels = EXCHANGE_GROUP_LABELS;
  readonly giLabels = GI_LABELS;

  readonly active = computed(
    () => this.member.plans().find((p) => p.status === 'active') ?? null,
  );
  readonly past = computed(() => this.member.plans().filter((p) => p.status !== 'active'));
  readonly allergies = computed(() => this.member.view()?.client.allergies ?? []);

  readonly foodQuery = signal('');
  readonly checkedGrocery = signal<string[]>([]);
  readonly selectedCheat = signal<'sweet' | 'fastfood' | 'late' | null>(null);

  readonly cheatPresets = [
    {
      key: 'sweet' as const,
      label: '🍰 Tatlı / Pasta (+450 kcal)',
      title: '48 Saatlik Glisemik & Ödem Dengeleme Protokolü',
      steps:
        'Su tüketimini +750 ml artırın, sonraki 2 akşam öğününden ekmek/tahıl değişimini çıkarıp yeşil yapraklı salata + tarçınlı bitki çayı ekleyin ve yemek sonrası 30 dk yürüyüş yapın.',
    },
    {
      key: 'fastfood' as const,
      label: '🍔 Burger / Pizza (+700 kcal)',
      title: '48 Saatlik Sodyum & Karbonhidrat Arındırma Protokolü',
      steps:
        'Yüksek sodyum kaynaklı su tutulumunu atmak için 48 saat tartıya çıkmayın, potasyumdan zengin kabak/avokado/maydanoz tüketin ve suyu +1 litre artırın.',
    },
    {
      key: 'late' as const,
      label: '🌙 Gece Atıştırması (+300 kcal)',
      title: 'Sirkadiyen Sindirim Dinlendirme Protokolü',
      steps:
        'Ertesi sabah kahvaltıyı 1 saat ileri kaydırarak 14 saatlik sirkadiyen açlık penceresi oluşturun ve güne 2 bardak ılık su + yumurta/peynir proteiniyle başlayın.',
    },
  ];

  readonly activeCheatProtocol = computed(
    () => this.cheatPresets.find((c) => c.key === this.selectedCheat()) ?? null,
  );

  readonly matchedFoods = computed(() => {
    const q = this.foodQuery().trim().toLocaleLowerCase('tr');
    const all = this.diet.foods();
    if (!q) return all.slice(0, 4);
    return all
      .filter(
        (f) =>
          f.name.toLocaleLowerCase('tr').includes(q) ||
          (f.brand ?? '').toLocaleLowerCase('tr').includes(q),
      )
      .slice(0, 5);
  });

  readonly groceryList = computed(() => {
    const plan = this.active();
    return plan ? buildGroceryList(plan.meals, 7) : [];
  });

  readonly timeline = computed(() => {
    const plan = this.active();
    if (!plan) return { pct: 0, label: '' };
    const total = Math.max(1, daysBetween(plan.startDate, plan.endDate));
    const elapsed = Math.min(total, Math.max(0, daysBetween(plan.startDate, new Date())));
    const left = Math.max(0, total - elapsed);
    return {
      pct: Math.round((elapsed / total) * 100),
      label: left === 0 ? 'Son gün' : `${left} gün kaldı`,
    };
  });

  hasClientAllergen(food: FoodItem): boolean {
    const clientAllergies = this.allergies().map((a) => a.toLocaleLowerCase('tr'));
    return food.allergens.some((al) => clientAllergies.includes(al.toLocaleLowerCase('tr')));
  }

  isGroceryChecked(foodId: string): boolean {
    return this.checkedGrocery().includes(foodId);
  }

  toggleGrocery(foodId: string): void {
    this.checkedGrocery.update((list) =>
      list.includes(foodId) ? list.filter((id) => id !== foodId) : [...list, foodId],
    );
  }

  print(): void {
    window.print();
  }
}
