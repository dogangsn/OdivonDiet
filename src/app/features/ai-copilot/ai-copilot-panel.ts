import { Component, computed, inject, signal } from '@angular/core';
import { DietApiService } from '../../core/api/diet-api.service';
import {
  ActivityLevel,
  AiNutripilotService,
  CheatRecoveryInput,
  CheatRecoveryProtocol,
  ConsultationInput,
  DietGoal,
  DietType,
  Gender,
  LabFinding,
  LabInput,
  MealPlanDay,
  MetabolicInput,
  MetabolicOutput,
} from '../../core/services/ai-nutripilot.service';
import { DietStateService } from '../../core/services/diet-state.service';

@Component({
  selector: 'app-ai-copilot-panel',
  template: `
    <section class="space-y-6">
      <!-- Active Client Context Alert (if selected from client list) -->
      @if (activeClient(); as client) {
        <div
          class="no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-300 bg-emerald-50/90 px-5 py-3.5 text-xs text-emerald-950 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
        >
          <div class="flex items-center gap-2.5">
            <span class="material-symbols-rounded !text-lg text-emerald-600 dark:text-emerald-400">
              account_circle
            </span>
            <span>
              Aktif Danışan: <strong>{{ client.fullName }}</strong> ({{ client.clinicBranch }}) ·
              {{ client.age }} yaş, {{ client.currentWeightKg }} kg · {{ client.programType }}
            </span>
          </div>
          <button
            type="button"
            class="font-bold text-emerald-800 underline hover:text-emerald-950 dark:text-emerald-300"
            (click)="clearActiveClient()"
          >
            Danışan Bağlantısını Sıfırla
          </button>
        </div>
      }

      <!-- Top Hero Banner -->
      <div
        class="no-print relative overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-br from-slate-950 via-violet-950 to-indigo-950 p-6 text-white shadow-xl sm:p-8"
      >
        <div
          class="pointer-events-none absolute -end-16 -top-20 size-72 rounded-full bg-violet-500/20 blur-3xl"
        ></div>
        <div class="relative flex flex-wrap items-center justify-between gap-6">
          <div class="max-w-2xl">
            <div
              class="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/20 px-3 py-1 text-xs font-black uppercase tracking-widest text-violet-300"
            >
              <span class="size-2 animate-pulse rounded-full bg-emerald-400"></span>
              ODIVON AI NUTRIPILOT V2.0
            </div>
            <h2 class="m-0 text-2xl font-black tracking-tight sm:text-3xl">
              Yapay Zekâ Klinik Diyetisyen Karar Desteği
            </h2>
            <p class="mb-0 mt-2 text-sm leading-6 text-slate-300">
              Mifflin-St Jeor metabolik formülasyonu, kan tahlili biyobelirteç analizi, akıllı kaçamak
              telafi simülasyonu, tek tıkla PDF çıktı ve doğrudan WhatsApp danışan iletişimi.
            </p>
          </div>
          <div class="flex items-center gap-2">
            <span
              class="grid size-14 place-items-center rounded-2xl bg-white/10 text-violet-300 ring-1 ring-white/20"
            >
              <span class="material-symbols-rounded !text-4xl">psychology</span>
            </span>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <nav aria-label="AI NutriPilot Sekmeleri" class="mt-8 flex flex-wrap gap-2">
          <button
            type="button"
            class="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all"
            [class.bg-white]="activeTab() === 'menu'"
            [class.text-slate-950]="activeTab() === 'menu'"
            [class.shadow-md]="activeTab() === 'menu'"
            [class.bg-white/10]="activeTab() !== 'menu'"
            [class.text-white]="activeTab() !== 'menu'"
            (click)="activeTab.set('menu')"
          >
            <span class="material-symbols-rounded !text-lg">restaurant</span>
            Kişiye Özel Menü & Makro
          </button>
          <button
            type="button"
            class="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all"
            [class.bg-white]="activeTab() === 'labs'"
            [class.text-slate-950]="activeTab() === 'labs'"
            [class.shadow-md]="activeTab() === 'labs'"
            [class.bg-white/10]="activeTab() !== 'labs'"
            [class.text-white]="activeTab() !== 'labs'"
            (click)="activeTab.set('labs')"
          >
            <span class="material-symbols-rounded !text-lg">bloodtype</span>
            Kan Tahlili & Biyobelirteç
          </button>
          <button
            type="button"
            class="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all"
            [class.bg-white]="activeTab() === 'recovery'"
            [class.text-slate-950]="activeTab() === 'recovery'"
            [class.shadow-md]="activeTab() === 'recovery'"
            [class.bg-white/10]="activeTab() !== 'recovery'"
            [class.text-white]="activeTab() !== 'recovery'"
            (click)="activeTab.set('recovery')"
          >
            <span class="material-symbols-rounded !text-lg">refresh</span>
            Kaçamak & Telafi Simülatörü
          </button>
          <button
            type="button"
            class="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all"
            [class.bg-white]="activeTab() === 'consultation'"
            [class.text-slate-950]="activeTab() === 'consultation'"
            [class.shadow-md]="activeTab() === 'consultation'"
            [class.bg-white/10]="activeTab() !== 'consultation'"
            [class.text-white]="activeTab() !== 'consultation'"
            (click)="activeTab.set('consultation')"
          >
            <span class="material-symbols-rounded !text-lg">forum</span>
            Seans Özeti & Motivasyon
          </button>
        </nav>
      </div>

      <!-- TAB 1: SMART MENU & MACRO PLANNER -->
      @if (activeTab() === 'menu') {
        <div class="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          <!-- Input Card -->
          <section class="no-print odv-card p-6" aria-labelledby="menu-params-title">
            <div
              class="mb-5 flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800"
            >
              <div>
                <h3 id="menu-params-title" class="m-0 text-base font-black">
                  Biyometrik ve Klinik Parametreler
                </h3>
                <p class="mb-0 mt-0.5 text-xs text-slate-500">
                  Kişiselleştirilmiş beslenme reçetesi için girdiler
                </p>
              </div>
              <button type="button" class="odv-btn-soft text-xs" (click)="loadDemoMenuData()">
                Örnek Vaka Yükle
              </button>
            </div>

            <!-- Client Identity row -->
            <div class="mb-4 grid gap-3 sm:grid-cols-2">
              <label class="block">
                <span class="mb-1 block text-xs font-bold">Danışan Adı Soyadı</span>
                <input
                  type="text"
                  class="odv-input"
                  [value]="clientName()"
                  (input)="clientName.set($any($event.target).value)"
                  placeholder="Danışan adı"
                />
              </label>
              <label class="block">
                <span class="mb-1 block text-xs font-bold">Danışan Telefonu (WhatsApp)</span>
                <input
                  type="tel"
                  class="odv-input"
                  [value]="clientPhone()"
                  (input)="clientPhone.set($any($event.target).value)"
                  placeholder="+90 5xx xxx xx xx"
                />
              </label>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <label class="block">
                <span class="mb-1 block text-xs font-bold">Cinsiyet</span>
                <select
                  class="odv-input"
                  [value]="menuParams().gender"
                  (change)="updateMenuParam('gender', $any($event.target).value)"
                >
                  <option value="female">Kadın</option>
                  <option value="male">Erkek</option>
                </select>
              </label>

              <label class="block">
                <span class="mb-1 block text-xs font-bold">Yaş</span>
                <input
                  type="number"
                  class="odv-input"
                  [value]="menuParams().age"
                  (input)="updateMenuParam('age', +$any($event.target).value)"
                />
              </label>

              <label class="block">
                <span class="mb-1 block text-xs font-bold">Kilo (kg)</span>
                <input
                  type="number"
                  class="odv-input"
                  [value]="menuParams().weightKg"
                  (input)="updateMenuParam('weightKg', +$any($event.target).value)"
                />
              </label>

              <label class="block">
                <span class="mb-1 block text-xs font-bold">Boy (cm)</span>
                <input
                  type="number"
                  class="odv-input"
                  [value]="menuParams().heightCm"
                  (input)="updateMenuParam('heightCm', +$any($event.target).value)"
                />
              </label>

              <label class="block sm:col-span-2">
                <span class="mb-1 block text-xs font-bold">Fiziksel Aktivite Seviyesi</span>
                <select
                  class="odv-input"
                  [value]="menuParams().activity"
                  (change)="updateMenuParam('activity', $any($event.target).value)"
                >
                  <option value="sedentary">Masa Başı / Hareketsiz (x1.2)</option>
                  <option value="light">Hafif Hareketli - haftada 1-2 gün yürüyüş (x1.375)</option>
                  <option value="moderate">Orta Düzey - haftada 3-4 gün antrenman (x1.55)</option>
                  <option value="very_active">
                    Yüksek Aktif - haftada 5-6 gün yoğun spor (x1.725)
                  </option>
                  <option value="athlete">Profesyonel Sporcu / Ağır İş (x1.9)</option>
                </select>
              </label>

              <label class="block">
                <span class="mb-1 block text-xs font-bold">Hedef</span>
                <select
                  class="odv-input"
                  [value]="menuParams().goal"
                  (change)="updateMenuParam('goal', $any($event.target).value)"
                >
                  <option value="lose_weight">Kilo Verme (-500 kcal)</option>
                  <option value="burn_fat">Yağ Yakımı & Sıkılaşma (-350 kcal)</option>
                  <option value="maintain">Kilo Koruma (Dengeli)</option>
                  <option value="build_muscle">Kas Artışı (+300 kcal)</option>
                  <option value="gain_weight">Sağlıklı Kilo Alma (+500 kcal)</option>
                </select>
              </label>

              <label class="block">
                <span class="mb-1 block text-xs font-bold">Beslenme Modeli</span>
                <select
                  class="odv-input"
                  [value]="menuParams().dietType"
                  (change)="updateMenuParam('dietType', $any($event.target).value)"
                >
                  <option value="mediterranean">Akdeniz Diyeti (Dengeli)</option>
                  <option value="insulin_resistance">İnsülin Direnci / Düşük Gİ</option>
                  <option value="high_protein">Yüksek Protein & Sporcu</option>
                  <option value="keto">Ketojenik (Düşük Karb)</option>
                  <option value="low_fodmap">Düşük FODMAP (IBS/Şişkinlik)</option>
                  <option value="vegan">Bitkisel / Vegan</option>
                </select>
              </label>
            </div>

            <div class="mt-4">
              <span class="mb-2 block text-xs font-bold">Hassasiyetler & Eliminasyon</span>
              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  class="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
                  [class.bg-violet-600]="hasIntolerance('Gluten')"
                  [class.text-white]="hasIntolerance('Gluten')"
                  [class.bg-slate-100]="!hasIntolerance('Gluten')"
                  [class.dark:bg-slate-800]="!hasIntolerance('Gluten')"
                  (click)="toggleIntolerance('Gluten')"
                >
                  Glutensiz
                </button>
                <button
                  type="button"
                  class="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
                  [class.bg-violet-600]="hasIntolerance('Laktos')"
                  [class.text-white]="hasIntolerance('Laktos')"
                  [class.bg-slate-100]="!hasIntolerance('Laktos')"
                  [class.dark:bg-slate-800]="!hasIntolerance('Laktos')"
                  (click)="toggleIntolerance('Laktos')"
                >
                  Laktozsuz
                </button>
              </div>
            </div>

            <button
              type="button"
              class="odv-btn-primary mt-6 w-full justify-center"
              (click)="generateMealPlan()"
            >
              <span class="material-symbols-rounded">auto_awesome</span>
              Klinik Planı & Makroları Hesapla
            </button>
          </section>

          <!-- Results Card -->
          <section class="space-y-6">
            <!-- Action Toolbar for Export / WhatsApp / MainAPI -->
            <div
              class="no-print flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div class="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                <span class="material-symbols-rounded text-violet-600">output</span>
                Reçete Dışa Aktarma:
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  class="odv-btn-soft text-xs"
                  (click)="printPlan()"
                  title="PDF olarak kaydet veya yazdır"
                >
                  <span class="material-symbols-rounded !text-base">print</span>
                  PDF / Yazdır
                </button>
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
                  (click)="sendMenuViaWhatsApp()"
                  title="Danışana WhatsApp ile menü özeti gönder"
                >
                  <span class="material-symbols-rounded !text-base">chat</span>
                  WhatsApp ile Gönder
                </button>
                <button
                  type="button"
                  class="odv-btn-primary text-xs !py-2"
                  (click)="savePlanToMainApi()"
                  title="MainAPI veritabanına kaydet"
                >
                  <span class="material-symbols-rounded !text-base">cloud_upload</span>
                  MainAPI'ye Kaydet
                </button>
              </div>
            </div>

            @if (planSavedSuccess()) {
              <div
                class="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
              >
                Plan MainAPI beslenme kayıtlarına başarıyla kaydedildi!
              </div>
            }

            <!-- Metabolic KPI Overview -->
            @if (metabolicResult(); as meta) {
              <div class="grid gap-3 sm:grid-cols-4">
                <div class="odv-card p-4">
                  <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Bazal Metabolizma
                  </span>
                  <strong class="mt-1 block text-2xl font-black">
                    {{ meta.bmr }} <small class="text-xs font-normal">kcal</small>
                  </strong>
                  <span class="text-[11px] text-slate-500">Mifflin-St Jeor</span>
                </div>
                <div class="odv-card p-4">
                  <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Günlük Harcama (TDEE)
                  </span>
                  <strong class="mt-1 block text-2xl font-black">
                    {{ meta.tdee }} <small class="text-xs font-normal">kcal</small>
                  </strong>
                  <span class="text-[11px] text-slate-500">Aktivite katsayılı</span>
                </div>
                <div
                  class="odv-card border-violet-200 bg-violet-50/50 p-4 dark:border-violet-800 dark:bg-violet-950/20"
                >
                  <span
                    class="text-[10px] font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300"
                  >
                    Hedef Kalori
                  </span>
                  <strong
                    class="mt-1 block text-2xl font-black text-violet-700 dark:text-violet-300"
                  >
                    {{ meta.targetCalories }} <small class="text-xs font-normal">kcal</small>
                  </strong>
                  <span class="text-[11px] text-violet-600 dark:text-violet-400">
                    Reçete edilen enerji
                  </span>
                </div>
                <div class="odv-card p-4">
                  <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Vücut Kitle İndeksi (BMI)
                  </span>
                  <strong class="mt-1 block text-2xl font-black">{{ meta.bmi }}</strong>
                  <span class="text-[11px] font-semibold text-emerald-600">{{
                    meta.bmiCategory
                  }}</span>
                </div>
              </div>

              <!-- Macronutrient Distribution Bar -->
              <div class="odv-card p-5">
                <div class="mb-3 flex items-center justify-between">
                  <h4 class="m-0 text-sm font-black">Hedef Makro Besin Dağılımı</h4>
                  <span class="text-xs text-slate-500">
                    Günlük Su: <strong>{{ meta.waterLiters }} L</strong> · Lif:
                    <strong>{{ meta.macros.fiberGrams }}g</strong>
                  </span>
                </div>
                <div class="grid gap-3 sm:grid-cols-3">
                  <div
                    class="rounded-xl border border-sky-100 bg-sky-50/60 p-3 dark:border-sky-900/50 dark:bg-sky-950/20"
                  >
                    <div
                      class="flex items-center justify-between text-xs font-bold text-sky-700 dark:text-sky-300"
                    >
                      <span>Protein</span>
                      <span>%{{ meta.macros.proteinPct }}</span>
                    </div>
                    <strong class="mt-1 block text-xl font-black text-sky-900 dark:text-sky-100">
                      {{ meta.macros.proteinGrams }} g
                    </strong>
                    <span class="text-[11px] text-slate-500"
                      >{{ meta.macros.proteinKcal }} kcal</span
                    >
                  </div>
                  <div
                    class="rounded-xl border border-amber-100 bg-amber-50/60 p-3 dark:border-amber-900/50 dark:bg-amber-950/20"
                  >
                    <div
                      class="flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-300"
                    >
                      <span>Karbonhidrat</span>
                      <span>%{{ meta.macros.carbPct }}</span>
                    </div>
                    <strong class="mt-1 block text-xl font-black text-amber-900 dark:text-amber-100">
                      {{ meta.macros.carbGrams }} g
                    </strong>
                    <span class="text-[11px] text-slate-500">{{ meta.macros.carbKcal }} kcal</span>
                  </div>
                  <div
                    class="rounded-xl border border-rose-100 bg-rose-50/60 p-3 dark:border-rose-900/50 dark:bg-rose-950/20"
                  >
                    <div
                      class="flex items-center justify-between text-xs font-bold text-rose-700 dark:text-rose-300"
                    >
                      <span>Sağlıklı Yağ</span>
                      <span>%{{ meta.macros.fatPct }}</span>
                    </div>
                    <strong class="mt-1 block text-xl font-black text-rose-900 dark:text-rose-100">
                      {{ meta.macros.fatGrams }} g
                    </strong>
                    <span class="text-[11px] text-slate-500">{{ meta.macros.fatKcal }} kcal</span>
                  </div>
                </div>
              </div>
            }

            <!-- Smart Daily Menu -->
            @if (mealPlanResult(); as plan) {
              <div class="odv-card overflow-hidden">
                <div
                  class="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div class="flex items-center gap-2">
                    <span class="material-symbols-rounded text-violet-600">restaurant_menu</span>
                    <strong class="text-sm font-black">{{ plan.title }}</strong>
                  </div>
                  <span class="odv-badge-success">{{ plan.totalCalories }} kcal / gün</span>
                </div>

                <div class="divide-y divide-slate-100 p-4 dark:divide-slate-800 sm:p-6">
                  <!-- Breakfast -->
                  <div class="py-3 first:pt-0">
                    <span class="text-xs font-extrabold uppercase text-violet-600 dark:text-violet-400">
                      Kahvaltı
                    </span>
                    <div class="mt-2 space-y-2">
                      @for (item of plan.meals.breakfast; track item.name) {
                        <div class="flex items-center justify-between text-xs">
                          <div>
                            <strong class="font-bold">{{ item.name }}</strong>
                            <span class="text-slate-500"> ({{ item.portion }})</span>
                            @if (item.clinicalNote) {
                              <p class="mb-0 mt-0.5 text-[11px] text-slate-400">
                                {{ item.clinicalNote }}
                              </p>
                            }
                          </div>
                          <span class="font-mono text-slate-500">{{ item.calories }} kcal</span>
                        </div>
                      }
                    </div>
                  </div>

                  <!-- Morning Snack -->
                  @if (plan.meals.morningSnack?.length) {
                    <div class="py-3">
                      <span class="text-xs font-extrabold uppercase text-slate-500">
                        Kuşluk Ara Öğünü
                      </span>
                      <div class="mt-2 space-y-2">
                        @for (item of plan.meals.morningSnack; track item.name) {
                          <div class="flex items-center justify-between text-xs">
                            <div>
                              <strong class="font-bold">{{ item.name }}</strong>
                              <span class="text-slate-500"> ({{ item.portion }})</span>
                            </div>
                            <span class="font-mono text-slate-500">{{ item.calories }} kcal</span>
                          </div>
                        }
                      </div>
                    </div>
                  }

                  <!-- Lunch -->
                  <div class="py-3">
                    <span class="text-xs font-extrabold uppercase text-emerald-600">Öğle Yemeği</span>
                    <div class="mt-2 space-y-2">
                      @for (item of plan.meals.lunch; track item.name) {
                        <div class="flex items-center justify-between text-xs">
                          <div>
                            <strong class="font-bold">{{ item.name }}</strong>
                            <span class="text-slate-500"> ({{ item.portion }})</span>
                            @if (item.clinicalNote) {
                              <p class="mb-0 mt-0.5 text-[11px] text-slate-400">
                                {{ item.clinicalNote }}
                              </p>
                            }
                          </div>
                          <span class="font-mono text-slate-500">{{ item.calories }} kcal</span>
                        </div>
                      }
                    </div>
                  </div>

                  <!-- Afternoon Snack -->
                  @if (plan.meals.afternoonSnack?.length) {
                    <div class="py-3">
                      <span class="text-xs font-extrabold uppercase text-amber-600">
                        İkindi Ara Öğünü
                      </span>
                      <div class="mt-2 space-y-2">
                        @for (item of plan.meals.afternoonSnack; track item.name) {
                          <div class="flex items-center justify-between text-xs">
                            <div>
                              <strong class="font-bold">{{ item.name }}</strong>
                              <span class="text-slate-500"> ({{ item.portion }})</span>
                            </div>
                            <span class="font-mono text-slate-500">{{ item.calories }} kcal</span>
                          </div>
                        }
                      </div>
                    </div>
                  }

                  <!-- Dinner -->
                  <div class="py-3 last:pb-0">
                    <span class="text-xs font-extrabold uppercase text-indigo-600">Akşam Yemeği</span>
                    <div class="mt-2 space-y-2">
                      @for (item of plan.meals.dinner; track item.name) {
                        <div class="flex items-center justify-between text-xs">
                          <div>
                            <strong class="font-bold">{{ item.name }}</strong>
                            <span class="text-slate-500"> ({{ item.portion }})</span>
                            @if (item.clinicalNote) {
                              <p class="mb-0 mt-0.5 text-[11px] text-slate-400">
                                {{ item.clinicalNote }}
                              </p>
                            }
                          </div>
                          <span class="font-mono text-slate-500">{{ item.calories }} kcal</span>
                        </div>
                      }
                    </div>
                  </div>
                </div>

                <!-- Clinical Rationale -->
                <div
                  class="border-t border-slate-100 bg-violet-50/40 p-4 dark:border-slate-800 dark:bg-violet-950/20"
                >
                  <span class="text-xs font-bold text-violet-800 dark:text-violet-300">
                    Klinik İpuçları & Diyetisyen Notu:
                  </span>
                  <ul class="mb-0 mt-1.5 space-y-1 ps-4 text-xs text-slate-600 dark:text-slate-300">
                    @for (tip of plan.clinicalTips; track tip) {
                      <li>{{ tip }}</li>
                    }
                  </ul>
                </div>
              </div>
            }

            <!-- Clean Printable Medical A4 Template (Shown only when Printing/Exporting to PDF) -->
            <div class="print-only hidden p-8 text-slate-900 bg-white">
              <div class="mb-6 flex items-start justify-between border-b-2 border-slate-900 pb-4">
                <div>
                  <h1 class="text-2xl font-black uppercase tracking-wider text-slate-900">
                    Odivon Klinik Beslenme & Diyet Danışmanlığı
                  </h1>
                  <p class="mt-1 text-xs text-slate-600">
                    Kişiye Özel Tıbbi ve Metabolik Beslenme Reçetesi
                  </p>
                </div>
                <div class="text-end text-xs">
                  <strong>Tarih:</strong> {{ currentDateString }}<br />
                  <strong>Protokol No:</strong> ODV-{{ menuParams().weightKg }}-{{
                    menuParams().heightCm
                  }}
                </div>
              </div>

              @if (metabolicResult(); as meta) {
                <div class="mb-6 rounded-xl border border-slate-300 bg-slate-50 p-4 text-xs">
                  <div class="grid grid-cols-4 gap-4">
                    <div><strong>Danışan:</strong> {{ clientName() }}</div>
                    <div>
                      <strong>Boy / Kilo:</strong> {{ menuParams().heightCm }} cm /
                      {{ menuParams().weightKg }} kg
                    </div>
                    <div><strong>BMI:</strong> {{ meta.bmi }} ({{ meta.bmiCategory }})</div>
                    <div><strong>Hedef Kalori:</strong> {{ meta.targetCalories }} kcal/gün</div>
                    <div>
                      <strong>Protein:</strong> {{ meta.macros.proteinGrams }} g (%{{
                        meta.macros.proteinPct
                      }})
                    </div>
                    <div>
                      <strong>Karbonhidrat:</strong> {{ meta.macros.carbGrams }} g (%{{
                        meta.macros.carbPct
                      }})
                    </div>
                    <div>
                      <strong>Sağlıklı Yağ:</strong> {{ meta.macros.fatGrams }} g (%{{
                        meta.macros.fatPct
                      }})
                    </div>
                    <div><strong>Su İhtiyacı:</strong> {{ meta.waterLiters }} Litre/gün</div>
                  </div>
                </div>
              }

              @if (mealPlanResult(); as plan) {
                <div class="space-y-4 text-xs">
                  <div class="border-b border-slate-200 pb-2">
                    <strong class="text-sm uppercase text-slate-800">Kahvaltı:</strong>
                    <ul class="mt-1 ps-4 list-disc space-y-1">
                      @for (item of plan.meals.breakfast; track item.name) {
                        <li>{{ item.name }} ({{ item.portion }}) - {{ item.calories }} kcal</li>
                      }
                    </ul>
                  </div>

                  @if (plan.meals.morningSnack?.length) {
                    <div class="border-b border-slate-200 pb-2">
                      <strong class="text-sm uppercase text-slate-800">Kuşluk Ara Öğünü:</strong>
                      <ul class="mt-1 ps-4 list-disc space-y-1">
                        @for (item of plan.meals.morningSnack; track item.name) {
                          <li>{{ item.name }} ({{ item.portion }}) - {{ item.calories }} kcal</li>
                        }
                      </ul>
                    </div>
                  }

                  <div class="border-b border-slate-200 pb-2">
                    <strong class="text-sm uppercase text-slate-800">Öğle Yemeği:</strong>
                    <ul class="mt-1 ps-4 list-disc space-y-1">
                      @for (item of plan.meals.lunch; track item.name) {
                        <li>{{ item.name }} ({{ item.portion }}) - {{ item.calories }} kcal</li>
                      }
                    </ul>
                  </div>

                  @if (plan.meals.afternoonSnack?.length) {
                    <div class="border-b border-slate-200 pb-2">
                      <strong class="text-sm uppercase text-slate-800">İkindi Ara Öğünü:</strong>
                      <ul class="mt-1 ps-4 list-disc space-y-1">
                        @for (item of plan.meals.afternoonSnack; track item.name) {
                          <li>{{ item.name }} ({{ item.portion }}) - {{ item.calories }} kcal</li>
                        }
                      </ul>
                    </div>
                  }

                  <div class="border-b border-slate-200 pb-2">
                    <strong class="text-sm uppercase text-slate-800">Akşam Yemeği:</strong>
                    <ul class="mt-1 ps-4 list-disc space-y-1">
                      @for (item of plan.meals.dinner; track item.name) {
                        <li>{{ item.name }} ({{ item.portion }}) - {{ item.calories }} kcal</li>
                      }
                    </ul>
                  </div>
                </div>

                <div class="mt-8 flex items-end justify-between border-t border-slate-400 pt-6 text-xs">
                  <div class="max-w-md">
                    <strong>Klinik Beslenme Uyarısı:</strong>
                    <p class="mt-1 text-slate-600">
                      Bu beslenme reçetesi danışanın biyometrik ve laboratuvar verilerine göre
                      özelleştirilmiştir. Başkası tarafından uygulanamaz.
                    </p>
                  </div>
                  <div class="w-44 text-center">
                    <div class="mb-1 border-b border-slate-400 pb-8"></div>
                    <strong class="block">Dyt. Ayşe Yılmaz</strong>
                    <span class="text-[10px] text-slate-500">Kaşe / İmza</span>
                  </div>
                </div>
              }
            </div>
          </section>
        </div>
      }

      <!-- TAB 2: LAB BIOMARKERS CLINICAL DECISION -->
      @if (activeTab() === 'labs') {
        <div class="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
          <section class="odv-card p-6" aria-labelledby="lab-input-title">
            <div
              class="mb-5 flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800"
            >
              <div>
                <h3 id="lab-input-title" class="m-0 text-base font-black">
                  Kan Tahlili Biyobelirteç Girişi
                </h3>
                <p class="mb-0 mt-0.5 text-xs text-slate-500">
                  Danışanın laboratuvar sonuçlarını girin
                </p>
              </div>
              <button type="button" class="odv-btn-soft text-xs" (click)="loadDemoLabData()">
                Örnek Tahlil Yükle
              </button>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <label class="block">
                <span class="mb-1 block text-xs font-bold">Açlık Kan Şekeri (mg/dL)</span>
                <input
                  type="number"
                  class="odv-input"
                  [value]="labInputs().fastingGlucose"
                  (input)="updateLabInput('fastingGlucose', +$any($event.target).value)"
                  placeholder="Örn. 95"
                />
              </label>

              <label class="block">
                <span class="mb-1 block text-xs font-bold">HbA1c (%)</span>
                <input
                  type="number"
                  step="0.1"
                  class="odv-input"
                  [value]="labInputs().hba1c"
                  (input)="updateLabInput('hba1c', +$any($event.target).value)"
                  placeholder="Örn. 5.6"
                />
              </label>

              <label class="block">
                <span class="mb-1 block text-xs font-bold">Ferritin (ng/mL)</span>
                <input
                  type="number"
                  class="odv-input"
                  [value]="labInputs().ferritin"
                  (input)="updateLabInput('ferritin', +$any($event.target).value)"
                  placeholder="Örn. 22"
                />
              </label>

              <label class="block">
                <span class="mb-1 block text-xs font-bold">25-OH Vitamin D (ng/mL)</span>
                <input
                  type="number"
                  class="odv-input"
                  [value]="labInputs().vitaminD"
                  (input)="updateLabInput('vitaminD', +$any($event.target).value)"
                  placeholder="Örn. 19"
                />
              </label>

              <label class="block sm:col-span-2">
                <span class="mb-1 block text-xs font-bold">LDL Kolesterol (mg/dL)</span>
                <input
                  type="number"
                  class="odv-input"
                  [value]="labInputs().ldl"
                  (input)="updateLabInput('ldl', +$any($event.target).value)"
                  placeholder="Örn. 142"
                />
              </label>
            </div>

            <button
              type="button"
              class="odv-btn-primary mt-6 w-full justify-center"
              (click)="evaluateLabs()"
            >
              <span class="material-symbols-rounded">biotech</span>
              Biyobelirteçleri & Besin Etkileşimini Analiz Et
            </button>
          </section>

          <!-- Lab Insights Output -->
          <section class="space-y-4">
            <h3 class="m-0 text-base font-black">AI Klinik Tahlil Değerlendirmesi</h3>
            @if (labFindings().length) {
              <div class="space-y-3">
                @for (item of labFindings(); track item.marker) {
                  <article class="odv-card p-5">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <span class="material-symbols-rounded text-violet-600">bloodtype</span>
                        <strong class="text-sm font-bold">{{ item.marker }}</strong>
                        <span class="font-mono text-xs text-slate-500"
                          >({{ item.value }} {{ item.unit }})</span
                        >
                      </div>
                      <span
                        [class]="
                          item.status === 'optimal'
                            ? 'odv-badge-success'
                            : item.status === 'warning'
                              ? 'odv-badge-warning'
                              : 'odv-badge-primary'
                        "
                      >
                        {{
                          item.status === 'optimal'
                            ? 'Optimal'
                            : item.status === 'warning'
                              ? 'Risk / Dikkat'
                              : 'Kritik Aralık'
                        }}
                      </span>
                    </div>

                    <p class="mb-2 mt-3 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {{ item.assessment }}
                    </p>

                    <div
                      class="rounded-xl border border-violet-100 bg-violet-50/50 p-3 dark:border-violet-900/60 dark:bg-violet-950/20"
                    >
                      <span
                        class="text-[10px] font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300"
                      >
                        Beslenme Reçetesi & Etkileşim Uyarısı:
                      </span>
                      <p class="mb-0 mt-1 text-xs text-slate-600 dark:text-slate-300">
                        {{ item.dietRecommendation }}
                      </p>
                    </div>
                  </article>
                }
              </div>
            } @else {
              <div class="odv-card p-8 text-center text-slate-400">
                <span class="material-symbols-rounded !text-5xl text-slate-300">monitor_heart</span>
                <p class="mt-2 text-sm">Soldaki parametreleri girip analizi başlatın.</p>
              </div>
            }
          </section>
        </div>
      }

      <!-- TAB 3: CHEAT RECOVERY SIMULATOR -->
      @if (activeTab() === 'recovery') {
        <div class="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
          <section class="odv-card p-6" aria-labelledby="cheat-sim-title">
            <h3 id="cheat-sim-title" class="m-0 text-base font-black">
              Kaçamak & Uyumsuzluk Simülatörü
            </h3>
            <p class="mb-5 mt-0.5 text-xs text-slate-500">
              Danışanın plan dışı tüketimini dengeleyin
            </p>

            <div class="space-y-4">
              <label class="block">
                <span class="mb-1 block text-xs font-bold">Tüketilen Kaçamak / Plan Dışı Gıda</span>
                <input
                  type="text"
                  class="odv-input"
                  [value]="cheatInput().cheatFood"
                  (input)="updateCheatParam('cheatFood', $any($event.target).value)"
                  placeholder="Örn. 2 dilim karışık pizza ve 1 kutu gazlı içecek"
                />
              </label>

              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  class="odv-btn-soft text-xs"
                  (click)="setCheatPreset('2 Dilim Pizza + Gazoz', 950, 'heavy')"
                >
                  Pizza & Gazoz
                </button>
                <button
                  type="button"
                  class="odv-btn-soft text-xs"
                  (click)="setCheatPreset('1 Porsiyon Antep Fıstıklı Baklava', 680, 'moderate')"
                >
                  Fıstıklı Baklava
                </button>
                <button
                  type="button"
                  class="odv-btn-soft text-xs"
                  (click)="setCheatPreset('Hamburger Menü ve Patates', 1100, 'heavy')"
                >
                  Fast-Food Menü
                </button>
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <label class="block">
                  <span class="mb-1 block text-xs font-bold">Tahmini Ekstra Enerji (kcal)</span>
                  <input
                    type="number"
                    class="odv-input"
                    [value]="cheatInput().estimatedExtraKcal"
                    (input)="updateCheatParam('estimatedExtraKcal', +$any($event.target).value)"
                  />
                </label>

                <label class="block">
                  <span class="mb-1 block text-xs font-bold">Şiddet Derecesi</span>
                  <select
                    class="odv-input"
                    [value]="cheatInput().severity"
                    (change)="updateCheatParam('severity', $any($event.target).value)"
                  >
                    <option value="mild">Hafif (Küçük kaçamak)</option>
                    <option value="moderate">Orta Düzey</option>
                    <option value="heavy">Ağır / Yüksek Kalori</option>
                  </select>
                </label>
              </div>

              <button
                type="button"
                class="odv-btn-primary w-full justify-center"
                (click)="simulateRecovery()"
              >
                <span class="material-symbols-rounded">healing</span>
                48 Saatlik Toparlanma Protokolünü Üret
              </button>
            </div>
          </section>

          <!-- Recovery Protocol Output -->
          <section>
            @if (recoveryProtocol(); as proto) {
              <div class="odv-card space-y-5 p-6">
                <div
                  class="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800"
                >
                  <span
                    class="grid size-11 place-items-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950"
                  >
                    <span class="material-symbols-rounded">sync_saved_locally</span>
                  </span>
                  <div>
                    <h4 class="m-0 text-sm font-black">{{ proto.foodSummary }}</h4>
                    <p class="mb-0 mt-0.5 text-xs text-slate-500">{{ proto.metabolicImpact }}</p>
                  </div>
                </div>

                <div>
                  <span class="text-xs font-extrabold uppercase tracking-wider text-sky-600">
                    1. Hidrasyon Protokolü
                  </span>
                  <p class="mb-0 mt-1 text-xs text-slate-600 dark:text-slate-300">
                    {{ proto.hydrationPlan }}
                  </p>
                </div>

                <div>
                  <span class="text-xs font-extrabold uppercase tracking-wider text-emerald-600">
                    2. Sonraki 48 Saatlik Beslenme Ayarlamaları
                  </span>
                  <ul class="mb-0 mt-1.5 space-y-1 ps-4 text-xs text-slate-600 dark:text-slate-300">
                    @for (adj of proto.nextDayDietAdjustments; track adj) {
                      <li>{{ adj }}</li>
                    }
                  </ul>
                </div>

                <div>
                  <span class="text-xs font-extrabold uppercase tracking-wider text-violet-600">
                    3. Fiziksel Aktivite & NEAT Reçetesi
                  </span>
                  <p class="mb-0 mt-1 text-xs text-slate-600 dark:text-slate-300">
                    {{ proto.activityPrescription }}
                  </p>
                </div>

                <div
                  class="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/20"
                >
                  <strong class="block text-xs font-black text-emerald-800 dark:text-emerald-300">
                    Klinik Psikolojik Yaklaşım:
                  </strong>
                  <p class="mb-0 mt-1 text-xs text-emerald-900 dark:text-emerald-200">
                    {{ proto.mindsetNote }}
                  </p>
                </div>
              </div>
            }
          </section>
        </div>
      }

      <!-- TAB 4: CONSULTATION & MOTIVATION SUMMARY -->
      @if (activeTab() === 'consultation') {
        <div class="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
          <section class="odv-card p-6" aria-labelledby="consultation-form-title">
            <h3 id="consultation-form-title" class="m-0 text-base font-black">
              Haftalık Görüşme Notları
            </h3>
            <p class="mb-5 mt-0.5 text-xs text-slate-500">
              Seans verilerinden otomatik klinik özet ve danışan mesajı
            </p>

            <div class="space-y-4">
              <div class="grid gap-4 sm:grid-cols-2">
                <label class="block">
                  <span class="mb-1 block text-xs font-bold">Danışan Adı</span>
                  <input
                    type="text"
                    class="odv-input"
                    [value]="consultationData().clientName"
                    (input)="updateConsultation('clientName', $any($event.target).value)"
                  />
                </label>

                <label class="block">
                  <span class="mb-1 block text-xs font-bold">Hafta No</span>
                  <input
                    type="number"
                    class="odv-input"
                    [value]="consultationData().weekNumber"
                    (input)="updateConsultation('weekNumber', +$any($event.target).value)"
                  />
                </label>

                <label class="block">
                  <span class="mb-1 block text-xs font-bold">Kilo Değişimi (kg, eksi/artı)</span>
                  <input
                    type="number"
                    step="0.1"
                    class="odv-input"
                    [value]="consultationData().weightDiffKg"
                    (input)="updateConsultation('weightDiffKg', +$any($event.target).value)"
                    placeholder="Örn. -1.4"
                  />
                </label>

                <label class="block">
                  <span class="mb-1 block text-xs font-bold">Plana Uyum (%)</span>
                  <input
                    type="number"
                    class="odv-input"
                    [value]="consultationData().complianceRatePct"
                    (input)="updateConsultation('complianceRatePct', +$any($event.target).value)"
                    placeholder="Örn. 90"
                  />
                </label>
              </div>

              <label class="block">
                <span class="mb-1 block text-xs font-bold">Danışanın Zorlandığı Noktalar</span>
                <input
                  type="text"
                  class="odv-input"
                  [value]="consultationData().struggles"
                  (input)="updateConsultation('struggles', $any($event.target).value)"
                  placeholder="Örn. Akşam saat 21:00 sonrası tatlı krizi oldu"
                />
              </label>

              <label class="block">
                <span class="mb-1 block text-xs font-bold">Diyetisyen Notu</span>
                <textarea
                  class="odv-input min-h-20"
                  [value]="consultationData().dietitianNotes"
                  (input)="updateConsultation('dietitianNotes', $any($event.target).value)"
                  placeholder="Seans esnasındaki klinik gözlemleriniz"
                ></textarea>
              </label>

              <button
                type="button"
                class="odv-btn-primary w-full justify-center"
                (click)="generateConsultationSummary()"
              >
                <span class="material-symbols-rounded">psychology_alt</span>
                SOAP Kaydı & Danışan Mesajı Üret
              </button>
            </div>
          </section>

          <!-- Summary Output -->
          <section class="space-y-4">
            @if (consultationSummary(); as summary) {
              <!-- SOAP Record -->
              <div class="odv-card p-5">
                <div
                  class="mb-3 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800"
                >
                  <div class="flex items-center gap-2">
                    <span class="material-symbols-rounded text-violet-600">clinical_notes</span>
                    <strong class="text-sm font-black">Klinik SOAP Dosya Kaydı</strong>
                  </div>
                  <button
                    type="button"
                    class="odv-btn-soft text-xs"
                    (click)="copyText(soapFormatted())"
                  >
                    Kopyala
                  </button>
                </div>
                <div class="space-y-2 text-xs">
                  <p><strong>S (Subjective):</strong> {{ summary.soapRecord.subjective }}</p>
                  <p><strong>O (Objective):</strong> {{ summary.soapRecord.objective }}</p>
                  <p><strong>A (Assessment):</strong> {{ summary.soapRecord.assessment }}</p>
                  <p><strong>P (Plan):</strong> {{ summary.soapRecord.plan }}</p>
                </div>
              </div>

              <!-- Client WhatsApp / SMS Copy -->
              <div
                class="odv-card border-emerald-200 bg-emerald-50/30 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/20"
              >
                <div
                  class="mb-3 flex items-center justify-between border-b border-emerald-100 pb-3 dark:border-emerald-900/40"
                >
                  <div class="flex items-center gap-2">
                    <span class="material-symbols-rounded text-emerald-600">chat</span>
                    <strong class="text-sm font-black text-emerald-950 dark:text-emerald-100">
                      Danışana Gönderilecek Mesaj
                    </strong>
                  </div>
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      class="odv-btn-soft text-xs"
                      (click)="copyText(summary.clientMessage)"
                    >
                      Kopyala
                    </button>
                    <button
                      type="button"
                      class="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700 transition-colors"
                      (click)="sendConsultationViaWhatsApp()"
                    >
                      <span class="material-symbols-rounded !text-sm">send</span>
                      WhatsApp ile Gönder
                    </button>
                  </div>
                </div>
                <pre
                  class="whitespace-pre-wrap font-sans text-xs leading-6 text-slate-700 dark:text-slate-200"
                  >{{ summary.clientMessage }}</pre
                >
              </div>
            }
          </section>
        </div>
      }
    </section>
  `,
})
export class AiCopilotPanel {
  private readonly ai = inject(AiNutripilotService);
  private readonly dietApi = inject(DietApiService);
  private readonly dietState = inject(DietStateService);

