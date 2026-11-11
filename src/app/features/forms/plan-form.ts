import { DecimalPipe } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormField, form, max, min, required, submit, validate } from '@angular/forms/signals';
import { DietStore } from '../../core/data/diet-store';
import { Notify } from '../../core/notify/notify';
import {
  atwaterKcal,
  isoDate,
  round1,
  scaleFoodItem,
  suggestedKcal,
  summarizeMeals,
} from '../../domain/diet-calc';
import {
  EXCHANGE_GROUP_LABELS,
  ExchangeGroup,
  FOOD_CATEGORY_LABELS,
  FoodCategory,
  Meal,
  MealFoodItem,
} from '../../domain/diet.models';
import { MacroBar } from '../../shared/ui/macro-bar';
import { SlideOver } from '../../shared/ui/slide-over';
import { QuickActions } from './quick-actions';

interface PlanDraft {
  clientId: string;
  title: string;
  startDate: string;
  weeks: number | null;
  kcal: number | null;
  proteinPct: number | null;
  carbPct: number | null;
  fatPct: number | null;
  mealsPerDay: number;
  activate: boolean;
  notes: string;
}

export type PlanPresetKey = 'mediterranean' | 'low-gi' | 'athlete' | 'gluten-free';

const MEAL_LAYOUTS: Record<number, ReadonlyArray<[string, string, number]>> = {
  3: [
    ['Kahvaltı', '08:00', 0.3],
    ['Öğle', '13:00', 0.35],
    ['Akşam', '19:00', 0.35],
  ],
  4: [
    ['Kahvaltı', '08:00', 0.25],
    ['Öğle', '13:00', 0.3],
    ['Ara öğün', '16:00', 0.15],
    ['Akşam', '19:00', 0.3],
  ],
  5: [
    ['Kahvaltı', '08:00', 0.25],
    ['Ara öğün', '10:30', 0.1],
    ['Öğle', '13:00', 0.3],
    ['Ara öğün', '16:00', 0.1],
    ['Akşam', '19:00', 0.25],
  ],
  6: [
    ['Kahvaltı', '08:00', 0.2],
    ['Ara öğün', '10:30', 0.1],
    ['Öğle', '13:00', 0.25],
    ['Ara öğün', '16:00', 0.1],
    ['Akşam', '19:00', 0.25],
    ['Gece', '21:30', 0.1],
  ],
};

