import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { AuthStore } from '../../core/auth/auth-store';
import { DietStore } from '../../core/data/diet-store';
import { PortalStore } from '../../core/data/portal-store';
import { Notify } from '../../core/notify/notify';
import {
  ActivityLevel,
  AiNutripilotService,
  ChurnRiskAssessment,
  ClinicServicePackage,
  DietGoal,
  DietType,
  Gender,
  LeadCandidate,
  OcrDocumentKind,
} from '../../core/services/ai-nutripilot.service';
import { daysBetween, isoDate } from '../../domain/diet-calc';
import { Meal } from '../../domain/diet.models';
import { Avatar } from '../../shared/ui/avatar';
import { KpiCard } from '../../shared/ui/kpi-card';
import { PageHeader } from '../../shared/ui/page-header';

type CopilotTab = 'autopilot' | 'ocr' | 'scribe' | 'retention' | 'growth';

@Component({
  selector: 'app-ai-copilot-page',
  imports: [PageHeader, KpiCard, Avatar, DecimalPipe],
  template: `
    <div class="animate-fade-up space-y-6">
      <app-page-header
        eyebrow="Yapay Zekâ & Klinik Büyüme Motoru"
        title="AI NutriPilot & Dijital Klinik Hizmet Stüdyosu"
        description="10 saniyede kişiselleştirilmiş menü üretin, e-Nabız/InBody belgelerini OCR ile okuyun, kopma riskindeki danışanları yakalayın ve Instagram hunisiyle yeni danışan kazanın."
      >
        <div actions class="flex flex-wrap items-center gap-2">
          <button type="button" class="odv-btn-soft" (click)="activeTab.set('ocr')">
            <span class="material-symbols-rounded !text-lg">document_scanner</span>Tahlil / InBody OCR
          </button>
          <button type="button" class="odv-btn-primary" (click)="activeTab.set('growth')">
            <span class="material-symbols-rounded !text-lg">rocket_launch</span>Danışan Kazanım Hunisi
          </button>
        </div>
      </app-page-header>

      <!-- Üst KPI Özeti -->
      <section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="AI Stüdyo Özeti">
        <app-kpi-card
          label="AI Zaman Tasarrufu"
          value="42 dk / danışan"
          icon="bolt"
          tone="primary"
          hint="Otomatik liste + OCR + SOAP notu"
        />
        <app-kpi-card
          label="Belge OCR Doğruluğu"
          [value]="'%' + ocrResult().confidencePct"
          icon="document_scanner"
          tone="positive"
          hint="e-Nabız PDF & InBody/Tanita fişi"
        />
        <app-kpi-card
          label="Kopma (Churn) Radarı"
          [value]="highRiskChurnCount() + ' danışan'"
          icon="radar"
          tone="warning"
          hint="Yakın takip gerektiren danışanlar"
        />
        <app-kpi-card
          label="Bekleyen Sıcak Aday (Lead)"
          [value]="unconvertedLeadCount() + ' aday'"
          icon="person_add"
          tone="info"
          hint="Instagram & Web Metabolik Check-Up"
        />
      </section>

      <!-- Sekme Seçici -->
      <div class="odv-segment flex-wrap" role="tablist" aria-label="AI NutriPilot modülleri">
        <button
          type="button"
          role="tab"
          class="odv-segment-item"
          [attr.aria-selected]="activeTab() === 'autopilot'"
          [attr.aria-pressed]="activeTab() === 'autopilot'"
          (click)="activeTab.set('autopilot')"
        >
          <span class="material-symbols-rounded !text-base" aria-hidden="true">auto_awesome</span>
          1. AI Menü Oto-Pilotu
        </button>
        <button
          type="button"
          role="tab"
          class="odv-segment-item"
          [attr.aria-selected]="activeTab() === 'ocr'"
          [attr.aria-pressed]="activeTab() === 'ocr'"
          (click)="activeTab.set('ocr')"
        >
          <span class="material-symbols-rounded !text-base" aria-hidden="true">document_scanner</span>
          2. e-Nabız & InBody OCR
        </button>
        <button
          type="button"
          role="tab"
          class="odv-segment-item"
          [attr.aria-selected]="activeTab() === 'scribe'"
          [attr.aria-pressed]="activeTab() === 'scribe'"
          (click)="activeTab.set('scribe')"
        >
          <span class="material-symbols-rounded !text-base" aria-hidden="true">mic</span>
          3. AI Seans SOAP & Özet
        </button>
        <button
          type="button"
          role="tab"
          class="odv-segment-item"
          [attr.aria-selected]="activeTab() === 'retention'"
          [attr.aria-pressed]="activeTab() === 'retention'"
          (click)="activeTab.set('retention')"
        >
          <span class="material-symbols-rounded !text-base" aria-hidden="true">notifications_active</span>
          4. Kopma (Churn) Radarı ({{ highRiskChurnCount() }})
        </button>
        <button
          type="button"
          role="tab"
          class="odv-segment-item"
          [attr.aria-selected]="activeTab() === 'growth'"
          [attr.aria-pressed]="activeTab() === 'growth'"
          (click)="activeTab.set('growth')"
        >
          <span class="material-symbols-rounded !text-base" aria-hidden="true">campaign</span>
          5. Danışan Kazanım & Paket Satışı ({{ unconvertedLeadCount() }})
        </button>
      </div>

      <!-- TAB 1: AI MENÜ OTO-PİLOTU -->
      @if (activeTab() === 'autopilot') {
        <div class="grid gap-6 lg:grid-cols-[380px_1fr]">
          <section class="odv-card space-y-4 p-5" aria-label="AI Menü Parametreleri">
            <div>
              <span class="odv-eyebrow text-violet-700 dark:text-violet-300">Klinik Parametreler</span>
              <h2 class="text-base font-extrabold">Danışan Seçin ve Protokol Belirleyin</h2>
              <p class="mt-0.5 text-xs text-slate-500">
                Danışan seçtiğinizde boy, kilo, yaş ve alerjileri otomatik yüklenir.
              </p>
            </div>

            <label class="block">
              <span class="odv-label">Hedef danışan</span>
              <select
                class="odv-input"
                [value]="selectedClientId()"
                (change)="selectClient($any($event.target).value)"
              >
                @for (v of activeClientViews(); track v.client.id) {
                  <option [value]="v.client.id">{{ v.fullName }} ({{ v.currentWeightKg }} kg)</option>
                }
              </select>
            </label>

            <div class="grid grid-cols-2 gap-3">
              <label class="block">
                <span class="odv-label">Klinik diyet modeli</span>
                <select
                  class="odv-input"
                  [value]="dietType()"
                  (change)="dietType.set($any($event.target).value)"
                >
                  <option value="mediterranean">Akdeniz Tipi Klinik</option>
                  <option value="insulin_resistance">İnsülin Direnci / Düşük Gİ</option>
                  <option value="high_protein">Yüksek Protein / Kas Koruma</option>
                  <option value="low_fodmap">Low-FODMAP (IBS / Hassas Bağırsak)</option>
                  <option value="keto">Ketojenik Protokol</option>
                  <option value="vegan">Bitkisel / Vegan</option>
                </select>
              </label>

              <label class="block">
                <span class="odv-label">Metabolik hedef</span>
                <select
                  class="odv-input"
                  [value]="dietGoal()"
                  (change)="dietGoal.set($any($event.target).value)"
                >
                  <option value="lose_weight">Yağ Kaybı (-500 kcal)</option>
                  <option value="burn_fat">Metabolik Definisyon (-350 kcal)</option>
                  <option value="maintain">Kilo Koruma (İdame)</option>
                  <option value="build_muscle">Hipertrofi (+300 kcal)</option>
                  <option value="gain_weight">Sağlıklı Kilo Alma (+500 kcal)</option>
                </select>
              </label>
            </div>

            <div class="grid grid-cols-3 gap-2.5">
              <label class="block">
                <span class="odv-label">Kilo (kg)</span>
                <input
                  type="number"
                  class="odv-input tabular"
                  [value]="weightKg()"
                  (input)="weightKg.set(+$any($event.target).value || 70)"
                />
              </label>
              <label class="block">
                <span class="odv-label">Boy (cm)</span>
                <input
                  type="number"
                  class="odv-input tabular"
                  [value]="heightCm()"
                  (input)="heightCm.set(+$any($event.target).value || 168)"
                />
              </label>
              <label class="block">
                <span class="odv-label">Yaş</span>
                <input
                  type="number"
                  class="odv-input tabular"
                  [value]="age()"
                  (input)="age.set(+$any($event.target).value || 32)"
                />
              </label>
            </div>

            <fieldset>
              <legend class="odv-label">İntolerans / Alerji Koruması</legend>
              <div class="mt-1 flex flex-wrap gap-2">
                @for (tag of intoleranceOptions; track tag) {
                  <button
                    type="button"
                    class="rounded-xl border px-3 py-1.5 text-xs font-bold transition"
                    [class.border-violet-600]="intolerances().includes(tag)"
                    [class.bg-violet-600]="intolerances().includes(tag)"
                    [class.text-white]="intolerances().includes(tag)"
                    [class.border-slate-200]="!intolerances().includes(tag)"
                    (click)="toggleIntolerance(tag)"
                  >
                    {{ tag }}
                  </button>
                }
              </div>
            </fieldset>

            <button
              type="button"
              class="odv-btn-primary w-full justify-center"
              (click)="assignGeneratedPlanToClient()"
            >
              <span class="material-symbols-rounded !text-lg">assignment_turned_in</span>
              Bu Menüyü Danışana Aktif Plan Olarak Ata
            </button>
          </section>

          <!-- Sağ: Üretilen Menü ve Makro Dağılımı -->
          <section class="odv-card space-y-5 p-5" aria-label="Üretilen AI Beslenme Planı">
            <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <span class="odv-eyebrow text-emerald-700 dark:text-emerald-300">Mifflin-St Jeor + Klinik Sentez</span>
                <h3 class="text-lg font-extrabold">{{ generatedPlan().title }}</h3>
              </div>
              <div class="flex flex-wrap gap-2 text-xs font-bold">
                <span class="rounded-xl bg-violet-50 px-3 py-1.5 text-violet-800 dark:bg-violet-950/60 dark:text-violet-200">
                  BMR: {{ metabolism().bmr }} kcal
                </span>
                <span class="rounded-xl bg-sky-50 px-3 py-1.5 text-sky-800 dark:bg-sky-950/60 dark:text-sky-200">
                  TDEE: {{ metabolism().tdee }} kcal
                </span>
                <span class="rounded-xl bg-emerald-100 px-3 py-1.5 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-100">
                  Hedef: {{ metabolism().targetCalories }} kcal · {{ metabolism().waterLiters }} L Su
                </span>
              </div>
            </div>

            <!-- Makro Bar -->
            <div class="grid grid-cols-3 gap-3">
              <div class="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                <span class="text-xs text-slate-500">Protein (%{{ metabolism().macros.proteinPct }})</span>
                <p class="mt-0.5 text-lg font-extrabold text-violet-700 dark:text-violet-300">
                  {{ metabolism().macros.proteinGrams }} g
                </p>
              </div>
              <div class="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                <span class="text-xs text-slate-500">Karbonhidrat (%{{ metabolism().macros.carbPct }})</span>
                <p class="mt-0.5 text-lg font-extrabold text-amber-700 dark:text-amber-300">
                  {{ metabolism().macros.carbGrams }} g
                </p>
              </div>
              <div class="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                <span class="text-xs text-slate-500">Sağlıklı Yağ (%{{ metabolism().macros.fatPct }})</span>
                <p class="mt-0.5 text-lg font-extrabold text-emerald-700 dark:text-emerald-300">
                  {{ metabolism().macros.fatGrams }} g
                </p>
              </div>
            </div>

            <!-- Öğün Kartları -->
            <div class="grid gap-3 md:grid-cols-2">
              @for (section of generatedMealSections(); track section.label) {
                <div class="rounded-2xl border border-slate-200/80 p-3.5 space-y-2 dark:border-slate-800">
                  <div class="flex items-center justify-between">
                    <strong class="text-sm font-extrabold text-slate-900 dark:text-white">{{ section.label }}</strong>
                    <span class="text-xs font-bold text-slate-500">{{ section.time }}</span>
                  </div>
                  <ul class="space-y-1.5 text-xs">
                    @for (item of section.items; track item.name) {
                      <li class="flex items-start justify-between gap-2 border-t border-slate-100 pt-1.5 first:border-t-0 first:pt-0 dark:border-slate-800/60">
                        <div>
                          <span class="font-bold text-slate-800 dark:text-slate-200">{{ item.name }}</span>
                          <span class="ms-1 text-slate-500">({{ item.portion }})</span>
                          @if (item.clinicalNote) {
                            <p class="text-[11px] text-emerald-700 dark:text-emerald-400">{{ item.clinicalNote }}</p>
                          }
                        </div>
                        <span class="shrink-0 font-bold tabular text-slate-600 dark:text-slate-300">{{ item.calories }} kcal</span>
                      </li>
                    }
                  </ul>
                </div>
              }
            </div>

            <!-- Klinik Notlar -->
            <div class="rounded-2xl bg-emerald-50/70 p-4 dark:bg-emerald-950/30">
              <span class="odv-eyebrow text-emerald-800 dark:text-emerald-300">AI Klinik Gerekçelendirme</span>
              <ul class="mt-2 space-y-1 text-xs text-slate-700 dark:text-slate-200">
                @for (tip of generatedPlan().clinicalTips; track tip) {
                  <li class="flex items-start gap-1.5">
                    <span class="material-symbols-rounded !text-sm text-emerald-600" aria-hidden="true">check_circle</span>
                    <span>{{ tip }}</span>
                  </li>
                }
              </ul>
            </div>
          </section>
        </div>
      }

      <!-- TAB 2: e-NABIZ & INBODY OCR OKUYUCU -->
      @if (activeTab() === 'ocr') {
        <div class="grid gap-6 lg:grid-cols-[380px_1fr]">
          <section class="odv-card space-y-4 p-5" aria-label="OCR Belge Seçimi">
            <div>
              <span class="odv-eyebrow text-emerald-700 dark:text-emerald-300">Sıfır Klavye Veri Girişi</span>
              <h2 class="text-base font-extrabold">e-Nabız PDF & InBody / Tanita Fişi Okuyucu</h2>
              <p class="mt-0.5 text-xs text-slate-500">
                Tahlil PDF'ini veya tartı fişi fotoğrafını seçin; AI değerleri ayrıştırıp doğrudan danışanın dosyasına işlesin.
              </p>
            </div>

            <label class="block">
              <span class="odv-label">Kaydedilecek danışan</span>
              <select
                class="odv-input"
                [value]="selectedClientId()"
                (change)="selectClient($any($event.target).value)"
              >
                @for (c of activeClients(); track c.id) {
                  <option [value]="c.id">{{ c.firstName }} {{ c.lastName }}</option>
                }
              </select>
            </label>

            <fieldset class="space-y-2">
              <legend class="odv-label">Hazır Örnek Belge Şablonu veya Dosya Yükle</legend>
              <button
                type="button"
                class="flex w-full items-center justify-between rounded-xl border p-3 text-start text-xs font-bold transition"
                [class.border-violet-600]="ocrKind() === 'enabiz_insulin'"
                [class.bg-violet-50]="ocrKind() === 'enabiz_insulin'"
                [class.dark:bg-violet-950/40]="ocrKind() === 'enabiz_insulin'"
                (click)="selectOcrKind('enabiz_insulin')"
              >
                <span>1. e-Nabız Kan Tahlili PDF (İnsülin Direnci + Ferritin)</span>
                <span class="material-symbols-rounded !text-base text-violet-600" aria-hidden="true">biotech</span>
              </button>
              <button
                type="button"
                class="flex w-full items-center justify-between rounded-xl border p-3 text-start text-xs font-bold transition"
                [class.border-violet-600]="ocrKind() === 'inbody_sheet'"
                [class.bg-violet-50]="ocrKind() === 'inbody_sheet'"
                [class.dark:bg-violet-950/40]="ocrKind() === 'inbody_sheet'"
                (click)="selectOcrKind('inbody_sheet')"
              >
                <span>2. InBody 270 Termal Fiş (Ödem + Viseral Yağ)</span>
                <span class="material-symbols-rounded !text-base text-emerald-600" aria-hidden="true">monitor_weight</span>
              </button>
              <button
                type="button"
                class="flex w-full items-center justify-between rounded-xl border p-3 text-start text-xs font-bold transition"
                [class.border-violet-600]="ocrKind() === 'tanita_athlete'"
                [class.bg-violet-50]="ocrKind() === 'tanita_athlete'"
                [class.dark:bg-violet-950/40]="ocrKind() === 'tanita_athlete'"
                (click)="selectOcrKind('tanita_athlete')"
              >
                <span>3. Tanita MC-780 Sporcu Segmental Analiz Fişi</span>
                <span class="material-symbols-rounded !text-base text-sky-600" aria-hidden="true">fitness_center</span>
              </button>
            </fieldset>

            <label class="block">
              <span class="odv-label">Bilgisayardan PDF / Fotoğraf Seç</span>
              <input
                type="file"
                accept=".pdf,image/*"
                class="odv-input text-xs"
                (change)="onOcrFilePicked($event)"
              />
            </label>

            <button
              type="button"
              class="odv-btn-primary w-full justify-center !bg-emerald-600 hover:!bg-emerald-700"
              (click)="saveOcrToClientRecord()"
            >
              <span class="material-symbols-rounded !text-lg">save</span>
              Okunan Verileri Danışan Dosyasına İşle
            </button>
          </section>

          <!-- Sağ: Okunan OCR Sonuçları -->
          <section class="odv-card space-y-4 p-5" aria-label="OCR Ayrıştırma Sonucu">
            <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <span class="odv-eyebrow">Ayrıştırılan Belge</span>
                <h3 class="text-base font-extrabold">{{ ocrResult().documentTitle }}</h3>
              </div>
              <span class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
                OCR Güven Skoru: %{{ ocrResult().confidencePct }}
              </span>
            </div>

            @if (ocrResult().labValues; as lab) {
              <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div class="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <span class="text-xs text-slate-500">Açlık Glukozu</span>
                  <p class="text-base font-extrabold tabular">{{ lab.fastingGlucoseMgDl }} mg/dL</p>
                </div>
                <div class="rounded-xl border border-amber-300 bg-amber-50/50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
                  <span class="text-xs text-amber-800 dark:text-amber-300">Açlık İnsülini</span>
                  <p class="text-base font-extrabold tabular text-amber-900 dark:text-amber-200">{{ lab.fastingInsulinUiuMl }} µIU/mL</p>
                </div>
                <div class="rounded-xl border border-amber-300 bg-amber-50/50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
                  <span class="text-xs text-amber-800 dark:text-amber-300">HbA1c</span>
                  <p class="text-base font-extrabold tabular text-amber-900 dark:text-amber-200">%{{ lab.hba1cPct }}</p>
                </div>
                <div class="rounded-xl border border-rose-300 bg-rose-50/50 p-3 dark:border-rose-800 dark:bg-rose-950/30">
                  <span class="text-xs text-rose-800 dark:text-rose-300">Ferritin</span>
                  <p class="text-base font-extrabold tabular text-rose-900 dark:text-rose-200">{{ lab.ferritinNgMl }} ng/mL</p>
                </div>
                <div class="rounded-xl border border-amber-300 bg-amber-50/50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
                  <span class="text-xs text-amber-800 dark:text-amber-300">25-OH Vitamin D</span>
                  <p class="text-base font-extrabold tabular">{{ lab.vitaminDNgMl }} ng/mL</p>
                </div>
                <div class="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <span class="text-xs text-slate-500">Vitamin B12</span>
                  <p class="text-base font-extrabold tabular">{{ lab.vitaminB12PgMl }} pg/mL</p>
                </div>
                <div class="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <span class="text-xs text-slate-500">LDL / Trigliserid</span>
                  <p class="text-base font-extrabold tabular">{{ lab.ldlMgDl }} / {{ lab.triglyceridesMgDl }}</p>
                </div>
                <div class="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <span class="text-xs text-slate-500">TSH / CRP</span>
                  <p class="text-base font-extrabold tabular">{{ lab.tshMiuL }} / {{ lab.crpMgL }}</p>
                </div>
              </div>
            }

            @if (ocrResult().bodyValues; as body) {
              <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div class="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <span class="text-xs text-slate-500">Tartı Ağırlığı</span>
                  <p class="text-base font-extrabold tabular">{{ body.weightKg }} kg</p>
                </div>
                <div class="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <span class="text-xs text-slate-500">Vücut Yağ Oranı</span>
                  <p class="text-base font-extrabold tabular">%{{ body.bodyFatPct }}</p>
                </div>
                <div class="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 dark:border-emerald-800 dark:bg-emerald-950/30">
                  <span class="text-xs text-emerald-800 dark:text-emerald-300">İskelet Kas Kütlesi</span>
                  <p class="text-base font-extrabold tabular">{{ body.muscleMassKg }} kg</p>
                </div>
                <div class="rounded-xl border border-amber-200 bg-amber-50/40 p-3 dark:border-amber-800 dark:bg-amber-950/30">
                  <span class="text-xs text-amber-800 dark:text-amber-300">ECW/TBW (Ödem)</span>
                  <p class="text-base font-extrabold tabular">{{ body.ecwTbwRatio }}</p>
                </div>
                <div class="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <span class="text-xs text-slate-500">Viseral Yağ Derecesi</span>
                  <p class="text-base font-extrabold tabular">Seviye {{ body.visceralFatRating }}</p>
                </div>
                <div class="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <span class="text-xs text-slate-500">Metabolik Yaş</span>
                  <p class="text-base font-extrabold tabular">{{ body.metabolicAge }} yaş</p>
                </div>
                <div class="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <span class="text-xs text-slate-500">Faz Açısı (Phase Angle)</span>
                  <p class="text-base font-extrabold tabular">{{ body.phaseAngleDeg }}°</p>
                </div>
                <div class="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <span class="text-xs text-slate-500">Bel Çevresi</span>
                  <p class="text-base font-extrabold tabular">{{ body.waistCm }} cm</p>
                </div>
              </div>
            }

            <div class="rounded-2xl bg-amber-50/70 p-4 space-y-2 dark:bg-amber-950/30">
              <span class="odv-eyebrow text-amber-800 dark:text-amber-300">AI Otomatik Klinik Bulgular</span>
              <ul class="space-y-1.5 text-xs text-slate-800 dark:text-slate-200">
                @for (flag of ocrResult().clinicalFlags; track flag) {
                  <li class="flex items-start gap-2">
                    <span class="material-symbols-rounded !text-sm text-amber-600" aria-hidden="true">warning</span>
                    <span>{{ flag }}</span>
                  </li>
                }
              </ul>
            </div>
          </section>
        </div>
      }

      <!-- TAB 3: AI SEANS SOAP NOTU & WHATSAPP ÖZETİ -->
      @if (activeTab() === 'scribe') {
        <div class="grid gap-6 lg:grid-cols-2">
          <section class="odv-card space-y-4 p-5" aria-label="Seans Girdileri">
            <div>
              <span class="odv-eyebrow text-violet-700 dark:text-violet-300">AI Ambient Scribe</span>
              <h2 class="text-base font-extrabold">Seans Anahtar Kelimelerinden SOAP & Mesaj Üretici</h2>
              <p class="mt-0.5 text-xs text-slate-500">
                Seans sonunda 2 cümlelik gözleminizi yazın; AI resmi klinik SOAP raporunu ve danışan motivasyon mesajını hazırlasın.
              </p>
            </div>

            <div class="grid gap-3 sm:grid-cols-3">
              <label class="block sm:col-span-1">
                <span class="odv-label">Danışan</span>
                <select
                  class="odv-input"
                  [value]="selectedClientId()"
                  (change)="selectClient($any($event.target).value)"
                >
                  @for (c of activeClients(); track c.id) {
                    <option [value]="c.id">{{ c.firstName }} {{ c.lastName }}</option>
                  }
                </select>
              </label>
              <label class="block">
                <span class="odv-label">Haftalık fark (kg)</span>
                <input
                  type="number"
                  step="0.1"
                  class="odv-input tabular"
                  [value]="scribeWeightDiff()"
                  (input)="scribeWeightDiff.set(+$any($event.target).value || 0)"
                />
              </label>
              <label class="block">
                <span class="odv-label">Plan uyumu (%)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  class="odv-input tabular"
                  [value]="scribeCompliance()"
                  (input)="scribeCompliance.set(+$any($event.target).value || 85)"
                />
              </label>
            </div>

            <label class="block">
              <span class="odv-label">Danışanın zorlandığı noktalar</span>
              <input
                class="odv-input"
                [value]="scribeStruggles()"
                (input)="scribeStruggles.set($any($event.target).value)"
                placeholder="Örn: Akşam 21:00 sonrası tatlı isteği, su içmeyi unutma"
              />
            </label>

            <label class="block">
              <span class="odv-label">Kısa diyetisyen izlemi</span>
              <textarea
                class="odv-input min-h-24"
                [value]="scribeNotes()"
                (input)="scribeNotes.set($any($event.target).value)"
                placeholder="Örn: İkindiye tarçınlı kefir ve 10 çiğ badem eklendi, yürüyüş 35 dakikaya çıkarıldı."
              ></textarea>
            </label>
          </section>

          <section class="odv-card space-y-4 p-5" aria-label="Üretilen SOAP ve Mesaj">
            <div>
              <span class="odv-eyebrow text-emerald-700 dark:text-emerald-300">Klinik Kayıt & İletişim</span>
              <h3 class="text-base font-extrabold">Oluşturulan SOAP Raporu</h3>
            </div>

            <div class="space-y-2 rounded-2xl border border-slate-200 p-4 text-xs dark:border-slate-800">
              <p><strong>S (Subjective):</strong> {{ consultationSummary().soapRecord.subjective }}</p>
              <p><strong>O (Objective):</strong> {{ consultationSummary().soapRecord.objective }}</p>
              <p><strong>A (Assessment):</strong> {{ consultationSummary().soapRecord.assessment }}</p>
              <p><strong>P (Plan):</strong> {{ consultationSummary().soapRecord.plan }}</p>
            </div>

            <div class="rounded-2xl bg-emerald-50/70 p-4 space-y-2 dark:bg-emerald-950/30">
              <span class="odv-eyebrow text-emerald-800 dark:text-emerald-300">Danışana Gidecek Motivasyon Özeti</span>
              <p class="whitespace-pre-line text-xs text-slate-800 dark:text-slate-200">{{ consultationSummary().clientMessage }}</p>
            </div>

            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                class="odv-btn-primary !bg-emerald-600 hover:!bg-emerald-700"
                (click)="sendSoapMessageToClient()"
              >
                <span class="material-symbols-rounded !text-base">send</span>Portaldan Danışana Gönder
              </button>
              <button type="button" class="odv-btn-soft" (click)="copySoapText()">
                <span class="material-symbols-rounded !text-base">content_copy</span>SOAP & Mesajı Kopyala
              </button>
            </div>
          </section>
        </div>
      }

      <!-- TAB 4: DANIŞAN KOPMA (CHURN) RADARI -->
      @if (activeTab() === 'retention') {
        <section class="odv-card space-y-4 p-5" aria-label="Danışan Kopma Radarı">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span class="odv-eyebrow text-amber-700 dark:text-amber-300">AI Elde Tutma (Retention) Motoru</span>
              <h2 class="text-base font-extrabold">Danışan Kopma Riski Analizi & Tek Tıkla Dürtme</h2>
              <p class="mt-0.5 text-xs text-slate-500">
                Tartı girmeyen, görevlerini geciktiren veya mesajlara dönmeyen danışanları erken yakalayıp tek tıkla geri kazanın.
              </p>
            </div>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            @for (item of churnAssessments(); track item.clientId) {
              <div class="rounded-2xl border border-slate-200 p-4 space-y-3 dark:border-slate-800">
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2.5">
                    <app-avatar [name]="item.clientName" size="sm" />
                    <div>
                      <strong class="text-sm font-extrabold">{{ item.clientName }}</strong>
                      <p class="text-xs text-slate-500">Son ölçüm: {{ item.daysSinceLastMeasurement }} gün önce</p>
                    </div>
                  </div>
                  <span
                    class="rounded-full px-3 py-1 text-xs font-extrabold"
                    [class.bg-rose-100]="item.riskLevel === 'high'"
                    [class.text-rose-800]="item.riskLevel === 'high'"
                    [class.bg-amber-100]="item.riskLevel === 'medium'"
                    [class.text-amber-800]="item.riskLevel === 'medium'"
                    [class.bg-emerald-100]="item.riskLevel === 'low'"
                    [class.text-emerald-800]="item.riskLevel === 'low'"
                  >
                    Kopma Riski: %{{ item.riskScore }}
                  </span>
                </div>

                <ul class="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                  @for (reason of item.reasons; track reason) {
                    <li class="flex items-center gap-1.5">
                      <span class="material-symbols-rounded !text-sm text-amber-500" aria-hidden="true">info</span>
                      {{ reason }}
                    </li>
                  }
                </ul>

                <div class="rounded-xl bg-slate-50 p-3 text-xs text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  <span class="font-bold text-violet-700 dark:text-violet-300">Önerilen AI Mesajı:</span>
                  <p class="mt-1">{{ item.nudgeMessage }}</p>
                </div>

                <div class="flex flex-wrap gap-2">
                  <button
                    type="button"
                    class="odv-btn-primary !py-1.5 !text-xs"
                    (click)="sendChurnNudge(item)"
                  >
                    <span class="material-symbols-rounded !text-sm">send</span>Portaldan Gönder
                  </button>
                  <button
                    type="button"
                    class="odv-btn-ghost !py-1.5 !text-xs"
                    (click)="copyText(item.nudgeMessage, 'WhatsApp geri kazanım mesajı kopyalandı.')"
                  >
                    <span class="material-symbols-rounded !text-sm">content_copy</span>WhatsApp İçin Kopyala
                  </button>
                </div>
              </div>
            }
          </div>
        </section>
      }

      <!-- TAB 5: YENİ DANIŞAN KAZANIM HUNİSİ (LEADS) & PAKET SATIŞI -->
      @if (activeTab() === 'growth') {
        <div class="space-y-6">
          <!-- Instagram / Web Lead Magnet Banner -->
          <section class="odv-card border-violet-200 bg-violet-50/40 p-5 space-y-4 dark:border-violet-900/60 dark:bg-violet-950/20" aria-label="Instagram Danışan Kazanım Hunisi">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span class="odv-eyebrow text-violet-700 dark:text-violet-300">Ticari Büyüme Hizmeti #1</span>
                <h2 class="text-base font-extrabold text-slate-900 dark:text-white">
                  Instagram & Web "Ücretsiz 1 Dakikada Metabolik Yaş & İnsülin Direnci Risk Testi" Hunisi
                </h2>
                <p class="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                  Bu linki Instagram biyografinize koyun; testi çözen kişilerin iletişim ve metabolik verileri anında aşağıdaki "Sıcak Adaylar" listesine düşsün.
                </p>
              </div>
              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  class="odv-btn-soft"
                  (click)="simulateIncomingLead()"
                >
                  <span class="material-symbols-rounded !text-base">person_add</span>+ Yeni Aday Geldi Simüle Et
                </button>
                <button
                  type="button"
                  class="odv-btn-primary"
                  (click)="copyText(funnelUrl(), 'Instagram Metabolik Check-Up huni linkiniz panoya kopyalandı!')"
                >
                  <span class="material-symbols-rounded !text-base">share</span>Huni Linkini Kopyala
                </button>
              </div>
            </div>

            <div class="grid gap-4 md:grid-cols-3">
              @for (lead of leads(); track lead.id) {
                <div class="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                  <div class="flex items-start justify-between gap-2">
                    <div>
                      <span class="text-[11px] font-bold text-violet-600 dark:text-violet-400">{{ lead.source }} · {{ lead.createdAt }}</span>
                      <h3 class="text-sm font-extrabold">{{ lead.fullName }}</h3>
                      <p class="text-xs text-slate-500">{{ lead.phone }} · {{ lead.age }} yaş</p>
                    </div>
                    <span
                      class="rounded-lg px-2 py-0.5 text-[11px] font-bold"
                      [class.bg-rose-100]="lead.insulinRiskLabel === 'Yüksek Risk'"
                      [class.text-rose-800]="lead.insulinRiskLabel === 'Yüksek Risk'"
                      [class.bg-amber-100]="lead.insulinRiskLabel !== 'Yüksek Risk'"
                      [class.text-amber-800]="lead.insulinRiskLabel !== 'Yüksek Risk'"
                    >
                      {{ lead.insulinRiskLabel }}
                    </span>
                  </div>

                  <div class="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2.5 text-center text-xs dark:bg-slate-800/60">
                    <div>
                      <span class="text-[10px] text-slate-500">Mevcut / Hedef</span>
                      <p class="font-extrabold tabular">{{ lead.weightKg }} → {{ lead.targetWeightKg }} kg</p>
                    </div>
                    <div>
                      <span class="text-[10px] text-slate-500">BKİ</span>
                      <p class="font-extrabold tabular">{{ lead.bmi | number: '1.1-1' }}</p>
                    </div>
                    <div>
                      <span class="text-[10px] text-slate-500">Metabolik Yaş</span>
                      <p class="font-extrabold tabular text-rose-600 dark:text-rose-400">{{ lead.metabolicAgeEstimate }}</p>
                    </div>
                  </div>

                  <p class="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Hedef: {{ lead.goalLabel }}
                  </p>

                  @if (lead.convertedClientId) {
                    <div class="rounded-xl bg-emerald-50 px-3 py-2 text-center text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
                      ✓ Kliniğe Danışan Olarak Eklendi & Portal Daveti Gönderildi
                    </div>
                  } @else {
                    <button
                      type="button"
                      class="odv-btn-primary w-full justify-center !bg-emerald-600 !py-2 !text-xs hover:!bg-emerald-700"
                      (click)="convertLeadToClient(lead)"
                    >
                      <span class="material-symbols-rounded !text-base">how_to_reg</span>
                      Tek Tıkla Danışan Olarak Kaydet & Davet Et
                    </button>
                  }
                </div>
              }
            </div>
          </section>

          <!-- Online Paket Satış & Tahsilat Linkleri -->
          <section class="odv-card p-5 space-y-4" aria-label="Online Paket Satış Linkleri">
            <div>
              <span class="odv-eyebrow text-emerald-700 dark:text-emerald-300">Ticari Büyüme Hizmeti #2</span>
              <h2 class="text-base font-extrabold">Hazır Online Takip Paketleri & Tek Tıkla Ödeme/Teklif Linki</h2>
              <p class="mt-0.5 text-xs text-slate-500">
                Danışanlarınıza veya yeni adaylara WhatsApp'tan gönderebileceğiniz kurumsal hizmet paketleri.
              </p>
            </div>

            <div class="grid gap-4 md:grid-cols-3">
              @for (pkg of servicePackages; track pkg.id) {
                <div class="flex flex-col justify-between rounded-2xl border border-slate-200 p-4 space-y-4 dark:border-slate-800">
                  <div class="space-y-2">
                    <span class="inline-block rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
                      {{ pkg.badge }}
                    </span>
                    <h3 class="text-sm font-extrabold">{{ pkg.title }}</h3>
                    <p class="text-xs text-slate-500">{{ pkg.durationLabel }} · {{ pkg.installmentLabel }}</p>
                    <p class="text-xl font-extrabold tabular text-slate-900 dark:text-white">
                      {{ pkg.priceTl | number }} ₺
                    </p>
                    <ul class="space-y-1.5 pt-2 text-xs text-slate-600 dark:text-slate-300">
                      @for (inc of pkg.includes; track inc) {
                        <li class="flex items-start gap-1.5">
                          <span class="material-symbols-rounded !text-sm text-emerald-600" aria-hidden="true">check</span>
                          <span>{{ inc }}</span>
                        </li>
                      }
                    </ul>
                  </div>

                  <button
                    type="button"
                    class="odv-btn-soft w-full justify-center !text-xs"
                    (click)="copyPackageOffer(pkg)"
                  >
                    <span class="material-symbols-rounded !text-base">send</span>
                    WhatsApp Teklif & Ödeme Mesajını Kopyala
                  </button>
                </div>
              }
            </div>
          </section>
        </div>
      }
    </div>
  `,
})
export class AiCopilotPage {
  readonly diet = inject(DietStore);
  readonly portal = inject(PortalStore);
  private readonly auth = inject(AuthStore);
  private readonly ai = inject(AiNutripilotService);
  private readonly notify = inject(Notify);

