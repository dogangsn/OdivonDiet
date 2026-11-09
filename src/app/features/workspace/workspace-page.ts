import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormField, form, minLength, required, submit } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { DietApiService } from '../../core/api/diet-api.service';
import { TranslatePipe } from '../../core/i18n/i18n';
import { DietStateService } from '../../core/services/diet-state.service';
import { WORKSPACE_DOMAINS } from '../../domain/domain-navigation';
import { PRODUCT } from '../../domain/product-manifest';
import { PageHeader } from '../../shared/ui/page-header';
import { SlideOver } from '../../shared/ui/slide-over';
import { AiCopilotPanel } from '../ai-copilot/ai-copilot-panel';
import { ClientPortalComponent } from '../client-portal/client-portal';

interface DomainFormLabels {
  readonly primaryLabel: string;
  readonly primaryPlaceholder: string;
  readonly secondaryLabel: string;
  readonly secondaryPlaceholder: string;
  readonly categoryLabel: string;
  readonly categories: readonly string[];
}

interface RecordRow {
  id: number;
  name: string;
  code: string;
  location: string;
  status: 'active' | 'pending';
  updated: string;
  archived: boolean;
}

interface PlanItem {
  id: number;
  clientName: string;
  title: string;
  calories: number;
  proteinGrams: number;
  carbGrams: number;
  fatGrams: number;
  dietType: string;
  status: 'active' | 'revision' | 'draft';
  durationText: string;
  clinicBranch: string;
}

interface MeasurementItem {
  id: number;
  clientName: string;
  clinicBranch: string;
  heightCm: number;
  currentWeightKg: number;
  targetWeightKg: number;
  diffKgText: string;
  bmi: number;
  bmiCategory: string;
  bodyFatPct: number;
  muscleMassKg: number;
  waistHipRatio: number;
  lastDate: string;
  trendTone: 'positive' | 'warning' | 'primary';
}

interface ConsultationSession {
  id: number;
  clientName: string;
  phone: string;
  timeText: string;
  channel: 'online' | 'clinic' | 'phone';
  topic: string;
  compliancePct: number;
  status: 'completed' | 'scheduled' | 'urgent';
  notes: string;
}

interface ProgressReportCard {
  id: number;
  clientName: string;
  programDuration: string;
  totalWeightLossText: string;
  waistLossText: string;
  clinicalImpact: string;
  compliancePct: number;
  status: 'completed' | 'ongoing';
}

