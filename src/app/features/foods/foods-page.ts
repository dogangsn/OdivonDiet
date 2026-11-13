import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DietStore } from '../../core/data/diet-store';
import { Notify } from '../../core/notify/notify';
import { atwaterKcal, round1 } from '../../domain/diet-calc';
import {
  EXCHANGE_GROUP_LABELS,
  ExchangeGroup,
  FOOD_CATEGORY_LABELS,
  FoodCategory,
  FoodItem,
  GI_LABELS,
  GlycemicIndex,
} from '../../domain/diet.models';
import { EmptyState } from '../../shared/ui/empty-state';
import { KpiCard } from '../../shared/ui/kpi-card';
import { PageHeader } from '../../shared/ui/page-header';
import { QuickActions } from '../forms/quick-actions';

const ALLERGEN_OPTIONS = [
  'Gluten',
  'Laktoz',
  'Süt',
  'Yumurta',
  'Balık',
  'Kuruyemiş',
  'Yer fıstığı',
  'Soya',
  'Susam',
] as const;

interface FoodDraft {
  id?: string;
  name: string;
  brand: string;
  category: FoodCategory;
  exchange: ExchangeGroup;
  unit: string;
  grams: number;
  kcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  fiberG: number;
  gi: GlycemicIndex;
  allergens: string[];
  autoKcal: boolean;
}