  readonly activeTab = signal<CopilotTab>('autopilot');
  readonly activeClients = computed(() =>
    this.diet.clients().filter((c) => c.status !== 'archived'),
  );
  readonly activeClientViews = computed(() =>
    this.diet.clientViews().filter((v) => v.client.status !== 'archived'),
  );
  readonly selectedClientId = signal<string>(this.activeClients()[0]?.id ?? 'c-1');

  // Autopilot state
  readonly gender = signal<Gender>('female');
  readonly age = signal<number>(32);
  readonly weightKg = signal<number>(74.8);
  readonly heightCm = signal<number>(168);
  readonly activity = signal<ActivityLevel>('light');
  readonly dietGoal = signal<DietGoal>('lose_weight');
  readonly dietType = signal<DietType>('insulin_resistance');
  readonly intolerances = signal<string[]>(['Laktoz']);
  readonly intoleranceOptions = ['Laktoz', 'Gluten', 'Yumurta', 'Fruktoz', 'Histamin'] as const;

  readonly metabolism = computed(() =>
    this.ai.calculateMetabolism({
      gender: this.gender(),
      age: this.age(),
      weightKg: this.weightKg(),
      heightCm: this.heightCm(),
      activity: this.activity(),
      goal: this.dietGoal(),
      dietType: this.dietType(),
      intolerances: this.intolerances(),
    }),
  );

