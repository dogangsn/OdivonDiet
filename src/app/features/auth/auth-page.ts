import { Component, inject, signal } from '@angular/core';
import { email, FormField, form, minLength, required, submit } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthStore } from '../../core/auth/auth-store';
import { PRODUCT } from '../../domain/product-manifest';

@Component({
  selector: 'app-auth-page',
  imports: [FormField, RouterLink],
  template: `
    <main
      class="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0b1120] dark:text-white lg:grid lg:grid-cols-[1.05fr_.95fr]"
    >
      <section
        class="relative hidden overflow-hidden bg-[#0f0a24] p-12 text-white lg:flex lg:flex-col lg:justify-between"
      >
        <div
          class="pointer-events-none absolute -end-32 -top-32 size-[28rem] rounded-full bg-violet-600/30 blur-3xl"
        ></div>
        <div
          class="pointer-events-none absolute -bottom-40 -start-20 size-[26rem] rounded-full bg-emerald-500/20 blur-3xl"
        ></div>

        <div class="relative flex items-center gap-3">
          <span
            class="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/30"
          >
            <span class="material-symbols-rounded icon-fill">nutrition</span>
          </span>
          <strong class="text-lg font-extrabold tracking-tight">{{ product.name }}</strong>
        </div>

        <div class="relative max-w-xl">
          <h1 class="text-[2.75rem] font-extrabold leading-[1.1] tracking-tight">
            Danışanlarınızın ilerlemesini<br />
            <span
              class="bg-gradient-to-r from-violet-300 to-emerald-300 bg-clip-text text-transparent"
              >tek ekranda</span
            >
            yönetin.
          </h1>
          <p class="mt-5 text-base leading-7 text-slate-300">
            Danışan profili, beslenme planı, ölçüm ve takip görüşmeleri tek akışta. BKİ, bazal
            metabolizma ve günlük enerji ihtiyacı otomatik hesaplanır.
          </p>

          <div class="mt-10 rounded-2xl border border-white/10 bg-white/[.06] p-5 backdrop-blur">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span
                  class="grid size-9 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-xs font-bold"
                  >EK</span
                >
                <div>
                  <strong class="block text-sm">Elif K.</strong>
                  <span class="text-xs text-slate-400">Kilo verme · 12. hafta</span>
                </div>
              </div>
              <span
                class="rounded-full bg-emerald-400/15 px-2.5 py-1 text-xs font-bold text-emerald-300"
                >−7,4 kg</span
              >
            </div>
            <svg viewBox="0 0 300 70" class="mt-4 h-16 w-full" aria-hidden="true">
              <defs>
                <linearGradient id="hero-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stop-color="#a78bfa" stop-opacity=".35" />
                  <stop offset="100%" stop-color="#a78bfa" stop-opacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0,12 L50,18 L100,26 L150,33 L200,38 L250,48 L300,54 L300,70 L0,70 Z"
                fill="url(#hero-fill)"
              />
              <path
                d="M0,12 L50,18 L100,26 L150,33 L200,38 L250,48 L300,54"
                fill="none"
                stroke="#a78bfa"
                stroke-width="2.5"
                stroke-linecap="round"
              />
              <line x1="0" x2="300" y1="62" y2="62" stroke="#34d399" stroke-dasharray="4 4" />
            </svg>
            <div class="mt-3 grid grid-cols-3 gap-3 text-center text-xs">
              <div class="rounded-xl bg-white/5 py-2">
                <strong class="block text-base">24,9</strong><span class="text-slate-400">BKİ</span>
              </div>
              <div class="rounded-xl bg-white/5 py-2">
                <strong class="block text-base">1650</strong
                ><span class="text-slate-400">kcal / gün</span>
              </div>
              <div class="rounded-xl bg-white/5 py-2">
                <strong class="block text-base">%61</strong
                ><span class="text-slate-400">hedefe</span>
              </div>
            </div>
          </div>
        </div>

        <p class="relative flex items-center gap-2 text-xs text-slate-400">
          <span class="material-symbols-rounded !text-base">shield_lock</span>Sağlık verileri KVKK
          uyumlu, şifreli bağlantıyla saklanır.
        </p>
      </section>

      <section class="flex min-h-screen items-center justify-center p-5 sm:p-8">
        <div class="w-full max-w-sm">
          <div class="mb-10 flex items-center gap-2.5 lg:hidden">
            <span
              class="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white"
            >
              <span class="material-symbols-rounded icon-fill !text-xl">nutrition</span>
            </span>
            <strong class="text-lg font-extrabold">{{ product.name }}</strong>
          </div>
          <h2 class="text-2xl font-extrabold tracking-tight">
            {{ isRegister ? 'Hesabınızı oluşturun' : 'Tekrar hoş geldiniz' }}
          </h2>
          <p class="mt-1.5 text-sm text-slate-500">
            {{
              isRegister
                ? 'Muayenehanenizi birkaç dakikada dijitale taşıyın.'
                : 'Danışan panelinize giriş yapın.'
            }}
          </p>

          <form class="mt-8 space-y-4" (submit)="onSubmit($event)" novalidate>
            @if (isRegister) {
              <label class="block">
                <span class="odv-label">Ad soyad</span>
                <input
                  class="odv-input"
                  [formField]="authForm.name"
                  autocomplete="name"
                  placeholder="Dyt. Ad Soyad"
                />
                @if (authForm.name().touched() && authForm.name().invalid()) {
                  <span class="odv-error">Ad soyad zorunludur.</span>
                }
              </label>
              <label class="block">
                <span class="odv-label">Muayenehane / klinik adı</span>
                <input
                  class="odv-input"
                  [formField]="authForm.company"
                  autocomplete="organization"
                  placeholder="İsteğe bağlı"
                />
              </label>
            }
            <label class="block">
              <span class="odv-label">E-posta</span>
              <input
                class="odv-input"
                type="email"
                [formField]="authForm.email"
                autocomplete="email"
                placeholder="ornek@klinik.com"
              />
              @if (authForm.email().touched() && authForm.email().invalid()) {
                <span class="odv-error">Geçerli bir e-posta girin.</span>
              }
            </label>
            <label class="block">
              <span class="odv-label">Şifre</span>
              <div class="relative">
                <input
                  class="odv-input pe-12"
                  [type]="showPassword() ? 'text' : 'password'"
                  [formField]="authForm.password"
                  [autocomplete]="isRegister ? 'new-password' : 'current-password'"
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
              </div>
              @if (authForm.password().touched() && authForm.password().invalid()) {
                <span class="odv-error">Şifre en az 8 karakter olmalıdır.</span>
              }
            </label>
            @if (error()) {
              <div
                role="alert"
                class="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
              >
                {{ error() }}
              </div>
            }
            <button class="odv-btn-primary !min-h-11 w-full" type="submit" [disabled]="busy()">
              {{ busy() ? 'İşleniyor…' : isRegister ? 'Hesap oluştur' : 'Giriş yap' }}
            </button>
          </form>

          <div class="my-6 flex items-center gap-3 text-xs text-slate-400">
            <span class="h-px flex-1 bg-slate-200 dark:bg-slate-700"></span>veya<span
              class="h-px flex-1 bg-slate-200 dark:bg-slate-700"
            ></span>
          </div>
          <button type="button" class="odv-btn-secondary !min-h-11 w-full" (click)="demo()">
            <span class="material-symbols-rounded !text-lg">play_circle</span>Demo verilerle incele
          </button>
          <p class="mt-6 text-center text-sm text-slate-500">
            {{ isRegister ? 'Zaten hesabınız var mı?' : 'Henüz hesabınız yok mu?' }}
            <a
              class="font-bold text-violet-600 hover:underline dark:text-violet-400"
              [routerLink]="isRegister ? '/login' : '/register'"
              >{{ isRegister ? 'Giriş yapın' : 'Hesap oluşturun' }}</a
            >
          </p>
          <p class="mt-8 text-center text-[11px] leading-5 text-slate-400">
            Devam ederek kullanım koşullarını ve aydınlatma metnini kabul etmiş olursunuz.
          </p>
        </div>
      </section>
    </main>
  `,
})
export class AuthPage {
  readonly product = PRODUCT;
  readonly isRegister = inject(ActivatedRoute).snapshot.data['mode'] === 'register';
  readonly showPassword = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
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
  onSubmit(event: Event): void {
    event.preventDefault();
    submit(this.authForm, async () => {
      this.busy.set(true);
      this.error.set('');
      try {
        const value = this.model();
        if (this.isRegister)
          await this.auth.register(value.name, value.email, value.password, value.company.trim());
        else await this.auth.signIn(value.email, value.password);
        await this.router.navigateByUrl('/overview');
      } catch {
        this.error.set('İşlem tamamlanamadı. Bilgilerinizi kontrol edip tekrar deneyin.');
      } finally {
        this.busy.set(false);
      }
    });
  }
  demo(): void {
    this.auth.continueDemo();
    void this.router.navigateByUrl('/overview');
  }
}