@Component({
  selector: 'app-plan-form',
  imports: [SlideOver, FormField, FormsModule, DecimalPipe, MacroBar],
  template: `
    <app-slide-over
      [open]="open()"
      [wide]="true"
      [dirty]="!!model().title || !!model().notes"
      icon="restaurant_menu"
      eyebrow="Klinik diyet tasarım stüdyosu"
      title="Detaylı beslenme programı & kalori analizi"
      description="Danışanın metabolik hızına göre öğün bazlı yemek/ürün seçin; kalori, makro (g ve g/kg), lif ve değişim gruplarını anlık analiz edin."
      submitLabel="Planı kaydet"
      (closed)="qa.close()"
      (submitted)="save()"
    >
      <!-- 1. Danışan & Temel Plan Bilgileri -->
      <div class="odv-card space-y-4 p-5">
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="block">
            <span class="odv-label">Danışan <b class="text-rose-500">*</b></span>
            <select class="odv-input" [formField]="f.clientId">
              <option value="" disabled>Danışan seçin</option>
              @for (view of store.activeClients(); track view.client.id) {
                <option [value]="view.client.id">
                  {{ view.fullName }} ({{ view.currentWeightKg }} kg · TDEE {{ view.tdee }} kcal)
                </option>
              }
            </select>
            @if (f.clientId().touched() && f.clientId().invalid()) {
              <span class="odv-error">Danışan seçin.</span>
            }
          </label>
          <label class="block">
            <span class="odv-label">Plan adı <b class="text-rose-500">*</b></span>
            <input class="odv-input" [formField]="f.title" placeholder="Örn. Kilo verme · Faz 1" />
            @if (f.title().touched() && f.title().invalid()) {
              <span class="odv-error">Plan adı zorunludur.</span>
            }
          </label>
          <label class="block">
            <span class="odv-label">Başlangıç</span>
            <input class="odv-input" type="date" [formField]="f.startDate" />
          </label>
          <label class="block">
            <span class="odv-label">Süre (hafta)</span>
            <input class="odv-input tabular" type="number" [formField]="f.weeks" />
          </label>
        </div>

        @if (selectedClientView(); as cv) {
          <div
            class="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-xs sm:grid-cols-4 dark:bg-slate-800/50"
          >
            <div>
              <span class="block text-[10px] font-bold uppercase text-slate-400">Güncel / Hedef</span>
              <strong class="tabular">{{ cv.currentWeightKg }} → {{ cv.client.targetWeightKg }} kg</strong>
            </div>
            <div>
              <span class="block text-[10px] font-bold uppercase text-slate-400">BMR (Mifflin)</span>
              <strong class="tabular">{{ cv.bmr }} kcal</strong>
            </div>
            <div>
              <span class="block text-[10px] font-bold uppercase text-slate-400">Günlük TDEE</span>
              <strong class="tabular text-violet-600 dark:text-violet-300">{{ cv.tdee }} kcal</strong>
            </div>
            <div>
              <span class="block text-[10px] font-bold uppercase text-slate-400">BKİ Sınıfı</span>
              <strong class="tabular">{{ cv.bmi | number: '1.1-1' }} ({{ cv.bmiBand.label }})</strong>
            </div>
          </div>
        }

        @if (allergyNote(); as note) {
          <p
            class="flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
          >
            <span class="material-symbols-rounded !text-base">warning</span>{{ note }}
          </p>
        }
      </div>

      <!-- 2. Klinik Hazır Menü Şablonları -->
      <div class="odv-card space-y-3 p-5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span class="odv-label !mb-0">Hızlı klinik protokol şablonu yükle</span>
            <p class="text-xs text-slate-500">
              Seçtiğiniz şablon öğünlere gerçek besinleri, gramajları ve alternatifleri otomatik
              yerleştirir.
            </p>
          </div>
        </div>
        <div class="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            class="flex items-start gap-2.5 rounded-xl border border-slate-200 p-3 text-start text-xs transition hover:border-violet-400 hover:bg-violet-50/40 dark:border-slate-800 dark:hover:bg-violet-950/20"
            (click)="applyPreset('mediterranean')"
          >
            <span class="material-symbols-rounded text-emerald-600">spa</span>
            <div>
              <strong class="block text-slate-800 dark:text-slate-100">Akdeniz Dengeli Plan</strong>
              <span class="text-slate-500">%25 P · %45 K · %30 Y · Zeytinyağlı & balık odaklı</span>
            </div>
          </button>

          <button
            type="button"
            class="flex items-start gap-2.5 rounded-xl border border-slate-200 p-3 text-start text-xs transition hover:border-violet-400 hover:bg-violet-50/40 dark:border-slate-800 dark:hover:bg-violet-950/20"
            (click)="applyPreset('low-gi')"
          >
            <span class="material-symbols-rounded text-sky-600">bloodtype</span>
            <div>
              <strong class="block text-slate-800 dark:text-slate-100"
                >Düşük Gİ · İnsülin Direnci</strong
              >
              <span class="text-slate-500">%30 P · %35 K · %35 Y · Yüksek lif, düşük Gİ</span>
            </div>
          </button>

          <button
            type="button"
            class="flex items-start gap-2.5 rounded-xl border border-slate-200 p-3 text-start text-xs transition hover:border-violet-400 hover:bg-violet-50/40 dark:border-slate-800 dark:hover:bg-violet-950/20"
            (click)="applyPreset('athlete')"
          >
            <span class="material-symbols-rounded text-amber-600">fitness_center</span>
            <div>
              <strong class="block text-slate-800 dark:text-slate-100"
                >Yüksek Protein · Sporcu</strong
              >
              <span class="text-slate-500">%30 P · %45 K · %25 Y · Antrenman destekli</span>
            </div>
          </button>

          <button
            type="button"
            class="flex items-start gap-2.5 rounded-xl border border-slate-200 p-3 text-start text-xs transition hover:border-violet-400 hover:bg-violet-50/40 dark:border-slate-800 dark:hover:bg-violet-950/20"
            (click)="applyPreset('gluten-free')"
          >
            <span class="material-symbols-rounded text-violet-600">grain</span>
            <div>
              <strong class="block text-slate-800 dark:text-slate-100"
                >Glutensiz Anti-İnflamatuar</strong
              >
              <span class="text-slate-500">%25 P · %40 K · %35 Y · Karabuğday & kinoa bazlı</span>
            </div>
          </button>
        </div>
      </div>

      <!-- 3. Hedef Kalori & Makro Dağılımı -->
      <div class="odv-card space-y-4 p-5">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <label class="block min-w-40 flex-1">
            <span class="odv-label">Günlük enerji hedefi (kcal) <b class="text-rose-500">*</b></span>
            <input
              class="odv-input tabular !text-lg !font-bold"
              type="number"
              step="10"
              [formField]="f.kcal"
            />
          </label>
          <div class="flex flex-wrap items-center gap-2">
            @if (suggestion(); as s) {
              <button type="button" class="odv-btn-soft" (click)="applySuggestion(s.kcal)">
                <span class="material-symbols-rounded !text-base">auto_awesome</span>Önerilen:
                {{ s.kcal }} kcal
              </button>
            }
            @if (menuSummary().itemCount > 0) {
              <button
                type="button"
                class="odv-btn-soft"
                (click)="syncTargetFromMenu()"
                title="Öğünlere eklenen yemeklerin toplam kalorisini ve makro yüzdelerini hedefe uygula"
              >
                <span class="material-symbols-rounded !text-base">calculate</span>Menü toplamını
                hedefe eşitle ({{ menuSummary().kcal }} kcal)
              </button>
            }
          </div>
        </div>
        @if (suggestion(); as s) {
          <p class="text-[11px] text-slate-500">
            Günlük ihtiyaç {{ s.tdee }} kcal · program: {{ s.program }}
          </p>
        }
        <div class="grid grid-cols-3 gap-3">
          <label class="block">
            <span class="odv-label"
              ><span class="me-1 inline-block size-2 rounded-full bg-violet-500"></span>Protein
              %</span
            >
            <input class="odv-input tabular" type="number" [formField]="f.proteinPct" />
          </label>
          <label class="block">
            <span class="odv-label"
              ><span class="me-1 inline-block size-2 rounded-full bg-sky-400"></span>Karbonhidrat
              %</span
            >
            <input class="odv-input tabular" type="number" [formField]="f.carbPct" />
          </label>
          <label class="block">
            <span class="odv-label"
              ><span class="me-1 inline-block size-2 rounded-full bg-amber-400"></span>Yağ %</span
            >
            <input class="odv-input tabular" type="number" [formField]="f.fatPct" />
          </label>
        </div>
        <app-macro-bar
          [kcal]="model().kcal ?? 0"
          [protein]="model().proteinPct ?? 0"
          [carb]="model().carbPct ?? 0"
          [fat]="model().fatPct ?? 0"
          [detailed]="true"
        />
        @if (macroTotal() !== 100) {
          <span class="odv-error"
            >Makro oranlarının toplamı %100 olmalı (şu an %{{ macroTotal() }}).</span
          >
        }
      </div>

      <!-- 4. Öğün Bazlı Yemek / Ürün Seçimi ve Kalori Hesaplayıcı -->
      <div class="odv-card space-y-4 p-5">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span class="odv-label" id="meals-label">Öğün sayısı ve menü içerikleri</span>
            <p class="text-xs text-slate-500">
              Her öğüne kütüphaneden yemek, besin veya ürün ekleyin; porsiyon çarpanını değiştirdikçe
              kalori ve makrolar anlık güncellenir.
            </p>
          </div>
          <div class="odv-segment" role="group" aria-labelledby="meals-label">
            @for (n of [3, 4, 5, 6]; track n) {
              <button
                type="button"
                class="odv-segment-item"
                [attr.aria-pressed]="model().mealsPerDay === n"
                (click)="setMeals(n)"
              >
                {{ n }} öğün
              </button>
            }
          </div>
        </div>

        <!-- Canlı Menü Kalori & Makro Analiz Özeti -->
        <div
          class="rounded-xl border border-violet-200 bg-violet-50/50 p-4 dark:border-violet-900/50 dark:bg-violet-950/20"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <strong class="text-xs font-bold text-violet-900 dark:text-violet-200">
              Menüdeki Yemeklerin Gerçek Kalori & Makro Analizi ({{ menuSummary().itemCount }} kalem
              besin)
            </strong>
            <span
              class="odv-badge"
              [class.odv-tone-positive]="kcalDiffAbs() <= 100"
              [class.odv-tone-warning]="kcalDiffAbs() > 100 && kcalDiffAbs() <= 250"
              [class.odv-tone-danger]="kcalDiffAbs() > 250"
            >
              Hedef farkı: {{ kcalDiff() > 0 ? '+' : '' }}{{ kcalDiff() }} kcal
            </span>
          </div>

          <div class="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
            <div class="rounded-lg bg-white p-2.5 dark:bg-slate-900">
              <span class="block text-[10px] font-bold uppercase text-slate-400"
                >Menü Enerjisi</span
              >
              <strong class="tabular text-sm">{{ menuSummary().kcal }} kcal</strong>
              <span class="block text-[10px] text-slate-500"
                >Hedef: {{ model().kcal ?? 0 }} kcal</span
              >
            </div>
            <div class="rounded-lg bg-white p-2.5 dark:bg-slate-900">
              <span class="block text-[10px] font-bold uppercase text-violet-500">Protein</span>
              <strong class="tabular text-sm"
                >{{ menuSummary().proteinG }} g (%{{ menuSummary().proteinPct }})</strong
              >
              <span class="block text-[10px] text-slate-500">{{ proteinPerKg() }} g/kg ağırlık</span>
            </div>
            <div class="rounded-lg bg-white p-2.5 dark:bg-slate-900">
              <span class="block text-[10px] font-bold uppercase text-sky-500">Karbonhidrat</span>
              <strong class="tabular text-sm"
                >{{ menuSummary().carbG }} g (%{{ menuSummary().carbPct }})</strong
              >
              <span class="block text-[10px] text-slate-500">{{ carbPerKg() }} g/kg ağırlık</span>
            </div>
            <div class="rounded-lg bg-white p-2.5 dark:bg-slate-900">
              <span class="block text-[10px] font-bold uppercase text-amber-500">Yağ</span>
              <strong class="tabular text-sm"
                >{{ menuSummary().fatG }} g (%{{ menuSummary().fatPct }})</strong
              >
              <span class="block text-[10px] text-slate-500">{{ fatPerKg() }} g/kg ağırlık</span>
            </div>
            <div class="rounded-lg bg-white p-2.5 dark:bg-slate-900">
              <span class="block text-[10px] font-bold uppercase text-emerald-600"
                >Diyet Lifi (Posa)</span
              >
              <strong class="tabular text-sm">{{ menuSummary().fiberG }} g</strong>
              <span class="block text-[10px] text-slate-500">Önerilen: 25–35 g</span>
            </div>
          </div>

          @if (exchangeSummaryList().length) {
            <div class="mt-3 flex flex-wrap items-center gap-1.5">
              <span class="text-[11px] font-semibold text-slate-500">BeBis Değişim Dağılımı:</span>
              @for (ex of exchangeSummaryList(); track ex.key) {
                <span class="odv-badge odv-tone-neutral">
                  {{ ex.label }}: {{ ex.count }} değişim
                </span>
              }
            </div>
          }

          @if (allergenConflicts().length) {
            <div
              role="alert"
              class="mt-3 flex items-start gap-2 rounded-lg bg-rose-100 px-3 py-2 text-xs font-semibold text-rose-800 dark:bg-rose-950/70 dark:text-rose-200"
            >
              <span class="material-symbols-rounded !text-base">gpp_maybe</span>
              <span>
                Danışan alerjen çakışması tespit edildi: {{ allergenConflicts().join(' · ') }}
              </span>
            </div>
          }
        </div>

        <!-- Hızlı Özel Besin Ekleme Çekmecesi -->
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="text-xs font-semibold text-slate-500">
            Aradığınız yemek veya paketli ürün listede yok mu?
          </span>
          <button
            type="button"
            class="odv-btn-ghost !min-h-8 text-xs text-violet-600"
            (click)="quickFoodOpen.set(!quickFoodOpen())"
          >
            <span class="material-symbols-rounded !text-base">
              {{ quickFoodOpen() ? 'expand_less' : 'add_circle' }}
            </span>
            {{ quickFoodOpen() ? 'Hızlı besin formunu kapat' : 'Hızlı yeni yemek / ürün tanımla' }}
          </button>
        </div>

        @if (quickFoodOpen()) {
          <div
            class="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-900/60"
          >
            <p class="text-xs font-bold">
              Kütüphaneye hızlı yemek / ürün ekle (Atwater 4P+4K+9Y otomatik kalori)
            </p>
            <div class="grid gap-2.5 sm:grid-cols-3">
              <label class="block">
                <span class="odv-label">Yemek / ürün adı</span>
                <input
                  type="text"
                  class="odv-input"
                  [ngModel]="quickFood().name"
                  (ngModelChange)="patchQuickFood({ name: $event })"
                  placeholder="Örn. Fırında mücver"
                />
              </label>
              <label class="block">
                <span class="odv-label">Porsiyon birimi</span>
                <input
                  type="text"
                  class="odv-input"
                  [ngModel]="quickFood().unit"
                  (ngModelChange)="patchQuickFood({ unit: $event })"
                  placeholder="Örn. 2 adet"
                />
              </label>
              <label class="block">
                <span class="odv-label">Gramaj (g)</span>
                <input
                  type="number"
                  class="odv-input tabular"
                  [ngModel]="quickFood().grams"
                  (ngModelChange)="patchQuickFood({ grams: +$event })"
                />
              </label>
            </div>
            <div class="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
              <label class="block">
                <span class="odv-label">Protein (g)</span>
                <input
                  type="number"
                  step="0.5"
                  class="odv-input tabular"
                  [ngModel]="quickFood().proteinG"
                  (ngModelChange)="patchQuickFood({ proteinG: +$event })"
                />
              </label>
              <label class="block">
                <span class="odv-label">Karb. (g)</span>
                <input
                  type="number"
                  step="0.5"
                  class="odv-input tabular"
                  [ngModel]="quickFood().carbG"
                  (ngModelChange)="patchQuickFood({ carbG: +$event })"
                />
              </label>
              <label class="block">
                <span class="odv-label">Yağ (g)</span>
                <input
                  type="number"
                  step="0.5"
                  class="odv-input tabular"
                  [ngModel]="quickFood().fatG"
                  (ngModelChange)="patchQuickFood({ fatG: +$event })"
                />
              </label>
              <label class="block">
                <span class="odv-label">Lif (g)</span>
                <input
                  type="number"
                  step="0.5"
                  class="odv-input tabular"
                  [ngModel]="quickFood().fiberG"
                  (ngModelChange)="patchQuickFood({ fiberG: +$event })"
                />
              </label>
              <div class="flex flex-col justify-end">
                <button type="button" class="odv-btn-primary !min-h-10 text-xs" (click)="saveQuickFood()">
                  Kaydet ({{ quickFoodKcal() }} kcal)
                </button>
              </div>
            </div>
          </div>
        }

        <!-- Öğün Kartları -->
        <ul class="space-y-3">
          @for (meal of meals(); track $index; let mIdx = $index) {
            <li
              class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40"
            >
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex items-center gap-2.5">
                  <span
                    class="tabular rounded-lg bg-violet-100 px-2 py-1 text-xs font-bold text-violet-700 dark:bg-violet-950 dark:text-violet-300"
                  >
                    {{ meal.time }}
                  </span>
                  <strong class="text-sm">{{ meal.name }}</strong>
                </div>
                <div class="flex flex-wrap items-center gap-2 text-xs">
                  <span class="tabular font-semibold text-violet-600"
                    >P: {{ meal.proteinG ?? 0 }}g</span
                  >
                  <span class="tabular font-semibold text-sky-600">K: {{ meal.carbG ?? 0 }}g</span>
                  <span class="tabular font-semibold text-amber-600">Y: {{ meal.fatG ?? 0 }}g</span>
                  <span class="tabular text-slate-400">Lif: {{ meal.fiberG ?? 0 }}g</span>
                  <span
                    class="tabular rounded-lg bg-slate-100 px-2.5 py-1 font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-100"
                  >
                    {{ meal.kcal }} kcal
                  </span>
                </div>
              </div>

              <!-- Öğündeki Besin Kalemleri -->
              @if (meal.items && meal.items.length > 0) {
                <div class="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
                  @for (item of meal.items; track $index; let iIdx = $index) {
                    <div class="flex flex-wrap items-center justify-between gap-2 py-2 text-xs">
                      <div class="min-w-44 flex-1">
                        <strong class="block text-slate-800 dark:text-slate-100">
                          {{ item.name }}
                        </strong>
                        <span class="text-[11px] text-slate-500">
                          {{ item.portions }} × {{ item.unit }} ({{ item.grams }} g) · P:{{
                            item.proteinG
                          }}g K:{{ item.carbG }}g Y:{{ item.fatG }}g
                        </span>
                      </div>

                      <div class="flex flex-wrap items-center gap-1.5">
                        <input
                          type="text"
                          class="odv-input !min-h-7 !w-36 !px-2 !py-1 !text-[11px]"
                          placeholder="Alternatif / değişim…"
                          [attr.aria-label]="item.name + ' alternatif besin'"
                          [ngModel]="item.alternative ?? ''"
                          (ngModelChange)="updateMealItemAlternative(mIdx, iIdx, $event)"
                        />

                        <div class="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700">
                          <button
                            type="button"
                            class="px-2 py-0.5 font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                            (click)="adjustPortion(mIdx, iIdx, -0.5)"
                            [attr.aria-label]="item.name + ' porsiyon azalt'"
                          >
                            −
                          </button>
                          <span class="tabular px-2 font-mono text-[11px] font-bold">
                            {{ item.portions }}x
                          </span>
                          <button
                            type="button"
                            class="px-2 py-0.5 font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                            (click)="adjustPortion(mIdx, iIdx, 0.5)"
                            [attr.aria-label]="item.name + ' porsiyon artır'"
                          >
                            +
                          </button>
                        </div>

                        <span class="tabular w-16 text-end font-bold text-slate-700 dark:text-slate-200">
                          {{ item.kcal }} kcal
                        </span>

                        <button
                          type="button"
                          class="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          (click)="removeFoodFromMeal(mIdx, iIdx)"
                          [attr.aria-label]="item.name + ' öğünden çıkar'"
                        >
                          <span class="material-symbols-rounded !text-base">delete</span>
                        </button>
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <p class="mt-2 text-xs italic text-slate-400">
                  Bu öğüne henüz spesifik yemek eklenmedi (oransal hedef: {{ meal.kcal }} kcal).
                  Aşağıdan yemek veya ürün ekleyebilirsiniz.
                </p>
              }

              <!-- Öğüne Yemek / Ürün Ekleme Satırı -->
              <div
                class="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2.5 dark:border-slate-800"
              >
                <select
                  class="odv-input !min-h-8 flex-1 !py-1 !text-xs"
                  [attr.aria-label]="meal.name + ' için besin seçin'"
                  [ngModel]="selectedFoodForSlot(mIdx)"
                  (ngModelChange)="setSelectedFoodForSlot(mIdx, $event)"
                >
                  @for (fItem of store.foods(); track fItem.id) {
                    <option [ngValue]="fItem.id">
                      {{ fItem.name }} — {{ fItem.unit }} ({{ fItem.grams }}g · {{ fItem.kcal }} kcal
                      · P:{{ fItem.proteinG }}g K:{{ fItem.carbG }}g Y:{{ fItem.fatG }}g)
                    </option>
                  }
                </select>
                <button
                  type="button"
                  class="odv-btn-soft !min-h-8 !px-3 !py-1 text-xs"
                  (click)="addSelectedFoodToMeal(mIdx)"
                >
                  <span class="material-symbols-rounded !text-sm">add</span>Öğüne ekle
                </button>
              </div>
            </li>
          }
        </ul>

        <label class="block">
          <span class="odv-label">Klinik uygulama notları & su hedefi</span>
          <textarea
            class="odv-input min-h-20 resize-y"
            [formField]="f.notes"
            placeholder="Besin tercihleri, pişirme yöntemleri, kaçınılacaklar, su hedefi…"
          ></textarea>
        </label>
        <label class="flex items-center gap-3 text-sm">
          <input type="checkbox" class="size-4 accent-violet-600" [formField]="f.activate" />
          <span
            ><strong>Hemen aktifleştir.</strong>
            <span class="text-slate-500"
              >Danışanın mevcut aktif planı tamamlandı olarak kapanır.</span
            ></span
          >
        </label>
      </div>
    </app-slide-over>
  `,
})
export class PlanForm {
  readonly qa = inject(QuickActions);
  readonly store = inject(DietStore);
  private readonly notify = inject(Notify);
  readonly open = computed(() => this.qa.state()?.kind === 'plan');
  readonly model = signal<PlanDraft>(this.empty());