  readonly generatedPlan = computed(() =>
    this.ai.generateSmartMealPlan({
      gender: this.gender(),
      age: this.age(),
      weightKg: this.weightKg(),
      heightCm: this.heightCm(),
      activity: this.activity(),
      goal: this.dietGoal(),
      dietType: this.dietType(),
      intolerances: this.intolerances(),
    }),
  );

  readonly generatedMealSections = computed(() => {
    const m = this.generatedPlan().meals;
    return [
      { label: 'Kahvaltı', time: '08:30', items: m.breakfast },
      { label: 'Kuşluk Ara Öğünü', time: '11:00', items: m.morningSnack ?? [] },
      { label: 'Öğle Yemeği', time: '13:30', items: m.lunch },
      { label: 'İkindi Ara Öğünü', time: '16:30', items: m.afternoonSnack ?? [] },
      { label: 'Akşam Yemeği', time: '19:30', items: m.dinner },
    ];
  });

  // OCR state
  readonly ocrKind = signal<OcrDocumentKind>('enabiz_insulin');
  readonly ocrCustomFileName = signal<string>('');
  readonly ocrResult = computed(() =>
    this.ai.extractOcrDocument(this.ocrKind(), this.ocrCustomFileName() || undefined),
  );

  // Scribe state
  readonly scribeWeightDiff = signal<number>(-1.3);
  readonly scribeCompliance = signal<number>(88);
  readonly scribeStruggles = signal<string>('Akşam yemeklerinden sonra tatlı ve çay yanına atıştırmalık isteği.');
  readonly scribeNotes = signal<string>('İkindi ara öğününe tarçınlı kefir ve çiğ badem eklendi, akşam karbonhidratı azaltıldı.');