@Component({
  selector: 'app-foods-page',
  imports: [FormsModule, DecimalPipe, PageHeader, KpiCard, EmptyState],
  template: `
    <div class="animate-fade-up space-y-6">
      <app-page-header
        eyebrow="Klinik besin veri tabanı & tarif havuzu"
        title="Besin, yemek ve ürün kütüphanesi"
        description="Diyet programlarında kullanılacak yemekleri, klinik tarifleri ve paketli ürünleri BeBis değişim grupları, glisemik indeks ve Atwater makro analizleriyle yönetin."
      >
        <div actions class="flex flex-wrap items-center gap-2">
          <button type="button" class="odv-btn-soft" (click)="openPlanBuilder()">
            <span class="material-symbols-rounded !text-lg">restaurant_menu</span>Diyet programı
            hazırla
          </button>
          <button type="button" class="odv-btn-primary" (click)="startCreate()">
            <span class="material-symbols-rounded !text-lg">add</span>Yeni yemek / ürün ekle
          </button>
        </div>
      </app-page-header>

      <section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Kütüphane özeti">
        <app-kpi-card
          label="Toplam besin & ürün"
          [value]="store.foods().length"
          icon="grocery"
          tone="primary"
          [hint]="customCount() + ' özel diyetisyen kaydı'"
        />
        <app-kpi-card
          label="Ev & klinik yemekleri"
          [value]="cookedDishCount()"
          icon="soup_kitchen"
          tone="info"
          hint="Porsiyon gramajı ve makrosu tanımlı"
        />
        <app-kpi-card
          label="Düşük glisemik indeks"
          [value]="lowGiCount()"
          icon="bloodtype"
          tone="positive"
          hint="İnsülin direnci & diyabet uyumlu"
        />
        <app-kpi-card
          label="Paketli & sporcu ürünü"
          [value]="packagedCount()"
          icon="inventory_2"
          tone="warning"
          hint="Etiket kalori & alerjen kontrollü"
        />
      </section>

      @if (editorOpen()) {
        <section
          aria-label="Yemek ve ürün tanımlama formu"
          class="odv-card border-2 border-violet-500/40 p-5"
        >
          <div
            class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4 dark:border-slate-800"
          >
            <div>
              <h2 class="text-base font-bold">
                {{
                  draft().id
                    ? 'Besin / yemek kaydını düzenle'
                    : 'Yeni yemek, tarif veya ürün tanımla'
                }}
              </h2>
              <p class="text-xs text-slate-500">
                Makroları girdiğinizde Atwater formülü (4×Protein + 4×Karbonhidrat + 9×Yağ) ile
                kalori otomatik hesaplanır.
              </p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <button
                type="button"
                class="odv-btn-soft !min-h-9 text-xs font-bold"
                (click)="recipeBuilderOpen.update((v) => !v)"
              >
                <span class="material-symbols-rounded !text-base" aria-hidden="true">blender</span>
                {{
                  recipeBuilderOpen()
                    ? 'Malzeme Hesaplayıcıyı Gizle'
                    : 'Çoklu Malzemeden Otomatik Tarif Hesapla'
                }}
              </button>
              <button type="button" class="odv-btn-ghost !min-h-9 text-xs" (click)="closeEditor()">
                <span class="material-symbols-rounded !text-base">close</span>Kapat
              </button>
            </div>
          </div>

          @if (recipeBuilderOpen()) {
            <div
              class="mt-4 space-y-3 rounded-xl border border-violet-200 bg-violet-50/50 p-4 dark:border-violet-900/50 dark:bg-violet-950/20"
            >
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span class="odv-eyebrow">Akıllı Tarif Mühendisliği</span>
                  <h3 class="text-sm font-extrabold">
                    Malzemeleri Seçin → 1 Porsiyon Makro ve Alerjenlerini Otomatik Topla
                  </h3>
                </div>
                <label class="flex items-center gap-2 text-xs font-bold">
                  <span>Tarif Kaç Porsiyon Çıkıyor?</span>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    class="odv-input !w-16 !py-1 text-center text-xs tabular"
                    [value]="recipeServings()"
                    (input)="recipeServings.set(+$any($event.target).value || 1)"
                  />
                </label>
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <select
                  class="odv-input flex-1 !py-1.5 text-xs"
                  aria-label="Tarife eklenecek malzeme"
                  [value]="selectedIngredientId()"
                  (change)="selectedIngredientId.set($any($event.target).value)"
                >
                  @for (f of store.foods(); track f.id) {
                    <option [value]="f.id">
                      {{ f.name }} ({{ f.unit }} · {{ f.grams }}g · {{ f.kcal }} kcal)
                    </option>
                  }
                </select>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="20"
                  aria-label="Malzeme porsiyon adedi"
                  class="odv-input !w-20 !py-1.5 text-center text-xs tabular"
                  [value]="selectedIngredientAmount()"
                  (input)="selectedIngredientAmount.set(+$any($event.target).value || 1)"
                />
                <button
                  type="button"
                  class="odv-btn-soft !min-h-8 !px-3 text-xs font-bold"
                  (click)="addRecipeIngredient()"
                >
                  <span class="material-symbols-rounded !text-base" aria-hidden="true">add</span>
                  Malzeme Ekle
                </button>
              </div>

              @if (recipeIngredients().length) {
                <ul class="divide-y divide-violet-200/50 rounded-xl bg-white p-3 text-xs dark:divide-slate-800 dark:bg-slate-900">
                  @for (ing of recipeIngredients(); track $index; let idx = $index) {
                    <li class="flex items-center justify-between py-1.5">
                      <span>
                        <strong>{{ ing.food.name }}</strong> · {{ ing.amount }} × {{ ing.food.unit }}
                        ({{ ing.food.grams * ing.amount | number: '1.0-0' }}g)
                      </span>
                      <span class="flex items-center gap-2">
                        <strong class="tabular text-violet-600"
                          >{{ ing.food.kcal * ing.amount | number: '1.0-0' }} kcal</strong
                        >
                        <button
                          type="button"
                          class="text-rose-500 hover:text-rose-700"
                          (click)="removeRecipeIngredient(idx)"
                          [attr.aria-label]="ing.food.name + ' malzemesini çıkar'"
                        >
                          <span class="material-symbols-rounded !text-sm">delete</span>
                        </button>
                      </span>
                    </li>
                  }
                </ul>
                <div class="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                  <span class="font-semibold text-slate-600 dark:text-slate-300">
                    1 Porsiyon Özeti ({{ recipePerServing().grams }}g):
                    <strong class="text-violet-700 dark:text-violet-300"
                      >{{ recipePerServing().kcal }} kcal</strong
                    >
                    · P: {{ recipePerServing().proteinG }}g · K: {{ recipePerServing().carbG }}g · Y:
                    {{ recipePerServing().fatG }}g · Lif: {{ recipePerServing().fiberG }}g
                  </span>
                  <button
                    type="button"
                    class="odv-btn-primary !min-h-8 !px-3 text-xs"
                    (click)="applyRecipeToDraft()"
                  >
                    1 Porsiyon Değerlerini Forma Aktar
                  </button>
                </div>
              }
            </div>
          }

          <form (ngSubmit)="saveFood()" class="mt-4 space-y-4">
            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label class="block sm:col-span-2">
                <span class="odv-label"
                  >Besin / yemek / ürün adı <b class="text-rose-500">*</b></span
                >
                <input
                  name="name"
                  type="text"
                  required
                  class="odv-input"
                  [ngModel]="draft().name"
                  (ngModelChange)="patchDraft({ name: $event })"
                  placeholder="Örn. Zeytinyağlı kabak kalye veya Şekersiz Fıstık Ezmeli Bar"
                />
              </label>

              <label class="block">
                <span class="odv-label">Kaynak / marka / tarif tipi</span>
                <input
                  name="brand"
                  type="text"
                  class="odv-input"
                  [ngModel]="draft().brand"
                  (ngModelChange)="patchDraft({ brand: $event })"
                  placeholder="Klinik Tarif, Ev Yemeği, Marka…"
                />
              </label>

              <label class="block">
                <span class="odv-label">Kategori</span>
                <select
                  name="category"
                  class="odv-input"
                  [ngModel]="draft().category"
                  (ngModelChange)="patchDraft({ category: $event })"
                >
                  @for (cat of categoryEntries; track cat.key) {
                    <option [ngValue]="cat.key">{{ cat.label }}</option>
                  }
                </select>
              </label>
            </div>

            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label class="block">
                <span class="odv-label">BeBis değişim grubu</span>
                <select
                  name="exchange"
                  class="odv-input"
                  [ngModel]="draft().exchange"
                  (ngModelChange)="patchDraft({ exchange: $event })"
                >
                  @for (ex of exchangeEntries; track ex.key) {
                    <option [ngValue]="ex.key">{{ ex.label }}</option>
                  }
                </select>
              </label>

              <label class="block">
                <span class="odv-label">Porsiyon birimi <b class="text-rose-500">*</b></span>
                <input
                  name="unit"
                  type="text"
                  required
                  class="odv-input"
                  [ngModel]="draft().unit"
                  (ngModelChange)="patchDraft({ unit: $event })"
                  placeholder="Örn. 1 porsiyon (tabak), 1 adet, 2 yemek kaşığı"
                />
              </label>

              <label class="block">
                <span class="odv-label">Net porsiyon gramajı (g) <b class="text-rose-500">*</b></span>
                <input
                  name="grams"
                  type="number"
                  min="1"
                  max="2000"
                  class="odv-input tabular"
                  [ngModel]="draft().grams"
                  (ngModelChange)="patchDraft({ grams: +$event })"
                />
              </label>

              <label class="block">
                <span class="odv-label">Glisemik indeks (Gİ) sınıfı</span>
                <select
                  name="gi"
                  class="odv-input"
                  [ngModel]="draft().gi"
                  (ngModelChange)="patchDraft({ gi: $event })"
                >
                  <option value="low">Düşük Gİ (≤55)</option>
                  <option value="medium">Orta Gİ (56–69)</option>
                  <option value="high">Yüksek Gİ (≥70)</option>
                </select>
              </label>
            </div>

            <div
              class="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/50"
            >
              <div class="flex flex-wrap items-center justify-between gap-2">
                <p class="text-xs font-bold">
                  1 porsiyon ({{ draft().grams }} g) besin değerleri ve kalori hesaplama
                </p>
                <label class="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold">
                  <input
                    type="checkbox"
                    name="autoKcal"
                    [ngModel]="draft().autoKcal"
                    (ngModelChange)="toggleAutoKcal($event)"
                    class="size-4 accent-violet-600"
                  />
                  Atwater formülü ile kaloriyi otomatik hesapla ({{ computedAtwaterKcal() }} kcal)
                </label>
              </div>

              <div class="mt-3 grid gap-3 sm:grid-cols-5">
                <label class="block">
                  <span class="odv-label">Protein (g)</span>
                  <input
                    name="proteinG"
                    type="number"
                    min="0"
                    step="0.1"
                    class="odv-input tabular"
                    [ngModel]="draft().proteinG"
                    (ngModelChange)="updateMacro('proteinG', +$event)"
                  />
                  <span class="mt-1 block text-[11px] text-slate-500">
                    {{ draft().proteinG * 4 | number: '1.0-0' }} kcal
                  </span>
                </label>

                <label class="block">
                  <span class="odv-label">Karbonhidrat (g)</span>
                  <input
                    name="carbG"
                    type="number"
                    min="0"
                    step="0.1"
                    class="odv-input tabular"
                    [ngModel]="draft().carbG"
                    (ngModelChange)="updateMacro('carbG', +$event)"
                  />
                  <span class="mt-1 block text-[11px] text-slate-500">
                    {{ draft().carbG * 4 | number: '1.0-0' }} kcal
                  </span>
                </label>

                <label class="block">
                  <span class="odv-label">Yağ (g)</span>
                  <input
                    name="fatG"
                    type="number"
                    min="0"
                    step="0.1"
                    class="odv-input tabular"
                    [ngModel]="draft().fatG"
                    (ngModelChange)="updateMacro('fatG', +$event)"
                  />
                  <span class="mt-1 block text-[11px] text-slate-500">
                    {{ draft().fatG * 9 | number: '1.0-0' }} kcal
                  </span>
                </label>

                <label class="block">
                  <span class="odv-label">Diyet lifi / posa (g)</span>
                  <input
                    name="fiberG"
                    type="number"
                    min="0"
                    step="0.1"
                    class="odv-input tabular"
                    [ngModel]="draft().fiberG"
                    (ngModelChange)="patchDraft({ fiberG: +$event })"
                  />
                  <span class="mt-1 block text-[11px] text-slate-500">
                    100g'da {{ per100g(draft().fiberG, draft().grams) }} g lif
                  </span>
                </label>

                <label class="block">
                  <span class="odv-label">Net enerji (kcal)</span>
                  <input
                    name="kcal"
                    type="number"
                    min="0"
                    [disabled]="draft().autoKcal"
                    class="odv-input tabular !font-bold"
                    [ngModel]="draft().kcal"
                    (ngModelChange)="patchDraft({ kcal: +$event })"
                  />
                  <span class="mt-1 block text-[11px] text-slate-500">
                    Yoğunluk: {{ per100g(draft().kcal, draft().grams) }} kcal/100g
                  </span>
                </label>
              </div>
            </div>

            <div>
              <span class="odv-label">
                İçerdiği alerjen / intolerans etiketleri (Danışan planlarında otomatik çakışma
                kontrolü yapılır)
              </span>
              <div class="mt-1.5 flex flex-wrap gap-1.5">
                @for (alg of allergenOptions; track alg) {
                  <button
                    type="button"
                    (click)="toggleDraftAllergen(alg)"
                    [attr.aria-pressed]="draft().allergens.includes(alg)"
                    class="rounded-full border px-3 py-1 text-xs font-semibold transition"
                    [class.border-rose-500]="draft().allergens.includes(alg)"
                    [class.bg-rose-50]="draft().allergens.includes(alg)"
                    [class.text-rose-700]="draft().allergens.includes(alg)"
                    [class.border-slate-200]="!draft().allergens.includes(alg)"
                    [class.text-slate-600]="!draft().allergens.includes(alg)"
                  >
                    {{ alg }}
                  </button>
                }
              </div>
            </div>

            @if (editorError()) {
              <p role="alert" class="odv-error">{{ editorError() }}</p>
            }

            <div class="flex justify-end gap-2 pt-2">
              <button type="button" class="odv-btn-ghost" (click)="closeEditor()">Vazgeç</button>
              <button type="submit" class="odv-btn-primary">
                {{ draft().id ? 'Değişiklikleri kaydet' : 'Kütüphaneye ekle' }}
              </button>
            </div>
          </form>
        </section>
      }

      <section aria-label="Besin filtreleme araçları" class="odv-card space-y-3 p-4">
        <div class="grid gap-3 md:grid-cols-12">
          <label class="relative md:col-span-4">
            <span class="sr-only">Besin, yemek veya marka ara</span>
            <span
              class="material-symbols-rounded pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-400"
              >search</span
            >
            <input
              type="search"
              class="odv-input ps-10"
              [ngModel]="query()"
              (ngModelChange)="query.set($event)"
              placeholder="Yemek, besin, marka veya alerjen ara…"
            />
          </label>

          <label class="md:col-span-3">
            <span class="sr-only">Kategori filtresi</span>
            <select
              class="odv-input"
              aria-label="Kategori filtresi"
              [ngModel]="categoryFilter()"
              (ngModelChange)="categoryFilter.set($event)"
            >
              <option value="all">Tüm kategoriler</option>
              @for (cat of categoryEntries; track cat.key) {
                <option [ngValue]="cat.key">{{ cat.label }}</option>
              }
            </select>
          </label>

          <label class="md:col-span-3">
            <span class="sr-only">BeBis değişim grubu filtresi</span>
            <select
              class="odv-input"
              aria-label="BeBis değişim grubu filtresi"
              [ngModel]="exchangeFilter()"
              (ngModelChange)="exchangeFilter.set($event)"
            >
              <option value="all">Tüm değişim grupları</option>
              @for (ex of exchangeEntries; track ex.key) {
                <option [ngValue]="ex.key">{{ ex.label }}</option>
              }
            </select>
          </label>

          <label class="md:col-span-2">
            <span class="sr-only">Glisemik indeks filtresi</span>
            <select
              class="odv-input"
              aria-label="Glisemik indeks filtresi"
              [ngModel]="giFilter()"
              (ngModelChange)="giFilter.set($event)"
            >
              <option value="all">Tüm Gİ sınıfları</option>
              <option value="low">Düşük Gİ</option>
              <option value="medium">Orta Gİ</option>
              <option value="high">Yüksek Gİ</option>
            </select>
          </label>
        </div>

        <div
          class="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800"
        >
          <div class="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>
              Gösterilen: <strong class="text-slate-800 dark:text-slate-100">{{ filteredFoods().length }}</strong> kayıt
            </span>
            @if (
              query() ||
              categoryFilter() !== 'all' ||
              exchangeFilter() !== 'all' ||
              giFilter() !== 'all'
            ) {
              <button
                type="button"
                (click)="resetFilters()"
                class="font-semibold text-violet-600 hover:underline"
              >
                Filtreleri temizle
              </button>
            }
          </div>

          <div class="odv-segment" role="group" aria-label="Gösterim baz birimi">
            <button
              type="button"
              class="odv-segment-item"
              [attr.aria-pressed]="basis() === 'portion'"
              (click)="basis.set('portion')"
            >
              Porsiyon bazlı
            </button>
            <button
              type="button"
              class="odv-segment-item"
              [attr.aria-pressed]="basis() === '100g'"
              (click)="basis.set('100g')"
            >
              100 gram bazlı
            </button>
          </div>
        </div>
      </section>

      <section aria-label="Besin ve yemek listesi" class="odv-card overflow-hidden">
        @if (filteredFoods().length) {
          <div class="custom-scroll overflow-x-auto">
            <table class="w-full min-w-[860px]">
              <thead>
                <tr>
                  <th class="odv-th">Besin / yemek / ürün</th>
                  <th class="odv-th">Kategori & değişim</th>
                  <th class="odv-th">Ölçü birimi</th>
                  <th class="odv-th text-end">Enerji</th>
                  <th class="odv-th text-end">Protein</th>
                  <th class="odv-th text-end">Karb.</th>
                  <th class="odv-th text-end">Yağ</th>
                  <th class="odv-th text-end">Lif</th>
                  <th class="odv-th text-center">Gİ</th>
                  <th class="odv-th text-end"><span class="sr-only">İşlem</span></th>
                </tr>
              </thead>
              <tbody>
                @for (item of filteredFoods(); track item.id) {
                  <tr class="transition hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td class="odv-td">
                      <strong class="block text-sm">{{ item.name }}</strong>
                      <div class="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                        @if (item.brand) {
                          <span>{{ item.brand }}</span>
                        }
                        @if (item.allergens.length > 0) {
                          <span class="font-semibold text-rose-600">
                            · Alerjen: {{ item.allergens.join(', ') }}
                          </span>
                        }
                      </div>
                    </td>

                    <td class="odv-td">
                      <span class="block text-xs font-semibold">
                        {{ categoryLabels[item.category] }}
                      </span>
                      <span class="odv-badge odv-tone-primary mt-1">
                        {{ exchangeLabels[item.exchange] }}
                      </span>
                    </td>

                    <td class="odv-td text-xs">
                      @if (basis() === 'portion') {
                        <span class="font-semibold">{{ item.unit }}</span>
                        <span class="tabular block text-slate-500">({{ item.grams }} g)</span>
                      } @else {
                        <span class="tabular font-semibold">100 g standart</span>
                      }
                    </td>

                    <td class="odv-td tabular text-end font-bold">
                      {{ displayValue(item.kcal, item.grams) | number: '1.0-0' }}
                      <span class="text-xs font-normal text-slate-400">kcal</span>
                    </td>

                    <td class="odv-td tabular text-end text-xs font-semibold text-violet-600">
                      {{ displayValue(item.proteinG, item.grams) | number: '1.0-1' }} g
                    </td>

                    <td class="odv-td tabular text-end text-xs font-semibold text-sky-600">
                      {{ displayValue(item.carbG, item.grams) | number: '1.0-1' }} g
                    </td>

                    <td class="odv-td tabular text-end text-xs font-semibold text-amber-600">
                      {{ displayValue(item.fatG, item.grams) | number: '1.0-1' }} g
                    </td>

                    <td class="odv-td tabular text-end text-xs text-slate-500">
                      {{ displayValue(item.fiberG, item.grams) | number: '1.0-1' }} g
                    </td>

                    <td class="odv-td text-center">
                      <span
                        class="odv-badge"
                        [class.odv-tone-positive]="item.gi === 'low'"
                        [class.odv-tone-warning]="item.gi === 'medium'"
                        [class.odv-tone-danger]="item.gi === 'high'"
                      >
                        {{ giLabels[item.gi] }}
                      </span>
                    </td>

                    <td class="odv-td text-end">
                      <div class="inline-flex items-center gap-1">
                        <button
                          type="button"
                          (click)="startEdit(item)"
                          class="odv-btn-ghost !min-h-8 !px-2.5 text-xs"
                          [attr.aria-label]="item.name + ' düzenle'"
                        >
                          Düzenle
                        </button>
                        @if (item.isCustom) {
                          <button
                            type="button"
                            (click)="deleteFood(item.id)"
                            class="odv-btn-ghost !min-h-8 !px-2 text-xs text-rose-600"
                            [attr.aria-label]="item.name + ' sil'"
                          >
                            Sil
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <app-empty-state
            icon="grocery"
            title="Besin veya yemek bulunamadı"
            body="Arama kriterlerinize uygun kayıt yok. Yeni bir yemek veya paketli ürün ekleyebilirsiniz."
          >
            <button type="button" class="odv-btn-primary" (click)="startCreate()">
              Yeni yemek / ürün ekle
            </button>
          </app-empty-state>
        }
      </section>
    </div>
  `,
})
export class FoodsPage {
  protected readonly store = inject(DietStore);
  private readonly actions = inject(QuickActions);
  private readonly notify = inject(Notify);

