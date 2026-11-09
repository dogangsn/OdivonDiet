import { Component, inject, signal } from '@angular/core';
import { email, FormField, form, minLength, required, submit } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthStore, PortalAccessError } from '../../core/auth/auth-store';
import { PRODUCT } from '../../domain/product-manifest';
import { VersionBadge } from '../../shared/ui/version-badge';

@Component({
  selector: 'app-auth-page',
  imports: [FormField, RouterLink, VersionBadge],
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
            class="mb-5 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold"
            >Klinik Beslenme & Danışan Yönetimi</span
          >
          <h1 class="m-0 text-5xl font-black leading-tight">
            Kişiye özel beslenmeyi<br />ölçülebilir başarıya dönüştürün.
          </h1>
          <p class="mt-5 text-base leading-7 text-slate-300">
            Danışan profili, beslenme planı, ölçüm ve takip görüşmeleri tek akışta. BKİ, bazal
            metabolizma ve günlük enerji ihtiyacı otomatik hesaplanır.
          </p>
          <div class="mt-10 grid grid-cols-3 gap-3">
            <div class="rounded-2xl bg-white/10 p-4">
              <strong class="block text-2xl">AI</strong>
              <span class="text-xs text-indigo-200">NutriPilot motoru</span>
            </div>
            <div class="rounded-2xl bg-white/10 p-4">
              <strong class="block text-2xl">8</strong>
              <span class="text-xs text-indigo-200">Dil & RTL desteği</span>
            </div>
            <div class="rounded-2xl bg-white/10 p-4">
              <strong class="block text-2xl">%100</strong>
              <span class="text-xs text-indigo-200">KVKK uyumlu</span>
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
                  ? 'Diyetisyen çalışma alanınızı birkaç adımda başlatın.'
                  : 'Klinik çalışma alanınıza güvenli erişim sağlayın.'
              }}
            </p>
          </div>
          <form class="space-y-4" (submit)="onSubmit($event)">
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
                  <span class="mt-1 block text-xs text-rose-600">Ad soyad zorunludur.</span>
                }</label
              ><label class="block"
                ><span class="mb-1.5 block text-xs font-bold">Klinik / Merkez adı</span
                ><input
                  class="odv-input"
                  [formField]="authForm.company"
                  placeholder="Örn. Diyet & Beslenme Kliniği"
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
            <span class="material-symbols-rounded !text-lg">play_circle</span
            >{{ isMember ? 'Demo danışan olarak incele' : 'Demo verilerle incele' }}
          </button>
          @if (isMember) {
            <p class="mt-6 text-center text-sm text-slate-500">
              Portal hesabınızı diyetisyeniniz açar; davet e-postasındaki adresle giriş yapın.
            </p>
            <p class="mt-3 text-center text-sm text-slate-500">
              Diyetisyen misiniz?
              <a
                class="font-bold text-violet-600 hover:underline dark:text-violet-400"
                routerLink="/login"
                >Diyetisyen girişi</a
              >
            </p>
          } @else {
            <p class="mt-6 text-center text-sm text-slate-500">
              {{ isRegister ? 'Zaten hesabınız var mı?' : 'Henüz hesabınız yok mu?' }}
              <a
                class="font-bold text-violet-600 hover:underline dark:text-violet-400"
                [routerLink]="isRegister ? '/login' : '/register'"
                >{{ isRegister ? 'Giriş yapın' : 'Hesap oluşturun' }}</a
              >
            </p>
            <p class="mt-3 text-center text-sm text-slate-500">
              Danışan mısınız?
              <a
                class="font-bold text-emerald-700 hover:underline dark:text-emerald-400"
                routerLink="/portal/login"
                >Danışan portalına giriş</a
              >
            </p>
          }
          <p class="mt-8 text-center text-[11px] leading-5 text-slate-400">
            Devam ederek kullanım koşullarını ve aydınlatma metnini kabul etmiş olursunuz.
          </p>
          <p class="mt-3 text-center"><odv-version-badge /></p>
        </div>
      </section>
    </main>
  `,
})
export class AuthPage {
  readonly product = PRODUCT;
  private readonly mode = inject(ActivatedRoute).snapshot.data['mode'] as
    | 'login'
    | 'register'
    | 'member';
  readonly isRegister = this.mode === 'register';
  readonly isMember = this.mode === 'member';
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
        else if (this.isMember) await this.auth.signInMember(value.email, value.password);
        else await this.auth.signIn(value.email, value.password);
        await this.router.navigateByUrl(this.auth.homePath());
      } catch (error) {
        this.error.set(
          error instanceof PortalAccessError
            ? error.message
            : 'İşlem tamamlanamadı. Bilgilerinizi kontrol edip tekrar deneyin.',
        );
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
}