  readonly consultationSummary = computed(() =>
    this.ai.summarizeConsultation({
      clientName: this.diet.clientName(this.selectedClientId()),
      weekNumber: 4,
      weightDiffKg: this.scribeWeightDiff(),
      complianceRatePct: this.scribeCompliance(),
      struggles: this.scribeStruggles(),
      dietitianNotes: this.scribeNotes(),
    }),
  );

  // Churn radar state
  readonly churnAssessments = computed<ChurnRiskAssessment[]>(() => {
    const today = isoDate(new Date());
    const inputs = this.activeClients().map((c) => {
      const latestMeas = this.diet.measurementsFor(c.id)[0];
      const daysSinceMeasurement = latestMeas ? Math.max(0, daysBetween(latestMeas.date, today)) : 14;
      const overdueTasks = this.portal
        .tasksFor(c.id)
        .filter((t) => t.status === 'open' && t.dueDate && t.dueDate < today).length;
      const unreadFromDietitian = this.portal.unreadCount(c.id, 'member');
      return {
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        daysSinceMeasurement,
        overdueTasks,
        unreadFromDietitian,
      };
    });
    return this.ai.evaluateClientChurn(inputs);
  });

  readonly highRiskChurnCount = computed(
    () => this.churnAssessments().filter((x) => x.riskLevel !== 'low').length,
  );