  readonly activeClient = this.dietState.activeClient;
  readonly activeTab = signal<'menu' | 'labs' | 'recovery' | 'consultation'>('menu');
  readonly clientName = signal('Elif Kaya');
  readonly clientPhone = signal('+905321002030');
  readonly planSavedSuccess = signal(false);
  readonly currentDateString = new Date().toLocaleDateString('tr-TR');

  // Tab 1 state
  readonly menuParams = signal<MetabolicInput>({
    gender: 'female',
    age: 32,
    weightKg: 68,
    heightCm: 165,
    activity: 'moderate',
    goal: 'burn_fat',
    dietType: 'mediterranean',
    intolerances: [],
  });
  readonly metabolicResult = signal<MetabolicOutput | null>(null);
  readonly mealPlanResult = signal<MealPlanDay | null>(null);

  // Tab 2 state
  readonly labInputs = signal<LabInput>({
    fastingGlucose: 104,
    hba1c: 5.8,
    ferritin: 18,
    vitaminD: 19,
    ldl: 138,
  });
  readonly labFindings = signal<LabFinding[]>([]);

  // Tab 3 state
  readonly cheatInput = signal<CheatRecoveryInput>({
    cheatFood: '2 Dilim Pizza + Asitli İçecek',
    estimatedExtraKcal: 850,
    severity: 'moderate',
  });
  readonly recoveryProtocol = signal<CheatRecoveryProtocol | null>(null);