  /** Per-meal food items indexed by meal slot (`0..5`). */
  readonly mealItemsBySlot = signal<Record<number, MealFoodItem[]>>({});
  readonly slotFoodSelection = signal<Record<number, string>>({});

  /** Quick inline custom food creator inside the plan studio. */
  readonly quickFoodOpen = signal(false);
  readonly quickFood = signal({
    name: '',
    unit: '1 porsiyon',
    grams: 150,
    category: 'yemek' as FoodCategory,
    exchange: 'et' as ExchangeGroup,
    proteinG: 12,
    carbG: 15,
    fatG: 6,
    fiberG: 3,
  });
  readonly quickFoodKcal = computed(() => {
    const q = this.quickFood();
    return atwaterKcal(q.proteinG, q.carbG, q.fatG);
  });

  readonly f = form(this.model, (p) => {
    required(p.clientId);
    required(p.title);
    required(p.startDate);
    required(p.weeks);
    min(p.weeks, 1);
    max(p.weeks, 52);
    required(p.kcal);
    min(p.kcal, 800);
    max(p.kcal, 6000);
    validate(p.proteinPct, ({ valueOf }) => {
      const total =
        (valueOf(p.proteinPct) ?? 0) + (valueOf(p.carbPct) ?? 0) + (valueOf(p.fatPct) ?? 0);
      return total === 100 ? null : { kind: 'macroTotal' };
    });
  });

