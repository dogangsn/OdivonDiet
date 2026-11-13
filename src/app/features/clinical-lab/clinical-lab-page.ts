import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DietStore } from '../../core/data/diet-store';
import { Notify } from '../../core/notify/notify';
import {
  analyzeChronoNutrition,
  analyzeDrugNutrientInteractions,
  atherogenicIndex,
  bmr,
  cunninghamBmr,
  evaluateSarcopeniaRisk,
  harrisBenedictBmr,
  homaIr,
  idealWeightRange,
  isoDate,
  katchMcArdleBmr,
  leanBodyMassKg,
  round1,
  summarizeMeals,
} from '../../domain/diet-calc';
import {
  GLP1_STAGE_LABELS,
  Glp1BariatricProfile,
  Glp1Stage,
  MedicationEntry,
  SUPPLEMENT_TIMING_LABELS,
  SupplementProtocolItem,
} from '../../domain/diet.models';
import { Avatar } from '../../shared/ui/avatar';
import { PageHeader } from '../../shared/ui/page-header';
import { QuickActions } from '../forms/quick-actions';

type ClinicalTab = 'labs' | 'interactions' | 'glp1' | 'chrono' | 'equations';
type PhysiologicalModifier =
  | 'standard'
  | 'luteal_phase'
  | 'pregnancy_t1'
  | 'pregnancy_t2'
  | 'pregnancy_t3'
  | 'lactation'
  | 'clinical_stress';