  // Growth / Lead Magnet state
  readonly leads = signal<LeadCandidate[]>(this.ai.defaultLeads());
  readonly servicePackages: ClinicServicePackage[] = this.ai.defaultServicePackages();
  readonly unconvertedLeadCount = computed(
    () => this.leads().filter((l) => !l.convertedClientId).length,
  );
  readonly funnelUrl = computed(() => {
    const clinicSlug = (this.auth.session()?.name ?? 'odivon-klinik')
      .toLocaleLowerCase('tr')
      .replace(/[^a-z0-9]+/g, '-');
    return `https://diet.odivon.com/checkup/${clinicSlug}`;
  });

  selectClient(clientId: string): void {
    this.selectedClientId.set(clientId);
    const v = this.diet.view(clientId);
    if (!v) return;
    this.weightKg.set(v.currentWeightKg);
    this.heightCm.set(v.client.heightCm);
    this.gender.set(v.client.sex === 'male' ? 'male' : 'female');
    this.age.set(Math.max(18, v.age));
    this.intolerances.set([...v.client.allergies]);
  }

  toggleIntolerance(tag: string): void {
    this.intolerances.update((list) =>
      list.includes(tag) ? list.filter((x) => x !== tag) : [...list, tag],
    );
  }

  assignGeneratedPlanToClient(): void {
    const clientId = this.selectedClientId();
    const meta = this.metabolism();
    const generated = this.generatedPlan();
    const start = isoDate(new Date());
    const endDt = new Date();
    endDt.setDate(endDt.getDate() + 7);

    const meals: Meal[] = this.generatedMealSections()
      .filter((s) => s.items.length > 0)
      .map((s) => ({
        name: s.label,
        time: s.time,
        kcal: s.items.reduce((sum, i) => sum + i.calories, 0),
        proteinG: s.items.reduce((sum, i) => sum + i.protein, 0),
        carbG: s.items.reduce((sum, i) => sum + i.carbs, 0),
        fatG: s.items.reduce((sum, i) => sum + i.fat, 0),
        note: s.items.map((i) => `${i.name} (${i.portion})`).join(' + '),
      }));

    this.diet.savePlan({
      clientId,
      title: `AI NutriPilot · ${generated.title}`,
      startDate: start,
      endDate: isoDate(endDt),
      kcal: meta.targetCalories,
      proteinPct: meta.macros.proteinPct,
      carbPct: meta.macros.carbPct,
      fatPct: meta.macros.fatPct,
      status: 'active',
      meals,
      notes: generated.clinicalTips.join(' '),
    });

    this.notify.success(
      'AI Beslenme Planı Atandı',
      `${this.diet.clientName(clientId)} için ${meta.targetCalories} kcal aktif plan oluşturuldu.`,
    );
  }

