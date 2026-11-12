import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { email, FormField, form, minLength, required, submit } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  AuthStore,
  EmailNotVerifiedError,
  PortalAccessError,
  VerificationError,
} from '../../core/auth/auth-store';
import { Notify } from '../../core/notify/notify';
import { ThemeStore } from '../../core/theme/theme-store';
import { PRODUCT } from '../../domain/product-manifest';
import { VersionBadge } from '../../shared/ui/version-badge';

interface DemoSpecialistProfile {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly practice: string;
  readonly specialty: string;
  readonly licenseNo: string;
  readonly workspaceMode: string;
}

interface DemoMemberProfile {
  readonly clientId: string;
  readonly name: string;
  readonly email: string;
  readonly programLabel: string;
  readonly metricNote: string;
}

const SPECIALIST_PROFILES: readonly DemoSpecialistProfile[] = [
  {
    id: 'sp-1',
    name: 'Uzm. Dyt. Deniz Arslan',
    email: 'deniz.arslan@odivon.com',
    practice: 'Odivon Nişantaşı Klinik Beslenme Merkezi',
    specialty: 'Obezite & Metabolik Beslenme',
    licenseNo: 'TR-DYT-10482',
    workspaceMode: 'Klinik + Online Hibrit',
  },
  {
    id: 'sp-2',
    name: 'Uzm. Dyt. Emre Karaca',
    email: 'emre.karaca@odivon.com',
    practice: 'Odivon Atletik Performans & Sporcu Kliniği',
    specialty: 'Sporcu & Performans Beslenmesi',
    licenseNo: 'TR-DYT-20914',
    workspaceMode: 'Spor Kulübü & Klinik',
  },
  {
    id: 'sp-3',
    name: 'Dr. Dyt. Selin Soylu',
    email: 'selin.soylu@odivon.com',
    practice: 'Odivon Endokrin & Diyabet Polikliniği',
    specialty: 'Endokrin, Diyabet & İnsülin Direnci',
    licenseNo: 'TR-DYT-33105',
    workspaceMode: 'Tıp Merkezi Polikliniği',
  },
];

const MEMBER_PROFILES: readonly DemoMemberProfile[] = [
  {
    clientId: 'c-1',
    name: 'Elif Kaya',
    email: 'elif.kaya@ornek.com',
    programLabel: 'Kilo verme · Faz 2 (1650 kcal)',
    metricNote: '74,6 kg → Hedef 66 kg · İnsülin direnci',
  },
  {
    clientId: 'c-2',
    name: 'Burak Demir',
    email: 'burak.demir@ornek.com',
    programLabel: 'Düşük Gİ Planı (1900 kcal)',
    metricNote: '95,9 kg → Hedef 86 kg · Prediyabet',
  },
  {
    clientId: 'c-4',
    name: 'Mert Yılmaz',
    email: 'mert.yilmaz@ornek.com',
    programLabel: 'Sporcu Performans (3100 kcal)',
    metricNote: '81,5 kg · Yarı maraton hazırlığı',
  },
];