  // Tab 4 state
  readonly consultationData = signal<ConsultationInput>({
    clientName: 'Elif Kaya',
    weekNumber: 3,
    weightDiffKg: -1.2,
    complianceRatePct: 92,
    struggles: 'Ofiste ikindi vakti bisküvi ikram edildiğinde zorlandı.',
    dietitianNotes: 'Uyum çok iyi, ödem azaldı, enerji seviyesi yüksek.',
  });
  readonly consultationSummary = signal<{
    soapRecord: { subjective: string; objective: string; assessment: string; plan: string };
    clientMessage: string;
  } | null>(null);

  readonly soapFormatted = computed(() => {
    const s = this.consultationSummary();
    if (!s) return '';
    return `[SOAP KLİNİK KAYDI]\nS: ${s.soapRecord.subjective}\nO: ${s.soapRecord.objective}\nA: ${s.soapRecord.assessment}\nP: ${s.soapRecord.plan}`;
  });

  constructor() {
    const client = this.dietState.activeClient();
    if (client) {
      this.clientName.set(client.fullName);
      this.clientPhone.set(client.phone || '');
      this.menuParams.set({
        gender: client.gender,
        age: client.age,
        weightKg: client.currentWeightKg,
        heightCm: client.heightCm,
        activity: 'moderate',
        goal: client.currentWeightKg > client.targetWeightKg ? 'lose_weight' : 'maintain',
        dietType: 'mediterranean',
        intolerances: client.allergies || [],
      });
      this.consultationData.update((p) => ({
        ...p,
        clientName: client.fullName,
      }));
    }

    this.generateMealPlan();
    this.evaluateLabs();
    this.simulateRecovery();
    this.generateConsultationSummary();
  }