@Component({
  selector: 'app-clinical-lab-page',
  imports: [PageHeader, Avatar, FormsModule, DatePipe, DecimalPipe],
  template: `
    <div class="animate-fade-up space-y-6">
      <app-page-header
        eyebrow="Klinik Karar Destek & İleri Analiz"
        title="Biyobelirteç, İlaç-Besin, GLP-1 & Krono-Beslenme Stüdyosu"
        description="HOMA-IR ve aterojenik indeks hesaplama, ilaç-besin-tahlil çapraz etkileşim motoru, GLP-1/bariatrik sarkopeni radarı ve 24 saatlik sirkadiyen glisemik simülasyon."
      >
        <div actions class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="odv-btn-soft"
            (click)="qa.open('measurement', selectedClientId())"
          >
            <span class="material-symbols-rounded !text-lg">monitor_weight</span>BIA Ölçümü Ekle
          </button>
          <button type="button" class="odv-btn-primary" (click)="qa.open('plan', selectedClientId())">
            <span class="material-symbols-rounded !text-lg">restaurant_menu</span>Diyet Planını Düzenle
          </button>
        </div>
      </app-page-header>

      <div class="grid gap-6 lg:grid-cols-[270px_1fr]">
        <!-- Sol: Danışan Seçici -->
        <aside class="odv-card h-fit p-3" aria-label="Klinik analiz danışan seçimi">
          <p class="odv-eyebrow px-2 pb-2 pt-1">Aktif Danışanlar</p>
          <ul class="custom-scroll max-h-[540px] space-y-1 overflow-y-auto">
            @for (v of store.activeClients(); track v.client.id) {
              <li>
                <button
                  type="button"
                  class="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-start transition"
                  [class]="
                    v.client.id === selectedClientId()
                      ? 'bg-violet-50 text-violet-900 dark:bg-violet-950/50 dark:text-white'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  "
                  [attr.aria-current]="v.client.id === selectedClientId() ? 'true' : null"
                  (click)="pickedClientId.set(v.client.id)"
                >
                  <app-avatar [name]="v.fullName" size="sm" />
                  <div class="min-w-0 flex-1">
                    <strong class="block truncate text-sm">{{ v.fullName }}</strong>
                    <span class="block truncate text-[11px] text-slate-500">
                      {{ v.currentWeightKg }} kg · BKİ {{ v.bmi }}
                    </span>
                  </div>
                  @if (store.labsFor(v.client.id).length) {
                    <span class="odv-badge odv-tone-info !px-1.5 !py-0.5 text-[10px]">Lab</span>
                  }
                </button>
              </li>
            }
          </ul>
        </aside>

        @if (selectedClient(); as v) {
          <div class="min-w-0 space-y-6">
            <!-- Üst Klinik Özet Çubuğu -->
            <section
              class="odv-card flex flex-wrap items-center justify-between gap-4 p-4"
              aria-label="Danışan klinik kimliği"
            >
              <div class="flex items-center gap-3">
                <app-avatar [name]="v.fullName" size="md" />
                <div>
                  <div class="flex flex-wrap items-center gap-2">
                    <h2 class="text-base font-extrabold">{{ v.fullName }}</h2>
                    <span class="odv-badge odv-tone-primary">{{ v.age }} yaş</span>
                    <span class="odv-badge odv-tone-neutral"
                      >Yağsız Kütle (LBM): {{ lbmKg() }} kg</span
                    >
                  </div>
                  <p class="mt-0.5 text-xs text-slate-500">
                    Klinik tanılar:
                    {{
                      v.client.conditions.length
                        ? v.client.conditions.join(', ')
                        : 'Tanımlı kronik durum yok'
                    }}
                    @if (v.client.allergies.length) {
                      · Alerji: {{ v.client.allergies.join(', ') }}
                    }
                  </p>
                </div>
              </div>

              <!-- Sekme Menüsü -->
              <div
                class="odv-segment flex-wrap"
                role="tablist"
                aria-label="Klinik analiz modülleri"
              >
                <button
                  type="button"
                  role="tab"
                  class="odv-segment-item"
                  [attr.aria-selected]="activeTab() === 'labs'"
                  [attr.aria-pressed]="activeTab() === 'labs'"
                  (click)="activeTab.set('labs')"
                >
                  1. Tahlil & HOMA-IR
                </button>
                <button
                  type="button"
                  role="tab"
                  class="odv-segment-item"
                  [attr.aria-selected]="activeTab() === 'interactions'"
                  [attr.aria-pressed]="activeTab() === 'interactions'"
                  (click)="activeTab.set('interactions')"
                >
                  2. İlaç-Besin & Takviye ({{ drugAlerts().length }})
                </button>
                <button
                  type="button"
                  role="tab"
                  class="odv-segment-item"
                  [attr.aria-selected]="activeTab() === 'glp1'"
                  [attr.aria-pressed]="activeTab() === 'glp1'"
                  (click)="activeTab.set('glp1')"
                >
                  3. GLP-1 & Sarkopeni Radarı
                </button>
                <button
                  type="button"
                  role="tab"
                  class="odv-segment-item"
                  [attr.aria-selected]="activeTab() === 'chrono'"
                  [attr.aria-pressed]="activeTab() === 'chrono'"
                  (click)="activeTab.set('chrono')"
                >
                  4. Krono-Beslenme & Glisemik Eğri
                </button>
                <button
                  type="button"
                  role="tab"
                  class="odv-segment-item"
                  [attr.aria-selected]="activeTab() === 'equations'"
                  [attr.aria-pressed]="activeTab() === 'equations'"
                  (click)="activeTab.set('equations')"
                >
                  5. Çoklu BMR, Kadın Sağlığı & FODMAP
                </button>
              </div>
            </section>

            <!-- SEKME 1: KAN TAHLİLİ, BİYOBELİRTEÇ & HOMA-IR / ATEROJENİK İNDEKS -->
            @if (activeTab() === 'labs') {
              <div class="space-y-6">
                <section class="grid gap-4 md:grid-cols-2" aria-label="Metabolik indeksler">
                  <div class="odv-card p-5">
                    <div class="flex items-center justify-between">
                      <span class="odv-eyebrow">HOMA-IR İnsülin Direnci İndeksi</span>
                      <span class="odv-badge" [class]="'odv-tone-' + homaResult().tone">
                        {{ homaResult().label }}
                      </span>
                    </div>
                    <div class="mt-2 flex items-baseline gap-2">
                      <strong class="tabular text-3xl font-extrabold">
                        {{ homaResult().value !== null ? (homaResult().value | number: '1.2-2') : '—' }}
                      </strong>
                      <span class="text-xs text-slate-400">
                        Formül: (Açlık Glukozu × Açlık İnsülini) / 405 · Referans &lt; 1,90
                      </span>
                    </div>
                    <p class="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
                      {{ homaResult().recommendation }}
                    </p>
                  </div>

                  <div class="odv-card p-5">
                    <div class="flex items-center justify-between">
                      <span class="odv-eyebrow">TG / HDL Aterojenik Dislipidemi İndeksi</span>
                      <span class="odv-badge" [class]="'odv-tone-' + atheroResult().tone">
                        {{ atheroResult().label }}
                      </span>
                    </div>
                    <div class="mt-2 flex items-baseline gap-2">
                      <strong class="tabular text-3xl font-extrabold">
                        {{
                          atheroResult().ratio !== null
                            ? (atheroResult().ratio | number: '1.2-2')
                            : '—'
                        }}
                      </strong>
                      <span class="text-xs text-slate-400">
                        Formül: Trigliserid / HDL-K · Optimal &lt; 2,00
                      </span>
                    </div>
                    <p class="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
                      {{ atheroResult().recommendation }}
                    </p>
                  </div>
                </section>

                @if (latestLab(); as lab) {
                  <section class="odv-card p-5">
                    <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 class="odv-section-title">
                          Son Biyokimya Paneli ({{ lab.date | date: 'd MMM y' }})
                        </h3>
                        <p class="text-xs text-slate-500">
                          Referans dışı değerler tıbbi beslenme tedavisi (MNT) için otomatik işaretlenir.
                        </p>
                      </div>
                      <button
                        type="button"
                        class="odv-btn-soft !min-h-9 text-xs"
                        (click)="showLabForm.update((x) => !x)"
                      >
                        <span class="material-symbols-rounded !text-base">biotech</span>
                        {{ showLabForm() ? 'Formu Kapat' : 'Yeni Tahlil Sonucu Gir' }}
                      </button>
                    </div>

                    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                      <div class="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                        <span class="text-[11px] text-slate-500">Açlık Glukozu</span>
                        <strong
                          class="tabular mt-0.5 block text-lg font-extrabold"
                          [class.text-rose-600]="(lab.fastingGlucoseMgDl ?? 0) >= 100"
                        >
                          {{ lab.fastingGlucoseMgDl ?? '—' }} <small class="text-xs">mg/dL</small>
                        </strong>
                        <span class="text-[10px] text-slate-400">Hedef: 70–99</span>
                      </div>

                      <div class="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                        <span class="text-[11px] text-slate-500">Açlık İnsülini</span>
                        <strong
                          class="tabular mt-0.5 block text-lg font-extrabold"
                          [class.text-rose-600]="(lab.fastingInsulinUiuMl ?? 0) > 10"
                        >
                          {{ lab.fastingInsulinUiuMl ?? '—' }} <small class="text-xs">µIU/mL</small>
                        </strong>
                        <span class="text-[10px] text-slate-400">Optimal: &lt; 8,5</span>
                      </div>

                      <div class="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                        <span class="text-[11px] text-slate-500">HbA1c</span>
                        <strong
                          class="tabular mt-0.5 block text-lg font-extrabold"
                          [class.text-rose-600]="(lab.hba1cPct ?? 0) >= 5.7"
                        >
                          %{{ lab.hba1cPct ?? '—' }}
                        </strong>
                        <span class="text-[10px] text-slate-400">Normal: &lt; %5,7</span>
                      </div>

                      <div class="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                        <span class="text-[11px] text-slate-500">Ferritin</span>
                        <strong
                          class="tabular mt-0.5 block text-lg font-extrabold"
                          [class.text-amber-600]="(lab.ferritinNgMl ?? 50) < 35"
                        >
                          {{ lab.ferritinNgMl ?? '—' }} <small class="text-xs">ng/mL</small>
                        </strong>
                        <span class="text-[10px] text-slate-400">Optimal: 45–120</span>
                      </div>

                      <div class="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                        <span class="text-[11px] text-slate-500">25-OH Vitamin D3</span>
                        <strong
                          class="tabular mt-0.5 block text-lg font-extrabold"
                          [class.text-amber-600]="(lab.vitaminDNgMl ?? 40) < 30"
                        >
                          {{ lab.vitaminDNgMl ?? '—' }} <small class="text-xs">ng/mL</small>
                        </strong>
                        <span class="text-[10px] text-slate-400">Optimal: 40–65</span>
                      </div>

                      <div class="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                        <span class="text-[11px] text-slate-500">Vitamin B12</span>
                        <strong
                          class="tabular mt-0.5 block text-lg font-extrabold"
                          [class.text-amber-600]="(lab.vitaminB12PgMl ?? 450) < 350"
                        >
                          {{ lab.vitaminB12PgMl ?? '—' }} <small class="text-xs">pg/mL</small>
                        </strong>
                        <span class="text-[10px] text-slate-400">Optimal: &gt; 400</span>
                      </div>

                      <div class="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                        <span class="text-[11px] text-slate-500">Trigliserid</span>
                        <strong
                          class="tabular mt-0.5 block text-lg font-extrabold"
                          [class.text-rose-600]="(lab.triglyceridesMgDl ?? 0) >= 150"
                        >
                          {{ lab.triglyceridesMgDl ?? '—' }} <small class="text-xs">mg/dL</small>
                        </strong>
                        <span class="text-[10px] text-slate-400">Hedef: &lt; 150</span>
                      </div>

                      <div class="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                        <span class="text-[11px] text-slate-500">HDL / LDL</span>
                        <strong class="tabular mt-0.5 block text-lg font-extrabold">
                          {{ lab.hdlMgDl ?? '—' }} / {{ lab.ldlMgDl ?? '—' }}
                        </strong>
                        <span class="text-[10px] text-slate-400">HDL &gt;50 · LDL &lt;130</span>
                      </div>

                      <div class="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                        <span class="text-[11px] text-slate-500">TSH</span>
                        <strong
                          class="tabular mt-0.5 block text-lg font-extrabold"
                          [class.text-amber-600]="(lab.tshMiuL ?? 2) > 3.0"
                        >
                          {{ lab.tshMiuL ?? '—' }} <small class="text-xs">mIU/L</small>
                        </strong>
                        <span class="text-[10px] text-slate-400">Fonksiyonel: 0,5–2,5</span>
                      </div>

                      <div class="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                        <span class="text-[11px] text-slate-500">Ürik Asit</span>
                        <strong
                          class="tabular mt-0.5 block text-lg font-extrabold"
                          [class.text-rose-600]="(lab.uricAcidMgDl ?? 0) > 6.5"
                        >
                          {{ lab.uricAcidMgDl ?? '—' }} <small class="text-xs">mg/dL</small>
                        </strong>
                        <span class="text-[10px] text-slate-400">Hedef: 3,5–6,2</span>
                      </div>

                      <div class="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                        <span class="text-[11px] text-slate-500">hs-CRP (İnflamasyon)</span>
                        <strong
                          class="tabular mt-0.5 block text-lg font-extrabold"
                          [class.text-rose-600]="(lab.crpMgL ?? 0) > 2.0"
                        >
                          {{ lab.crpMgL ?? '—' }} <small class="text-xs">mg/L</small>
                        </strong>
                        <span class="text-[10px] text-slate-400">Optimal: &lt; 1,0</span>
                      </div>
                    </div>
                  </section>
                } @else {
                  <div class="odv-card flex items-center justify-between p-5">
                    <div>
                      <strong class="block text-sm">Bu danışan için henüz kan tahlili girilmedi</strong>
                      <span class="text-xs text-slate-500">
                        HOMA-IR, TG/HDL ve ilaç-tahlil çapraz analizi için ilk biyokimya panelini ekleyin.
                      </span>
                    </div>
                    <button
                      type="button"
                      class="odv-btn-primary !min-h-9 text-xs"
                      (click)="showLabForm.set(true)"
                    >
                      İlk Tahlili Ekle
                    </button>
                  </div>
                }

                @if (showLabForm()) {
                  <form class="odv-card space-y-4 p-5" (submit)="saveLab($event)">
                    <h3 class="odv-section-title">Yeni Klinik Biyokimya Paneli Kaydet</h3>
                    <div class="grid gap-3 sm:grid-cols-4">
                      <label class="block">
                        <span class="odv-label">Açlık Glukozu (mg/dL)</span>
                        <input
                          class="odv-input tabular"
                          type="number"
                          [(ngModel)]="labDraft.fastingGlucoseMgDl"
                          name="fg"
                        />
                      </label>
                      <label class="block">
                        <span class="odv-label">Açlık İnsülini (µIU/mL)</span>
                        <input
                          class="odv-input tabular"
                          type="number"
                          step="0.1"
                          [(ngModel)]="labDraft.fastingInsulinUiuMl"
                          name="fi"
                        />
                      </label>
                      <label class="block">
                        <span class="odv-label">HbA1c (%)</span>
                        <input
                          class="odv-input tabular"
                          type="number"
                          step="0.1"
                          [(ngModel)]="labDraft.hba1cPct"
                          name="hba1c"
                        />
                      </label>
                      <label class="block">
                        <span class="odv-label">Trigliserid (mg/dL)</span>
                        <input
                          class="odv-input tabular"
                          type="number"
                          [(ngModel)]="labDraft.triglyceridesMgDl"
                          name="tg"
                        />
                      </label>
                      <label class="block">
                        <span class="odv-label">HDL (mg/dL)</span>
                        <input
                          class="odv-input tabular"
                          type="number"
                          [(ngModel)]="labDraft.hdlMgDl"
                          name="hdl"
                        />
                      </label>
                      <label class="block">
                        <span class="odv-label">LDL (mg/dL)</span>
                        <input
                          class="odv-input tabular"
                          type="number"
                          [(ngModel)]="labDraft.ldlMgDl"
                          name="ldl"
                        />
                      </label>
                      <label class="block">
                        <span class="odv-label">Ferritin (ng/mL)</span>
                        <input
                          class="odv-input tabular"
                          type="number"
                          [(ngModel)]="labDraft.ferritinNgMl"
                          name="ferr"
                        />
                      </label>
                      <label class="block">
                        <span class="odv-label">25-OH Vitamin D3 (ng/mL)</span>
                        <input
                          class="odv-input tabular"
                          type="number"
                          [(ngModel)]="labDraft.vitaminDNgMl"
                          name="vitd"
                        />
                      </label>
                      <label class="block">
                        <span class="odv-label">Vitamin B12 (pg/mL)</span>
                        <input
                          class="odv-input tabular"
                          type="number"
                          [(ngModel)]="labDraft.vitaminB12PgMl"
                          name="b12"
                        />
                      </label>
                      <label class="block">
                        <span class="odv-label">TSH (mIU/L)</span>
                        <input
                          class="odv-input tabular"
                          type="number"
                          step="0.1"
                          [(ngModel)]="labDraft.tshMiuL"
                          name="tsh"
                        />
                      </label>
                      <label class="block">
                        <span class="odv-label">Ürik Asit (mg/dL)</span>
                        <input
                          class="odv-input tabular"
                          type="number"
                          step="0.1"
                          [(ngModel)]="labDraft.uricAcidMgDl"
                          name="ua"
                        />
                      </label>
                      <label class="block">
                        <span class="odv-label">hs-CRP (mg/L)</span>
                        <input
                          class="odv-input tabular"
                          type="number"
                          step="0.1"
                          [(ngModel)]="labDraft.crpMgL"
                          name="crp"
                        />
                      </label>
                    </div>
                    <div class="flex justify-end gap-2">
                      <button
                        type="button"
                        class="odv-btn-ghost"
                        (click)="showLabForm.set(false)"
                      >
                        Vazgeç
                      </button>
                      <button type="submit" class="odv-btn-primary">Biyokimya Panelini Kaydet</button>
                    </div>
                  </form>
                }
              </div>
            }

            <!-- SEKME 2: İLAÇ - BESİN - TAHLİL ÇAPRAZ ETKİLEŞİM & TAKVİYE PROTOKOLÜ -->
            @if (activeTab() === 'interactions') {
              <div class="space-y-6">
                <section class="odv-card p-5">
                  <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span class="odv-eyebrow">Odivon Özel Klinik Motoru</span>
                      <h3 class="odv-section-title">
                        İlaç × Beslenme Planı × Kan Tahlili Çapraz Etkileşim Analizi
                      </h3>
                    </div>
                    <span class="odv-badge odv-tone-warning">
                      {{ drugAlerts().length }} aktif etkileşim uyarısı
                    </span>
                  </div>

                  @if (drugAlerts().length) {
                    <div class="space-y-3">
                      @for (alert of drugAlerts(); track alert.title) {
                        <div
                          class="rounded-2xl border p-4"
                          [class]="
                            alert.severity === 'danger'
                              ? 'border-rose-200 bg-rose-50/70 dark:border-rose-900/50 dark:bg-rose-950/30'
                              : 'border-amber-200 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/30'
                          "
                        >
                          <div class="flex items-center gap-2">
                            <span
                              class="material-symbols-rounded !text-lg"
                              [class.text-rose-600]="alert.severity === 'danger'"
                              [class.text-amber-600]="alert.severity !== 'danger'"
                              >warning</span
                            >
                            <strong class="text-sm font-extrabold">{{ alert.title }}</strong>
                          </div>
                          <p class="mt-1.5 text-xs leading-5 text-slate-600 dark:text-slate-300">
                            <b>Farmakokinetik Mekanizma:</b> {{ alert.mechanism }}
                          </p>
                          <p
                            class="mt-1 text-xs font-semibold leading-5 text-violet-700 dark:text-violet-300"
                          >
                            <b>Klinik Beslenme Aksiyonu:</b> {{ alert.action }}
                          </p>
                        </div>
                      }
                    </div>
                  } @else {
                    <p class="text-xs text-slate-500">
                      Bu danışan için aktif ilaç kaydı bulunmuyor. Aşağıdan danışanın kullandığı ilaçları
                      ekleyerek besin ve tahlil çakışmalarını otomatik denetleyin.
                    </p>
                  }

                  <!-- Aktif İlaçlar ve Ekleme -->
                  <div class="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
                    <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Danışanın Kullandığı İlaçlar ({{ clientMedications().length }})
                    </h4>
                    <div class="mt-2 flex flex-wrap gap-2">
                      @for (med of clientMedications(); track med.id) {
                        <span
                          class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                        >
                          <strong>{{ med.name }}</strong>
                          <span class="text-slate-500">({{ med.dosage }} · {{ med.schedule }})</span>
                          <button
                            type="button"
                            class="text-rose-500 hover:text-rose-700"
                            (click)="store.removeMedication(med.id)"
                            [attr.aria-label]="med.name + ' ilacını kaldır'"
                          >
                            ×
                          </button>
                        </span>
                      }
                    </div>

                    <form
                      class="mt-3 grid gap-2 sm:grid-cols-[1.2fr_1fr_1fr_1.2fr_auto]"
                      (submit)="addMed($event)"
                    >
                      <input
                        class="odv-input !py-2 text-xs"
                        placeholder="İlaç adı (Örn. Euthyrox 50 mcg)"
                        [(ngModel)]="medDraft.name"
                        name="medName"
                        required
                      />
                      <select
                        class="odv-input !py-2 text-xs"
                        [(ngModel)]="medDraft.activeIngredient"
                        name="medIng"
                      >
                        <option value="levothyroxine">Levotiroksin (Tiroid)</option>
                        <option value="metformin">Metformin (Biguanid)</option>
                        <option value="glp1_semaglutide">Semaglutid (GLP-1)</option>
                        <option value="glp1_tirzepatide">Tirzepatid (GLP-1/GIP)</option>
                        <option value="statin">Statin (Kolesterol)</option>
                        <option value="warfarin">Warfarin (Antikoagülan)</option>
                      </select>
                      <input
                        class="odv-input !py-2 text-xs"
                        placeholder="Doz (1x50 mcg)"
                        [(ngModel)]="medDraft.dosage"
                        name="medDose"
                      />
                      <input
                        class="odv-input !py-2 text-xs"
                        placeholder="Alım saati (Sabah aç)"
                        [(ngModel)]="medDraft.schedule"
                        name="medSched"
                      />
                      <button type="submit" class="odv-btn-soft !min-h-9 text-xs">İlaç Ekle</button>
                    </form>
                  </div>
                </section>

                <!-- Zaman Çizelgeli Kanıta Dayalı Takviye (Supplement) Protokolü -->
                <section class="odv-card p-5">
                  <h3 class="odv-section-title">
                    Saatli Fonksiyonel Takviye (Supplement) Reçetesi ({{
                      clientSupplements().length
                    }})
                  </h3>
                  <p class="mt-0.5 text-xs text-slate-500">
                    Yağda çözünen vitaminleri yağlı öğünlerle, demir/tiroid/magnezyum formlarını
                    emilim çakışması olmayacak saat dilimleriyle eşleştirin.
                  </p>

                  <div class="mt-4 grid gap-3 md:grid-cols-2">
                    @for (sup of clientSupplements(); track sup.id) {
                      <div
                        class="flex items-start justify-between gap-3 rounded-xl border border-slate-200 p-3.5 dark:border-slate-800"
                      >
                        <div>
                          <span class="odv-badge odv-tone-primary !text-[10px]">
                            {{ timingLabels[sup.timing] }}
                          </span>
                          <strong class="mt-1.5 block text-sm">{{ sup.name }}</strong>
                          <span class="block text-xs font-semibold text-violet-600">
                            Doz: {{ sup.dose }} · {{ sup.durationWeeks }} hafta
                          </span>
                          <p class="mt-1 text-xs text-slate-500">{{ sup.clinicalReason }}</p>
                        </div>
                        <button
                          type="button"
                          class="odv-icon-btn !size-8 text-slate-400 hover:text-rose-600"
                          (click)="store.removeSupplement(sup.id)"
                          [attr.aria-label]="sup.name + ' takviyesini sil'"
                        >
                          <span class="material-symbols-rounded !text-base">delete</span>
                        </button>
                      </div>
                    }
                  </div>

                  <form
                    class="mt-4 grid gap-2 border-t border-slate-100 pt-4 sm:grid-cols-[1.2fr_0.9fr_1.1fr_1.3fr_auto] dark:border-slate-800"
                    (submit)="addSup($event)"
                  >
                    <input
                      class="odv-input !py-2 text-xs"
                      placeholder="Takviye (Örn. Berberin / Omega-3)"
                      [(ngModel)]="supDraft.name"
                      name="supName"
                      required
                    />
                    <input
                      class="odv-input !py-2 text-xs"
                      placeholder="Doz (2000 mg)"
                      [(ngModel)]="supDraft.dose"
                      name="supDose"
                    />
                    <select
                      class="odv-input !py-2 text-xs"
                      [(ngModel)]="supDraft.timing"
                      name="supTiming"
                    >
                      <option value="morning_fasting">Sabah aç karnına</option>
                      <option value="with_breakfast">Kahvaltı ile (yağlı öğün)</option>
                      <option value="with_lunch">Öğle yemeği ile</option>
                      <option value="pre_workout">Egzersizden 30 dk önce</option>
                      <option value="bedtime">Gece yatmadan 1 saat önce</option>
                    </select>
                    <input
                      class="odv-input !py-2 text-xs"
                      placeholder="Klinik endikasyon / hedef"
                      [(ngModel)]="supDraft.clinicalReason"
                      name="supReason"
                    />
                    <button type="submit" class="odv-btn-primary !min-h-9 text-xs">
                      Takviye Ekle
                    </button>
                  </form>
                </section>
              </div>
            }

            <!-- SEKME 3: GLP-1 / BARİATRİK SARKOPENİ & KAS KORUMA RADARI -->
            @if (activeTab() === 'glp1') {
              <div class="space-y-6">
                <section class="grid gap-4 md:grid-cols-3">
                  <div class="odv-card p-5 md:col-span-2">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span class="odv-eyebrow">Sarkopeni & Yağsız Kütle Koruma Radarı</span>
                        <h3 class="mt-0.5 text-base font-extrabold">
                          {{ sarcopenia().headline }}
                        </h3>
                      </div>
                      <span class="odv-badge" [class]="'odv-tone-' + sarcopenia().tone">
                        Kas Kaybı Oranı: %{{ sarcopenia().muscleLossRatioPct ?? 10 }}
                      </span>
                    </div>

                    <ul class="mt-4 space-y-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
                      @for (step of sarcopenia().protocolSteps; track step) {
                        <li class="flex items-start gap-2">
                          <span
                            class="material-symbols-rounded !text-base text-emerald-500"
                            aria-hidden="true"
                            >verified</span
                          >
                          <span>{{ step }}</span>
                        </li>
                      }
                    </ul>
                  </div>

                  <div class="odv-card flex flex-col justify-between p-5">
                    <div>
                      <span class="odv-eyebrow">Minimum Klinik Protein Tabanı</span>
                      <strong class="tabular mt-2 block text-3xl font-extrabold text-violet-600">
                        {{ sarcopenia().minProteinGrams }} <small class="text-sm">g / gün</small>
                      </strong>
                      <p class="mt-1 text-xs text-slate-500">
                        Aktif Menü Proteini: <b>{{ activePlanSummary().proteinG }} g</b> ({{
                          proteinPerKg()
                        }}
                        g/kg)
                      </p>
                    </div>
                    <div class="mt-4 rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/60">
                      <span class="font-bold">Lösin Sentez Eşiği:</span> Her ana öğünde ≥28–32 g
                      protein (≈2,8 g Lösin) MPS (kas protein sentezi) tetiklemesi için zorunludur.
                    </div>
                  </div>
                </section>

                <section class="odv-card p-5">
                  <h3 class="odv-section-title">
                    GLP-1 Agonisti (Ozempic / Wegovy / Mounjaro) & Bariatrik Faz Yönetimi
                  </h3>
                  <p class="mt-0.5 text-xs text-slate-500">
                    Haftalık doz titrasyonunu, enjeksiyon günü GI yan etkilerini ve Bristol dışkı
                    skalasını takip edin.
                  </p>

                  <form class="mt-4 grid gap-4 sm:grid-cols-3" (submit)="saveGlp1($event)">
                    <label class="block">
                      <span class="odv-label">Klinik Protokol / Faz</span>
                      <select
                        class="odv-input"
                        [(ngModel)]="glp1Draft.stage"
                        name="glpStage"
                      >
                        @for (entry of glp1StageEntries; track entry[0]) {
                          <option [value]="entry[0]">{{ entry[1] }}</option>
                        }
                      </select>
                    </label>
                    <label class="block">
                      <span class="odv-label">Ajan / Cerrahi Tipi</span>
                      <input
                        class="odv-input"
                        [(ngModel)]="glp1Draft.agentName"
                        name="glpAgent"
                        placeholder="Örn. Semaglutid / Tirzepatid / Sleeve"
                      />
                    </label>
                    <label class="block">
                      <span class="odv-label">Haftalık Doz (mg) & Enjeksiyon Günü</span>
                      <div class="grid grid-cols-2 gap-2">
                        <input
                          class="odv-input tabular"
                          type="number"
                          step="0.25"
                          [(ngModel)]="glp1Draft.weeklyDoseMg"
                          name="glpDose"
                        />
                        <input
                          class="odv-input"
                          [(ngModel)]="glp1Draft.injectionDay"
                          name="glpDay"
                          placeholder="Pazar"
                        />
                      </div>
                    </label>
                    <label class="block">
                      <span class="odv-label">GI Bulantı / Reflü Skoru (1–5)</span>
                      <input
                        class="odv-input tabular"
                        type="number"
                        min="1"
                        max="5"
                        [(ngModel)]="glp1Draft.giSymptomScore"
                        name="glpGi"
                      />
                    </label>
                    <label class="block">
                      <span class="odv-label">Bristol Dışkı Ölçeği (Tip 1–7)</span>
                      <select
                        class="odv-input"
                        [(ngModel)]="glp1Draft.bristolStoolType"
                        name="glpBristol"
                      >
                        <option [ngValue]="1">Tip 1 — Şiddetli Konstipasyon (Ayrık sert)</option>
                        <option [ngValue]="2">Tip 2 — Hafif Konstipasyon (Topaklı)</option>
                        <option [ngValue]="3">Tip 3 — Normal (Çatlaklı yüzey)</option>
                        <option [ngValue]="4">Tip 4 — Optimal (Pürüzsüz yumuşak)</option>
                        <option [ngValue]="5">Tip 5 — Lif eksikliği eğilimi</option>
                        <option [ngValue]="6">Tip 6 — Hafif Diyare / Dumping</option>
                        <option [ngValue]="7">Tip 7 — Sıvı Diyare</option>
                      </select>
                    </label>
                    <label class="block">
                      <span class="odv-label">Haftalık Direnç Antrenmanı (Gün)</span>
                      <input
                        class="odv-input tabular"
                        type="number"
                        min="0"
                        max="7"
                        [(ngModel)]="glp1Draft.resistanceTrainingDays"
                        name="glpRes"
                      />
                    </label>
                    <div class="sm:col-span-3 flex justify-end">
                      <button type="submit" class="odv-btn-primary">
                        GLP-1 / Bariatrik Protokolü Güncelle
                      </button>
                    </div>
                  </form>
                </section>
              </div>
            }

            <!-- SEKME 4: KRONO-BESLENME, SİRKADİYEN AÇLIK & 24s GLİSEMİK EĞRİ SİMÜLATÖRÜ -->
            @if (activeTab() === 'chrono') {
              <div class="space-y-6">
                <section class="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div class="odv-card p-4">
                    <span class="odv-eyebrow">Beslenme Penceresi</span>
                    <strong class="tabular mt-1 block text-2xl font-extrabold">
                      {{ chrono().eatingWindowHours }} <small class="text-xs">saat</small>
                    </strong>
                    <span class="text-[11px] text-slate-500">
                      {{ chrono().firstMealTime }} – {{ chrono().lastMealTime }}
                    </span>
                  </div>
                  <div class="odv-card p-4">
                    <span class="odv-eyebrow">Gece Sirkadiyen Açlık</span>
                    <strong class="tabular mt-1 block text-2xl font-extrabold text-emerald-600">
                      {{ chrono().fastingWindowHours }} <small class="text-xs">saat</small>
                    </strong>
                    <span class="text-[11px] text-slate-500">Hedef eTRE: ≥13 saat</span>
                  </div>
                  <div class="odv-card p-4">
                    <span class="odv-eyebrow">19:30 Sonrası Enerji Yükü</span>
                    <strong
                      class="tabular mt-1 block text-2xl font-extrabold"
                      [class.text-rose-600]="chrono().lateNightKcalPct > 25"
                    >
                      %{{ chrono().lateNightKcalPct }}
                    </strong>
                    <span class="text-[11px] text-slate-500">Optimal: &lt; %20</span>
                  </div>
                  <div class="odv-card p-4">
                    <span class="odv-eyebrow">Sirkadiyen Uyum Skoru</span>
                    <strong class="tabular mt-1 block text-2xl font-extrabold text-violet-600">
                      {{ chrono().circadianScore }} / 100
                    </strong>
                    <span class="text-[11px] text-slate-500">Melatonin & İnsülin senkronu</span>
                  </div>
                </section>

                <section class="odv-card p-5">
                  <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 class="odv-section-title">
                        24 Saatlik Post-Prandiyal Glisemik Dalga Simülasyonu (mg/dL)
                      </h3>
                      <p class="text-xs text-slate-500">{{ chrono().recommendation }}</p>
                    </div>
                    <span class="odv-badge odv-tone-positive">
                      Lif Tamponu: {{ activePlanSummary().fiberG }} g/gün
                    </span>
                  </div>

                  <div class="grid grid-cols-4 gap-2 sm:grid-cols-8 lg:grid-cols-16">
                    @for (pt of chrono().curve; track pt.hourLabel) {
                      <div class="flex flex-col items-center rounded-xl bg-slate-50 p-2 dark:bg-slate-800/50">
                        <span class="tabular text-[10px] font-bold text-slate-400">{{
                          pt.hourLabel
                        }}</span>
                        <div class="my-2 flex h-24 w-3 items-end rounded-full bg-slate-200 dark:bg-slate-700">
                          <div
                            class="w-full rounded-full transition-all"
                            [class]="
                              pt.glucoseMgDl > 135
                                ? 'bg-amber-500'
                                : pt.mealName
                                  ? 'bg-violet-500'
                                  : 'bg-emerald-500'
                            "
                            [style.height.%]="((pt.glucoseMgDl - 65) / 105) * 100"
                          ></div>
                        </div>
                        <strong class="tabular text-xs font-extrabold">{{ pt.glucoseMgDl }}</strong>
                        @if (pt.mealName) {
                          <span class="mt-0.5 max-w-full truncate text-[9px] font-bold text-violet-600">
                            {{ pt.mealName }}
                          </span>
                        }
                      </div>
                    }
                  </div>

                  <div
                    class="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 text-xs text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200"
                  >
                    <strong>Klinik Öğün Yeme Sırası (Meal Sequencing) Protokolü:</strong> Öğüne
                    salata/sebze (çözünür lif) ile başlayıp 10 dk sonra protein/zeytinyağı ve en son
                    kompleks karbonhidrat tüketmek post-prandiyal glukoz pikini <b>%32</b>, insülin
                    pikini <b>%38</b> azaltır.
                  </div>
                </section>
              </div>
            }

            <!-- SEKME 5: ÇOKLU FORMÜL BMR & GEBELİK / LAKTASYON / LUTEAL FAZ / STRES HESAPLAYICI -->
            @if (activeTab() === 'equations') {
              <div class="space-y-6">
                <section class="odv-card p-5">
                  <div class="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 class="odv-section-title">
                        4 Farklı Klinik BMR Denklemi & Fizyolojik Durum Karşılaştırması
                      </h3>
                      <p class="text-xs text-slate-500">
                        Obezite, sporcu, gebelik, emzirme ve luteal faz durumlarında tek formül yerine
                        yağsız kütle (LBM) duyarlı denklemleri karşılaştırın.
                      </p>
                    </div>
                    <select
                      class="odv-input !w-auto text-xs font-semibold"
                      [ngModel]="modifier()"
                      (ngModelChange)="modifier.set($event)"
                      aria-label="Fizyolojik durum çarpanı"
                    >
                      <option value="standard">Standart Yetişkin Fizyolojisi (+0 kcal)</option>
                      <option value="luteal_phase">
                        Menstrüel Döngü: Luteal Faz (+140 kcal & Mg/Ödem Desteği)
                      </option>
                      <option value="pregnancy_t1">Gebelik 1. Trimester (+150 kcal)</option>
                      <option value="pregnancy_t2">Gebelik 2. Trimester (+340 kcal)</option>
                      <option value="pregnancy_t3">Gebelik 3. Trimester (+452 kcal)</option>
                      <option value="lactation">Emzirme / Laktasyon (+500 kcal & +25g Protein)</option>
                      <option value="clinical_stress">
                        Klinik Stres / Cerrahi İyileşme (+%20 Metabolik Yük)
                      </option>
                    </select>
                  </div>

                  <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    @for (eq of equationCards(); track eq.name) {
                      <div class="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                        <span class="odv-eyebrow">{{ eq.badge }}</span>
                        <strong class="mt-1 block text-sm font-bold">{{ eq.name }}</strong>
                        <div class="mt-2">
                          <span class="text-xs text-slate-400">Bazal Metabolizma (BMR)</span>
                          <strong class="tabular block text-2xl font-extrabold">
                            {{ eq.bmr }} <small class="text-xs">kcal</small>
                          </strong>
                        </div>
                        <div class="mt-2 border-t border-slate-100 pt-2 dark:border-slate-800">
                          <span class="text-xs text-slate-400">Fizyolojik TDEE (Toplam Harcama)</span>
                          <strong class="tabular block text-lg font-extrabold text-violet-600">
                            {{ eq.adjustedTdee }} <small class="text-xs">kcal / gün</small>
                          </strong>
                        </div>
                        <p class="mt-1.5 text-[11px] text-slate-500">{{ eq.useCase }}</p>
                      </div>
                    }
                  </div>
                </section>

                <!-- KADIN SAĞLIĞI: MENSTRÜEL DÖNGÜ (LUTEAL ÖDEM DÜZELTMESİ) & GEBELİK/EMZİRME MİKROBESİN PROTOKOLÜ -->
                <section
                  class="odv-card border-violet-200/80 p-5 dark:border-violet-900/50"
                  aria-label="Kadın sağlığı menstrüel döngü ve gebelik protokolü"
                >
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <span class="odv-eyebrow text-violet-600 dark:text-violet-300">
                        Kadın Sağlığı & Hormonal Döngü Adaptasyonu
                      </span>
                      <h3 class="odv-section-title mt-0.5">
                        Luteal Faz Ödem Düzeltmesi & Gebelik / Laktasyon Mikrobesin Matrisi
                      </h3>
                      <p class="text-xs text-slate-500">
                        Seçili fizyolojik duruma göre tartıdaki ödem sapmasını düzeltir ve kanıta dayalı
                        mikrobesin hedeflerini hesaplar.
                      </p>
                    </div>
                    <span class="odv-badge odv-tone-primary">{{ womensHealthSummary().badge }}</span>
                  </div>

                  <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div class="rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-800/60">
                      <span class="text-[11px] font-bold text-slate-400">Tartıdaki Güncel Ağırlık</span>
                      <strong class="tabular mt-1 block text-xl font-extrabold">
                        {{ v.currentWeightKg }} kg
                      </strong>
                      <span class="text-[11px] text-slate-500">Son ölçüm kaydı</span>
                    </div>
                    <div class="rounded-2xl bg-violet-50/70 p-3.5 dark:bg-violet-950/30">
                      <span class="text-[11px] font-bold text-violet-700 dark:text-violet-300">
                        Ödem Arındırılmış Gerçek Ağırlık
                      </span>
                      <strong class="tabular mt-1 block text-xl font-extrabold text-violet-700 dark:text-violet-200">
                        {{ womensHealthSummary().trueWeightKg }} kg
                      </strong>
                      <span class="text-[11px] text-violet-600 dark:text-violet-300">
                        Tahmini sıvı tutulumu: {{ womensHealthSummary().edemaOffsetKg }} kg
                      </span>
                    </div>
                    <div class="rounded-2xl bg-emerald-50/70 p-3.5 dark:bg-emerald-950/30">
                      <span class="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                        Ek Günlük Protein & Enerji
                      </span>
                      <strong class="tabular mt-1 block text-xl font-extrabold text-emerald-700 dark:text-emerald-200">
                        {{ womensHealthSummary().extraKcal }} kcal · +{{ womensHealthSummary().extraProteinG }}g P
                      </strong>
                      <span class="text-[11px] text-emerald-700 dark:text-emerald-300">
                        {{ womensHealthSummary().macroHint }}
                      </span>
                    </div>
                    <div class="rounded-2xl bg-amber-50/70 p-3.5 dark:bg-amber-950/30">
                      <span class="text-[11px] font-bold text-amber-800 dark:text-amber-300">
                        Kritik Mikrobesin Hedefi
                      </span>
                      <strong class="mt-1 block text-sm font-extrabold text-amber-900 dark:text-amber-200">
                        {{ womensHealthSummary().micronutrients }}
                      </strong>
                      <span class="mt-0.5 block text-[11px] text-amber-700 dark:text-amber-300">
                        {{ womensHealthSummary().clinicalTip }}
                      </span>
                    </div>
                  </div>
                </section>

                <!-- SİNDİRİM & DÜŞÜK FODMAP ELİMİNASYON / MUADİL RADARI -->
                <section
                  class="odv-card p-5"
                  aria-label="İBS ve düşük FODMAP mutfak muadilleri"
                >
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span class="odv-eyebrow text-emerald-600">Gastroenteroloji & İBS Desteği</span>
                      <h3 class="odv-section-title mt-0.5">
                        Düşük FODMAP Fermente Oligosakkarit / Poliol Mutfak Muadil Tablosu
                      </h3>
                    </div>
                    <div class="flex flex-wrap gap-1.5">
                      @for (grp of fodmapGroups; track grp.id) {
                        <button
                          type="button"
                          class="rounded-xl px-2.5 py-1 text-xs font-bold transition"
                          [class]="
                            selectedFodmapId() === grp.id
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                          "
                          (click)="selectedFodmapId.set(grp.id)"
                        >
                          {{ grp.code }}
                        </button>
                      }
                    </div>
                  </div>

                  @if (activeFodmapGroup(); as fg) {
                    <div class="mt-4 grid gap-3 md:grid-cols-3">
                      <div class="rounded-xl border border-rose-200 bg-rose-50/50 p-3.5 dark:border-rose-900/50 dark:bg-rose-950/20">
                        <span class="text-[11px] font-bold uppercase text-rose-600">
                          Yüksek FODMAP Tetikleyiciler (2–6 Hafta Kısıtla)
                        </span>
                        <p class="mt-1 text-xs font-semibold text-slate-800 dark:text-slate-100">
                          {{ fg.highTriggers }}
                        </p>
                      </div>
                      <div class="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                        <span class="text-[11px] font-bold uppercase text-emerald-700">
                          Güvenli Düşük FODMAP Muadilleri
                        </span>
                        <p class="mt-1 text-xs font-semibold text-slate-800 dark:text-slate-100">
                          {{ fg.safeSwaps }}
                        </p>
                      </div>
                      <div class="rounded-xl border border-violet-200 bg-violet-50/50 p-3.5 dark:border-violet-900/50 dark:bg-violet-950/20">
                        <span class="text-[11px] font-bold uppercase text-violet-700">
                          Yeniden Tanıtım (Re-Challenge) Dozu
                        </span>
                        <p class="mt-1 text-xs font-semibold text-slate-800 dark:text-slate-100">
                          {{ fg.rechallengeProtocol }}
                        </p>
                      </div>
                    </div>
                  }
                </section>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class ClinicalLabPage {
  readonly store = inject(DietStore);
  readonly qa = inject(QuickActions);
  private readonly notify = inject(Notify);

  readonly pickedClientId = signal<string | null>(null);
  readonly activeTab = signal<ClinicalTab>('labs');
  readonly showLabForm = signal(false);
  readonly modifier = signal<PhysiologicalModifier>('standard');
  readonly selectedFodmapId = signal<string>('fructans');

  readonly fodmapGroups = [
    {
      id: 'fructans',
      code: 'Fruktanlar (Soğan/Sarımsak/Buğday)',
      highTriggers: 'Kuru soğan, sarımsak, beyaz buğday ekmeği, çavdar, enginar, pırasa beyazı',
      safeSwaps: 'Sarımsak aromalı zeytinyağı, taze soğanın yeşil yaprakları, karabuğday, kinoa, yulaf',
      rechallengeProtocol: '1. Gün: 1/4 diş sarımsak · 2. Gün: 1/2 diş · 3. Gün: 1 tam diş (72 saat semptom izlemi)',
    },
    {
      id: 'gos',
      code: 'GOS (Baklagiller & Kuruyemiş)',
      highTriggers: 'Kuru fasulye, nohut, mercimek (haşlama suyuyla), kaju, Antep fıstığı',
      safeSwaps: 'Suda bekletilip iyice durulanmış kırmızı mercimek (≤1/2 su bardağı), ceviz, kabak çekirdeği, yer fıstığı',
      rechallengeProtocol: '1. Gün: 2 yemek kaşığı haşlanmış nohut · 2. Gün: 4 yemek kaşığı · 3. Gün: 1/2 kase',
    },
    {
      id: 'lactose',
      code: 'Laktoz (Süt Ürünleri)',
      highTriggers: 'Standart inek/keçi sütü, yumuşak taze peynirler, dondurma, krema',
      safeSwaps: 'Laktozsuz süt/yoğurt/kefir, sert olgunlaştırılmış peynirler (eski kaşar, tulum), badem sütü',
      rechallengeProtocol: '1. Gün: 60 ml süt · 2. Gün: 125 ml süt · 3. Gün: 200 ml süt',
    },
    {
      id: 'fructose',
      code: 'Serbest Fruktoz (Meyve/Bal)',
      highTriggers: 'Elma, armut, karpuz, incir, mango, bal, agav şurubu',
      safeSwaps: 'Çilek, yaban mersini, kivi, mandalina, sert muz, akçaağaç şurubu',
      rechallengeProtocol: '1. Gün: 1 çay kaşığı bal · 2. Gün: 1 tatlı kaşığı · 3. Gün: 1 yemek kaşığı',
    },
    {
      id: 'polyols',
      code: 'Polioller (Sorbitol/Mannitol)',
      highTriggers: 'Karnabahar, mantar, avokado (>1/4 adet), erik, kiraz, şeftali, şekersiz sakızlar',
      safeSwaps: 'Brokoli çiçekleri, kabak, ıspanak, havuç, 1/8 dilim avokado (güvenli porsiyon)',
      rechallengeProtocol: '1. Gün: 2 adet mantar veya 2 çiçek karnabahar · 2. Gün: 4 adet · 3. Gün: 1 porsiyon',
    },
  ];

  readonly activeFodmapGroup = computed(
    () => this.fodmapGroups.find((g) => g.id === this.selectedFodmapId()) ?? this.fodmapGroups[0],
  );

  readonly womensHealthSummary = computed(() => {
    const v = this.selectedClient();
    const currentW = v?.currentWeightKg ?? 65;
    const mod = this.modifier();
    if (mod === 'luteal_phase') {
      return {
        badge: 'Luteal Faz (Gün 17–28) · Progesteron Piki',
        edemaOffsetKg: 1.4,
        trueWeightKg: round1(currentW - 1.4),
        extraKcal: '+140',
        extraProteinG: 10,
        macroHint: 'Serotonin düşüşüne karşı kompleks KH + %85 bitter çikolata',
        micronutrients: 'Magnezyum Bisglisinat 300 mg + B6 (P5P) 25 mg',
        clinicalTip: 'Aldosteron kaynaklı 1–1,5 kg ödem normaldir; tartı artışını yağ kazanımı olarak yorumlamayın.',
      };
    }
    if (mod === 'pregnancy_t1') {
      return {
        badge: 'Gebelik 1. Trimester (Hafta 1–13)',
        edemaOffsetKg: 0.5,
        trueWeightKg: round1(currentW - 0.5),
        extraKcal: '+150',
        extraProteinG: 10,
        macroHint: 'Sabah bulantısına karşı kuru kompleks KH + zencefil/B6',
        micronutrients: 'Metilfolat 600 mcg + İyot 150 mcg + D3 2000 IU',
        clinicalTip: 'Nöral tüp gelişimi için folat ve kolin (450 mg/gün) önceliklidir.',
      };
    }
    if (mod === 'pregnancy_t2') {
      return {
        badge: 'Gebelik 2. Trimester (Hafta 14–27)',
        edemaOffsetKg: 1.8,
        trueWeightKg: round1(currentW - 1.8),
        extraKcal: '+340',
        extraProteinG: 20,
        macroHint: 'Artan kan hacmi için hem-demir + C vitamini eşleşmesi',
        micronutrients: 'Demir 27 mg + Kalsiyum 1000 mg + DHA 300 mg',
        clinicalTip: 'Demir ve kalsiyum takviyeleri emilim rekabeti nedeniyle en az 2 saat arayla alınmalıdır.',
      };
    }
    if (mod === 'pregnancy_t3') {
      return {
        badge: 'Gebelik 3. Trimester (Hafta 28–40)',
        edemaOffsetKg: 2.6,
        trueWeightKg: round1(currentW - 2.6),
        extraKcal: '+452',
        extraProteinG: 25,
        macroHint: 'Fetal beyin miyelinizasyonu için yüksek DHA & Kolin',
        micronutrients: 'Omega-3 DHA 300–500 mg + Demir 27 mg + Magnezyum',
        clinicalTip: 'Mide kapasitesi azaldığı için 3 ana + 3 küçük yoğun besleyici ara öğün planlayın.',
      };
    }
    if (mod === 'lactation') {
      return {
        badge: 'Emzirme / Laktasyon Dönemi',
        edemaOffsetKg: 0.8,
        trueWeightKg: round1(currentW - 0.8),
        extraKcal: '+500',
        extraProteinG: 25,
        macroHint: 'Süt üretimi için +750 ml ek su (Toplam 3.0–3.5 L/gün)',
        micronutrients: 'İyot 290 mcg + Kolin 550 mg + Kalsiyum 1000 mg',
        clinicalTip: 'Hızlı kalorik kısıtlama (<1500 kcal) prolaktin ve süt hacmini düşürür; ılımlı açık uygulayın.',
      };
    }
    return {
      badge: 'Foliküler / Standart Bazal Fizyoloji',
      edemaOffsetKg: 0,
      trueWeightKg: currentW,
      extraKcal: '+0',
      extraProteinG: 0,
      macroHint: 'İnsülin duyarlılığının en yüksek olduğu standart metabolik evre',
      micronutrients: 'D3 1000–2000 IU + Omega-3 EPA/DHA + Lif ≥28 g/gün',
      clinicalTip: 'Luteal faz ödemi veya gebelik/laktasyon durumu varsa üstteki seçiciden değiştirin.',
    };
  });

  readonly timingLabels = SUPPLEMENT_TIMING_LABELS;
  readonly glp1StageEntries = Object.entries(GLP1_STAGE_LABELS) as [Glp1Stage, string][];

  readonly selectedClientId = computed(
    () => this.pickedClientId() ?? this.store.activeClients()[0]?.client.id ?? 'c-1',
  );
  readonly selectedClient = computed(() => this.store.view(this.selectedClientId()));

  readonly latestLab = computed(() => this.store.labsFor(this.selectedClientId())[0]);
  readonly clientMedications = computed(() => this.store.medicationsFor(this.selectedClientId()));
  readonly clientSupplements = computed(() => this.store.supplementsFor(this.selectedClientId()));

  readonly lbmKg = computed(() => {
    const v = this.selectedClient();
    if (!v) return 50;
    return leanBodyMassKg(
      v.currentWeightKg,
      v.lastMeasurement?.bodyFatPct ?? v.client.bodyFatPct,
      v.client.heightCm,
      v.client.sex,
    );
  });

  readonly activePlanSummary = computed(() => {
    const meals = this.selectedClient()?.activePlan?.meals ?? [];
    return summarizeMeals(meals);
  });

  readonly proteinPerKg = computed(() => {
    const v = this.selectedClient();
    if (!v || v.currentWeightKg <= 0) return 1.4;
    return round1(this.activePlanSummary().proteinG / v.currentWeightKg);
  });

  readonly homaResult = computed(() =>
    homaIr(this.latestLab()?.fastingGlucoseMgDl, this.latestLab()?.fastingInsulinUiuMl),
  );

  readonly atheroResult = computed(() =>
    atherogenicIndex(this.latestLab()?.triglyceridesMgDl, this.latestLab()?.hdlMgDl),
  );

  readonly drugAlerts = computed(() =>
    analyzeDrugNutrientInteractions(
      this.clientMedications(),
      this.latestLab(),
      this.selectedClient()?.activePlan?.meals ?? [],
      this.proteinPerKg(),
    ),
  );

  readonly sarcopenia = computed(() => {
    const v = this.selectedClient();
    if (!v) {
      return evaluateSarcopeniaRisk(0, null, 60, 1.5, false);
    }
    const list = this.store.measurementsFor(v.client.id);
    const firstM = list[0]?.muscleMassKg;
    const lastM = list.at(-1)?.muscleMassKg;
    const muscleDelta =
      firstM !== undefined && firstM !== null && lastM !== undefined && lastM !== null
        ? round1(lastM - firstM)
        : null;
    const ideal = idealWeightRange(v.client.heightCm, v.client.sex).devine;
    const glpProfile = this.store.glp1ProfileFor(v.client.id);
    const isGlp =
      (glpProfile !== undefined && glpProfile.stage !== 'none') ||
      this.clientMedications().some((m) => m.activeIngredient.startsWith('glp1'));
    return evaluateSarcopeniaRisk(v.changeKg, muscleDelta, ideal, this.proteinPerKg(), isGlp);
  });

  readonly chrono = computed(() =>
    analyzeChronoNutrition(this.selectedClient()?.activePlan?.meals ?? []),
  );

  readonly equationCards = computed(() => {
    const v = this.selectedClient();
    if (!v) return [];
    const lbm = this.lbmKg();
    const mifflin = bmr(v.client.sex, v.currentWeightKg, v.client.heightCm, v.age);
    const harris = harrisBenedictBmr(v.client.sex, v.currentWeightKg, v.client.heightCm, v.age);
    const katch = katchMcArdleBmr(lbm);
    const cunningham = cunninghamBmr(lbm);

    const factor = v.tdee / Math.max(1, v.bmr);
    const mod = this.modifier();
    const adjust = (baseTdee: number) => {
      if (mod === 'luteal_phase') return baseTdee + 140;
      if (mod === 'pregnancy_t1') return baseTdee + 150;
      if (mod === 'pregnancy_t2') return baseTdee + 340;
      if (mod === 'pregnancy_t3') return baseTdee + 452;
      if (mod === 'lactation') return baseTdee + 500;
      if (mod === 'clinical_stress') return Math.round(baseTdee * 1.2);
      return baseTdee;
    };

    return [
      {
        badge: 'Altın Standart',
        name: 'Mifflin-St Jeor',
        bmr: mifflin,
        adjustedTdee: adjust(Math.round(mifflin * factor)),
        useCase: 'Fazla kilolu, obez ve genel klinik danışanlarda en yüksek doğruluk.',
      },
      {
        badge: 'Klasik Klinik',
        name: 'Harris-Benedict (Revize)',
        bmr: harris,
        adjustedTdee: adjust(Math.round(harris * factor)),
        useCase: 'Normal BKİ aralığındaki yetişkinlerde geleneksel referans.',
      },
      {
        badge: 'BIA / LBM Bazlı',
        name: 'Katch-McArdle',
        bmr: katch,
        adjustedTdee: adjust(Math.round(katch * factor)),
        useCase: `Yağsız vücut kütlesi (${lbm} kg) bilinen danışanlarda metabolik hızı hassas ölçer.`,
      },
      {
        badge: 'Elit Sporcu',
        name: 'Cunningham Denklemi',
        bmr: cunningham,
        adjustedTdee: adjust(Math.round(cunningham * factor)),
        useCase: 'Yüksek kas kütlesine sahip performans sporcuları için önerilir.',
      },
    ];
  });

  labDraft = {
    fastingGlucoseMgDl: 94,
    fastingInsulinUiuMl: 9.2,
    hba1cPct: 5.4,
    triglyceridesMgDl: 120,
    hdlMgDl: 55,
    ldlMgDl: 110,
    ferritinNgMl: 48,
    vitaminDNgMl: 36,
    vitaminB12PgMl: 420,
    tshMiuL: 1.9,
    uricAcidMgDl: 5.1,
    crpMgL: 1.1,
  };

  medDraft: {
    name: string;
    activeIngredient: MedicationEntry['activeIngredient'];
    dosage: string;
    schedule: string;
  } = {
    name: '',
    activeIngredient: 'levothyroxine',
    dosage: '1x50 mcg',
    schedule: 'Sabah kahvaltıdan 45 dk önce',
  };

  supDraft: {
    name: string;
    dose: string;
    timing: SupplementProtocolItem['timing'];
    clinicalReason: string;
  } = {
    name: '',
    dose: '1000 mg',
    timing: 'with_breakfast',
    clinicalReason: '',
  };

  glp1Draft: Glp1BariatricProfile = {
    clientId: 'c-1',
    stage: 'glp1_titration',
    agentName: 'Semaglutid (Ozempic)',
    weeklyDoseMg: 0.5,
    injectionDay: 'Pazar',
    giSymptomScore: 2,
    bristolStoolType: 3,
    resistanceTrainingDays: 3,
    notes: '',
  };

  saveLab(event: Event): void {
    event.preventDefault();
    this.store.saveLabPanel({
      clientId: this.selectedClientId(),
      date: isoDate(new Date()),
      ...this.labDraft,
    });
    this.showLabForm.set(false);
    this.notify.success('Biyokimya tahlili kaydedildi', 'HOMA-IR ve TG/HDL otomatik güncellendi.');
  }

  addMed(event: Event): void {
    event.preventDefault();
    if (!this.medDraft.name.trim()) return;
    this.store.addMedication({
      clientId: this.selectedClientId(),
      name: this.medDraft.name.trim(),
      activeIngredient: this.medDraft.activeIngredient,
      dosage: this.medDraft.dosage.trim() || '1x1',
      schedule: this.medDraft.schedule.trim() || 'Günlük',
    });
    this.medDraft.name = '';
    this.notify.success('İlaç eklendi', 'Besin ve tahlil etkileşimleri yeniden tarandı.');
  }

  addSup(event: Event): void {
    event.preventDefault();
    if (!this.supDraft.name.trim()) return;
    this.store.addSupplement({
      clientId: this.selectedClientId(),
      name: this.supDraft.name.trim(),
      dose: this.supDraft.dose.trim() || '1 porsiyon',
      timing: this.supDraft.timing,
      clinicalReason: this.supDraft.clinicalReason.trim() || 'Klinik mikrobesin desteği',
      durationWeeks: 8,
    });
    this.supDraft.name = '';
    this.supDraft.clinicalReason = '';
    this.notify.success('Takviye reçeteye eklendi', '');
  }

  saveGlp1(event: Event): void {
    event.preventDefault();
    this.store.saveGlp1Profile({
      ...this.glp1Draft,
      clientId: this.selectedClientId(),
    });
    this.notify.success('GLP-1 / Bariatrik protokol kaydedildi', '');
  }
}