@Component({
  selector: 'app-auth-page',
  imports: [FormField, FormsModule, RouterLink, VersionBadge],
  template: `
    <main
      class="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-[#070b16] dark:text-white lg:grid lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)] lg:p-3"
    >
      <!-- Sol: marka ve ürün vitrini -->
      <section
        class="relative hidden overflow-hidden rounded-[1.75rem] bg-[#0c0820] text-white lg:flex lg:flex-col"
        aria-label="OdivonDiet tanıtım"
      >
        <div class="pointer-events-none absolute inset-0" aria-hidden="true">
          <div
            class="absolute -end-40 -top-48 size-[36rem] rounded-full bg-violet-600/35 blur-[110px]"
          ></div>
          <div
            class="absolute -bottom-48 -start-32 size-[32rem] rounded-full bg-emerald-500/20 blur-[110px]"
          ></div>
          <div
            class="absolute end-1/4 top-1/2 size-72 rounded-full bg-indigo-500/20 blur-[90px]"
          ></div>
          <div
            class="absolute inset-0 opacity-[.35] [background-image:radial-gradient(rgb(255_255_255/.14)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_75%)]"
          ></div>
        </div>

        <div class="relative flex items-center justify-between px-12 pt-10 xl:px-14">
          <div class="flex items-center gap-3">
            <span
              class="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/40 ring-1 ring-white/20"
            >
              <span class="material-symbols-rounded icon-fill" aria-hidden="true">nutrition</span>
            </span>
            <strong class="text-lg font-extrabold tracking-tight">{{ product.name }}</strong>
          </div>
          <span
            class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.06] px-3 py-1.5 text-[11px] font-bold text-slate-200 backdrop-blur"
          >
            <span
              class="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px] shadow-emerald-400"
            ></span>
            Klinik Beslenme & Menü Mühendisliği
          </span>
        </div>

        <div class="relative flex flex-1 flex-col justify-center px-12 py-10 xl:px-14">
          <h1
            class="max-w-xl text-[2.6rem] font-extrabold leading-[1.08] tracking-tight xl:text-[3.1rem]"
          >
            Kişiye özel beslenmeyi
            <span
              class="bg-gradient-to-r from-violet-300 via-fuchsia-200 to-emerald-300 bg-clip-text text-transparent"
              >ölçülebilir başarıya</span
            >
            dönüştürün.
          </h1>
          <p class="mt-5 max-w-lg text-[15px] leading-7 text-slate-300">
            Danışan antropometrisi, BeBis değişim gruplu besin ve yemek kütüphanesi, Atwater kalori
            hesaplama motoru ve öğün bazlı diyet programı tasarımı tek klinik platformda.
          </p>

          <!-- Ürün önizlemesi -->
          <div
            class="relative mt-10 h-[20.5rem] max-w-xl [@media(max-height:860px)]:hidden"
            aria-hidden="true"
          >
            <div
              class="absolute inset-x-0 top-0 me-12 rounded-2xl border border-white/10 bg-white/[.07] p-5 shadow-2xl shadow-black/40 backdrop-blur-xl"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <span
                    class="grid size-9 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-xs font-bold"
                    >EK</span
                  >
                  <div>
                    <strong class="block text-sm">Elif K. · Faz 2 Diyet Analizi</strong>
                    <span class="text-xs text-slate-400"
                      >Mifflin BMR: 1468 kcal · TDEE: 2019 kcal</span
                    >
                  </div>
                </div>
                <span
                  class="rounded-full bg-emerald-400/15 px-2.5 py-1 text-xs font-bold text-emerald-300"
                  >−7,4 kg</span
                >
              </div>
              <svg viewBox="0 0 300 70" class="mt-4 h-16 w-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="hero-fill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stop-color="#a78bfa" stop-opacity=".4" />
                    <stop offset="100%" stop-color="#a78bfa" stop-opacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,10 C40,14 60,20 100,25 S170,34 200,39 S260,50 300,54 L300,70 L0,70 Z"
                  fill="url(#hero-fill)"
                />
                <path
                  d="M0,10 C40,14 60,20 100,25 S170,34 200,39 S260,50 300,54"
                  fill="none"
                  stroke="#a78bfa"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  vector-effect="non-scaling-stroke"
                />
                <line
                  x1="0"
                  x2="300"
                  y1="62"
                  y2="62"
                  stroke="#34d399"
                  stroke-dasharray="4 4"
                  vector-effect="non-scaling-stroke"
                />
              </svg>
              <div class="mt-3 grid grid-cols-3 gap-2.5 text-center text-xs">
                <div class="rounded-xl bg-white/[.06] py-2">
                  <strong class="block text-base">24,9</strong
                  ><span class="text-slate-400">BKİ</span>
                </div>
                <div class="rounded-xl bg-white/[.06] py-2">
                  <strong class="block text-base">1650</strong
                  ><span class="text-slate-400">kcal / gün</span>
                </div>
                <div class="rounded-xl bg-white/[.06] py-2">
                  <strong class="block text-base">1,6 g/kg</strong
                  ><span class="text-slate-400">protein</span>
                </div>
              </div>
            </div>

            <div
              class="absolute bottom-0 end-0 flex w-[21rem] items-start gap-3 rounded-2xl border border-white/10 bg-[#17112f]/95 p-3.5 shadow-2xl shadow-black/50 backdrop-blur-xl"
            >
              <span
                class="grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-md shadow-fuchsia-500/30"
              >
                <span class="material-symbols-rounded icon-fill !text-base">calculate</span>
              </span>
              <p class="m-0 text-xs leading-5 text-slate-300">
                <strong class="block text-[11px] text-violet-200">Atwater & BeBis Motoru</strong>
                Öğünlere eklenen yemeklerden <strong class="text-white">kalori, lif ve makro</strong>
                değerleri otomatik hesaplanır.
              </p>
            </div>
          </div>
        </div>

        <div class="relative px-12 pb-10 xl:px-14">
          <div class="grid grid-cols-3 gap-3">
            <div
              class="rounded-2xl border border-white/10 bg-white/[.05] px-4 py-3.5 backdrop-blur"
            >
              <div class="flex items-center gap-2">
                <span class="material-symbols-rounded !text-lg text-violet-300" aria-hidden="true"
                  >grocery</span
                ><strong class="text-xl font-extrabold">BeBis</strong>
              </div>
              <span class="mt-1 block text-xs text-slate-400">Besin & tarif kütüphanesi</span>
            </div>
            <div
              class="rounded-2xl border border-white/10 bg-white/[.05] px-4 py-3.5 backdrop-blur"
            >
              <div class="flex items-center gap-2">
                <span class="material-symbols-rounded !text-lg text-sky-300" aria-hidden="true"
                  >calculate</span
                ><strong class="text-xl font-extrabold">Atwater</strong>
              </div>
              <span class="mt-1 block text-xs text-slate-400">Otomatik kcal & g/kg</span>
            </div>
            <div
              class="rounded-2xl border border-white/10 bg-white/[.05] px-4 py-3.5 backdrop-blur"
            >
              <div class="flex items-center gap-2">
                <span class="material-symbols-rounded !text-lg text-emerald-300" aria-hidden="true"
                  >shield_lock</span
                ><strong class="text-xl font-extrabold">%100</strong>
              </div>
              <span class="mt-1 block text-xs text-slate-400">KVKK & klinik onay</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Sağ: form -->
      <section class="relative flex min-h-screen flex-col lg:min-h-0">
        <div
          class="pointer-events-none absolute -end-24 -top-24 size-72 rounded-full bg-violet-400/15 blur-3xl lg:hidden"
          aria-hidden="true"
        ></div>
        <div
          class="relative flex items-center justify-between px-5 pt-5 sm:px-8 lg:justify-end lg:pt-7"
        >
          <div class="flex items-center gap-2.5 lg:hidden">
            <span
              class="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md shadow-violet-500/30"
            >
              <span class="material-symbols-rounded icon-fill !text-xl" aria-hidden="true"
                >nutrition</span
              >
            </span>
            <strong class="text-lg font-extrabold">{{ product.name }}</strong>
          </div>
          <button
            type="button"
            class="odv-icon-btn"
            (click)="theme.toggle()"
            [attr.aria-label]="theme.dark() ? 'Açık temaya geç' : 'Koyu temaya geç'"
          >
            <span class="material-symbols-rounded">{{
              theme.dark() ? 'light_mode' : 'dark_mode'
            }}</span>
          </button>
        </div>

        <div class="relative flex flex-1 items-center justify-center px-5 py-8 sm:px-8 lg:py-4">
          <div class="w-full max-w-[28rem] animate-fade-up">
            @if (isVerify) {
              <span
                class="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/30"
              >
                <span class="material-symbols-rounded icon-fill !text-3xl" aria-hidden="true">{{
                  linkState() === 'done' ? 'mark_email_read' : 'mark_email_unread'
                }}</span>
              </span>
              <h2 class="mt-6 text-[1.75rem] font-extrabold leading-tight tracking-tight">
                {{ linkState() === 'done' ? 'E-postanız doğrulandı' : 'E-postanızı doğrulayın' }}
              </h2>
              @if (linkState() === 'checking') {
                <p class="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400" role="status">
                  Doğrulama bağlantınız kontrol ediliyor…
                </p>
              } @else if (linkState() === 'done') {
                <p class="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400" role="status">
                  Hesabınız etkinleştirildi. Devam etmek için giriş yapın.
                </p>
                <a class="odv-btn-primary !min-h-12 mt-8 w-full !text-sm" routerLink="/login"
                  >Giriş yap</a
                >
              } @else if (pending(); as p) {
                <p class="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  <strong class="text-slate-800 dark:text-white">{{ p.email }}</strong>
                  adresine
                  {{
                    p.demo
                      ? '6 haneli bir doğrulama kodu gönderdik. Hesabınız kod girilene kadar etkin olmaz.'
                      : 'bir doğrulama bağlantısı gönderdik. Bağlantıya tıklayana kadar hesabınız etkin olmaz.'
                  }}
                </p>

                @if (p.demo) {
                  <div
                    class="mt-6 flex items-start gap-2.5 rounded-xl border border-violet-200 bg-violet-50 p-3 text-xs leading-5 text-violet-800 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-200"
                  >
                    <span class="material-symbols-rounded !text-base" aria-hidden="true">info</span>
                    <span
                      >Demo modunda gerçek e-posta gönderilmez. Doğrulama kodunuz:
                      <strong class="font-mono text-sm tracking-[.2em]">{{ p.code }}</strong></span
                    >
                  </div>
                  <form class="mt-6 space-y-4" (submit)="onVerifyCode($event)" novalidate>
                    <label class="block">
                      <span class="odv-label">Doğrulama kodu</span>
                      <input
                        class="odv-input !py-3 text-center font-mono !text-lg tracking-[.5em]"
                        inputmode="numeric"
                        autocomplete="one-time-code"
                        maxlength="6"
                        placeholder="••••••"
                        [value]="code()"
                        (input)="onCodeInput($event)"
                      />
                    </label>
                    @if (error()) {
                      <div role="alert" class="odv-auth-alert">
                        <span class="material-symbols-rounded !text-base" aria-hidden="true"
                          >error</span
                        >
                        {{ error() }}
                      </div>
                    }
                    <button
                      class="odv-btn-primary !min-h-12 w-full !text-sm"
                      type="submit"
                      [disabled]="code().length !== 6"
                    >
                      Doğrula ve devam et
                    </button>
                  </form>
                } @else {
                  <ol
                    class="mt-6 space-y-2.5 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                  >
                    <li class="flex gap-2.5">
                      <span
                        class="material-symbols-rounded !text-lg text-violet-500"
                        aria-hidden="true"
                        >inbox</span
                      >
                      Gelen kutunuzu (ve gereksiz klasörünü) açın.
                    </li>
                    <li class="flex gap-2.5">
                      <span
                        class="material-symbols-rounded !text-lg text-violet-500"
                        aria-hidden="true"
                        >link</span
                      >
                      OdivonDiet doğrulama bağlantısına tıklayın.
                    </li>
                    <li class="flex gap-2.5">
                      <span
                        class="material-symbols-rounded !text-lg text-violet-500"
                        aria-hidden="true"
                        >task_alt</span
                      >
                      Bu sayfaya dönüp devam edin.
                    </li>
                  </ol>
                  @if (error()) {
                    <div role="alert" class="odv-auth-alert mt-4">
                      <span class="material-symbols-rounded !text-base" aria-hidden="true"
                        >error</span
                      >
                      {{ error() }}
                    </div>
                  }
                  <button
                    class="odv-btn-primary !min-h-12 mt-6 w-full !text-sm"
                    type="button"
                    [disabled]="busy()"
                    (click)="onConfirmVerified()"
                  >
                    {{ busy() ? 'Kontrol ediliyor…' : 'Doğruladım, devam et' }}
                  </button>
                }

                <button
                  type="button"
                  class="odv-btn-secondary !min-h-12 mt-3 w-full !text-sm dark:!border-slate-800 dark:!bg-slate-900 dark:hover:!bg-slate-800"
                  [disabled]="resendWait() > 0 || busy()"
                  (click)="onResend()"
                >
                  <span class="material-symbols-rounded !text-lg text-violet-500" aria-hidden="true"
                    >forward_to_inbox</span
                  >
                  {{
                    resendWait() > 0
                      ? 'Tekrar gönder (' + resendWait() + ' sn)'
                      : p.demo
                        ? 'Yeni kod gönder'
                        : 'Bağlantıyı tekrar gönder'
                  }}
                </button>
                <p class="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
                  Yanlış adres mi?
                  <button
                    type="button"
                    class="font-bold text-violet-600 hover:underline dark:text-violet-400"
                    (click)="onChangeEmail()"
                  >
                    Farklı e-postayla kaydol
                  </button>
                </p>
              } @else {
                @if (error()) {
                  <div role="alert" class="odv-auth-alert mt-4">
                    <span class="material-symbols-rounded !text-base" aria-hidden="true"
                      >error</span
                    >
                    {{ error() }}
                  </div>
                } @else {
                  <p class="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    Doğrulama bekleyen bir kayıt bulunamadı.
                  </p>
                }
                <a class="odv-btn-primary !min-h-12 mt-8 w-full !text-sm" routerLink="/login"
                  >Giriş sayfasına dön</a
                >
              }
            } @else {
              @if (!isRegister) {
                <nav
                  class="mb-6 grid grid-cols-2 rounded-xl border border-slate-200 bg-white p-1 text-sm font-bold shadow-sm dark:border-slate-800 dark:bg-slate-900"
                  aria-label="Giriş türü"
                >
                  <a
                    routerLink="/login"
                    class="flex items-center justify-center gap-1.5 rounded-lg py-2 transition-colors"
                    [class]="
                      isMember
                        ? 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                        : 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200'
                    "
                    [attr.aria-current]="isMember ? null : 'page'"
                    ><span class="material-symbols-rounded !text-lg" aria-hidden="true"
                      >stethoscope</span
                    >Diyetisyen / Uzman</a
                  >
                  <a
                    routerLink="/portal/login"
                    class="flex items-center justify-center gap-1.5 rounded-lg py-2 transition-colors"
                    [class]="
                      isMember
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                    "
                    [attr.aria-current]="isMember ? 'page' : null"
                    ><span class="material-symbols-rounded !text-lg" aria-hidden="true"
                      >favorite</span
                    >Danışan Portalı</a
                  >
                </nav>
              }

              <h2 class="text-[1.65rem] font-extrabold leading-tight tracking-tight">
                {{
                  isRegister
                    ? 'Klinik uzman hesabınızı oluşturun'
                    : isMember
                      ? 'Danışan Beslenme & Takip Portalı'
                      : 'Diyetisyen Klinik Çalışma Alanı'
                }}
              </h2>
              <p class="mt-1.5 text-sm leading-6 text-slate-500 dark:text-slate-400">
                {{
                  isRegister
                    ? 'Uzmanlık branşınızı, sicil bilginizi ve muayenehanenizi tanımlayarak başlayın.'
                    : isMember
                      ? 'Günlük öğün programınızı, kalori/makro dağılımınızı, ölçümlerinizi ve uzman mesajlarınızı takip edin.'
                      : 'Danışan antropometrisi, besin kütüphanesi ve kalori hesaplamalı diyet stüdyosuna erişin.'
                }}
              </p>

              <form class="mt-6 space-y-3.5" (submit)="onSubmit($event)" novalidate>
                @if (isRegister) {
                  <div class="grid gap-3 sm:grid-cols-[9rem_1fr]">
                    <label class="block">
                      <span class="odv-label">Unvan</span>
                      <select
                        class="odv-input !py-2.5"
                        [ngModel]="specialistTitle()"
                        (ngModelChange)="specialistTitle.set($event)"
                        [ngModelOptions]="{ standalone: true }"
                      >
                        <option value="Dyt.">Dyt.</option>
                        <option value="Uzm. Dyt.">Uzm. Dyt.</option>
                        <option value="Dr. Dyt.">Dr. Dyt.</option>
                        <option value="Doç. Dr.">Doç. Dr.</option>
                        <option value="Prof. Dr.">Prof. Dr.</option>
                      </select>
                    </label>
                    <label class="block">
                      <span class="odv-label">Ad soyad</span>
                      <span class="relative block">
                        <span
                          class="material-symbols-rounded pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 !text-lg text-slate-400"
                          aria-hidden="true"
                          >person</span
                        >
                        <input
                          class="odv-input !py-2.5 ps-10"
                          [formField]="authForm.name"
                          autocomplete="name"
                          placeholder="Deniz Arslan"
                        />
                      </span>
                      @if (authForm.name().touched() && authForm.name().invalid()) {
                        <span class="odv-error">Ad soyad zorunludur.</span>
                      }
                    </label>
                  </div>

                  <div class="grid gap-3 sm:grid-cols-2">
                    <label class="block">
                      <span class="odv-label">Klinik uzmanlık branşı</span>
                      <select
                        class="odv-input !py-2.5"
                        [ngModel]="specialty()"
                        (ngModelChange)="specialty.set($event)"
                        [ngModelOptions]="{ standalone: true }"
                      >
                        <option value="Obezite & Metabolik Beslenme">
                          Obezite & Metabolik Beslenme
                        </option>
                        <option value="Sporcu & Performans Beslenmesi">
                          Sporcu & Performans Beslenmesi
                        </option>
                        <option value="Endokrin & Diyabet Beslenmesi">
                          Endokrin & Diyabet Beslenmesi
                        </option>
                        <option value="Gastroenteroloji & Eliminasyon">
                          Gastroenteroloji & Eliminasyon
                        </option>
                        <option value="Anne-Çocuk & Gebelik Beslenmesi">
                          Anne-Çocuk & Gebelik Beslenmesi
                        </option>
                      </select>
                    </label>
                    <label class="block">
                      <span class="odv-label">TDD / Bakanlık Sicil No</span>
                      <input
                        class="odv-input !py-2.5"
                        [ngModel]="licenseNo()"
                        (ngModelChange)="licenseNo.set($event)"
                        [ngModelOptions]="{ standalone: true }"
                        placeholder="TR-DYT-10482"
                      />
                    </label>
                  </div>

                  <div class="grid gap-3 sm:grid-cols-2">
                    <label class="block">
                      <span class="odv-label">Muayenehane / klinik adı</span>
                      <span class="relative block">
                        <span
                          class="material-symbols-rounded pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 !text-lg text-slate-400"
                          aria-hidden="true"
                          >apartment</span
                        >
                        <input
                          class="odv-input !py-2.5 ps-10"
                          [formField]="authForm.company"
                          autocomplete="organization"
                          placeholder="Örn. Nişantaşı Beslenme Kliniği"
                        />
                      </span>
                    </label>
                    <label class="block">
                      <span class="odv-label">Çalışma modeli</span>
                      <select
                        class="odv-input !py-2.5"
                        [ngModel]="workspaceMode()"
                        (ngModelChange)="workspaceMode.set($event)"
                        [ngModelOptions]="{ standalone: true }"
                      >
                        <option value="Klinik + Online Hibrit">Klinik + Online Hibrit</option>
                        <option value="Yüz Yüze Muayenehane">Yüz Yüze Muayenehane</option>
                        <option value="Online Beslenme Danışmanlığı">
                          Online Beslenme Danışmanlığı
                        </option>
                        <option value="Hastane / Tıp Merkezi Polikliniği">
                          Hastane / Tıp Merkezi Polikliniği
                        </option>
                      </select>
                    </label>
                  </div>
                }

                <label class="block">
                  <span class="odv-label">E-posta</span>
                  <span class="relative block">
                    <span
                      class="material-symbols-rounded pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 !text-lg text-slate-400"
                      aria-hidden="true"
                      >mail</span
                    >
                    <input
                      class="odv-input !py-2.5 ps-10"
                      type="email"
                      [formField]="authForm.email"
                      autocomplete="email"
                      [placeholder]="isMember ? 'elif.kaya@ornek.com' : 'uzman@klinik.com'"
                    />
                  </span>
                  @if (authForm.email().touched() && authForm.email().invalid()) {
                    <span class="odv-error">Geçerli bir e-posta girin.</span>
                  }
                </label>

                <label class="block">
                  <span class="odv-label">Şifre</span>
                  <span class="relative block">
                    <span
                      class="material-symbols-rounded pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 !text-lg text-slate-400"
                      aria-hidden="true"
                      >lock</span
                    >
                    <input
                      class="odv-input !py-2.5 ps-10 pe-12"
                      [type]="showPassword() ? 'text' : 'password'"
                      [formField]="authForm.password"
                      [autocomplete]="isRegister ? 'new-password' : 'current-password'"
                      placeholder="En az 8 karakter"
                    />
                    <button
                      class="odv-icon-btn absolute end-1 top-1/2 !size-9 -translate-y-1/2"
                      type="button"
                      (click)="showPassword.update((v) => !v)"
                      [attr.aria-label]="showPassword() ? 'Şifreyi gizle' : 'Şifreyi göster'"
                    >
                      <span class="material-symbols-rounded !text-lg">{{
                        showPassword() ? 'visibility_off' : 'visibility'
                      }}</span>
                    </button>
                  </span>
                  @if (authForm.password().touched() && authForm.password().invalid()) {
                    <span class="odv-error">Şifre en az 8 karakter olmalıdır.</span>
                  }
                </label>

                @if (error()) {
                  <div
                    role="alert"
                    class="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-300"
                  >
                    <span class="material-symbols-rounded !text-base" aria-hidden="true"
                      >error</span
                    >
                    {{ error() }}
                  </div>
                }

                <button
                  class="odv-btn-primary group !min-h-11 w-full !text-sm"
                  type="submit"
                  [disabled]="busy()"
                >
                  {{ busy() ? 'İşleniyor…' : isRegister ? 'Hesap oluştur' : 'Giriş yap' }}
                  @if (!busy()) {
                    <span
                      class="material-symbols-rounded directional-icon !text-lg transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                      >arrow_forward</span
                    >
                  }
                </button>
              </form>

              <div class="my-6 flex items-center gap-3 text-xs font-semibold text-slate-400">
                <span class="h-px flex-1 bg-slate-200 dark:bg-slate-800"></span>veya<span
                  class="h-px flex-1 bg-slate-200 dark:bg-slate-800"
                ></span>
              </div>

              <button
                type="button"
                class="odv-btn-secondary !min-h-12 w-full !text-sm dark:!border-slate-800 dark:!bg-slate-900 dark:hover:!bg-slate-800"
                (click)="demo()"
              >
                <span class="material-symbols-rounded !text-lg text-violet-500" aria-hidden="true"
                  >play_circle</span
                >{{ isMember ? 'Demo danışan olarak incele' : 'Demo verilerle incele' }}
              </button>

              @if (isMember) {
                <p class="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
                  Portal hesabınızı diyetisyeniniz açar; davet e-postasındaki adresle giriş yapın.
                </p>
              } @else {
                <p class="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
                  {{ isRegister ? 'Zaten hesabınız var mı?' : 'Henüz hesabınız yok mu?' }}
                  <a
                    class="font-bold text-violet-600 hover:underline dark:text-violet-400"
                    [routerLink]="isRegister ? '/login' : '/register'"
                    >{{ isRegister ? 'Giriş yapın' : 'Hesap oluşturun' }}</a
                  >
                </p>
              }
            }
          </div>
        </div>

        <footer
          class="relative flex flex-col items-center gap-2 px-5 pb-6 text-center text-[11px] leading-5 text-slate-400 sm:px-8"
        >
          <p class="m-0 flex items-center gap-1.5">
            <span class="material-symbols-rounded !text-sm" aria-hidden="true">verified_user</span>
            Devam ederek kullanım koşullarını ve aydınlatma metnini kabul etmiş olursunuz.
          </p>
          <odv-version-badge />
        </footer>
      </section>
    </main>
  `,
})
export class AuthPage {
  readonly product = PRODUCT;
  readonly theme = inject(ThemeStore);
  private readonly mode = inject(ActivatedRoute).snapshot.data['mode'] as
    'login' | 'register' | 'member' | 'verify';
  readonly isRegister = this.mode === 'register';
  readonly isVerify = this.mode === 'verify';
  readonly isMember = this.mode === 'member';
  readonly showPassword = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');