  readonly macroTotal = computed(() => {
    const v = this.model();
    return (v.proteinPct ?? 0) + (v.carbPct ?? 0) + (v.fatPct ?? 0);
  });

  readonly selectedClientView = computed(() => {
    const id = this.model().clientId;
    return id ? (this.store.view(id) ?? null) : null;
  });

  readonly suggestion = computed(() => {
    const view = this.store.view(this.model().clientId);
    if (!view) return null;
    return {
      kcal: suggestedKcal(view.tdee, view.client.program),
      tdee: view.tdee,
      program: view.client.program,
    };
  });

  readonly allergyNote = computed(() => {
    const view = this.store.view(this.model().clientId);
    if (!view) return '';
    const list = [...view.client.allergies, ...view.client.conditions];
    return list.length ? `Dikkat: ${list.join(', ')}` : '';
  });

  readonly meals = computed<Meal[]>(() => {
    const kcal = this.model().kcal ?? 0;
    const slots = this.mealItemsBySlot();
    return (MEAL_LAYOUTS[this.model().mealsPerDay] ?? MEAL_LAYOUTS[5]).map(
      ([name, time, share], idx) => {
        const items = slots[idx] ?? [];
        if (items.length === 0) {
          return {
            name,
            time,
            kcal: Math.round(kcal * share),
            proteinG: 0,
            carbG: 0,
            fatG: 0,
            fiberG: 0,
            items: [],
          };
        }
        const sumKcal = Math.round(items.reduce((s, i) => s + i.kcal, 0));
        const proteinG = round1(items.reduce((s, i) => s + i.proteinG, 0));
        const carbG = round1(items.reduce((s, i) => s + i.carbG, 0));
        const fatG = round1(items.reduce((s, i) => s + i.fatG, 0));
        const fiberG = round1(items.reduce((s, i) => s + i.fiberG, 0));
        return {
          name,
          time,
          kcal: sumKcal,
          proteinG,
          carbG,
          fatG,
          fiberG,
          items,
        };
      },
    );
  });