  protected readonly categoryLabels = FOOD_CATEGORY_LABELS;
  protected readonly exchangeLabels = EXCHANGE_GROUP_LABELS;
  protected readonly giLabels = GI_LABELS;
  protected readonly allergenOptions = ALLERGEN_OPTIONS;

  protected readonly categoryEntries = (
    Object.entries(FOOD_CATEGORY_LABELS) as [FoodCategory, string][]
  ).map(([key, label]) => ({ key, label }));

  protected readonly exchangeEntries = (
    Object.entries(EXCHANGE_GROUP_LABELS) as [ExchangeGroup, string][]
  ).map(([key, label]) => ({ key, label }));

  readonly query = signal('');
  readonly categoryFilter = signal<FoodCategory | 'all'>('all');
  readonly exchangeFilter = signal<ExchangeGroup | 'all'>('all');
  readonly giFilter = signal<GlycemicIndex | 'all'>('all');
  readonly basis = signal<'portion' | '100g'>('portion');

  readonly editorOpen = signal(false);
  readonly editorError = signal('');
  readonly draft = signal<FoodDraft>(emptyDraft());
  readonly recipeBuilderOpen = signal(false);
  readonly recipeServings = signal(2);
  readonly selectedIngredientId = signal('f-egg');
  readonly selectedIngredientAmount = signal(1);
  readonly recipeIngredients = signal<{ food: FoodItem; amount: number }[]>([]);