  readonly specialistProfiles = SPECIALIST_PROFILES;
  readonly memberProfiles = MEMBER_PROFILES;

  readonly specialistTitle = signal('Uzm. Dyt.');
  readonly specialty = signal('Obezite & Metabolik Beslenme');
  readonly licenseNo = signal('TR-DYT-10482');
  readonly workspaceMode = signal('Klinik + Online Hibrit');

  readonly model = signal({ name: '', company: '', email: '', password: '' });
  readonly authForm = form(this.model, (p) => {
    if (this.isRegister) required(p.name);
    required(p.email);
    email(p.email);
    required(p.password);
    minLength(p.password, 8);
  });
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly notify = inject(Notify);
  private readonly route = inject(ActivatedRoute);
  readonly pending = this.auth.pendingVerification;
  readonly code = signal('');
  readonly resendWait = signal(0);
  /** State of a verification link (`?oobCode=`) opened in this app. */
  readonly linkState = signal<'none' | 'checking' | 'done'>('none');

  constructor() {
    if (!this.isVerify) return;
    this.tickResend();
    const timer = setInterval(() => this.tickResend(), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
    const params = this.route.snapshot.queryParamMap;
    const oobCode = params.get('oobCode');
    if (oobCode && params.get('mode') !== 'resetPassword') void this.applyLink(oobCode);
  }

  private tickResend(): void {
    this.resendWait.set(this.auth.resendWaitSeconds());
  }

  private async applyLink(oobCode: string): Promise<void> {
    this.linkState.set('checking');
    try {
      if (await this.auth.applyVerificationLink(oobCode)) {
        await this.finishVerification();
        return;
      }
      this.linkState.set('done');
    } catch (error) {
      this.linkState.set('none');
      this.error.set(error instanceof VerificationError ? error.message : this.genericError);
    }
  }

  private readonly genericError = 'İşlem tamamlanamadı. Bilgilerinizi kontrol edip tekrar deneyin.';

  onCodeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 6);
    input.value = digits;
    this.code.set(digits);
    this.error.set('');
  }

  async onVerifyCode(event: Event): Promise<void> {
    event.preventDefault();
    try {
      this.auth.verifyCode(this.code());
      await this.finishVerification();
    } catch (error) {
      this.error.set(error instanceof VerificationError ? error.message : this.genericError);
    }
  }

  async onConfirmVerified(): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      await this.auth.confirmVerified();
      await this.finishVerification();
    } catch (error) {
      this.error.set(error instanceof VerificationError ? error.message : this.genericError);
    } finally {
      this.busy.set(false);
    }
  }

  async onResend(): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      await this.auth.resendVerification();
      this.code.set('');
      this.tickResend();
      this.notify.success(
        this.pending()?.demo ? 'Yeni kod oluşturuldu' : 'Doğrulama e-postası gönderildi',
        this.pending()?.email,
      );
    } catch (error) {
      this.error.set(
        error instanceof VerificationError
          ? error.message
          : 'E-posta gönderilemedi. Birkaç dakika sonra tekrar deneyin.',
      );
    } finally {
      this.busy.set(false);
    }
  }

  async onChangeEmail(): Promise<void> {
    this.auth.cancelVerification();
    await this.router.navigateByUrl('/register');
  }

  private async finishVerification(): Promise<void> {
    this.notify.success('E-postanız doğrulandı', 'Hesabınız etkinleştirildi.');
    await this.router.navigateByUrl(this.auth.homePath());
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    submit(this.authForm, async () => {
      this.busy.set(true);
      this.error.set('');
      try {
        const value = this.model();
        if (this.isRegister) {
          const fullName = value.name.trim().startsWith('Dyt') || value.name.trim().startsWith('Uzm') || value.name.trim().startsWith('Dr') || value.name.trim().startsWith('Doç') || value.name.trim().startsWith('Prof')
            ? value.name.trim()
            : `${this.specialistTitle()} ${value.name.trim()}`;
          await this.auth.register(
            fullName,
            value.email,
            value.password,
            value.company.trim(),
            this.specialty(),
            this.licenseNo().trim(),
            this.workspaceMode(),
          );
        } else if (this.isMember) {
          await this.auth.signInMember(value.email, value.password);
        } else {
          await this.auth.signIn(
            value.email,
            value.password,
            this.specialty(),
            this.licenseNo().trim(),
          );
        }
        await this.router.navigateByUrl(this.isRegister ? '/verify-email' : this.auth.homePath());
      } catch (error) {
        if (error instanceof EmailNotVerifiedError) {
          await this.router.navigateByUrl('/verify-email');
          return;
        }
        this.error.set(error instanceof PortalAccessError ? error.message : this.genericError);
      } finally {
        this.busy.set(false);
      }
    });
  }

  async demo(): Promise<void> {
    if (this.isMember) await this.auth.continueMemberDemo();
    else this.auth.continueDemo();
    await this.router.navigateByUrl(this.auth.homePath());
  }

  async demoSpecialist(profile: DemoSpecialistProfile): Promise<void> {
    this.auth.continueDemo(profile);
    await this.router.navigateByUrl(this.auth.homePath());
  }

  async demoMember(clientId: string): Promise<void> {
    await this.auth.continueMemberDemo(clientId);
    await this.router.navigateByUrl(this.auth.homePath());
  }
}