  readonly menuSummary = computed(() => summarizeMeals(this.meals()));

  readonly kcalDiff = computed(() => {
    const target = this.model().kcal ?? 0;
    return this.menuSummary().kcal - target;
  });

  readonly kcalDiffAbs = computed(() => Math.abs(this.kcalDiff()));

  readonly proteinPerKg = computed(() => {
    const weight = this.selectedClientView()?.currentWeightKg ?? 70;
    return weight > 0 ? round1(this.menuSummary().proteinG / weight) : 0;
  });

  readonly carbPerKg = computed(() => {
    const weight = this.selectedClientView()?.currentWeightKg ?? 70;
    return weight > 0 ? round1(this.menuSummary().carbG / weight) : 0;
  });

  readonly fatPerKg = computed(() => {
    const weight = this.selectedClientView()?.currentWeightKg ?? 70;
    return weight > 0 ? round1(this.menuSummary().fatG / weight) : 0;
  });

  readonly exchangeSummaryList = computed(() => {
    const counts = this.menuSummary().exchangeCounts;
    return (Object.entries(EXCHANGE_GROUP_LABELS) as [ExchangeGroup, string][])
      .map(([key, label]) => ({ key, label, count: round1(counts[key] ?? 0) }))
      .filter((x) => x.count > 0);
  });