@Component({
  selector: 'app-workspace-page',
  imports: [PageHeader, SlideOver, FormField, TranslatePipe, AiCopilotPanel, RouterLink, ClientPortalComponent],
  template: `
    @if (view === 'overview') {
      <div class="space-y-6">
        <app-page-header
          eyebrow="Klinik Yönetim Merkezi"
          [title]="product.name + ' Genel Bakış'"
          description="Danışan portföyünü, beslenme planı uyumunu ve AI NutriPilot klinik kararlarını tek merkezden yönetin."
        >
          <div actions class="flex items-center gap-2">
            <a routerLink="/ai-nutripilot" class="odv-btn-soft">
              <span class="material-symbols-rounded">auto_awesome</span>AI Asistanı
            </a>
            <button type="button" class="odv-btn-primary" (click)="openCreate()">
              <span class="material-symbols-rounded">add</span>Yeni kayıt
            </button>
          </div>
        </app-page-header>

        <!-- AI NutriPilot Quick Action Banner -->
        <section
          class="odv-card relative overflow-hidden border border-violet-200/80 bg-gradient-to-r from-violet-50/90 via-indigo-50/50 to-white p-6 shadow-sm dark:border-violet-900/60 dark:from-violet-950/40 dark:via-slate-900 dark:to-slate-900"
        >
          <div class="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div class="flex items-start gap-4">
              <span
                class="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white shadow-lg shadow-violet-500/25"
              >
                <span class="material-symbols-rounded !text-2xl">auto_awesome</span>
              </span>
              <div>
                <div
                  class="mb-1 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-violet-700 dark:text-violet-300"
                >
                  <span class="size-1.5 rounded-full bg-violet-600"></span>
                  ODIVON AI NUTRIPILOT
                </div>
                <h3 class="m-0 text-lg font-black text-slate-950 dark:text-white">
                  Yapay Zekâ Klinik Karar Desteği Hazır
                </h3>
                <p class="mb-0 mt-1 max-w-2xl text-xs leading-5 text-slate-600 dark:text-slate-300">
                  BMR/TDEE bazlı kişiselleştirilmiş menü oluşturun, tek tıkla PDF çıktı alın veya
                  doğrudan danışanın telefonuna WhatsApp üzerinden haftalık beslenme planı gönderin.
                </p>
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-3">
              <a routerLink="/client-portal" class="odv-btn-soft">
                <span class="material-symbols-rounded">smartphone</span>
                Danışan Portalı
              </a>
              <a routerLink="/ai-nutripilot" class="odv-btn-primary">
                <span class="material-symbols-rounded">psychology</span>
                AI NutriPilot'ı Aç
              </a>
            </div>
          </div>
        </section>

        <!-- Live Clinical Radar Banner -->
        <section
          class="odv-card overflow-hidden bg-gradient-to-br from-slate-950 via-violet-950 to-blue-950 p-6 text-white lg:p-8"
        >
          <div class="grid gap-8 lg:grid-cols-[1.35fr_1fr] lg:items-center">
            <div>
              <div
                class="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300"
              >
                <span class="size-2 animate-pulse rounded-full bg-emerald-400"></span>CANLI KLİNİK
                RADARI
              </div>
              <h2 class="m-0 text-2xl font-black">Danışan takibi kontrol altında</h2>
              <p class="max-w-2xl text-sm leading-6 text-slate-300">
                Tüm beslenme planları ve biyobelirteçler MainAPI ile senkronize; klinik başarı anlık
                takip ediliyor.
              </p>
            </div>
            <div class="grid grid-cols-3 gap-3 text-center">
              <div class="rounded-2xl bg-white/10 p-4">
                <strong class="block text-2xl">98%</strong>
                <span class="text-xs text-slate-300">Sistem</span>
              </div>
              <div class="rounded-2xl bg-white/10 p-4">
                <strong class="block text-2xl">92%</strong>
                <span class="text-xs text-slate-300">Plan Uyumu</span>
              </div>
              <div class="rounded-2xl bg-white/10 p-4">
                <strong class="block text-2xl">14</strong>
                <span class="text-xs text-slate-300">Bugünkü Seans</span>
              </div>
            </div>
          </div>
        </section>

        <!-- KPI Metrics -->
        <section aria-label="Temel göstergeler" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          @for (metric of product.metrics; track metric.labelKey; let first = $first) {
            <article
              class="odv-card p-5"
              [class.!bg-gradient-to-br]="first"
              [class.!from-violet-600]="first"
              [class.!to-indigo-700]="first"
              [class.!text-white]="first"
            >
              <div class="mb-4 flex items-center justify-between">
                <span
                  class="text-xs font-extrabold uppercase tracking-wider"
                  [class.text-slate-500]="!first"
                >
                  {{ metric.labelKey | t }}
                </span>
                <span class="material-symbols-rounded" [class.text-violet-600]="!first">
                  monitoring
                </span>
              </div>
              <strong class="block text-4xl font-black">{{ metric.value }}</strong>
              <span class="mt-2 block text-xs" [class.text-slate-500]="!first">
                {{ metric.noteKey | t }}
              </span>
            </article>
          }
        </section>

        <!-- Quick Appointments Widget -->
        <section class="odv-card p-5 sm:p-6" aria-labelledby="today-sessions-title">
          <div class="mb-4 flex items-center justify-between">
            <div>
              <h2 id="today-sessions-title" class="m-0 text-base font-black">
                Bugünkü Randevular & Takip Görüşmeleri
              </h2>
              <p class="mb-0 mt-0.5 text-xs text-slate-500">
                Günün seans takvimi ve danışan uyum durumları
              </p>
            </div>
            <a routerLink="/consultations" class="odv-btn-soft text-xs">Tüm Seansları Aç</a>
          </div>
          <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            @for (session of consultationsList.slice(0, 4); track session.id) {
              <div
                class="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/40"
              >
                <div>
                  <div class="flex items-center justify-between text-xs">
                    <span class="font-bold text-violet-700 dark:text-violet-300">{{
                      session.timeText
                    }}</span>
                    <span
                      class="rounded-full px-2 py-0.5 text-[10px] font-bold"
                      [class.bg-emerald-100]="session.status === 'completed'"
                      [class.text-emerald-800]="session.status === 'completed'"
                      [class.bg-sky-100]="session.status === 'scheduled'"
                      [class.text-sky-800]="session.status === 'scheduled'"
                    >
                      {{ session.channel === 'online' ? 'Zoom' : 'Klinik' }}
                    </span>
                  </div>
                  <strong class="mt-2 block text-sm font-black">{{ session.clientName }}</strong>
                  <p class="mb-0 mt-1 line-clamp-2 text-xs text-slate-500">{{ session.topic }}</p>
                </div>
                <div class="mt-4 flex items-center justify-between border-t border-slate-200/80 pt-3 dark:border-slate-800">
                  <span class="text-xs text-slate-500">Uyum: <strong>%{{ session.compliancePct }}</strong></span>
                  <button
                    type="button"
                    class="odv-btn-soft text-xs !py-1"
                    (click)="sendConsultationReminder(session)"
                    title="Danışana WhatsApp hatırlatması gönder"
                  >
                    <span class="material-symbols-rounded !text-sm">chat</span>
                    Hatırlat
                  </button>
                </div>
              </div>
            }
          </div>
        </section>

        <!-- Product Modules Grid -->
        <section class="odv-card p-5 sm:p-6" aria-labelledby="modules-title">
          <div class="mb-5">
            <h2 id="modules-title" class="m-0 text-xl font-extrabold">{{ 'module.title' | t }}</h2>
            <p class="mt-1 text-sm text-slate-500">{{ 'module.subtitle' | t }}</p>
          </div>
          <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            @for (module of product.modules; track module.nameKey) {
              <article class="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                <div class="mb-3 flex items-center justify-between">
                  <span
                    class="grid size-10 place-items-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300"
                  >
                    <span class="material-symbols-rounded">{{ module.icon }}</span>
                  </span>
                  <span class="text-xs font-bold text-slate-400">Faz {{ module.phase }}</span>
                </div>
                <h3 class="text-sm font-extrabold">{{ module.nameKey | t }}</h3>
                <p class="text-xs leading-5 text-slate-500">{{ module.descriptionKey | t }}</p>
              </article>
            }
          </div>
        </section>

        <!-- Records Table -->
        <section class="odv-card overflow-hidden">
          <div
            class="flex flex-col gap-4 border-b border-slate-200 p-5 dark:border-slate-700 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <h2 class="m-0 text-xl font-black">Danışan ve klinik kayıtları</h2>
              <div class="mt-3 inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
                <button
                  type="button"
                  class="rounded-lg px-3 py-2 text-xs font-bold"
                  [class.bg-white]="!archived()"
                  [class.shadow-sm]="!archived()"
                  (click)="archived.set(false)"
                >
                  Aktif {{ activeCount() }}
                </button>
                <button
                  type="button"
                  class="rounded-lg px-3 py-2 text-xs font-bold"
                  [class.bg-white]="archived()"
                  [class.shadow-sm]="archived()"
                  (click)="archived.set(true)"
                >
                  Arşiv {{ archivedCount() }}
                </button>
              </div>
            </div>
            <label class="relative block md:w-80">
              <span class="sr-only">Kayıtlarda ara</span>
              <span
                class="material-symbols-rounded pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-400"
              >
                search
              </span>
              <input
                class="odv-input ps-10"
                type="search"
                placeholder="Danışan adı, kod veya klinik ara…"
                [value]="search()"
                (input)="search.set($any($event.target).value)"
              />
            </label>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full min-w-[720px]">
              <thead>
                <tr>
                  <th class="odv-th">Danışan / Kayıt</th>
                  <th class="odv-th">Referans Kodu</th>
                  <th class="odv-th">Klinik / Kanal</th>
                  <th class="odv-th">Durum</th>
                  <th class="odv-th">Son İşlem</th>
                  <th class="odv-th"><span class="sr-only">İşlem</span></th>
                </tr>
              </thead>
              <tbody>
                @for (row of filtered(); track row.id) {
                  <tr class="hover:bg-violet-50/40 dark:hover:bg-slate-800">
                    <td class="odv-td font-bold">{{ row.name }}</td>
                    <td class="odv-td font-mono text-xs text-slate-500">{{ row.code }}</td>
                    <td class="odv-td text-slate-500">{{ row.location }}</td>
                    <td class="odv-td">
                      <span
                        [class]="
                          row.status === 'active' ? 'odv-badge-success' : 'odv-badge-warning'
                        "
                      >
                        {{ row.status === 'active' ? 'Aktif' : 'Aksiyon gerekli' }}
                      </span>
                    </td>
                    <td class="odv-td text-slate-500">{{ row.updated }}</td>
                    <td class="odv-td text-end">
                      <button
                        class="odv-icon-btn"
                        type="button"
                        aria-label="Kaydı aç"
                        (click)="openDetail(row)"
                      >
                        <span class="material-symbols-rounded directional-icon">arrow_forward</span>
                      </button>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6" class="p-12 text-center text-sm text-slate-500">
                      Bu filtrede kayıt bulunamadı.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      </div>
    } @else if (view === 'domain') {
      <!-- 1. AI NUTRIPILOT DEDICATED SCREEN -->
      @if (section === 'ai-nutripilot') {
        <div class="space-y-6">
          <app-page-header
            [eyebrow]="product.name"
            [title]="domain.title"
            [description]="domain.description"
            icon="auto_awesome"
          />
          <app-ai-copilot-panel />
        </div>
      }

      <!-- 2. BESLENME PLANLARI DEDICATED SCREEN -->
      @else if (section === 'plans') {
        <div class="space-y-6">
          <app-page-header
            [eyebrow]="product.name"
            [title]="domain.title"
            [description]="domain.description"
            icon="restaurant_menu"
          >
            <div actions class="flex items-center gap-2">
              <a routerLink="/ai-nutripilot" class="odv-btn-soft">
                <span class="material-symbols-rounded">auto_awesome</span>AI ile Plan Üret
              </a>
              <button type="button" class="odv-btn-primary" (click)="openCreate()">
                <span class="material-symbols-rounded">add</span>Yeni Plan Ekle
              </button>
            </div>
          </app-page-header>

          <!-- Plans KPI Bar -->
          <section class="grid gap-4 sm:grid-cols-4" aria-label="Beslenme planı göstergeleri">
            <article class="odv-card p-5">
              <span class="text-xs font-extrabold uppercase tracking-wider text-slate-500">Aktif Planlar</span>
              <strong class="mt-2 block text-3xl font-black text-violet-700 dark:text-violet-300">28</strong>
              <span class="text-xs text-slate-500">Klinikte uygulanan</span>
            </article>
            <article class="odv-card p-5">
              <span class="text-xs font-extrabold uppercase tracking-wider text-slate-500">Ortalama Kalori</span>
              <strong class="mt-2 block text-3xl font-black">1.820 <small class="text-xs font-normal">kcal</small></strong>
              <span class="text-xs text-slate-500">Günlük enerji hedefi</span>
            </article>
            <article class="odv-card p-5">
              <span class="text-xs font-extrabold uppercase tracking-wider text-slate-500">Revizyon Bekleyen</span>
              <strong class="mt-2 block text-3xl font-black text-amber-600">3</strong>
              <span class="text-xs text-slate-500">Danışan talebi var</span>
            </article>
            <article class="odv-card p-5">
              <span class="text-xs font-extrabold uppercase tracking-wider text-slate-500">Ortalama Uyum</span>
              <strong class="mt-2 block text-3xl font-black text-emerald-600">%92</strong>
              <span class="text-xs text-slate-500">Haftalık başarı</span>
            </article>
          </section>

          <!-- Plans Grid -->
          <section class="grid gap-4 md:grid-cols-2">
            @for (plan of plansList; track plan.id) {
              <article class="odv-card flex flex-col justify-between p-6">
                <div>
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <span class="text-[10px] font-extrabold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                        {{ plan.dietType }}
                      </span>
                      <h3 class="m-0 mt-0.5 text-base font-black">{{ plan.title }}</h3>
                      <p class="mb-0 mt-1 text-xs text-slate-500">Danışan: <strong>{{ plan.clientName }}</strong> ({{ plan.clinicBranch }})</p>
                    </div>
                    <span
                      class="rounded-full px-2.5 py-1 text-xs font-bold"
                      [class.bg-emerald-100]="plan.status === 'active'"
                      [class.text-emerald-800]="plan.status === 'active'"
                      [class.bg-amber-100]="plan.status === 'revision'"
                      [class.text-amber-800]="plan.status === 'revision'"
                    >
                      {{ plan.status === 'active' ? 'Aktif' : 'Revizyon Bekliyor' }}
                    </span>
                  </div>

                  <div class="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/60">
                    <div class="flex items-center justify-between text-xs font-black">
                      <span>Hedef Enerji</span>
                      <span class="text-violet-700 dark:text-violet-300">{{ plan.calories }} kcal/gün</span>
                    </div>
                    <div class="mt-2 grid grid-cols-3 gap-2 text-center text-[11px]">
                      <div class="rounded-lg bg-white p-2 shadow-sm dark:bg-slate-800">
                        <span class="text-slate-400 block text-[10px]">Protein</span>
                        <strong>{{ plan.proteinGrams }}g</strong>
                      </div>
                      <div class="rounded-lg bg-white p-2 shadow-sm dark:bg-slate-800">
                        <span class="text-slate-400 block text-[10px]">Karbonhidrat</span>
                        <strong>{{ plan.carbGrams }}g</strong>
                      </div>
                      <div class="rounded-lg bg-white p-2 shadow-sm dark:bg-slate-800">
                        <span class="text-slate-400 block text-[10px]">Yağ</span>
                        <strong>{{ plan.fatGrams }}g</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <span class="text-xs text-slate-500">{{ plan.durationText }}</span>
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      class="odv-btn-soft text-xs"
                      (click)="loadAiForPlan(plan)"
                      title="AI NutriPilot ile planı aç ve revize et"
                    >
                      <span class="material-symbols-rounded !text-sm">auto_awesome</span>AI Düzenle
                    </button>
                    <button
                      type="button"
                      class="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors"
                      (click)="sendPlanViaWhatsApp(plan)"
                    >
                      <span class="material-symbols-rounded !text-sm">chat</span>WhatsApp
                    </button>
                  </div>
                </div>
              </article>
            }
          </section>
        </div>
      }

      <!-- 3. ÖLÇÜMLER & LABORATUVAR DEDICATED SCREEN -->
      @else if (section === 'measurements') {
        <div class="space-y-6">
          <app-page-header
            [eyebrow]="product.name"
            [title]="domain.title"
            [description]="domain.description"
            icon="monitor_weight"
          >
            <div actions class="flex items-center gap-2">
              <a routerLink="/ai-nutripilot" class="odv-btn-soft">
                <span class="material-symbols-rounded">biotech</span>AI Tahlil Yorumlayıcı
              </a>
              <button type="button" class="odv-btn-primary" (click)="openCreate()">
                <span class="material-symbols-rounded">add</span>Yeni Ölçüm Gir
              </button>
            </div>
          </app-page-header>

          <!-- Measurements KPI Bar -->
          <section class="grid gap-4 sm:grid-cols-4" aria-label="Ölçüm ve laboratuvar göstergeleri">
            <article class="odv-card p-5">
              <span class="text-xs font-extrabold uppercase tracking-wider text-slate-500">Toplam Verilen Kilo</span>
              <strong class="mt-2 block text-3xl font-black text-emerald-600">-142.8 <small class="text-xs font-normal">kg</small></strong>
              <span class="text-xs text-slate-500">Tüm danışanlar toplamı</span>
            </article>
            <article class="odv-card p-5">
              <span class="text-xs font-extrabold uppercase tracking-wider text-slate-500">Ortalama Yağ Kaybı</span>
              <strong class="mt-2 block text-3xl font-black text-emerald-600">-%2.4</strong>
              <span class="text-xs text-slate-500">Vücut kompozisyonunda</span>
            </article>
            <article class="odv-card p-5">
              <span class="text-xs font-extrabold uppercase tracking-wider text-slate-500">İdeal Ağırlığa Ulaşan</span>
              <strong class="mt-2 block text-3xl font-black text-violet-700 dark:text-violet-300">19</strong>
              <span class="text-xs text-slate-500">Normal BMI sınırında</span>
            </article>
            <article class="odv-card p-5">
              <span class="text-xs font-extrabold uppercase tracking-wider text-slate-500">Bu Hafta Ölçülen</span>
              <strong class="mt-2 block text-3xl font-black">24</strong>
              <span class="text-xs text-slate-500">Antropometrik kayıt</span>
            </article>
          </section>

          <!-- Measurements Table -->
          <section class="odv-card overflow-hidden">
            <div class="border-b border-slate-200 p-4 dark:border-slate-800">
              <h3 class="m-0 text-sm font-black">Vücut Kompozisyonu & Biyometrik Takip Çizelgesi</h3>
            </div>
            <div class="custom-scroll overflow-x-auto">
              <table class="w-full min-w-[760px] text-xs">
                <thead>
                  <tr>
                    <th class="odv-th">Danışan</th>
                    <th class="odv-th">Güncel Kilo / Hedef</th>
                    <th class="odv-th">Değişim Trendi</th>
                    <th class="odv-th">BMI</th>
                    <th class="odv-th">Yağ Oranı</th>
                    <th class="odv-th">Kas Kütlesi</th>
                    <th class="odv-th">Bel/Kalça (WHR)</th>
                    <th class="odv-th">Son Tarih</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of measurementsList; track item.id) {
                    <tr class="hover:bg-violet-50/40 dark:hover:bg-slate-800">
                      <td class="odv-td">
                        <strong class="font-bold">{{ item.clientName }}</strong>
                        <span class="block text-[10px] text-slate-500">{{ item.clinicBranch }}</span>
                      </td>
                      <td class="odv-td">
                        <strong class="font-bold">{{ item.currentWeightKg }} kg</strong>
                        <span class="block text-[10px] text-slate-500">Hedef: {{ item.targetWeightKg }} kg</span>
                      </td>
                      <td class="odv-td">
                        <span
                          class="rounded-lg px-2 py-1 font-bold text-xs"
                          [class.bg-emerald-100]="item.trendTone === 'positive'"
                          [class.text-emerald-800]="item.trendTone === 'positive'"
                          [class.bg-amber-100]="item.trendTone === 'warning'"
                          [class.text-amber-800]="item.trendTone === 'warning'"
                        >
                          {{ item.diffKgText }}
                        </span>
                      </td>
                      <td class="odv-td">
                        <strong class="font-bold">{{ item.bmi }}</strong>
                        <span class="block text-[10px] text-slate-500">{{ item.bmiCategory }}</span>
                      </td>
                      <td class="odv-td font-semibold text-rose-600">%{{ item.bodyFatPct }}</td>
                      <td class="odv-td font-semibold text-sky-600">{{ item.muscleMassKg }} kg</td>
                      <td class="odv-td font-mono">{{ item.waistHipRatio }}</td>
                      <td class="odv-td text-slate-500">{{ item.lastDate }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </section>
        </div>
      }

      <!-- 4. TAKİP GÖRÜŞMELERİ DEDICATED SCREEN -->
      @else if (section === 'consultations') {
        <div class="space-y-6">
          <app-page-header
            [eyebrow]="product.name"
            [title]="domain.title"
            [description]="domain.description"
            icon="clinical_notes"
          >
            <div actions class="flex items-center gap-2">
              <a routerLink="/ai-nutripilot" class="odv-btn-soft">
                <span class="material-symbols-rounded">psychology_alt</span>AI Seans Özeti
              </a>
              <button type="button" class="odv-btn-primary" (click)="openCreate()">
                <span class="material-symbols-rounded">add</span>Yeni Seans Planla
              </button>
            </div>
          </app-page-header>

          <!-- Consultations KPI Bar -->
          <section class="grid gap-4 sm:grid-cols-4" aria-label="Seans ve görüşme göstergeleri">
            <article class="odv-card p-5">
              <span class="text-xs font-extrabold uppercase tracking-wider text-slate-500">Bugünkü Seanslar</span>
              <strong class="mt-2 block text-3xl font-black text-violet-700 dark:text-violet-300">4 Randevu</strong>
              <span class="text-xs text-slate-500">Klinik ve online</span>
            </article>
            <article class="odv-card p-5">
              <span class="text-xs font-extrabold uppercase tracking-wider text-slate-500">Bu Haftaki Seans</span>
              <strong class="mt-2 block text-3xl font-black">22</strong>
              <span class="text-xs text-slate-500">Planlanan görüşme</span>
            </article>
            <article class="odv-card p-5">
              <span class="text-xs font-extrabold uppercase tracking-wider text-slate-500">Ortalama Uyum</span>
              <strong class="mt-2 block text-3xl font-black text-emerald-600">%91</strong>
              <span class="text-xs text-slate-500">Görüşme değerlendirmesi</span>
            </article>
            <article class="odv-card p-5">
              <span class="text-xs font-extrabold uppercase tracking-wider text-slate-500">İptal / Ertelenen</span>
              <strong class="mt-2 block text-3xl font-black text-slate-400">1</strong>
              <span class="text-xs text-slate-500">Son 14 günde</span>
            </article>
          </section>

          <!-- Consultations List Cards -->
          <section class="space-y-3">
            @for (session of consultationsList; track session.id) {
              <article class="odv-card flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
                <div class="flex items-start gap-4">
                  <span
                    class="grid size-12 shrink-0 place-items-center rounded-2xl bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300"
                  >
                    <span class="material-symbols-rounded">
                      {{ session.channel === 'online' ? 'videocam' : 'clinical_notes' }}
                    </span>
                  </span>
                  <div>
                    <div class="flex items-center gap-2">
                      <strong class="text-base font-black">{{ session.clientName }}</strong>
                      <span
                        class="rounded-full px-2 py-0.5 text-[10px] font-bold"
                        [class.bg-emerald-100]="session.status === 'completed'"
                        [class.text-emerald-800]="session.status === 'completed'"
                        [class.bg-sky-100]="session.status === 'scheduled'"
                        [class.text-sky-800]="session.status === 'scheduled'"
                      >
                        {{ session.status === 'completed' ? 'Tamamlandı' : 'Randevu Bekliyor' }}
                      </span>
                    </div>
                    <p class="mb-0 mt-1 text-xs text-slate-600 dark:text-slate-300">{{ session.topic }}</p>
                    <span class="mt-1.5 inline-block text-[11px] text-slate-500">
                      Zaman: <strong>{{ session.timeText }}</strong> · Kanal: <strong>{{ session.channel === 'online' ? 'Zoom / Video' : 'Klinik Yüz Yüze' }}</strong> · Uyum: <strong>%{{ session.compliancePct }}</strong>
                    </span>
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors"
                    (click)="sendConsultationReminder(session)"
                  >
                    <span class="material-symbols-rounded !text-sm">chat</span>WhatsApp
                  </button>
                  <a
                    routerLink="/ai-nutripilot"
                    class="odv-btn-soft text-xs"
                    title="Bu danışanın seansı için AI SOAP kaydı üret"
                  >
                    <span class="material-symbols-rounded !text-sm">psychology</span>AI Özeti
                  </a>
                </div>
              </article>
            }
          </section>
        </div>
      }

      <!-- 5. İLERLEME VE SONUÇ RAPORLARI DEDICATED SCREEN -->
      @else if (section === 'reports') {
        <div class="space-y-6">
          <app-page-header
            [eyebrow]="product.name"
            [title]="domain.title"
            [description]="domain.description"
            icon="insights"
          >
            <div actions class="flex items-center gap-2">
              <button type="button" class="odv-btn-primary" (click)="printReport()">
                <span class="material-symbols-rounded">print</span>Klinik Raporu Yazdır (PDF)
              </button>
            </div>
          </app-page-header>

          <!-- Reports KPI Analytics -->
          <section class="grid gap-4 sm:grid-cols-4" aria-label="Raporlama göstergeleri">
            <article class="odv-card p-5">
              <span class="text-xs font-extrabold uppercase tracking-wider text-slate-500">Toplam Kilo Kaybı</span>
              <strong class="mt-2 block text-3xl font-black text-emerald-600">-184.6 kg</strong>
              <span class="text-xs text-slate-500">Klinik genelinde başarı</span>
            </article>
            <article class="odv-card p-5">
              <span class="text-xs font-extrabold uppercase tracking-wider text-slate-500">Hedef Başarı Oranı</span>
              <strong class="mt-2 block text-3xl font-black text-emerald-600">%94</strong>
              <span class="text-xs text-slate-500">Tamamlanan programlarda</span>
            </article>
            <article class="odv-card p-5">
              <span class="text-xs font-extrabold uppercase tracking-wider text-slate-500">İnsülin Regülasyonu</span>
              <strong class="mt-2 block text-3xl font-black text-violet-700 dark:text-violet-300">%88</strong>
              <span class="text-xs text-slate-500">HbA1c normalleşme oranı</span>
            </article>
            <article class="odv-card p-5">
              <span class="text-xs font-extrabold uppercase tracking-wider text-slate-500">Aktif Takip</span>
              <strong class="mt-2 block text-3xl font-black">32 Danışan</strong>
              <span class="text-xs text-slate-500">Klinik ve online</span>
            </article>
          </section>

          <!-- Visual Progress Trend Chart (CSS Bar Chart) -->
          <section class="odv-card p-6">
            <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 class="m-0 text-base font-black">Aylık Klinik Kilo Kaybı & Metabolik Trend</h3>
                <p class="mb-0 mt-0.5 text-xs text-slate-500">Haftalık kümülatif kilo kaybı dağılımı (kg)</p>
              </div>
              <span class="odv-badge-success">Aylık Toplam: -184.6 kg</span>
            </div>

            <div class="grid grid-cols-4 gap-4 items-end h-48 pt-6 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div class="flex flex-col items-center gap-2 h-full justify-end">
                <span class="text-xs font-bold text-slate-500">-38.2 kg</span>
                <div class="w-full max-w-[64px] bg-violet-300 dark:bg-violet-700/60 rounded-t-xl h-[52%]"></div>
                <span class="text-[11px] font-bold text-slate-600 dark:text-slate-400">1. Hafta</span>
              </div>
              <div class="flex flex-col items-center gap-2 h-full justify-end">
                <span class="text-xs font-bold text-slate-500">-46.5 kg</span>
                <div class="w-full max-w-[64px] bg-violet-400 dark:bg-violet-600/70 rounded-t-xl h-[68%]"></div>
                <span class="text-[11px] font-bold text-slate-600 dark:text-slate-400">2. Hafta</span>
              </div>
              <div class="flex flex-col items-center gap-2 h-full justify-end">
                <span class="text-xs font-bold text-slate-500">-52.1 kg</span>
                <div class="w-full max-w-[64px] bg-violet-500 dark:bg-violet-500 rounded-t-xl h-[82%]"></div>
                <span class="text-[11px] font-bold text-slate-600 dark:text-slate-400">3. Hafta</span>
              </div>
              <div class="flex flex-col items-center gap-2 h-full justify-end">
                <span class="text-xs font-bold text-slate-500">-47.8 kg</span>
                <div class="w-full max-w-[64px] bg-violet-600 dark:bg-violet-400 rounded-t-xl h-[74%]"></div>
                <span class="text-[11px] font-bold text-slate-600 dark:text-slate-400">4. Hafta</span>
              </div>
            </div>
          </section>

          <!-- Danışan Başarı Karneleri List -->
          <section class="space-y-4">
            <h3 class="m-0 text-base font-black">Danışan Başarı Karneleri & Çıktılar</h3>
            <div class="grid gap-4 md:grid-cols-3">
              @for (report of reportsList; track report.id) {
                <article class="odv-card flex flex-col justify-between p-5">
                  <div>
                    <div class="flex items-center justify-between text-xs">
                      <span class="font-bold text-violet-700 dark:text-violet-300">{{ report.programDuration }}</span>
                      <span class="odv-badge-success">Uyum: %{{ report.compliancePct }}</span>
                    </div>
                    <h4 class="mb-1 mt-2 text-base font-black">{{ report.clientName }}</h4>
                    <p class="mb-0 text-xs font-bold text-emerald-600">{{ report.totalWeightLossText }} · {{ report.waistLossText }}</p>
                    <p class="mb-0 mt-2 text-xs leading-5 text-slate-500">{{ report.clinicalImpact }}</p>
                  </div>

                  <div class="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                    <button
                      type="button"
                      class="odv-btn-soft text-xs"
                      (click)="printReport()"
                    >
                      <span class="material-symbols-rounded !text-sm">print</span>Karne Yazdır
                    </button>
                    <button
                      type="button"
                      class="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700 transition-colors"
                      (click)="shareReportViaWhatsApp(report)"
                    >
                      <span class="material-symbols-rounded !text-sm">chat</span>Paylaş
                    </button>
                  </div>
                </article>
              }
            </div>
          </section>
        </div>
      }

      <!-- 6. DANIŞAN PORTALI (CLIENT PORTAL & MOBİL GÜNLÜK) -->
      @else if (section === 'client-portal') {
        <app-client-portal />
      }

      <!-- 7. DEFAULT DOMAIN VIEW (Danışanlar / Clients) -->
      @else {
        <div class="space-y-6">
          <app-page-header
            [eyebrow]="product.name"
            [title]="domain.title"
            [description]="domain.description"
          >
            <div actions class="flex items-center gap-2">
              <a routerLink="/client-portal" class="odv-btn-soft">
                <span class="material-symbols-rounded">smartphone</span>Danışan Portalı
              </a>
              <a routerLink="/ai-nutripilot" class="odv-btn-soft">
                <span class="material-symbols-rounded">auto_awesome</span>AI Analiz
              </a>
              <button type="button" class="odv-btn-primary" (click)="openCreate()">
                <span class="material-symbols-rounded">add</span>Yeni kayıt
              </button>
            </div>
          </app-page-header>

          <section class="grid gap-4 sm:grid-cols-3" aria-label="İş alanı özeti">
            <article class="odv-card p-5">
              <span class="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Toplam kayıt
              </span>
              <strong class="mt-3 block text-3xl font-black">{{ 24 + domainIndex }}</strong>
              <span class="mt-1 block text-xs text-slate-500">Bu iş alanındaki güncel kayıtlar</span>
            </article>
            <article class="odv-card p-5">
              <span class="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Aksiyon gerekli
              </span>
              <strong class="mt-3 block text-3xl font-black text-amber-600">
                {{ 2 + domainIndex }}
              </strong>
              <span class="mt-1 block text-xs text-slate-500">Son tarihi yaklaşan işlemler</span>
            </article>
            <article class="odv-card p-5">
              <span class="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Tamamlanma
              </span>
              <strong class="mt-3 block text-3xl font-black text-emerald-600">
                %{{ 94 - domainIndex }}
              </strong>
              <span class="mt-1 block text-xs text-slate-500">Güncel uygunluk oranı</span>
            </article>
          </section>

          <section class="odv-card overflow-hidden">
            <div
              class="flex flex-col gap-3 border-b border-slate-200 p-4 dark:border-slate-700 sm:flex-row sm:items-center"
            >
              <label class="relative flex-1">
                <span class="sr-only">{{ domain.title }} kayıtlarında ara</span>
                <span
                  class="material-symbols-rounded pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  search
                </span>
                <input
                  class="odv-input ps-10"
                  type="search"
                  [placeholder]="domain.title + ' içinde ara…'"
                  [value]="search()"
                  (input)="search.set($any($event.target).value)"
                />
              </label>
              <select
                class="odv-input !w-auto"
                aria-label="Durum filtresi"
                [value]="statusFilter()"
                (change)="statusFilter.set($any($event.target).value)"
              >
                <option value="all">Tüm durumlar</option>
                <option value="active">Aktif</option>
                <option value="pending">Aksiyon gerekli</option>
              </select>
            </div>
            <div class="custom-scroll overflow-x-auto">
              <table class="w-full min-w-[720px]">
                <thead>
                  <tr>
                    <th class="odv-th">{{ domain.title }}</th>
                    <th class="odv-th">Referans</th>
                    <th class="odv-th">Klinik / Şube</th>
                    <th class="odv-th">Durum</th>
                    <th class="odv-th">Son işlem</th>
                    <th class="odv-th"><span class="sr-only">İşlem</span></th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of domainRows(); track row.id; let index = $index) {
                    <tr class="hover:bg-violet-50/40 dark:hover:bg-slate-800">
                      <td class="odv-td">
                        <div class="flex items-center gap-3">
                          <span
                            class="grid size-9 place-items-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300"
                          >
                            <span class="material-symbols-rounded">{{ domain.icon }}</span>
                          </span>
                          <strong>{{ row.name }}</strong>
                        </div>
                      </td>
                      <td class="odv-td font-mono text-xs text-slate-500">{{ row.code }}</td>
                      <td class="odv-td text-slate-500">{{ row.location }}</td>
                      <td class="odv-td">
                        <span
                          [class]="
                            row.status === 'active' ? 'odv-badge-success' : 'odv-badge-warning'
                          "
                        >
                          {{ row.status === 'active' ? 'Aktif' : 'Aksiyon gerekli' }}
                        </span>
                      </td>
                      <td class="odv-td text-slate-500">{{ row.updated }}</td>
                      <td class="odv-td text-end">
                        <button type="button" class="odv-btn-soft" (click)="openDetail(row)">
                          Detayı aç
                        </button>
                      </td>
                    </tr>
                    @if (selectedModule() === index) {
                      <tr>
                        <td
                          colspan="6"
                          class="bg-violet-50/50 px-6 py-4 text-sm text-slate-600 dark:bg-violet-500/5 dark:text-slate-300"
                        >
                          <strong>{{ row.name }}</strong> kaydının görevleri, belgeleri ve denetim
                          izi MainAPI üzerinden bu alanda yönetilir.
                        </td>
                      </tr>
                    }
                  }
                </tbody>
              </table>
            </div>
            <footer
              class="border-t border-slate-200 p-4 text-xs text-slate-500 dark:border-slate-700"
            >
              Toplam <strong>{{ domainRows().length }}</strong> kayıt gösteriliyor.
            </footer>
          </section>
        </div>
      }
    } @else if (view === 'activity') {
      <div class="space-y-6">
        <app-page-header
          eyebrow="Denetim İzi"
          title="Aktiviteler"
          description="Ekip ve sistem tarafından gerçekleştirilen son işlemler."
        />
        <section class="odv-card p-6">
          <div class="space-y-1">
            @for (item of activities; track item.time) {
              <article
                class="grid grid-cols-[auto_1fr_auto] gap-4 border-b border-slate-100 py-5 last:border-0 dark:border-slate-700"
              >
                <span
                  class="grid size-10 place-items-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300"
                >
                  <span class="material-symbols-rounded">{{ item.icon }}</span>
                </span>
                <div>
                  <strong class="block text-sm">{{ item.title }}</strong>
                  <p class="mb-0 mt-1 text-xs text-slate-500">{{ item.detail }}</p>
                </div>
                <time class="text-xs font-semibold text-slate-400">{{ item.time }}</time>
              </article>
            }
          </div>
        </section>
      </div>
    } @else {
      <div class="space-y-6">
        <app-page-header
          eyebrow="Yapılandırma"
          title="Ayarlar"
          description="Çalışma alanı, bildirim ve entegrasyon tercihlerini yönetin."
        />
        <div class="grid gap-5 xl:grid-cols-[1fr_.8fr]">
          <section class="odv-card p-6">
            <h2 class="mt-0 text-lg font-black">Çalışma alanı</h2>
            <div class="grid gap-4 sm:grid-cols-2">
              <label>
                <span class="mb-1.5 block text-xs font-bold">Klinik / İşletme adı</span>
                <input class="odv-input" value="Odivon Beslenme & Diyet Danışmanlığı" />
              </label>
              <label>
                <span class="mb-1.5 block text-xs font-bold">Varsayılan bölge</span>
                <select class="odv-input">
                  <option>Türkiye</option>
                  <option>Avrupa Birliği</option>
                </select>
              </label>
              <label class="sm:col-span-2">
                <span class="mb-1.5 block text-xs font-bold">API adresi</span>
                <input class="odv-input font-mono text-xs" [value]="apiBaseUrl" readonly />
              </label>
            </div>
            <button type="button" class="odv-btn-primary mt-5" (click)="saved.set(true)">
              <span class="material-symbols-rounded">save</span>Ayarları kaydet
            </button>
            @if (saved()) {
              <span class="ms-3 text-xs font-bold text-emerald-600">Değişiklikler kaydedildi.</span>
            }
          </section>
          <section class="odv-card p-6">
            <h2 class="mt-0 text-lg font-black">Bildirimler</h2>
            @for (option of notificationOptions; track option.label) {
              <label
                class="flex items-center justify-between border-b border-slate-100 py-4 last:border-0 dark:border-slate-700"
              >
                <span>
                  <strong class="block text-sm">{{ option.label }}</strong>
                  <small class="text-slate-500">{{ option.note }}</small>
                </span>
                <input
                  type="checkbox"
                  class="size-5 accent-violet-600"
                  [checked]="option.enabled"
                />
              </label>
            }
          </section>
        </div>
      </div>
    }

    <!-- SlideOver Drawer -->
    <app-slide-over
      [open]="drawerOpen()"
      [dirty]="!selectedRecord() && draftDirty()"
      [wide]="true"
      [icon]="selectedRecord() ? domain.icon : 'add_circle'"
      [eyebrow]="selectedRecord() ? 'Danışan / Kayıt Detayı' : product.name"
      [title]="drawerTitle()"
      [description]="drawerDescription()"
      [submitLabel]="selectedRecord() ? 'Düzenlemeye geç' : 'Kaydı oluştur'"
      (closed)="closeDrawer()"
      (submitted)="handleDrawerSubmit()"
    >
      @if (selectedRecord(); as record) {
        <div
          class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div
            class="bg-gradient-to-br from-slate-950 via-violet-950 to-indigo-950 p-6 text-white"
          >
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div class="flex items-center gap-4">
                <span
                  class="grid size-14 place-items-center rounded-2xl bg-white/10 text-violet-200 ring-1 ring-white/15"
                >
                  <span class="material-symbols-rounded !text-3xl">{{ domain.icon }}</span>
                </span>
                <div>
                  <span
                    class="text-[10px] font-bold uppercase tracking-[.18em] text-violet-300"
                  >
                    {{ record.code }}
                  </span>
                  <h3 class="mb-1 mt-1 text-xl font-black">{{ record.name }}</h3>
                  <p class="m-0 text-xs text-slate-300">{{ record.location }}</p>
                </div>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  class="odv-btn-soft text-xs"
                  (click)="openAiForRecord(record)"
                  title="Bu danışanın verileriyle AI NutriPilot beslenme planı üret"
                >
                  <span class="material-symbols-rounded">auto_awesome</span>AI ile Plan Üret
                </button>
                <button
                  type="button"
                  class="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700 transition-colors"
                  (click)="openWhatsAppForRecord(record)"
                  title="Danışana doğrudan WhatsApp mesajı aç"
                >
                  <span class="material-symbols-rounded !text-sm">chat</span>WhatsApp
                </button>
                <span
                  [class]="record.status === 'active' ? 'odv-badge-success' : 'odv-badge-warning'"
                >
                  {{ record.status === 'active' ? 'Aktif ve uyumlu' : 'Aksiyon gerekli' }}
                </span>
              </div>
            </div>
          </div>
          <div
            class="grid grid-cols-2 divide-x divide-y divide-slate-100 dark:divide-slate-800 sm:grid-cols-4"
          >
            <div class="p-4">
              <span class="block text-[10px] font-bold uppercase text-slate-400">Plan Uyumu</span>
              <strong class="mt-1 block text-xl text-emerald-600">%94</strong>
            </div>
            <div class="p-4">
              <span class="block text-[10px] font-bold uppercase text-slate-400">Yaklaşan Seans</span>
              <strong class="mt-1 block text-xl">3 Gün</strong>
            </div>
            <div class="p-4">
              <span class="block text-[10px] font-bold uppercase text-slate-400">Tahlil / Rapor</span>
              <strong class="mt-1 block text-xl">6 Belge</strong>
            </div>
            <div class="p-4">
              <span class="block text-[10px] font-bold uppercase text-slate-400">Son İşlem</span>
              <strong class="mt-1 block text-sm">{{ record.updated }}</strong>
            </div>
          </div>
        </div>

        <section class="odv-card p-5">
          <div class="mb-4 flex items-center gap-2">
            <span class="material-symbols-rounded text-violet-600">info</span>
            <h3 class="m-0 text-sm font-black">Kayıt bilgileri</h3>
          </div>
          <dl class="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt class="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {{ formLabels.categoryLabel }}
              </dt>
              <dd class="m-0 mt-1 font-bold">{{ formLabels.categories[0] }}</dd>
            </div>
            <div>
              <dt class="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Sorumlu Diyetisyen
              </dt>
              <dd class="m-0 mt-1 font-bold">Dyt. Ayşe Yılmaz</dd>
            </div>
            <div>
              <dt class="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {{ formLabels.primaryLabel }}
              </dt>
              <dd class="m-0 mt-1 font-bold">{{ formLabels.primaryPlaceholder }}</dd>
            </div>
            <div>
              <dt class="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {{ formLabels.secondaryLabel }}
              </dt>
              <dd class="m-0 mt-1 font-bold">{{ formLabels.secondaryPlaceholder }}</dd>
            </div>
          </dl>
        </section>

        <section class="odv-card p-5">
          <div class="mb-4 flex items-center gap-2">
            <span class="material-symbols-rounded text-violet-600">history</span>
            <h3 class="m-0 text-sm font-black">Denetim izi</h3>
          </div>
          <div class="space-y-4">
            @for (item of activities.slice(0, 3); track item.time) {
              <div class="flex gap-3">
                <span
                  class="mt-1 size-2 shrink-0 rounded-full bg-violet-500 ring-4 ring-violet-100 dark:ring-violet-950"
                ></span>
                <div>
                  <strong class="block text-xs">{{ item.title }}</strong>
                  <span class="text-[11px] text-slate-500">
                    {{ item.detail }} · {{ item.time }}
                  </span>
                </div>
              </div>
            }
          </div>
        </section>
      } @else {
        <div
          class="rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-indigo-50 p-4 dark:border-violet-900 dark:from-violet-950/40 dark:to-indigo-950/30"
        >
          <div class="flex gap-3">
            <span class="material-symbols-rounded text-violet-600">auto_awesome</span>
            <div>
              <strong class="block text-sm text-violet-950 dark:text-violet-100">
                {{ domain.title }} kaydı oluşturuyorsunuz
              </strong>
              <p class="mb-0 mt-1 text-xs leading-5 text-violet-700 dark:text-violet-300">
                Zorunlu alanlar işaretlidir. Danışan verileri KVKK ve sağlık mevzuatına tam uyumlu
                biçimde şifrelenir.
              </p>
            </div>
          </div>
        </div>

        <section class="odv-card p-5 sm:p-6">
          <div
            class="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800"
          >
            <span
              class="grid size-9 place-items-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950"
            >
              <span class="material-symbols-rounded">badge</span>
            </span>
            <div>
              <h3 class="m-0 text-sm font-black">Temel bilgiler</h3>
              <p class="mb-0 mt-0.5 text-[11px] text-slate-500">
                Danışanın kimlik ve klinik organizasyon bilgileri
              </p>
            </div>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="sm:col-span-2">
              <span class="mb-1.5 block text-xs font-bold">
                Kayıt adı <b class="text-rose-500">*</b>
              </span>
              <input
                class="odv-input"
                [formField]="draftForm.name"
                placeholder="Örn. Danışan Adı Soyadı veya Program Başlığı"
                autocomplete="off"
              />
              @if (draftForm.name().touched() && draftForm.name().invalid()) {
                <span class="mt-1 block text-xs text-rose-600">
                  En az 3 karakterlik kayıt adı zorunludur.
                </span>
              }
            </label>
            <label>
              <span class="mb-1.5 block text-xs font-bold">
                Referans kodu <b class="text-rose-500">*</b>
              </span>
              <input
                class="odv-input font-mono"
                [formField]="draftForm.code"
                placeholder="Örn. DIET-2026-001"
                autocomplete="off"
              />
            </label>
            <label>
              <span class="mb-1.5 block text-xs font-bold">{{ formLabels.categoryLabel }}</span>
              <select class="odv-input" [formField]="draftForm.category">
                @for (option of formLabels.categories; track option) {
                  <option [value]="option">{{ option }}</option>
                }
              </select>
            </label>
            <label>
              <span class="mb-1.5 block text-xs font-bold">
                Klinik / Şube <b class="text-rose-500">*</b>
              </span>
              <input
                class="odv-input"
                [formField]="draftForm.location"
                placeholder="Şube, klinik veya online danışmanlık"
                autocomplete="off"
              />
            </label>
            <label>
              <span class="mb-1.5 block text-xs font-bold">Departman / Branş</span>
              <input
                class="odv-input"
                [formField]="draftForm.department"
                placeholder="Örn. Klinik Beslenme / Sporcu"
                autocomplete="off"
              />
            </label>
          </div>
        </section>

        <section class="odv-card p-5 sm:p-6">
          <div
            class="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800"
          >
            <span
              class="grid size-9 place-items-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950"
            >
              <span class="material-symbols-rounded">tune</span>
            </span>
            <div>
              <h3 class="m-0 text-sm font-black">Teknik ve mevzuat bilgileri</h3>
              <p class="mb-0 mt-0.5 text-[11px] text-slate-500">
                Klinik beslenme ve izlenebilirlik alanları
              </p>
            </div>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <label>
              <span class="mb-1.5 block text-xs font-bold">
                {{ formLabels.primaryLabel }} <b class="text-rose-500">*</b>
              </span>
              <input
                class="odv-input"
                [formField]="draftForm.primaryValue"
                [placeholder]="formLabels.primaryPlaceholder"
                autocomplete="off"
              />
            </label>
            <label>
              <span class="mb-1.5 block text-xs font-bold">{{ formLabels.secondaryLabel }}</span>
              <input
                class="odv-input"
                [formField]="draftForm.secondaryValue"
                [placeholder]="formLabels.secondaryPlaceholder"
                autocomplete="off"
              />
            </label>
            <label>
              <span class="mb-1.5 block text-xs font-bold">Hekim / Yönlendiren Kurum</span>
              <input
                class="odv-input"
                [formField]="draftForm.manufacturer"
                placeholder="Örn. Dr. Mehmet Öz / Acıbadem"
                autocomplete="organization"
              />
            </label>
            <label>
              <span class="mb-1.5 block text-xs font-bold">Protokol / Belge numarası</span>
              <input
                class="odv-input font-mono"
                [formField]="draftForm.serialNumber"
                placeholder="Klinik protokol veya tetkik barkod no"
                autocomplete="off"
              />
            </label>
          </div>
        </section>

        <section class="odv-card p-5 sm:p-6">
          <div
            class="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800"
          >
            <span
              class="grid size-9 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950"
            >
              <span class="material-symbols-rounded">event</span>
            </span>
            <div>
              <h3 class="m-0 text-sm font-black">Sorumluluk ve planlama</h3>
              <p class="mb-0 mt-0.5 text-[11px] text-slate-500">
                Diyetisyen ataması, öncelik ve sonraki seans takvimi
              </p>
            </div>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <label>
              <span class="mb-1.5 block text-xs font-bold">Sorumlu diyetisyen</span>
              <input
                class="odv-input"
                [formField]="draftForm.owner"
                placeholder="Diyetisyen adı soyadı"
                autocomplete="off"
              />
            </label>
            <label>
              <span class="mb-1.5 block text-xs font-bold">
                Sonraki seans / Son tarih <b class="text-rose-500">*</b>
              </span>
              <input class="odv-input" type="date" [formField]="draftForm.dueDate" />
            </label>
            <label>
              <span class="mb-1.5 block text-xs font-bold">Öncelik / Takip Sıklığı</span>
              <select class="odv-input" [formField]="draftForm.priority">
                <option value="normal">Normal (Haftalık)</option>
                <option value="high">Yüksek (3 Günde Bir)</option>
                <option value="critical">Kritik Klinik İzlem (Günlük)</option>
              </select>
            </label>
            <label>
              <span class="mb-1.5 block text-xs font-bold">Başlangıç durumu</span>
              <select class="odv-input" [formField]="draftForm.status">
                <option value="draft">Taslak Plan</option>
                <option value="active">Aktif Takipte</option>
                <option value="pending">Tetkik Bekleniyor</option>
              </select>
            </label>
          </div>
        </section>

        <section class="odv-card p-5 sm:p-6">
          <div class="mb-4 flex items-center gap-3">
            <span
              class="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950"
            >
              <span class="material-symbols-rounded">attachment</span>
            </span>
            <div>
              <h3 class="m-0 text-sm font-black">Tetkik, Kan Tahlili ve Klinik Notlar</h3>
              <p class="mb-0 mt-0.5 text-[11px] text-slate-500">
                Biyokimya tahlilleri, vücut analiz çıktıları ve seans notları
              </p>
            </div>
          </div>
          <label>
            <span class="mb-1.5 block text-xs font-bold">Harici referans / Tetkik kodu</span>
            <input
              class="odv-input"
              [formField]="draftForm.reference"
              placeholder="Laboratuvar sonuç no veya dosya numarası"
              autocomplete="off"
            />
          </label>
          <label class="mt-4 block">
            <span class="mb-1.5 block text-xs font-bold">Açıklama ve anamnez notları</span>
            <textarea
              class="odv-input min-h-28 resize-y"
              [formField]="draftForm.notes"
              placeholder="Danışanın beslenme alışkanlıkları, alerjileri ve klinik gözlemler"
            ></textarea>
          </label>
          <div
            class="mt-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-800/40"
          >
            <span class="material-symbols-rounded text-3xl text-slate-400">cloud_upload</span>
            <strong class="mt-2 block text-xs">
              Kan tahlili, Tanita ölçüm çıktısı veya diyet günlüğü ekleyin
            </strong>
            <span class="mt-1 block text-[11px] text-slate-400">
              PDF, PNG veya JPG · en fazla 10 MB
            </span>
            <input
              #evidenceInput
              type="file"
              class="sr-only"
              multiple
              accept=".pdf,.png,.jpg,.jpeg"
              (change)="onFilesSelected($event)"
            />
            <button type="button" class="odv-btn-soft mt-3" (click)="evidenceInput.click()">
              Dosya seç
            </button>
            @if (evidenceFiles().length) {
              <div class="mt-4 flex flex-wrap justify-center gap-2">
                @for (file of evidenceFiles(); track file) {
                  <span
                    class="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300"
                  >
                    <span class="material-symbols-rounded !text-base text-emerald-500">
                      check_circle
                    </span>
                    {{ file }}
                  </span>
                }
              </div>
            }
          </div>
        </section>
      }
    </app-slide-over>
  `,
})
export class WorkspacePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dietApi = inject(DietApiService);
  private readonly dietState = inject(DietStateService);

  readonly product = PRODUCT;
  readonly view = this.route.snapshot.data['view'] as
    | 'overview'
    | 'domain'
    | 'activity'
    | 'settings';
  readonly section = this.route.snapshot.data['section'] as string;
  readonly domain =
    WORKSPACE_DOMAINS.find((item) => item.key === this.section) ?? WORKSPACE_DOMAINS[0];
  readonly domainIndex = Math.max(
    0,
    WORKSPACE_DOMAINS.findIndex((item) => item.key === this.section),
  );
  readonly apiBaseUrl = environment.apiBaseUrl;
  readonly search = signal('');
  readonly statusFilter = signal<'all' | 'active' | 'pending'>('all');
  readonly archived = signal(false);
  readonly drawerOpen = signal(false);
  readonly selectedModule = signal(-1);
  readonly saved = signal(false);
  readonly selectedRecord = signal<RecordRow | null>(null);
  readonly evidenceFiles = signal<string[]>([]);
  readonly formLabels = this.resolveFormLabels();
  readonly draftModel = signal({
    name: '',
    code: '',
    category: this.formLabels.categories[0],
    location: '',
    department: '',
    primaryValue: '',
    secondaryValue: '',
    manufacturer: '',
    serialNumber: '',
    owner: '',
    dueDate: '',
    priority: 'normal',
    status: 'draft',
    reference: '',
    notes: '',
  });
  readonly draftForm = form(this.draftModel, (p) => {
    required(p.name);
    minLength(p.name, 3);
    required(p.code);
    required(p.location);
    required(p.primaryValue);
    required(p.dueDate);
  });
  readonly drawerTitle = computed(
    () => this.selectedRecord()?.name ?? `Yeni ${this.domain.title} Kaydı`,
  );
  readonly drawerDescription = computed(() =>
    this.selectedRecord()
      ? 'Klinik bilgiler, beslenme planı, biyobelirteçler ve seans geçmişi.'
      : this.domain.description,
  );
  readonly draftDirty = computed(() => {
    const value = this.draftModel();
    return Boolean(
      value.name ||
      value.location ||
      value.department ||
      value.primaryValue ||
      value.secondaryValue ||
      value.manufacturer ||
      value.serialNumber ||
      value.owner ||
      value.dueDate ||
      value.reference ||
      value.notes,
    );
  });
  readonly rows = signal<RecordRow[]>(this.seedRows());
  readonly domainRows = computed(() => {
    const status = this.statusFilter();
    return this.filtered().filter(
      (row) => !row.archived && (status === 'all' || row.status === status),
    );
  });
  readonly activeCount = computed(() => this.rows().filter((r) => !r.archived).length);
  readonly archivedCount = computed(() => this.rows().filter((r) => r.archived).length);
  readonly filtered = computed(() => {
    const q = this.search().trim().toLocaleLowerCase('tr');
    return this.rows().filter(
      (r) =>
        r.archived === this.archived() &&
        (!q || `${r.name} ${r.code} ${r.location}`.toLocaleLowerCase('tr').includes(q)),
    );
  });

  // Dedicated Domain State: Plans
  readonly plansList: PlanItem[] = [
    {
      id: 1,
      clientName: 'Elif Kaya',
      title: 'PCOS & Düşük Glisemik İndeks Planı',
      calories: 1750,
      proteinGrams: 90,
      carbGrams: 160,
      fatGrams: 65,
      dietType: 'İnsülin Direnci & PCOS',
      status: 'active',
      durationText: '4 Hafta · 16 Gün Kaldı',
      clinicBranch: 'Levent Klinik',
    },
    {
      id: 2,
      clientName: 'Mert Yıldız',
      title: 'Hipertrofi & Yüksek Protein Sporcu Planı',
      calories: 2600,
      proteinGrams: 175,
      carbGrams: 310,
      fatGrams: 75,
      dietType: 'Yüksek Protein & Sporcu',
      status: 'active',
      durationText: '6 Hafta · 24 Gün Kaldı',
      clinicBranch: 'Bağdat Caddesi Şube',
    },
    {
      id: 3,
      clientName: 'Selin Aras',
      title: 'Haşimato & Anti-İnflamatuar Akdeniz Planı',
      calories: 1600,
      proteinGrams: 85,
      carbGrams: 150,
      fatGrams: 60,
      dietType: 'Akdeniz & Eliminasyon',
      status: 'revision',
      durationText: 'Revizyon Bekliyor',
      clinicBranch: 'Online Seans / Zoom',
    },
    {
      id: 4,
      clientName: 'Canan Öztürk',
      title: 'Aralıklı Oruç (16:8) Metabolik Hızlandırma',
      calories: 1850,
      proteinGrams: 100,
      carbGrams: 170,
      fatGrams: 70,
      dietType: 'Aralıklı Oruç (IF)',
      status: 'active',
      durationText: '4 Hafta · 9 Gün Kaldı',
      clinicBranch: 'Nişantaşı Şube',
    },
  ];

  // Dedicated Domain State: Measurements
  readonly measurementsList: MeasurementItem[] = [
    {
      id: 1,
      clientName: 'Elif Kaya',
      clinicBranch: 'Levent Klinik',
      heightCm: 165,
      currentWeightKg: 68.2,
      targetWeightKg: 58.0,
      diffKgText: '-1.4 kg / seans',
      bmi: 25.1,
      bmiCategory: 'Hafif Fazla',
      bodyFatPct: 26.4,
      muscleMassKg: 47.8,
      waistHipRatio: 0.78,
      lastDate: '08.11.2026',
      trendTone: 'positive',
    },
    {
      id: 2,
      clientName: 'Mert Yıldız',
      clinicBranch: 'Bağdat Caddesi Şube',
      heightCm: 182,
      currentWeightKg: 84.1,
      targetWeightKg: 80.0,
      diffKgText: '+0.6 kg (Kas)',
      bmi: 25.4,
      bmiCategory: 'Normal / Sporcu',
      bodyFatPct: 14.2,
      muscleMassKg: 68.4,
      waistHipRatio: 0.82,
      lastDate: '06.11.2026',
      trendTone: 'positive',
    },
    {
      id: 3,
      clientName: 'Selin Aras',
      clinicBranch: 'Online Seans',
      heightCm: 162,
      currentWeightKg: 76.4,
      targetWeightKg: 62.0,
      diffKgText: '-0.8 kg',
      bmi: 29.1,
      bmiCategory: '1. Derece Obezite',
      bodyFatPct: 33.8,
      muscleMassKg: 48.2,
      waistHipRatio: 0.84,
      lastDate: '04.11.2026',
      trendTone: 'warning',
    },
    {
      id: 4,
      clientName: 'Burak Şen',
      clinicBranch: 'Nişantaşı Şube',
      heightCm: 178,
      currentWeightKg: 91.0,
      targetWeightKg: 82.0,
      diffKgText: '-2.1 kg / seans',
      bmi: 28.7,
      bmiCategory: 'Fazla Kilolu',
      bodyFatPct: 28.5,
      muscleMassKg: 61.2,
      waistHipRatio: 0.89,
      lastDate: '01.11.2026',
      trendTone: 'positive',
    },
  ];

  // Dedicated Domain State: Consultations
  readonly consultationsList: ConsultationSession[] = [
    {
      id: 1,
      clientName: 'Elif Kaya',
      phone: '+905321002030',
      timeText: 'Bugün 14:30',
      channel: 'online',
      topic: '3. Hafta Takibi - Tatlı krizleri ve akşam atıştırmaları değerlendirildi',
      compliancePct: 92,
      status: 'completed',
      notes: 'Uyum çok iyi, ödem azaldı.',
    },
    {
      id: 2,
      clientName: 'Mert Yıldız',
      phone: '+905332003040',
      timeText: 'Bugün 16:00',
      channel: 'clinic',
      topic: 'Antrenman öncesi karbonhidrat zamanlaması ve kreatin kullanımı',
      compliancePct: 95,
      status: 'completed',
      notes: 'Kas artışı ve hidrasyon başarılı.',
    },
    {
      id: 3,
      clientName: 'Selin Aras',
      phone: '+905353004050',
      timeText: 'Yarın 11:00',
      channel: 'online',
      topic: '4. Hafta Sonu Tahlil Değerlendirmesi (TSH & Ferritin)',
      compliancePct: 88,
      status: 'scheduled',
      notes: 'Laboratuvar sonuçları bekleniyor.',
    },
    {
      id: 4,
      clientName: 'Zeynep Çelik',
      phone: '+905304005060',
      timeText: 'Çarşamba 15:30',
      channel: 'clinic',
      topic: 'İlk Görüşme - Kapsamlı Anamnez ve Tanita Vücut Analizi',
      compliancePct: 100,
      status: 'scheduled',
      notes: 'Yeni başvuru.',
    },
  ];

  // Dedicated Domain State: Reports
  readonly reportsList: ProgressReportCard[] = [
    {
      id: 1,
      clientName: 'Elif Kaya',
      programDuration: '8 Haftalık Klinik Program',
      totalWeightLossText: '-5.8 kg Toplam Kayıp',
      waistLossText: 'Bel: -7 cm',
      clinicalImpact: 'HbA1c değeri %6.1 seviyesinden %5.4 düzeyine geriledi, insülin duyarlılığı optimize edildi.',
      compliancePct: 96,
      status: 'completed',
    },
    {
      id: 2,
      clientName: 'Mert Yıldız',
      programDuration: '6 Haftalık Sporcu Programı',
      totalWeightLossText: '+2.4 kg Kas Kütlesi',
      waistLossText: 'Yağ Oranı: %16.2 -> %13.8',
      clinicalImpact: 'Vücut yağ oranı %2.4 düşerken yağsız kas dokusu korundu ve maksimal kuvvet performansı arttı.',
      compliancePct: 94,
      status: 'ongoing',
    },
    {
      id: 3,
      clientName: 'Selin Aras',
      programDuration: '4 Haftalık Metabolik Program',
      totalWeightLossText: '-3.4 kg Yağ Kaybı',
      waistLossText: 'Bel: -4 cm',
      clinicalImpact: 'Anti-inflamatuar beslenme modeli ile tiroid antikorlarında düşüş ve kronik yorgunlukta belirgin azalma sağlandı.',
      compliancePct: 90,
      status: 'ongoing',
    },
  ];

  readonly activities = [
    {
      icon: 'auto_awesome',
      title: 'AI NutriPilot menüsü onaylandı',
      detail: 'Elif Kaya için PCOS & Ketojenik plan reçete edildi.',
      time: '12 dk önce',
    },
    {
      icon: 'person_add',
      title: 'Yeni danışan kabul edildi',
      detail: 'Klinik anamnez ve hedefler sisteme kaydedildi.',
      time: '45 dk önce',
    },
    {
      icon: 'bloodtype',
      title: 'Laboratuvar tahlili yüklendi',
      detail: 'Mert Yıldız için ferritin ve D vitamini analizi yapıldı.',
      time: '2 saat önce',
    },
    {
      icon: 'sync',
      title: 'MainAPI senkronizasyonu',
      detail: 'Tüm danışan kayıtları güvenle eşitlendi.',
      time: 'Bugün 09:15',
    },
  ];

  readonly notificationOptions = [
    {
      label: 'Kritik laboratuvar uyarıları',
      note: 'Bozulmuş kan şekeri ve eksiklikleri anında bildir',
      enabled: true,
    },
    {
      label: 'Haftalık seans özeti',
      note: 'Her pazartesi danışan uyum ve kilo raporu gönder',
      enabled: true,
    },
    {
      label: 'AI NutriPilot önerileri',
      note: 'Yeni klinik beslenme ve telafi algoritmaları',
      enabled: true,
    },
  ];

  ngOnInit(): void {
    this.dietApi.getClients().subscribe((clients) => {
      if (clients && clients.length) {
        this.rows.set(
          clients.map((c, index) => ({
            id: Number(c.id) || index + 1,
            name: `${c.fullName} – ${c.programType}`,
            code: `${PRODUCT.key.toUpperCase()}-${1001 + index}`,
            location: c.clinicBranch,
            status: c.status === 'active' ? 'active' : 'pending',
            updated: c.updatedAt || new Date().toLocaleDateString('tr-TR'),
            archived: c.status === 'completed',
          })),
        );
      }
    });
  }

  openCreate(): void {
    this.selectedRecord.set(null);
    this.resetDraft();
    this.drawerOpen.set(true);
  }

  openDetail(row: RecordRow): void {
    this.selectedRecord.set(row);
    this.drawerOpen.set(true);
  }

  openAiForRecord(record: RecordRow): void {
    const parts = record.name.split('–').map((s) => s.trim());
    const fullName = parts[0] || record.name;
    const programType = parts[1] || 'Kilo Yönetimi';
    this.dietState.selectClientForAi({
      id: record.id,
      fullName,
      clinicBranch: record.location,
      programType,
      age: 32,
      gender: 'female',
      heightCm: 165,
      currentWeightKg: 68,
      targetWeightKg: 60,
      status: record.status === 'active' ? 'active' : 'pending',
      allergies: [],
      clinicalDiagnoses: [],
      createdAt: '2026-10-15',
      updatedAt: record.updated,
    });
    this.closeDrawer();
    void this.router.navigateByUrl('/ai-nutripilot');
  }

  openWhatsAppForRecord(record: RecordRow): void {
    const fullName = record.name.split('–')[0].trim();
    const text = `Merhaba ${fullName}, Odivon Klinik Diyetisyeniniz olarak haftalık beslenme takibiniz ve seansınız için iletişime geçiyorum.`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  }

  sendConsultationReminder(session: ConsultationSession): void {
    const clean = session.phone.replace(/\D/g, '');
    const phone = clean.startsWith('0') ? `90${clean.slice(1)}` : clean.length === 10 ? `90${clean}` : clean;
    const text = `Merhaba ${session.clientName}, ${session.timeText} planlanan ${session.channel === 'online' ? 'Online Zoom' : 'Klinik'} diyetisyen takip seansımızı hatırlatmak isteriz. Görüşmek üzere! 💚`;
    window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`, '_blank');
  }

  sendPlanViaWhatsApp(plan: PlanItem): void {
    const text = `🥗 *ODİVON BESLENME PLANI*\n👤 *Danışan:* ${plan.clientName}\n📋 *Plan:* ${plan.title}\n🔥 *Hedef Kalori:* ${plan.calories} kcal\n📊 *Makrolar:* ${plan.proteinGrams}g Protein | ${plan.carbGrams}g Karb | ${plan.fatGrams}g Yağ\n\nBeslenme planınız aktif edilmiştir, afiyet ve şifa olsun! ✨`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  }

  loadAiForPlan(plan: PlanItem): void {
    this.dietState.selectClientForAi({
      id: plan.id,
      fullName: plan.clientName,
      clinicBranch: plan.clinicBranch,
      programType: plan.dietType,
      age: 30,
      gender: 'female',
      heightCm: 166,
      currentWeightKg: 67,
      targetWeightKg: 60,
      status: 'active',
      allergies: [],
      clinicalDiagnoses: [],
      createdAt: '2026-10-20',
      updatedAt: '2026-11-08',
    });
    void this.router.navigateByUrl('/ai-nutripilot');
  }

  printReport(): void {
    window.print();
  }

  shareReportViaWhatsApp(report: ProgressReportCard): void {
    const text = `🏆 *ODİVON KLİNİK GELİŞİM RAPORU*\n👤 *Danışan:* ${report.clientName}\n⏱️ *Süre:* ${report.programDuration}\n⚖️ *Sonuç:* ${report.totalWeightLossText} (${report.waistLossText})\n🎯 *Uyum Skoru:* %${report.compliancePct}\n💡 *Klinik Değerlendirme:* ${report.clinicalImpact}\n\nTebrikler, sağlıklı ve sürdürülebilir bir başarı elde ettik! 🌟`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
    this.selectedRecord.set(null);
    this.resetDraft();
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.evidenceFiles.set(Array.from(input.files ?? []).map((file) => file.name));
  }

  handleDrawerSubmit(): void {
    const selected = this.selectedRecord();
    if (selected) {
      this.draftModel.update((value) => ({
        ...value,
        name: selected.name,
        code: selected.code,
        location: selected.location,
        status: selected.status,
      }));
      this.selectedRecord.set(null);
      return;
    }
    submit(this.draftForm, async () => {
      const value = this.draftModel();
      const newRow: RecordRow = {
        id: Date.now(),
        name: value.name,
        code: value.code,
        location: value.location,
        status: value.status === 'active' ? 'active' : 'pending',
        updated: new Date().toLocaleDateString('tr-TR'),
        archived: false,
      };
      this.rows.update((rows) => [newRow, ...rows]);

      // Save to MainAPI
      this.dietApi
        .saveClient({
          fullName: value.name,
          clinicBranch: value.location,
          programType: value.category,
          status: value.status === 'active' ? 'active' : 'pending',
        })
        .subscribe();

      this.closeDrawer();
    });
  }

  private resetDraft(): void {
    this.evidenceFiles.set([]);
    this.draftModel.set({
      name: '',
      code: `${PRODUCT.key.toUpperCase()}-${Date.now().toString().slice(-6)}`,
      category: this.formLabels.categories[0],
      location: '',
      department: '',
      primaryValue: '',
      secondaryValue: '',
      manufacturer: '',
      serialNumber: '',
      owner: '',
      dueDate: '',
      priority: 'normal',
      status: 'draft',
      reference: '',
      notes: '',
    });
    this.draftForm().reset();
  }

  private resolveFormLabels(): DomainFormLabels {
    const key = `${PRODUCT.key}:${this.domain.key}`;
    const labels: Record<string, DomainFormLabels> = {
      'diet:clients': {
        primaryLabel: 'Danışan numarası / hedef',
        primaryPlaceholder: 'Örn. CL-2048 · performans artışı',
        secondaryLabel: 'Klinik not / hassasiyet',
        secondaryPlaceholder: 'Örn. laktoz intoleransı',
        categoryLabel: 'Program türü',
        categories: ['Kilo yönetimi', 'Sporcu beslenmesi', 'Klinik beslenme', 'Koruyucu sağlık'],
      },
      'diet:plans': {
        primaryLabel: 'Enerji ve makro hedefi',
        primaryPlaceholder: 'Örn. 2100 kcal · P150/K220/Y70',
        secondaryLabel: 'Plan dönemi / öğün düzeni',
        secondaryPlaceholder: 'Örn. 4 hafta · 3+2 öğün',
        categoryLabel: 'Plan durumu',
        categories: ['Taslak', 'Danışan onayında', 'Aktif', 'Revizyon gerekli'],
      },
      'diet:measurements': {
        primaryLabel: 'Ölçüm ve birim',
        primaryPlaceholder: 'Örn. vücut ağırlığı · 78,4 kg',
        secondaryLabel: 'Ölçüm yöntemi / koşulu',
        secondaryPlaceholder: 'Örn. BIA · açlık',
        categoryLabel: 'Ölçüm grubu',
        categories: ['Antropometri', 'Vücut kompozisyonu', 'Laboratuvar', 'Performans'],
      },
      'diet:consultations': {
        primaryLabel: 'Görüşme türü ve bulgu',
        primaryPlaceholder: 'Örn. haftalık takip · açlık kontrolü iyi',
        secondaryLabel: 'Sonraki aksiyon',
        secondaryPlaceholder: 'Örn. akşam ara öğününü güncelle',
        categoryLabel: 'Görüşme kanalı',
        categories: ['Klinik', 'Video görüşme', 'Telefon', 'Mesaj takibi'],
      },
      'diet:reports': {
        primaryLabel: 'Rapor dönemi / sonuç',
        primaryPlaceholder: 'Örn. Ekim 2026 · hedefin %82’si',
        secondaryLabel: 'Paylaşım kapsamı',
        secondaryPlaceholder: 'Örn. danışan ve hekim',
        categoryLabel: 'Rapor türü',
        categories: ['İlerleme raporu', 'Klinik özet', 'Program sonu', 'Kurumsal rapor'],
      },
      'diet:ai-nutripilot': {
        primaryLabel: 'Klinik hedef / algoritma',
        primaryPlaceholder: 'Örn. İnsülin direnci menü optimizasyonu',
        secondaryLabel: 'Biyobelirteç eşleşmesi',
        secondaryPlaceholder: 'Örn. Ferritin & D vitamini',
        categoryLabel: 'Analiz türü',
        categories: [
          'Menü optimizasyonu',
          'Biyobelirteç analizi',
          'Kaçamak telafisi',
          'Seans özeti',
        ],
      },
      'diet:client-portal': {
        primaryLabel: 'Danışan / Hedef',
        primaryPlaceholder: 'Örn. Elif Kaya · PCOS Programı',
        secondaryLabel: 'Mobil Erişim Durumu',
        secondaryPlaceholder: 'Örn. Canlı mobil erişim',
        categoryLabel: 'Portal Durumu',
        categories: ['Aktif', 'Davet Gönderildi', 'Beklemede'],
      },
    };
    return (
      labels[key] ?? {
        primaryLabel: 'Teknik değer',
        primaryPlaceholder: 'Değer girin',
        secondaryLabel: 'İkincil değer',
        secondaryPlaceholder: 'Ek bilgi',
        categoryLabel: 'Kategori',
        categories: ['Genel'],
      }
    );
  }

  private seedRows(): RecordRow[] {
    const names = [
      'Elif Kaya – Ketojenik & PCOS Programı',
      'Mert Yıldız – Sporcu Beslenmesi & Hipertrofi',
      'Selin Aras – İnsülin Direnci & Kilo Yönetimi',
      'Arşiv Danışan Kaydı – DT-104',
    ];
    return names.map((name, index) => ({
      id: index + 1,
      name,
      code: `${PRODUCT.key.toUpperCase()}-${1001 + index}`,
      location: [
        'Levent Klinik / Yüz Yüze',
        'Bağdat Caddesi Şube',
        'Online Seans / Zoom',
        'Arşiv / Tamamlanan Danışan',
      ][index],
      status: index === 1 ? 'pending' : 'active',
      updated: ['08.11.2026', '06.11.2026', '04.11.2026', '12.09.2026'][index],
      archived: index === 3,
    }));
  }
}