  clearActiveClient(): void {
    this.dietState.clearActiveClient();
  }

  updateMenuParam<K extends keyof MetabolicInput>(key: K, value: MetabolicInput[K]): void {
    this.menuParams.update((p) => ({ ...p, [key]: value }));
  }

  hasIntolerance(name: string): boolean {
    return (this.menuParams().intolerances ?? []).includes(name);
  }

  toggleIntolerance(name: string): void {
    this.menuParams.update((p) => {
      const list = p.intolerances ?? [];
      const updated = list.includes(name) ? list.filter((x) => x !== name) : [...list, name];
      return { ...p, intolerances: updated };
    });
  }

  loadDemoMenuData(): void {
    this.clientName.set('Selin Aras');
    this.clientPhone.set('+905353004050');
    this.menuParams.set({
      gender: 'female',
      age: 29,
      weightKg: 74,
      heightCm: 168,
      activity: 'light',
      goal: 'lose_weight',
      dietType: 'insulin_resistance',
      intolerances: ['Laktos'],
    });
    this.generateMealPlan();
  }

  generateMealPlan(): void {
    const params = this.menuParams();
    const meta = this.ai.calculateMetabolism(params);
    const plan = this.ai.generateSmartMealPlan(params);
    this.metabolicResult.set(meta);
    this.mealPlanResult.set(plan);
  }