  readonly allergenConflicts = computed<string[]>(() => {
    const view = this.selectedClientView();
    if (!view || view.client.allergies.length === 0) return [];
    const clientAllergies = view.client.allergies.map((a) => a.toLocaleLowerCase('tr'));
    const foodsById = new Map(this.store.foods().map((f) => [f.id, f]));
    const conflicts: string[] = [];

    for (const meal of this.meals()) {
      for (const item of meal.items ?? []) {
        const food = foodsById.get(item.foodId);
        if (!food) continue;
        const matched = food.allergens.filter((alg) =>
          clientAllergies.some(
            (ca) => ca.includes(alg.toLocaleLowerCase('tr')) || alg.toLocaleLowerCase('tr').includes(ca),
          ),
        );
        if (matched.length > 0) {
          conflicts.push(`${meal.name}: ${item.name} (${matched.join(', ')})`);
        }
      }
    }
    return conflicts;
  });

  constructor() {
    effect(() => {
      if (!this.open()) return;
      const clientId = this.qa.state()?.clientId ?? '';
      untracked(() => {
        const view = clientId ? this.store.view(clientId) : undefined;
        const targetKcal = view ? suggestedKcal(view.tdee, view.client.program) : null;
        this.model.set({
          ...this.empty(),
          clientId,
          kcal: targetKcal,
        });
        this.populateDefaultMenu(targetKcal ?? 1700, view?.client.allergies ?? []);
        this.f().reset();
      });
    });
  }

