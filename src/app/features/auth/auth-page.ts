import { Component, inject, signal } from '@angular/core';
import { email, FormField, form, minLength, required, submit } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthStore } from '../../core/auth/auth-store';
import { TranslatePipe } from '../../core/i18n/i18n';
import { PRODUCT } from '../../domain/product-manifest';

@Component({
  selector: 'app-auth-page',
  imports: [FormField, RouterLink, TranslatePipe],
  template: `
    <main class="min-h-screen bg-slate-950 text-white lg:grid lg:grid-cols-[1.08fr_.92fr]">
      <section
        class="relative hidden overflow-hidden bg-gradient-to-br from-violet-700 via-indigo-800 to-slate-950 p-12 lg:flex lg:flex-col lg:justify-between"
      >
        <div
          class="absolute -start-20 top-20 size-80 rounded-full bg-fuchsia-400/20 blur-3xl"
        ></div>
        <div class="relative flex items-center gap-3">
          <span class="grid size-11 place-items-center rounded-2xl bg-white/15"
            ><span class="material-symbols-rounded">verified_user</span></span
          >
          <div>
            <strong class="text-xl">Odivon</strong
            ><span class="block text-xs text-violet-200">{{ product.name }}</span>
          </div>
        </div>
        <div class="relative max-w-2xl">
          <span
            class="mb-5 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold"
            >Uyumluluk operasyon merkezi</span
          >
          <h1 class="m-0 text-5xl font-black leading-tight">
            Karmaşık mevzuatı<br />net aksiyonlara dönüştürün.
          </h1>
          <p class="mt-6 max-w-xl text-base leading-7 text-indigo-100">
            {{ product.promiseKey | t }}
          </p>
          <div class="mt-10 grid grid-cols-3 gap-3">
            <div class="rounded-2xl bg-white/10 p-4">
              <strong class="block text-2xl">8</strong
              ><span class="text-xs text-indigo-200">Dil desteği</span>
            </div>
            <div class="rounded-2xl bg-white/10 p-4">
              <strong class="block text-2xl">24/7</strong
              ><span class="text-xs text-indigo-200">Canlı izleme</span>
            </div>
            <div class="rounded-2xl bg-white/10 p-4">
              <strong class="block text-2xl">%100</strong
              ><span class="text-xs text-indigo-200">İzlenebilirlik</span>
            </div>
          </div>
        </div>
        <p class="relative text-xs text-indigo-300">Odivon güvenli bulut altyapısı · KVKK odaklı</p>
      </section>
      <section
        class="flex min-h-screen items-center justify-center bg-slate-50 p-5 text-slate-900 dark:bg-[#0b1120] dark:text-white"
      >
        <div class="w-full max-w-md">
          <div class="mb-8 flex items-center gap-3 lg:hidden">
            <span class="grid size-10 place-items-center rounded-xl bg-violet-600 text-white"
              ><span class="material-symbols-rounded">verified_user</span></span
            ><strong>Odivon · {{ product.name }}</strong>
          </div>
          <div class="mb-8">
            <span class="text-xs font-extrabold uppercase tracking-[.18em] text-violet-600">{{
              isRegister ? 'Yeni çalışma alanı' : 'Tekrar hoş geldiniz'
            }}</span>
            <h2 class="mb-2 mt-3 text-3xl font-black">
              {{ isRegister ? 'Hesabınızı oluşturun' : 'Hesabınıza giriş yapın' }}
            </h2>
            <p class="m-0 text-sm text-slate-500">
              {{
                isRegister
                  ? 'Ekibinizin uyumluluk operasyonunu birkaç adımda başlatın.'
                  : 'Operasyon merkezine güvenli erişim sağlayın.'
              }}
            </p>
          </div>
          <form class="space-y-4" (submit)="onSubmit($event)">
            @if (isRegister) {
              <label class="block"
                ><span class="mb-1.5 block text-xs font-bold">Ad soyad</span
                ><input class="odv-input" [formField]="authForm.name" autocomplete="name" />
                @if (authForm.name().touched() && authForm.name().invalid()) {
                  <span class="mt-1 block text-xs text-rose-600">Ad soyad zorunludur.</span>
                }</label
              ><label class="block"
                ><span class="mb-1.5 block text-xs font-bold">Şirket adı</span
                ><input
                  class="odv-input"
                  [formField]="authForm.company"
                  autocomplete="organization"
              /></label>
            }
            <label class="block"
              ><span class="mb-1.5 block text-xs font-bold">E-posta adresi</span
              ><input
                class="odv-input"
                type="email"
                [formField]="authForm.email"
                autocomplete="email"
              />
              @if (authForm.email().touched() && authForm.email().invalid()) {
                <span class="mt-1 block text-xs text-rose-600">Geçerli bir e-posta girin.</span>
              }
            </label>
            <label class="block"
              ><span class="mb-1.5 block text-xs font-bold">Şifre</span>
              <div class="relative">
                <input
                  class="odv-input pe-12"
                  [type]="showPassword() ? 'text' : 'password'"
                  [formField]="authForm.password"
                  [autocomplete]="isRegister ? 'new-password' : 'current-password'"
                /><button
                  class="odv-icon-btn absolute end-1 top-1/2 -translate-y-1/2"
                  type="button"
                  (click)="showPassword.update((v) => !v)"
                  [attr.aria-label]="showPassword() ? 'Şifreyi gizle' : 'Şifreyi göster'"
                >
                  <span class="material-symbols-rounded">{{
                    showPassword() ? 'visibility_off' : 'visibility'
                  }}</span>
                </button>
              </div>
              @if (authForm.password().touched() && authForm.password().invalid()) {
                <span class="mt-1 block text-xs text-rose-600"
                  >Şifre en az 8 karakter olmalıdır.</span
                >
              }
            </label>
            @if (error()) {
              <div
                role="alert"
                class="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700"
              >
                {{ error() }}
              </div>
            }
            <button class="odv-btn-primary w-full" type="submit" [disabled]="busy()">
              {{ busy() ? 'İşleniyor…' : isRegister ? 'Ücretsiz hesap oluştur' : 'Giriş yap' }}
            </button>
          </form>
          <div class="my-5 flex items-center gap-3 text-xs text-slate-400">
            <span class="h-px flex-1 bg-slate-200 dark:bg-slate-700"></span>veya<span
              class="h-px flex-1 bg-slate-200 dark:bg-slate-700"
            ></span>
          </div>
          <button
            type="button"
            class="odv-btn-ghost w-full border border-slate-200 dark:border-slate-700"
            (click)="demo()"
          >
            <span class="material-symbols-rounded">play_circle</span>Demo hesabıyla incele
          </button>
          <p class="mt-6 text-center text-sm text-slate-500">
            {{ isRegister ? 'Zaten hesabınız var mı?' : 'Henüz hesabınız yok mu?' }}
            <a
              class="font-bold text-violet-600 hover:underline"
              [routerLink]="isRegister ? '/login' : '/register'"
              >{{ isRegister ? 'Giriş yapın' : 'Hesap oluşturun' }}</a
            >
          </p>
          <p class="mt-8 text-center text-[11px] leading-5 text-slate-400">
            Devam ederek kullanım koşullarını ve gizlilik bildirimini kabul etmiş olursunuz.
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
        if (this.isRegister) await this.auth.register(value.name, value.email, value.password);
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