  updateLabInput<K extends keyof LabInput>(key: K, value: number): void {
    this.labInputs.update((p) => ({ ...p, [key]: value }));
  }

  loadDemoLabData(): void {
    this.labInputs.set({
      fastingGlucose: 112,
      hba1c: 6.1,
      ferritin: 14,
      vitaminD: 16,
      ldl: 145,
    });
    this.evaluateLabs();
  }

  evaluateLabs(): void {
    const findings = this.ai.evaluateBiomarkers(this.labInputs());
    this.labFindings.set(findings);
  }

  updateCheatParam<K extends keyof CheatRecoveryInput>(
    key: K,
    value: CheatRecoveryInput[K],
  ): void {
    this.cheatInput.update((p) => ({ ...p, [key]: value }));
  }

  setCheatPreset(
    cheatFood: string,
    estimatedExtraKcal: number,
    severity: 'mild' | 'moderate' | 'heavy',
  ): void {
    this.cheatInput.set({ cheatFood, estimatedExtraKcal, severity });
    this.simulateRecovery();
  }

  simulateRecovery(): void {
    const protocol = this.ai.simulateRecovery(this.cheatInput());
    this.recoveryProtocol.set(protocol);
  }

  updateConsultation<K extends keyof ConsultationInput>(
    key: K,
    value: ConsultationInput[K],
  ): void {
    this.consultationData.update((p) => ({ ...p, [key]: value }));
  }