  readonly recipePerServing = computed(() => {
    const list = this.recipeIngredients();
    const servings = Math.max(1, this.recipeServings());
    const totals = list.reduce(
      (acc, cur) => ({
        grams: acc.grams + cur.food.grams * cur.amount,
        proteinG: acc.proteinG + cur.food.proteinG * cur.amount,
        carbG: acc.carbG + cur.food.carbG * cur.amount,
        fatG: acc.fatG + cur.food.fatG * cur.amount,
        fiberG: acc.fiberG + cur.food.fiberG * cur.amount,
      }),
      { grams: 0, proteinG: 0, carbG: 0, fatG: 0, fiberG: 0 },
    );
    const proteinG = round1(totals.proteinG / servings);
    const carbG = round1(totals.carbG / servings);
    const fatG = round1(totals.fatG / servings);
    const fiberG = round1(totals.fiberG / servings);
    const allergies = Array.from(new Set(list.flatMap((i) => i.food.allergens)));
    return {
      grams: Math.max(1, Math.round(totals.grams / servings)),
      proteinG,
      carbG,
      fatG,
      fiberG,
      kcal: atwaterKcal(proteinG, carbG, fatG),
      allergens: allergies,
    };
  });

  readonly customCount = computed(() => this.store.foods().filter((f) => f.isCustom).length);
  readonly cookedDishCount = computed(
    () => this.store.foods().filter((f) => f.category === 'yemek').length,
  );
  readonly lowGiCount = computed(() => this.store.foods().filter((f) => f.gi === 'low').length);
  readonly packagedCount = computed(
    () => this.store.foods().filter((f) => f.category === 'paketli').length,
  );