  applySuggestion(kcal: number): void {
    this.model.update((v) => ({ ...v, kcal }));
  }

  setMeals(n: number): void {
    this.model.update((v) => ({ ...v, mealsPerDay: n }));
  }

  applyPreset(preset: PlanPresetKey): void {
    const f = (id: string, portions: number, alt?: string) => {
      const found = this.store.foods().find((x) => x.id === id) ?? this.store.foods()[0];
      return scaleFoodItem(found, portions, alt);
    };

    if (preset === 'mediterranean') {
      this.model.update((v) => ({
        ...v,
        title: v.title || 'Akdeniz Dengeli Klinik Plan',
        mealsPerDay: 5,
        proteinPct: 25,
        carbPct: 45,
        fatPct: 30,
      }));
      this.mealItemsBySlot.set({
        0: [f('f-egg', 1), f('f-ezine', 1, '2 yemek kaşığı lor'), f('f-sourdough', 1.5), f('f-olive', 1)],
        1: [f('f-apple', 1), f('f-almond', 1)],
        2: [f('f-lentil-soup', 1), f('f-chicken', 1), f('f-bulgur', 1), f('f-salad', 1)],
        3: [f('f-kefir', 1), f('f-walnut', 1)],
        4: [f('f-salmon', 1, 'Izgara çipura'), f('f-green-beans', 1), f('f-yogurt', 1)],
      });
    } else if (preset === 'low-gi') {
      this.model.update((v) => ({
        ...v,
        title: v.title || 'Düşük Glisemik İndeks · Kilo Verme',
        mealsPerDay: 5,
        proteinPct: 30,
        carbPct: 35,
        fatPct: 35,
      }));
      this.mealItemsBySlot.set({
        0: [f('f-omelet', 1), f('f-avocado', 1), f('f-sourdough', 1)],
        1: [f('f-apple', 1), f('f-almond', 1)],
        2: [f('f-chicken', 1), f('f-quinoa', 1), f('f-salad', 1)],
        3: [f('f-greek-yogurt', 1), f('f-walnut', 1)],
        4: [f('f-salmon', 1), f('f-artichoke', 1)],
      });
    } else if (preset === 'athlete') {
      this.model.update((v) => ({
        ...v,
        title: v.title || 'Yüksek Protein · Sporcu Performans Planı',
        mealsPerDay: 5,
        proteinPct: 30,
        carbPct: 45,
        fatPct: 25,
      }));
      this.mealItemsBySlot.set({
        0: [f('f-omelet', 1.5), f('f-oats', 2), f('f-banana', 1), f('f-peanut-butter', 1)],
        1: [f('f-greek-yogurt', 1.5), f('f-walnut', 1)],
        2: [f('f-chicken', 1.5), f('f-bulgur', 2), f('f-ayran', 1), f('f-salad', 1)],
        3: [f('f-whey', 1), f('f-banana', 1), f('f-protein-bar', 1)],
        4: [f('f-meatballs', 1.5), f('f-quinoa', 1.5), f('f-kefir', 1)],
      });
    } else if (preset === 'gluten-free') {
      this.model.update((v) => ({
        ...v,
        title: v.title || 'Glutensiz Anti-İnflamatuar Plan',
        mealsPerDay: 5,
        proteinPct: 25,
        carbPct: 40,
        fatPct: 35,
      }));
      this.mealItemsBySlot.set({
        0: [f('f-egg', 2), f('f-ezine', 1), f('f-buckwheat', 1.5), f('f-avocado', 1)],
        1: [f('f-apple', 1), f('f-almond', 1)],
        2: [f('f-chicken', 1), f('f-quinoa', 1), f('f-salad', 1)],
        3: [f('f-berries', 1), f('f-walnut', 1)],
        4: [f('f-salmon', 1), f('f-artichoke', 1)],
      });
    }
  }

  syncTargetFromMenu(): void {
    const summary = this.menuSummary();
    if (summary.kcal < 800) return;
    const pPct = summary.proteinPct;
    const cPct = summary.carbPct;
    const fPct = Math.max(0, 100 - pPct - cPct);
    this.model.update((v) => ({
      ...v,
      kcal: Math.min(6000, Math.max(800, summary.kcal)),
      proteinPct: pPct,
      carbPct: cPct,
      fatPct: fPct,
    }));
  }

  selectedFoodForSlot(slotIdx: number): string {
    return this.slotFoodSelection()[slotIdx] ?? this.store.foods()[0]?.id ?? '';
  }

  setSelectedFoodForSlot(slotIdx: number, foodId: string): void {
    this.slotFoodSelection.update((cur) => ({ ...cur, [slotIdx]: foodId }));
  }

  addSelectedFoodToMeal(slotIdx: number): void {
    const foodId = this.selectedFoodForSlot(slotIdx);
    const food = this.store.foods().find((f) => f.id === foodId);
    if (!food) return;
    const scaled = scaleFoodItem(food, 1);
    this.mealItemsBySlot.update((cur) => {
      const list = cur[slotIdx] ?? [];
      return { ...cur, [slotIdx]: [...list, scaled] };
    });
  }