  generateConsultationSummary(): void {
    const res = this.ai.summarizeConsultation(this.consultationData());
    this.consultationSummary.set(res);
  }

  copyText(text: string): void {
    void navigator.clipboard.writeText(text);
  }

  printPlan(): void {
    window.print();
  }

  sendMenuViaWhatsApp(): void {
    const meta = this.metabolicResult();
    const plan = this.mealPlanResult();
    if (!meta || !plan) return;

    let msg = `🥗 *ODİVON KLİNİK BESLENME PLANI*\n`;
    msg += `👤 *Danışan:* ${this.clientName()}\n`;
    msg += `🔥 *Hedef Enerji:* ${meta.targetCalories} kcal\n`;
    msg += `📊 *Makrolar:* ${meta.macros.proteinGrams}g Protein | ${meta.macros.carbGrams}g Karb | ${meta.macros.fatGrams}g Yağ\n`;
    msg += `💧 *Günlük Su Hedefi:* ${meta.waterLiters} Litre\n\n`;

    msg += `🍳 *Kahvaltı:*\n`;
    plan.meals.breakfast.forEach((item) => {
      msg += `• ${item.name} (${item.portion})\n`;
    });

    if (plan.meals.morningSnack?.length) {
      msg += `\n🍎 *Kuşluk:*\n`;
      plan.meals.morningSnack.forEach((item) => {
        msg += `• ${item.name} (${item.portion})\n`;
      });
    }

    msg += `\n🍗 *Öğle:*\n`;
    plan.meals.lunch.forEach((item) => {
      msg += `• ${item.name} (${item.portion})\n`;
    });

    if (plan.meals.afternoonSnack?.length) {
      msg += `\n🥜 *İkindi:*\n`;
      plan.meals.afternoonSnack.forEach((item) => {
        msg += `• ${item.name} (${item.portion})\n`;
      });
    }

    msg += `\n🍲 *Akşam:*\n`;
    plan.meals.dinner.forEach((item) => {
      msg += `• ${item.name} (${item.portion})\n`;
    });

    msg += `\n✨ *Diyetisyen Tavsiyesi:* Bol su içmeyi ve çiğneme sürenizi uzatmayı unutmayın. Sağlıklı ve zinde bir hafta dilerim! 💚`;

    this.openWhatsAppUrl(msg);
  }

  sendConsultationViaWhatsApp(): void {
    const summary = this.consultationSummary();
    if (!summary) return;
    this.openWhatsAppUrl(summary.clientMessage);
  }

  savePlanToMainApi(): void {
    const meta = this.metabolicResult();
    const plan = this.mealPlanResult();
    if (!meta || !plan) return;

    this.dietApi
      .saveNutritionPlan({
        clientName: this.clientName(),
        title: plan.title,
        targetCalories: meta.targetCalories,
        proteinGrams: meta.macros.proteinGrams,
        carbGrams: meta.macros.carbGrams,
        fatGrams: meta.macros.fatGrams,
        dietType: this.menuParams().dietType,
        status: 'active',
        startDate: new Date().toISOString().slice(0, 10),
        endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      })
      .subscribe(() => {
        this.planSavedSuccess.set(true);
        setTimeout(() => this.planSavedSuccess.set(false), 4000);
      });
  }

  private openWhatsAppUrl(text: string): void {
    const raw = this.clientPhone().replace(/\D/g, '');
    const phone = raw.startsWith('0') ? `90${raw.slice(1)}` : raw.length === 10 ? `90${raw}` : raw;
    const url = phone
      ? `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }
}