  readonly computedAtwaterKcal = computed(() => {
    const d = this.draft();
    return atwaterKcal(d.proteinG, d.carbG, d.fatG);
  });

  readonly filteredFoods = computed(() => {
    const q = this.query().trim().toLocaleLowerCase('tr');
    const cat = this.categoryFilter();
    const ex = this.exchangeFilter();
    const gi = this.giFilter();

    return this.store.foods().filter((item) => {
      if (cat !== 'all' && item.category !== cat) return false;
      if (ex !== 'all' && item.exchange !== ex) return false;
      if (gi !== 'all' && item.gi !== gi) return false;
      if (!q) return true;
      return (
        item.name.toLocaleLowerCase('tr').includes(q) ||
        (item.brand ?? '').toLocaleLowerCase('tr').includes(q) ||
        item.allergens.some((a) => a.toLocaleLowerCase('tr').includes(q))
      );
    });
  });

  openPlanBuilder(): void {
    this.actions.open('plan');
  }

  startCreate(): void {
    this.draft.set(emptyDraft());
    this.editorError.set('');
    this.editorOpen.set(true);
  }

  startEdit(item: FoodItem): void {
    this.draft.set({
      id: item.id,
      name: item.name,
      brand: item.brand ?? '',
      category: item.category,
      exchange: item.exchange,
      unit: item.unit,
      grams: item.grams,
      kcal: item.kcal,
      proteinG: item.proteinG,
      carbG: item.carbG,
      fatG: item.fatG,
      fiberG: item.fiberG,
      gi: item.gi,
      allergens: [...item.allergens],
      autoKcal: false,
    });
    this.editorError.set('');
    this.editorOpen.set(true);
  }