  adjustPortion(slotIdx: number, itemIdx: number, delta: number): void {
    this.mealItemsBySlot.update((cur) => {
      const list = [...(cur[slotIdx] ?? [])];
      const current = list[itemIdx];
      if (!current) return cur;
      const nextPortions = Math.max(0.5, round1(current.portions + delta));
      const food = this.store.foods().find((f) => f.id === current.foodId);
      if (food) {
        list[itemIdx] = scaleFoodItem(food, nextPortions, current.alternative);
      } else {
        const factor = nextPortions / current.portions;
        list[itemIdx] = {
          ...current,
          portions: nextPortions,
          grams: Math.round(current.grams * factor),
          kcal: Math.round(current.kcal * factor),
          proteinG: round1(current.proteinG * factor),
          carbG: round1(current.carbG * factor),
          fatG: round1(current.fatG * factor),
          fiberG: round1(current.fiberG * factor),
        };
      }
      return { ...cur, [slotIdx]: list };
    });
  }

  updateMealItemAlternative(slotIdx: number, itemIdx: number, alternative: string): void {
    this.mealItemsBySlot.update((cur) => {
      const list = [...(cur[slotIdx] ?? [])];
      const current = list[itemIdx];
      if (!current) return cur;
      list[itemIdx] = { ...current, alternative: alternative.trim() || undefined };
      return { ...cur, [slotIdx]: list };
    });
  }

  removeFoodFromMeal(slotIdx: number, itemIdx: number): void {
    this.mealItemsBySlot.update((cur) => {
      const list = (cur[slotIdx] ?? []).filter((_, idx) => idx !== itemIdx);
      return { ...cur, [slotIdx]: list };
    });
  }

  patchQuickFood(patch: Partial<ReturnType<typeof this.quickFood>>): void {
    this.quickFood.update((cur) => ({ ...cur, ...patch }));
  }

  saveQuickFood(): void {
    const q = this.quickFood();
    if (!q.name.trim()) return;
    const created = this.store.saveFood({
      name: q.name.trim(),
      brand: 'Klinik Tarif',
      category: q.category,
      exchange: q.exchange,
      unit: q.unit.trim() || '1 porsiyon',
      grams: Math.max(1, Math.round(q.grams)),
      kcal: this.quickFoodKcal(),
      proteinG: round1(q.proteinG),
      carbG: round1(q.carbG),
      fatG: round1(q.fatG),
      fiberG: round1(q.fiberG),
      gi: 'low',
      allergens: [],
    });
    this.slotFoodSelection.update((cur) => ({ ...cur, 0: created.id }));
    this.quickFood.update((cur) => ({ ...cur, name: '' }));
    this.quickFoodOpen.set(false);
    this.notify.success('Yeni besin kütüphaneye eklendi', `${created.name} · ${created.kcal} kcal`);
  }

  save(): void {
    void submit(this.f, async () => {
      const v = this.model();
      const end = new Date(v.startDate);
      end.setDate(end.getDate() + v.weeks! * 7);
      this.store.savePlan({
        clientId: v.clientId,
        title: v.title.trim(),
        startDate: v.startDate,
        endDate: isoDate(end),
        kcal: v.kcal!,
        proteinPct: v.proteinPct!,
        carbPct: v.carbPct!,
        fatPct: v.fatPct!,
        meals: this.meals(),
        status: v.activate ? 'active' : 'draft',
        notes: v.notes.trim(),
      });
      this.notify.success(
        v.activate ? 'Plan kaydedildi ve aktifleştirildi' : 'Plan taslak olarak kaydedildi',
        v.title.trim(),
      );
      this.qa.close();
    });
  }

  private populateDefaultMenu(targetKcal: number, allergies: readonly string[]): void {
    const hasGlutenAllergy = allergies.some((a) => a.toLocaleLowerCase('tr').includes('gluten'));
    const f = (id: string, portions: number, alt?: string) => {
      const found = this.store.foods().find((x) => x.id === id) ?? this.store.foods()[0];
      return scaleFoodItem(found, portions, alt);
    };
    const scale = Math.max(0.75, Math.min(1.5, targetKcal / 1700));
    const r = (n: number) => Math.max(0.5, Math.round(n * 2) / 2);

    this.mealItemsBySlot.set({
      0: [
        f('f-egg', r(1 * scale)),
        f('f-ezine', 1, '2 yemek kaşığı lor peyniri'),
        f(hasGlutenAllergy ? 'f-buckwheat' : 'f-sourdough', r(1.5 * scale)),
        f('f-olive', 1),
      ],
      1: [f('f-apple', 1), f('f-almond', 1)],
      2: [
        f('f-lentil-soup', 1),
        f('f-chicken', r(1 * scale), 'Izgara köfte (120g)'),
        f(hasGlutenAllergy ? 'f-quinoa' : 'f-bulgur', r(1 * scale)),
        f('f-salad', 1),
      ],
      3: [f('f-kefir', 1), f('f-walnut', 1)],
      4: [
        f('f-salmon', r(1 * scale), 'Fırında çipura'),
        f('f-green-beans', 1),
        f('f-yogurt', 1),
      ],
    });
  }

  private empty(): PlanDraft {
    return {
      clientId: '',
      title: '',
      startDate: isoDate(new Date()),
      weeks: 4,
      kcal: null,
      proteinPct: 25,
      carbPct: 45,
      fatPct: 30,
      mealsPerDay: 5,
      activate: true,
      notes: '',
    };
  }
}