  selectOcrKind(kind: OcrDocumentKind): void {
    this.ocrKind.set(kind);
    this.ocrCustomFileName.set('');
  }

  onOcrFilePicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.ocrCustomFileName.set(file.name);
    if (file.name.toLocaleLowerCase('tr').endsWith('.pdf')) {
      this.ocrKind.set('enabiz_insulin');
    } else {
      this.ocrKind.set('inbody_sheet');
    }
  }

  saveOcrToClientRecord(): void {
    const clientId = this.selectedClientId();
    const res = this.ocrResult();
    const today = isoDate(new Date());

    if (res.labValues) {
      this.diet.saveLabPanel({
        clientId,
        date: today,
        ...res.labValues,
        note: `AI OCR (${res.documentTitle} · %${res.confidencePct} doğruluk)`,
      });
      this.notify.success(
        'e-Nabız Tahlili Kaydedildi',
        `${this.diet.clientName(clientId)} klinik biyobelirteç dosyasına tüm değerler işlendi.`,
      );
      return;
    }

    if (res.bodyValues) {
      this.diet.addMeasurement({
        clientId,
        date: today,
        weightKg: res.bodyValues.weightKg,
        waistCm: res.bodyValues.waistCm,
        hipCm: null,
        bodyFatPct: res.bodyValues.bodyFatPct,
        muscleMassKg: res.bodyValues.muscleMassKg,
        visceralFatRating: res.bodyValues.visceralFatRating,
        bodyWaterPct: res.bodyValues.bodyWaterPct,
        ecwTbwRatio: res.bodyValues.ecwTbwRatio,
        metabolicAge: res.bodyValues.metabolicAge,
        phaseAngleDeg: res.bodyValues.phaseAngleDeg,
        note: `AI OCR (${res.documentTitle})`,
        source: 'dietitian',
      });
      this.notify.success(
        'InBody / Tanita Fişi Kaydedildi',
        `${this.diet.clientName(clientId)} ölçüm geçmişine segmental veriler eklendi.`,
      );
    }
  }

  sendSoapMessageToClient(): void {
    const clientId = this.selectedClientId();
    const msg = this.consultationSummary().clientMessage;
    this.portal.sendMessage(
      clientId,
      'dietitian',
      this.auth.session()?.name ?? 'Diyetisyen',
      msg,
    );
    this.notify.success(
      'Motivasyon Özeti Gönderildi',
      `${this.diet.clientName(clientId)} danışan portalı sohbetine iletildi.`,
    );
  }

  copySoapText(): void {
    const s = this.consultationSummary();
    const full = `SOAP KAYDI\nS: ${s.soapRecord.subjective}\nO: ${s.soapRecord.objective}\nA: ${s.soapRecord.assessment}\nP: ${s.soapRecord.plan}\n\nDANIŞAN MESAJI\n${s.clientMessage}`;
    this.copyText(full, 'SOAP raporu ve danışan mesajı panoya kopyalandı.');
  }

  sendChurnNudge(item: ChurnRiskAssessment): void {
    this.portal.sendMessage(
      item.clientId,
      'dietitian',
      this.auth.session()?.name ?? 'Diyetisyen',
      item.nudgeMessage,
    );
    this.notify.success(
      'Geri Kazanım Mesajı Gönderildi',
      `${item.clientName} portal sohbetine hatırlatma iletildi.`,
    );
  }

  simulateIncomingLead(): void {
    const id = `lead-${Date.now()}`;
    const newLead: LeadCandidate = {
      id,
      fullName: 'Cemre Aksoy',
      phone: '+90 535 612 88 19',
      email: `cemre.aksoy.${Date.now().toString().slice(-3)}@ornek.com`,
      age: 31,
      gender: 'female',
      heightCm: 167,
      weightKg: 76.2,
      targetWeightKg: 61,
      bmi: 27.3,
      metabolicAgeEstimate: 38,
      insulinRiskLabel: 'Orta Risk',
      goalLabel: 'Bölgesel İncelme & Tatlı Krizi Yönetimi (-15 kg)',
      source: 'Instagram Bio Testi',
      createdAt: 'Şimdi · 1 dk önce',
    };
    this.leads.update((list) => [newLead, ...list]);
    this.notify.success('Yeni Sıcak Aday Düştü!', 'Instagram Metabolik Check-Up formundan yeni bir başvuru geldi.');
  }

  convertLeadToClient(lead: LeadCandidate): void {
    if (lead.convertedClientId) return;
    const parts = lead.fullName.trim().split(/\s+/);
    const firstName = parts[0] || 'Danışan';
    const lastName = parts.slice(1).join(' ') || 'Aday';
    const birthYear = new Date().getFullYear() - lead.age;

    const created = this.diet.saveClient({
      firstName,
      lastName,
      email: lead.email,
      phone: lead.phone,
      sex: lead.gender,
      birthDate: `${birthYear}-05-15`,
      heightCm: lead.heightCm,
      startWeightKg: lead.weightKg,
      targetWeightKg: lead.targetWeightKg,
      activity: 'light',
      program: 'weight_loss',
      conditions: lead.insulinRiskLabel === 'Yüksek Risk' ? ['İnsülin Direnci Riski'] : [],
      allergies: [],
      consentAt: new Date().toISOString(),
      status: 'active',
    });

    this.portal.invite(created.id);
    this.leads.update((list) =>
      list.map((item) => (item.id === lead.id ? { ...item, convertedClientId: created.id } : item)),
    );
    this.notify.success(
      'Aday Kliniğe Kaydedildi',
      `${lead.fullName} aktif danışan olarak eklendi ve portal giriş daveti gönderildi.`,
    );
  }

  copyPackageOffer(pkg: ClinicServicePackage): void {
    const clinic = this.auth.session()?.name ?? 'OdivonDiet Kliniği';
    const text =
      `Merhaba 🌟 ${clinic} — "${pkg.title}" (${pkg.durationLabel})\n` +
      `Paket Ücreti: ${pkg.priceTl} TL (${pkg.installmentLabel})\n` +
      `İçerik:\n` +
      pkg.includes.map((i) => `• ${i}`).join('\n') +
      `\nOnline kayıt ve güvenli ödeme linki: ${this.funnelUrl()}?pkg=${pkg.id}`;
    this.copyText(text, `"${pkg.title}" teklif ve ödeme linki panoya kopyalandı.`);
  }

  copyText(text: string, toastMessage: string): void {
    void globalThis.navigator?.clipboard?.writeText(text);
    this.notify.success(toastMessage);
  }
}