  closeEditor(): void {
    this.editorOpen.set(false);
    this.editorError.set('');
  }

  patchDraft(patch: Partial<FoodDraft>): void {
    this.draft.update((cur) => {
      const next = { ...cur, ...patch };
      if (next.autoKcal) {
        next.kcal = atwaterKcal(next.proteinG, next.carbG, next.fatG);
      }
      return next;
    });
  }

  updateMacro(field: 'proteinG' | 'carbG' | 'fatG', value: number): void {
    const clean = Math.max(0, Number.isFinite(value) ? value : 0);
    this.patchDraft({ [field]: clean });
  }

  toggleAutoKcal(enabled: boolean): void {
    this.patchDraft({ autoKcal: enabled });
  }

  toggleDraftAllergen(allergen: string): void {
    this.draft.update((cur) => {
      const exists = cur.allergens.includes(allergen);
      return {
        ...cur,
        allergens: exists
          ? cur.allergens.filter((a) => a !== allergen)
          : [...cur.allergens, allergen],
      };
    });
  }

  saveFood(): void {
    const d = this.draft();
    if (!d.name.trim() || !d.unit.trim() || d.grams <= 0) {
      this.editorError.set('Lütfen besin adını, porsiyon birimini ve geçerli bir gramajı girin.');
      return;
    }
    const saved = this.store.saveFood({
      id: d.id,
      name: d.name.trim(),
      brand: d.brand.trim() || undefined,
      category: d.category,
      exchange: d.exchange,
      unit: d.unit.trim(),
      grams: Math.round(d.grams),
      kcal: Math.round(d.autoKcal ? atwaterKcal(d.proteinG, d.carbG, d.fatG) : d.kcal),
      proteinG: round1(d.proteinG),
      carbG: round1(d.carbG),
      fatG: round1(d.fatG),
      fiberG: round1(d.fiberG),
      gi: d.gi,
      allergens: d.allergens,
    });
    this.notify.success(
      d.id ? 'Besin kaydı güncellendi' : 'Yeni besin kütüphaneye eklendi',
      `${saved.name} · ${saved.kcal} kcal`,
    );
    this.closeEditor();
  }

