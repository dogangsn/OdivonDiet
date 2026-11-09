import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DietApiService, DietClient } from '../../core/api/diet-api.service';
import { AiNutripilotService, CheatRecoveryInput, CheatRecoveryProtocol } from '../../core/services/ai-nutripilot.service';
import { DietStateService } from '../../core/services/diet-state.service';

export interface ClientDailyMeal {
  id: string;
  name: string;
  time: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  description: string;
  status: 'consumed' | 'skipped' | 'swapped' | 'pending';
  note: string;
}

@Component({
  selector: 'app-client-portal',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="space-y-6">
      <!-- Portal Top Bar / Mode Switcher -->
      <header class="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-violet-200/80 bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-700 p-5 text-white shadow-lg shadow-violet-500/15">
        <div class="flex items-center gap-3">
          <span class="grid size-12 place-items-center rounded-2xl bg-white/15 backdrop-blur-sm">
            <span class="material-symbols-rounded !text-2xl">smartphone</span>
          </span>
          <div>
            <div class="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-violet-200">
              <span class="size-2 rounded-full bg-emerald-400 animate-pulse"></span>
              ODIVON DANIŞAN PORTALI
            </div>
            <h1 class="m-0 text-xl font-black">Mobil Diyet Günlüğü & Canlı Takip</h1>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <!-- Client Selector (For Dietitian Simulation / Switch View) -->
          <div class="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-1.5 backdrop-blur-md">
            <label for="clientSelect" class="text-xs font-bold text-violet-100">Danışan Görünümü:</label>
            <select
              id="clientSelect"
              class="rounded-lg bg-white/20 px-2 py-1 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-white/40"
              [value]="selectedClientId()"
              (change)="onClientChange($any($event.target).value)"
            >
              @for (c of clients(); track c.id) {
                <option [value]="c.id" class="text-slate-900">{{ c.fullName }} ({{ c.programType }})</option>
              }
            </select>
          </div>

          <a routerLink="/clients" class="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/25 transition-colors">
            <span class="material-symbols-rounded !text-sm">arrow_back</span>
            Diyetisyen Masasına Dön
          </a>
        </div>
      </header>

      <!-- Danışan Özet Kartı -->
      <section class="odv-card p-6" aria-label="Danışan bilgileri ve ilerleme">
        <div class="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex items-center gap-4">
            <span class="grid size-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-xl font-black text-white shadow-md">
              {{ currentClient().fullName.charAt(0) }}
            </span>
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="m-0 text-2xl font-black">{{ currentClient().fullName }}</h2>
                <span class="odv-badge-success">3. Hafta · Aktif Plan</span>
                <span class="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-extrabold text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                  {{ currentClient().programType }}
                </span>
              </div>
              <p class="mb-0 mt-1 text-xs text-slate-500">
                Diyetisyen: <strong>Uzm. Dyt. Ayşe Yılmaz</strong> · Klinik: {{ currentClient().clinicBranch }}
              </p>
            </div>
          </div>

          <!-- Kilo İlerleme Çubuğu -->
          <div class="w-full max-w-sm rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-500">Başlangıç: <strong>{{ currentClient().currentWeightKg + 5 }} kg</strong></span>
              <span class="font-black text-violet-700 dark:text-violet-300">Şu An: {{ currentClient().currentWeightKg }} kg</span>
              <span class="text-slate-500">Hedef: <strong>{{ currentClient().targetWeightKg }} kg</strong></span>
            </div>
            <div class="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                class="h-full rounded-full bg-gradient-to-r from-violet-600 to-emerald-500 transition-all duration-500"
                style="width: 55%"
              ></div>
            </div>
            <div class="mt-2 flex items-center justify-between text-[11px] font-bold text-slate-500">
              <span class="text-emerald-600">Toplam -5.0 kg verildi</span>
              <span>Hedefe 10 kg kaldı</span>
            </div>
          </div>
        </div>

        <!-- Günün Metrik Rozetleri -->
        <div class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 border-t border-slate-100 pt-5 dark:border-slate-800">
          <div class="rounded-xl bg-violet-50/60 p-3 dark:bg-violet-950/20">
            <span class="text-[11px] font-bold text-slate-500">Günün Uyum Skoru</span>
            <strong class="mt-1 block text-xl font-black text-violet-700 dark:text-violet-300">%{{ complianceScore() }}</strong>
            <span class="text-[10px] text-slate-500">{{ consumedMealsCount() }} / {{ meals().length }} öğün tamamlandı</span>
          </div>
          <div class="rounded-xl bg-sky-50/60 p-3 dark:bg-sky-950/20">
            <span class="text-[11px] font-bold text-slate-500">Su Tüketimi</span>
            <strong class="mt-1 block text-xl font-black text-sky-600">{{ waterConsumedMl() }} / {{ waterGoalMl() }} ml</strong>
            <span class="text-[10px] text-slate-500">%{{ waterProgressPct() }} hedefe ulaşıldı</span>
          </div>
          <div class="rounded-xl bg-emerald-50/60 p-3 dark:bg-emerald-950/20">
            <span class="text-[11px] font-bold text-slate-500">Hedef Enerji</span>
            <strong class="mt-1 block text-xl font-black text-emerald-600">1.750 kcal</strong>
            <span class="text-[10px] text-slate-500">P90g · K160g · Y65g</span>
          </div>
          <div class="rounded-xl bg-amber-50/60 p-3 dark:bg-amber-950/20">
            <span class="text-[11px] font-bold text-slate-500">Sonraki Görüşme</span>
            <strong class="mt-1 block text-sm font-black text-amber-700 dark:text-amber-300">Yarın 14:30</strong>
            <span class="text-[10px] text-slate-500">Online Video Görüşme</span>
          </div>
        </div>
      </section>

      <!-- Portal Navigation Tabs -->
      <nav class="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2 dark:border-slate-800" aria-label="Portal sekmeleri">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all"
          [class.bg-violet-600]="activeTab() === 'meals'"
          [class.text-white]="activeTab() === 'meals'"
          [class.bg-slate-100]="activeTab() !== 'meals'"
          [class.text-slate-700]="activeTab() !== 'meals'"
          [class.dark:bg-slate-800]="activeTab() !== 'meals'"
          [class.dark:text-slate-300]="activeTab() !== 'meals'"
          (click)="activeTab.set('meals')"
        >
          <span class="material-symbols-rounded !text-base">restaurant</span>
          Bugünkü Öğünler ({{ consumedMealsCount() }}/{{ meals().length }})
        </button>

        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all"
          [class.bg-violet-600]="activeTab() === 'water'"
          [class.text-white]="activeTab() === 'water'"
          [class.bg-slate-100]="activeTab() !== 'water'"
          [class.text-slate-700]="activeTab() !== 'water'"
          [class.dark:bg-slate-800]="activeTab() !== 'water'"
          [class.dark:text-slate-300]="activeTab() !== 'water'"
          (click)="activeTab.set('water')"
        >
          <span class="material-symbols-rounded !text-base">water_drop</span>
          Akıllı Su Sayacı ({{ waterConsumedMl() }} ml)
        </button>

        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all"
          [class.bg-violet-600]="activeTab() === 'cheat'"
          [class.text-white]="activeTab() === 'cheat'"
          [class.bg-slate-100]="activeTab() !== 'cheat'"
          [class.text-slate-700]="activeTab() !== 'cheat'"
          [class.dark:bg-slate-800]="activeTab() !== 'cheat'"
          [class.dark:text-slate-300]="activeTab() !== 'cheat'"
          (click)="activeTab.set('cheat')"
        >
          <span class="material-symbols-rounded !text-base">crisis_alert</span>
          Kaçamak Bildirimi & AI Telafi
        </button>

        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all"
          [class.bg-violet-600]="activeTab() === 'weighin'"
          [class.text-white]="activeTab() === 'weighin'"
          [class.bg-slate-100]="activeTab() !== 'weighin'"
          [class.text-slate-700]="activeTab() !== 'weighin'"
          [class.dark:bg-slate-800]="activeTab() !== 'weighin'"
          [class.dark:text-slate-300]="activeTab() !== 'weighin'"
          (click)="activeTab.set('weighin')"
        >
          <span class="material-symbols-rounded !text-base">monitor_weight</span>
          Haftalık Tartı Bildirimi
        </button>
      </nav>

      <!-- TAB 1: BUGÜNKÜ ÖĞÜNLER -->
      @if (activeTab() === 'meals') {
        <section class="space-y-4" aria-label="Günün öğünleri">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 class="m-0 text-lg font-black">Bugünkü Kişiselleştirilmiş Beslenme Planı</h3>
              <p class="mb-0 mt-0.5 text-xs text-slate-500">
                Tükettiğiniz öğünleri işaretleyin; diyetisyeniniz ilerlemenizi anlık olarak takip eder.
              </p>
            </div>
            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors"
              (click)="sendWhatsAppMealSummary()"
            >
              <span class="material-symbols-rounded !text-sm">chat</span>
              Öğün Uyumunu Diyetisyene Gönder
            </button>
          </div>

          <div class="grid gap-4">
            @for (meal of meals(); track meal.id) {
              <article
                class="odv-card p-5 transition-all"
                [class.border-emerald-300]="meal.status === 'consumed'"
                [class.bg-emerald-50/20]="meal.status === 'consumed'"
                [class.border-rose-300]="meal.status === 'skipped'"
                [class.bg-rose-50/20]="meal.status === 'skipped'"
              >
                <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div class="flex items-start gap-4">
                    <span
                      class="grid size-12 shrink-0 place-items-center rounded-2xl text-lg font-black"
                      [class.bg-emerald-100]="meal.status === 'consumed'"
                      [class.text-emerald-700]="meal.status === 'consumed'"
                      [class.bg-rose-100]="meal.status === 'skipped'"
                      [class.text-rose-700]="meal.status === 'skipped'"
                      [class.bg-violet-100]="meal.status === 'pending' || meal.status === 'swapped'"
                      [class.text-violet-700]="meal.status === 'pending' || meal.status === 'swapped'"
                    >
                      @if (meal.status === 'consumed') {
                        <span class="material-symbols-rounded">check</span>
                      } @else if (meal.status === 'skipped') {
                        <span class="material-symbols-rounded">close</span>
                      } @else {
                        <span class="material-symbols-rounded">restaurant</span>
                      }
                    </span>

                    <div>
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="font-mono text-xs font-bold text-violet-700 dark:text-violet-300">{{ meal.time }}</span>
                        <h4 class="m-0 text-base font-black">{{ meal.name }}</h4>
                        <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {{ meal.calories }} kcal · P:{{ meal.protein }}g · K:{{ meal.carbs }}g · Y:{{ meal.fat }}g
                        </span>
                      </div>
                      <p class="mb-0 mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
                        {{ meal.description }}
                      </p>
                    </div>
                  </div>

                  <!-- Öğün Aksiyon Butonları -->
                  <div class="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      class="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition-all"
                      [class.bg-emerald-600]="meal.status === 'consumed'"
                      [class.text-white]="meal.status === 'consumed'"
                      [class.bg-slate-100]="meal.status !== 'consumed'"
                      [class.text-slate-700]="meal.status !== 'consumed'"
                      (click)="setMealStatus(meal.id, 'consumed')"
                    >
                      <span class="material-symbols-rounded !text-sm">check_circle</span>
                      Tükettim
                    </button>

                    <button
                      type="button"
                      class="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition-all"
                      [class.bg-amber-500]="meal.status === 'swapped'"
                      [class.text-white]="meal.status === 'swapped'"
                      [class.bg-slate-100]="meal.status !== 'swapped'"
                      [class.text-slate-700]="meal.status !== 'swapped'"
                      (click)="setMealStatus(meal.id, 'swapped')"
                    >
                      <span class="material-symbols-rounded !text-sm">swap_horiz</span>
                      Değiştirdim
                    </button>

                    <button
                      type="button"
                      class="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition-all"
                      [class.bg-rose-600]="meal.status === 'skipped'"
                      [class.text-white]="meal.status === 'skipped'"
                      [class.bg-slate-100]="meal.status !== 'skipped'"
                      [class.text-slate-700]="meal.status !== 'skipped'"
                      (click)="setMealStatus(meal.id, 'skipped')"
                    >
                      <span class="material-symbols-rounded !text-sm">cancel</span>
                      Atladım
                    </button>
                  </div>
                </div>
              </article>
            }
          </div>
        </section>
      }

      <!-- TAB 2: AKILLI SU TAKİPÇİSİ -->
      @if (activeTab() === 'water') {
        <section class="odv-card p-6" aria-label="Akıllı su sayacı">
          <div class="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div class="space-y-3">
              <span class="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1 text-xs font-extrabold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                <span class="material-symbols-rounded !text-sm">water_drop</span>
                GÜNLÜK HİDRASYON HEDEFİ
              </span>
              <h3 class="m-0 text-2xl font-black">2.500 ml Su Hedefi</h3>
              <p class="max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                Yeterli su tüketimi, ödem atımını hızlandırır, böbrek filtrasyonunu destekler ve açlık-tokluk sinyallerini regüle eder.
              </p>

              <!-- Su İlerleme Çubuğu -->
              <div class="space-y-1.5 pt-2">
                <div class="flex items-center justify-between text-xs font-bold">
                  <span class="text-sky-600">{{ waterConsumedMl() }} ml tüketildi</span>
                  <span class="text-slate-500">Kalan: {{ remainingWaterMl() }} ml</span>
                </div>
                <div class="h-4 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    class="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-600 transition-all duration-300"
                    [style.width.%]="waterProgressPct()"
                  ></div>
                </div>
              </div>
            </div>

            <!-- İnteraktif Bardak Izgarası -->
            <div class="rounded-2xl border border-sky-100 bg-sky-50/50 p-6 dark:border-sky-900/40 dark:bg-sky-950/20">
              <h4 class="mb-4 text-xs font-extrabold uppercase tracking-wider text-sky-800 dark:text-sky-200">
                10 Bardak Su Takibi (Tıkla ve Doldur)
              </h4>
              <div class="grid grid-cols-5 gap-3">
                @for (glassIndex of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; track glassIndex) {
                  <button
                    type="button"
                    class="grid size-12 place-items-center rounded-2xl border transition-all"
                    [class.bg-sky-500]="glassIndex * 250 <= waterConsumedMl()"
                    [class.border-sky-500]="glassIndex * 250 <= waterConsumedMl()"
                    [class.text-white]="glassIndex * 250 <= waterConsumedMl()"
                    [class.shadow-md]="glassIndex * 250 <= waterConsumedMl()"
                    [class.bg-white]="glassIndex * 250 > waterConsumedMl()"
                    [class.border-sky-200]="glassIndex * 250 > waterConsumedMl()"
                    [class.text-sky-300]="glassIndex * 250 > waterConsumedMl()"
                    (click)="setWaterByGlasses(glassIndex)"
                  >
                    <span class="material-symbols-rounded !text-2xl">local_drink</span>
                  </button>
                }
              </div>

              <div class="mt-5 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  class="inline-flex items-center gap-1 rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-sky-700 transition-colors"
                  (click)="addWater(250)"
                >
                  <span class="material-symbols-rounded !text-sm">add</span>+250 ml (1 Bardak)
                </button>
                <button
                  type="button"
                  class="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition-colors"
                  (click)="addWater(500)"
                >
                  <span class="material-symbols-rounded !text-sm">add</span>+500 ml (1 Şişe)
                </button>
                <button
                  type="button"
                  class="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors dark:border-slate-700"
                  (click)="resetWater()"
                >
                  Sıfırla
                </button>
              </div>
            </div>
          </div>
        </section>
      }

      <!-- TAB 3: KAÇAMAK BİLDİRİMİ VE ANLIK AI TELAFİ -->
      @if (activeTab() === 'cheat') {
        <section class="odv-card p-6" aria-label="Kaçamak bildirimi">
          <div class="grid gap-8 lg:grid-cols-2">
            <div class="space-y-4">
              <div>
                <span class="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-xs font-extrabold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                  <span class="material-symbols-rounded !text-sm">psychology</span>
                  SUÇLULUK YOK, BİLİMSEL TELAFİ VAR
                </span>
                <h3 class="mb-1 mt-2 text-xl font-black">Kaçamak Yaptım, Ne Yapmalıyım?</h3>
                <p class="text-xs leading-5 text-slate-500">
                  Plan dışı bir besin tükettiğinizde süreci bozmanıza gerek yok. AI NutriPilot önümüzdeki 48 saat için glikojen boşaltıcı telafi planınızı hazırlar.
                </p>
              </div>

              <div class="space-y-3">
                <label class="block">
                  <span class="mb-1 block text-xs font-bold">Kaçamak Türü</span>
                  <select
                    class="odv-input"
                    [value]="cheatFoodType()"
                    (change)="cheatFoodType.set($any($event.target).value)"
                  >
                    <option value="tatli">Tatlı / Pasta / Çikolata</option>
                    <option value="hamurisi">Pizza / Börek / Hamurişi</option>
                    <option value="fastfood">Burger / Kızartma / Fast Food</option>
                    <option value="alkol">Alkol / Kokteyl</option>
                    <option value="gece">Gece Geç Saat Atıştırmalığı</option>
                  </select>
                </label>

                <label class="block">
                  <span class="mb-1 block text-xs font-bold">Tahmini Ekstra Kalori</span>
                  <select
                    class="odv-input"
                    [value]="cheatCalories()"
                    (change)="cheatCalories.set(+$any($event.target).value)"
                  >
                    <option [value]="350">Hafif Kaçamak (yaklaşık +350 kcal)</option>
                    <option [value]="650">Orta Kaçamak (yaklaşık +650 kcal)</option>
                    <option [value]="1100">Büyük Kaçamak (yaklaşık +1.100 kcal)</option>
                  </select>
                </label>

                <label class="block">
                  <span class="mb-1 block text-xs font-bold">Danışan Notu (Opsiyonel)</span>
                  <input
                    class="odv-input"
                    placeholder="Örn. Arkadaş doğum gününde 1 dilim çikolatalı pasta yedim"
                    [value]="cheatNote()"
                    (input)="cheatNote.set($any($event.target).value)"
                  />
                </label>

                <button
                  type="button"
                  class="odv-btn-primary w-full justify-center"
                  (click)="calculateCheatRecovery()"
                >
                  <span class="material-symbols-rounded">auto_awesome</span>
                  Anında AI Telafi Planı Üret
                </button>
              </div>
            </div>

            <!-- AI Recovery Output Card -->
            <div class="rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-50/70 to-indigo-50/40 p-6 dark:border-violet-900/60 dark:from-violet-950/20 dark:to-slate-900">
              @if (cheatPlan(); as plan) {
                <div class="space-y-4">
                  <div class="flex items-center justify-between">
                    <span class="odv-badge-success">AI NutriPilot Telafi Reçetesi</span>
                    <span class="text-xs font-bold text-violet-700 dark:text-violet-300">48 Saatlik Kompanzasyon</span>
                  </div>

                  <h4 class="m-0 text-base font-black text-slate-900 dark:text-white">
                    Glikojen Boşaltıcı Telafi Protokolü
                  </h4>

                  <div class="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
                    <div class="rounded-xl bg-white p-3 shadow-sm dark:bg-slate-800">
                      <strong class="block text-violet-700 dark:text-violet-300">Ekstra Hidrasyon:</strong>
                      <span>{{ plan.hydrationPlan }}</span>
                    </div>

                    <div class="rounded-xl bg-white p-3 shadow-sm dark:bg-slate-800">
                      <strong class="block text-violet-700 dark:text-violet-300">Önerilen Aktivite:</strong>
                      <span>{{ plan.activityPrescription }}</span>
                    </div>

                    <div class="rounded-xl bg-white p-3 shadow-sm dark:bg-slate-800">
                      <strong class="block text-violet-700 dark:text-violet-300">Sonraki 48 Saat Stratejisi:</strong>
                      <ul class="mb-0 mt-1 list-disc ps-4 leading-5 space-y-1">
                        @for (adj of plan.nextDayDietAdjustments; track adj) {
                          <li>{{ adj }}</li>
                        }
                      </ul>
                    </div>

                    <div class="rounded-xl bg-emerald-50 p-3 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                      <strong class="block">Diyetisyen Mesajı:</strong>
                      <p class="mb-0 mt-1 leading-5 italic">"{{ plan.mindsetNote }}"</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    class="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors"
                    (click)="sendCheatUpdateViaWhatsApp()"
                  >
                    <span class="material-symbols-rounded !text-sm">chat</span>
                    Diyetisyene Kaçamak & Telafiyi Bildir
                  </button>
                </div>
              } @else {
                <div class="grid h-full place-items-center text-center p-8">
                  <div>
                    <span class="grid size-14 place-items-center rounded-2xl bg-violet-100 text-violet-600 mx-auto dark:bg-violet-950 dark:text-violet-400">
                      <span class="material-symbols-rounded !text-3xl">psychology</span>
                    </span>
                    <h4 class="mt-3 text-sm font-black">Telafi Planınız Burada Görünecek</h4>
                    <p class="mt-1 text-xs text-slate-500">
                      Kaçamak detaylarınızı seçip "Anında AI Telafi Planı Üret" butonuna basın.
                    </p>
                  </div>
                </div>
              }
            </div>
          </div>
        </section>
      }

      <!-- TAB 4: HAFTALIK TARTI VE BİYOMETRİK BİLDİRİM -->
      @if (activeTab() === 'weighin') {
        <section class="odv-card p-6" aria-label="Haftalık tartı bildirimi">
          <div class="grid gap-8 lg:grid-cols-2">
            <div class="space-y-4">
              <div>
                <span class="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-xs font-extrabold text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                  <span class="material-symbols-rounded !text-sm">scale</span>
                  HAFTALIK ÖLÇÜM KONTROLÜ
                </span>
                <h3 class="mb-1 mt-2 text-xl font-black">Tartı & Mezura Bildirimi</h3>
                <p class="text-xs leading-5 text-slate-500">
                  Sabah aç karnına ve tuvalet sonrası ölçümünüzü girin. Diyetisyeninizin paneline anında yansır.
                </p>
              </div>

              <div class="space-y-3">
                <div class="grid grid-cols-2 gap-3">
                  <label class="block">
                    <span class="mb-1 block text-xs font-bold">Açlık Kilosu (kg)</span>
                    <input
                      type="number"
                      step="0.1"
                      class="odv-input font-mono font-bold text-base"
                      [value]="weighInWeight()"
                      (input)="weighInWeight.set(+$any($event.target).value)"
                    />
                  </label>
                  <label class="block">
                    <span class="mb-1 block text-xs font-bold">Bel Çevresi (cm)</span>
                    <input
                      type="number"
                      class="odv-input font-mono font-bold text-base"
                      [value]="weighInWaist()"
                      (input)="weighInWaist.set(+$any($event.target).value)"
                    />
                  </label>
                </div>

                <label class="block">
                  <span class="mb-1 block text-xs font-bold">Tartı Notu / Kendinizi Nasıl Hissediyorsunuz?</span>
                  <textarea
                    rows="2"
                    class="odv-input"
                    placeholder="Örn. Bu hafta şişkinliğim çok azaldı, enerji seviyem çok yüksekti."
                    [value]="weighInNote()"
                    (input)="weighInNote.set($any($event.target).value)"
                  ></textarea>
                </label>

                <button
                  type="button"
                  class="odv-btn-primary w-full justify-center"
                  (click)="saveWeighIn()"
                >
                  <span class="material-symbols-rounded">save</span>
                  Ölçümü Kaydet & Diyetisyene İlet
                </button>
              </div>
            </div>

            <!-- Tartı Başarı Özeti -->
            <div class="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-6 dark:border-slate-800 dark:bg-slate-900/40">
              <div class="space-y-4">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-slate-500">Önceki Ölçüme Göre Değişim</span>
                  <span class="odv-badge-success">-400 gr Bu Hafta</span>
                </div>

                <div class="grid grid-cols-2 gap-3 text-center">
                  <div class="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-800">
                    <span class="text-xs text-slate-500">Geçen Hafta</span>
                    <strong class="mt-1 block text-2xl font-black">68.6 kg</strong>
                  </div>
                  <div class="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-800">
                    <span class="text-xs text-slate-500">Bu Haftaki Tartı</span>
                    <strong class="mt-1 block text-2xl font-black text-emerald-600">{{ weighInWeight() }} kg</strong>
                  </div>
                </div>

                <div class="rounded-xl bg-violet-50/80 p-4 text-xs leading-5 text-violet-900 dark:bg-violet-950/40 dark:text-violet-200">
                  <strong>Klinik İlerleme:</strong> Toplamda 5.0 kg hafiflediniz. Bel çevreniz 4 cm inceldi. Tebrikler, harika bir disiplinle ilerliyorsunuz!
                </div>
              </div>

              <div class="mt-6 border-t border-slate-200 pt-4 dark:border-slate-800">
                <button
                  type="button"
                  class="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors"
                  (click)="sendWeighInViaWhatsApp()"
                >
                  <span class="material-symbols-rounded !text-sm">chat</span>
                  WhatsApp ile Diyetisyene Raporla
                </button>
              </div>
            </div>
          </div>
        </section>
      }
    </div>
  `,
})
export class ClientPortalComponent {
  private readonly dietApi = inject(DietApiService);
  private readonly aiPilot = inject(AiNutripilotService);
  private readonly dietState = inject(DietStateService);

  readonly selectedClientId = signal<number>(1);
  readonly activeTab = signal<'meals' | 'water' | 'cheat' | 'weighin'>('meals');

  readonly clients = signal<DietClient[]>([
    {
      id: 1,
      fullName: 'Elif Kaya',
      phone: '+905321002030',
      age: 32,
      gender: 'female',
      heightCm: 165,
      currentWeightKg: 68.2,
      targetWeightKg: 58.0,
      clinicBranch: 'Levent Klinik',
      programType: 'PCOS & Düşük Glisemik İndeks',
      status: 'active',
      allergies: ['Gluten', 'Laktoz'],
      clinicalDiagnoses: ['PCOS', 'İnsülin Direnci'],
      createdAt: '2026-10-15',
      updatedAt: '2026-11-08',
    },
    {
      id: 2,
      fullName: 'Mert Yıldız',
      phone: '+905332003040',
      age: 28,
      gender: 'male',
      heightCm: 182,
      currentWeightKg: 84.1,
      targetWeightKg: 80.0,
      clinicBranch: 'Bağdat Caddesi Şube',
      programType: 'Hipertrofi & Sporcu Beslenmesi',
      status: 'active',
      allergies: [],
      clinicalDiagnoses: ['Demir Eksikliği'],
      createdAt: '2026-10-20',
      updatedAt: '2026-11-06',
    },
    {
      id: 3,
      fullName: 'Selin Aras',
      phone: '+905353004050',
      age: 41,
      gender: 'female',
      heightCm: 162,
      currentWeightKg: 76.4,
      targetWeightKg: 62.0,
      clinicBranch: 'Online Seans / Zoom',
      programType: 'Haşimato & Anti-İnflamatuar',
      status: 'active',
      allergies: [],
      clinicalDiagnoses: ['Haşimato'],
      createdAt: '2026-10-24',
      updatedAt: '2026-11-04',
    },
  ]);

  readonly currentClient = computed(() => {
    return this.clients().find((c) => c.id === this.selectedClientId()) ?? this.clients()[0];
  });

  // Meals State
  readonly meals = signal<ClientDailyMeal[]>([
    {
      id: 'm1',
      name: 'Sabah Kahvaltısı',
      time: '08:30',
      calories: 420,
      protein: 24,
      carbs: 28,
      fat: 18,
      description: '2 adet haşlanmış organik yumurta, 50g lor peyniri, 5 adet az tuzlu zeytin, bol mevsim yeşilliği (roka, dereotu, maydanoz), 1 dilim ekşi mayalı karabuğday ekmeği.',
      status: 'consumed',
      note: '',
    },
    {
      id: 'm2',
      name: 'Kuşluk Ara Öğünü',
      time: '11:00',
      calories: 160,
      protein: 4,
      carbs: 16,
      fat: 8,
      description: '1 fincan sade filtre kahve, 10 adet çiğ badem, 1 dilim taze ananas (bromelain desteği).',
      status: 'consumed',
      note: '',
    },
    {
      id: 'm3',
      name: 'Öğle Yemeği',
      time: '13:30',
      calories: 540,
      protein: 45,
      carbs: 42,
      fat: 12,
      description: '150g ızgara hindi göğsü veya tavuk, 6 yemek kaşığı kinoalı Akdeniz salatası (1 tatlı kaşığı zeytinyağı ile), 1 kase probiyotik yoğurt.',
      status: 'consumed',
      note: '',
    },
    {
      id: 'm4',
      name: 'İkindi Ara Öğünü',
      time: '16:30',
      calories: 180,
      protein: 9,
      carbs: 18,
      fat: 6,
      description: '1 su bardağı ev yapımı kefir, 1 tatlı kaşığı chia tohumu, 1 avuç yaban mersini.',
      status: 'pending',
      note: '',
    },
    {
      id: 'm5',
      name: 'Akşam Yemeği',
      time: '19:30',
      calories: 450,
      protein: 38,
      carbs: 12,
      fat: 22,
      description: 'Fırında levrek veya somon fileto (180g), buharda brokoli ve kuşkonmaz, zeytinyağlı limonlu yeşil salata.',
      status: 'pending',
      note: '',
    },
  ]);

  readonly consumedMealsCount = computed(() => this.meals().filter((m) => m.status === 'consumed').length);
  readonly complianceScore = computed(() => {
    const total = this.meals().length;
    if (total === 0) return 100;
    const consumed = this.meals().filter((m) => m.status === 'consumed').length;
    const swapped = this.meals().filter((m) => m.status === 'swapped').length;
    return Math.round(((consumed * 1.0 + swapped * 0.7) / total) * 100);
  });

  // Water State
  readonly waterGoalMl = signal<number>(2500);
  readonly waterConsumedMl = signal<number>(1750);
  readonly remainingWaterMl = computed(() => Math.max(0, this.waterGoalMl() - this.waterConsumedMl()));
  readonly waterProgressPct = computed(() => Math.min(100, Math.round((this.waterConsumedMl() / this.waterGoalMl()) * 100)));

  // Cheat Logger State
  readonly cheatFoodType = signal<string>('tatli');
  readonly cheatCalories = signal<number>(650);
  readonly cheatNote = signal<string>('');
  readonly cheatPlan = signal<CheatRecoveryProtocol | null>(null);

  // WeighIn State
  readonly weighInWeight = signal<number>(68.2);
  readonly weighInWaist = signal<number>(74);
  readonly weighInNote = signal<string>('Şişkinlik azaldı, enerji çok iyi.');

  onClientChange(idStr: string): void {
    const id = Number(idStr);
    this.selectedClientId.set(id);
    const client = this.currentClient();
    this.dietState.selectClientForAi(client);
    this.weighInWeight.set(client.currentWeightKg);
  }

  setMealStatus(mealId: string, status: 'consumed' | 'skipped' | 'swapped'): void {
    this.meals.update((list) =>
      list.map((m) => (m.id === mealId ? { ...m, status } : m)),
    );
  }

  setWaterByGlasses(glasses: number): void {
    this.waterConsumedMl.set(glasses * 250);
  }

  addWater(ml: number): void {
    this.waterConsumedMl.update((curr) => Math.min(4000, curr + ml));
  }

  resetWater(): void {
    this.waterConsumedMl.set(0);
  }

  calculateCheatRecovery(): void {
    const calories = this.cheatCalories();
    const severity = calories > 1000 ? 'heavy' : calories > 500 ? 'moderate' : 'mild';
    const input: CheatRecoveryInput = {
      cheatFood: this.cheatFoodType(),
      estimatedExtraKcal: calories,
      severity,
    };
    const plan = this.aiPilot.simulateRecovery(input);
    this.cheatPlan.set(plan);
  }

  saveWeighIn(): void {
    this.currentClient().currentWeightKg = this.weighInWeight();
    this.dietApi.saveClient({
      id: this.currentClient().id,
      currentWeightKg: this.weighInWeight(),
    }).subscribe();
  }

  sendWhatsAppMealSummary(): void {
    const client = this.currentClient();
    const phone = client.phone?.replace(/\D/g, '') || '905321002030';
    const text = encodeURIComponent(
      `Merhaba Hocam! Ben ${client.fullName}.\n\nBugünkü Diyet Uyumum: %${this.complianceScore()}\nTamamlanan Öğünler: ${this.consumedMealsCount()} / ${this.meals().length}\nSu Tüketimim: ${this.waterConsumedMl()} ml\n\nHer şey yolunda, programa sadık kalmaya devam ediyorum! 🌿`,
    );
    window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${text}`, '_blank');
  }

  sendCheatUpdateViaWhatsApp(): void {
    const client = this.currentClient();
    const phone = client.phone?.replace(/\D/g, '') || '905321002030';
    const plan = this.cheatPlan();
    const note = plan ? plan.mindsetNote : 'Telafi protokolü uygulandı.';
    const text = encodeURIComponent(
      `Merhaba Hocam, ben ${client.fullName}.\n\nBugün ${this.cheatCalories()} kcal kaçamak bildirdim. AI NutriPilot telafi protokolünü başlattım:\n- Hidrasyon: ${plan?.hydrationPlan ?? 'Ekstra su'}\n- Aktivite: ${plan?.activityPrescription ?? '35 dk yürüyüş'}\n- Not: ${note}\n\nBilginize sunarım!`,
    );
    window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${text}`, '_blank');
  }

  sendWeighInViaWhatsApp(): void {
    const client = this.currentClient();
    const phone = client.phone?.replace(/\D/g, '') || '905321002030';
    const text = encodeURIComponent(
      `Merhaba Hocam! Ben ${client.fullName}.\n\nHaftalık Açlık Tartı Bildirimim:\n- Kilo: ${this.weighInWeight()} kg\n- Bel: ${this.weighInWaist()} cm\n- Notum: ${this.weighInNote()}\n\nDeğerlendirme için sevgiler! 🎯`,
    );
    window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${text}`, '_blank');
  }
}