  deleteFood(foodId: string): void {
    this.store.deleteFood(foodId);
    this.notify.info('Besin kütüphaneden kaldırıldı');
  }

  resetFilters(): void {
    this.query.set('');
    this.categoryFilter.set('all');
    this.exchangeFilter.set('all');
    this.giFilter.set('all');
  }

  displayValue(value: number, grams: number): number {
    if (this.basis() === 'portion' || grams <= 0) return value;
    return round1((value * 100) / grams);
  }

  per100g(value: number, grams: number): number {
    if (grams <= 0) return 0;
    return round1((value * 100) / grams);
  }

  addRecipeIngredient(): void {
    const food =
      this.store.foods().find((f) => f.id === this.selectedIngredientId()) ??
      this.store.foods()[0];
    if (!food) return;
    const amount = Math.max(0.25, this.selectedIngredientAmount());
    this.recipeIngredients.update((list) => [...list, { food, amount }]);
  }

  removeRecipeIngredient(index: number): void {
    this.recipeIngredients.update((list) => list.filter((_, i) => i !== index));
  }

  applyRecipeToDraft(): void {
    const p = this.recipePerServing();
    this.patchDraft({
      grams: p.grams,
      proteinG: p.proteinG,
      carbG: p.carbG,
      fatG: p.fatG,
      fiberG: p.fiberG,
      kcal: p.kcal,
      allergens: p.allergens,
      autoKcal: true,
    });
    this.recipeBuilderOpen.set(false);
    this.notify.success('Tarifin 1 porsiyon besin değerleri ve alerjenleri forma aktarıldı.');
  }
}

function emptyDraft(): FoodDraft {
  return {
    name: '',
    brand: 'Klinik Tarif',
    category: 'yemek',
    exchange: 'sebze',
    unit: '1 porsiyon (tabak)',
    grams: 200,
    kcal: 185,
    proteinG: 8,
    carbG: 18,
    fatG: 9,
    fiberG: 4.5,
    gi: 'low',
    allergens: [],
    autoKcal: true,
  };
}
