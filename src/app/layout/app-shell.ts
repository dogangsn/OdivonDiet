import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStore } from '../core/auth/auth-store';
import { I18nStore, SupportedLang } from '../core/i18n/i18n';
import { PRODUCT_NAVIGATION } from '../domain/domain-navigation';
import { PRODUCT } from '../domain/product-manifest';

@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0b1120] dark:text-slate-100">
      <a
        href="#main"
        class="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[80] odv-btn-primary"
        >İçeriğe geç</a
      >
      @if (mobileOpen()) {
        <button
          type="button"
          class="fixed inset-0 z-30 bg-slate-950/50 lg:hidden"
          aria-label="Menüyü kapat"
          (click)="mobileOpen.set(false)"
        ></button>
      }
      <aside
        class="fixed inset-y-0 start-0 z-40 flex w-72 flex-col border-e border-slate-200 bg-white p-5 transition-transform dark:border-slate-800 dark:bg-slate-900 lg:translate-x-0"
        [class.-translate-x-full]="!mobileOpen()"
      >
        <div class="mb-7 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div
              class="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-700 text-white shadow-lg shadow-violet-500/20"
            >
              <span class="material-symbols-rounded">verified_user</span>
            </div>
            <div>
              <strong class="block text-lg">Odivon</strong
              ><span class="text-xs text-slate-500">{{ product.name }}</span>
            </div>
          </div>
          <button
            type="button"
            class="odv-icon-btn lg:hidden"
            (click)="mobileOpen.set(false)"
            aria-label="Menüyü kapat"
          >
            <span class="material-symbols-rounded">close</span>
          </button>
        </div>
        <div class="mb-5 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800">
          <div class="flex items-center gap-3">
            <span
              class="grid size-9 place-items-center rounded-xl bg-violet-100 text-sm font-black text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"
              >DY</span
            >
            <div class="min-w-0">
              <strong class="block truncate text-xs">{{ auth.session()?.name }}</strong
              ><span class="block truncate text-[11px] text-slate-500">{{
                auth.session()?.email
              }}</span>
            </div>
          </div>
        </div>
        <nav aria-label="Ana menü" class="custom-scroll flex-1 space-y-1 overflow-y-auto pe-1">
          @for (item of menu; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300"
              class="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
              (click)="mobileOpen.set(false)"
              ><span class="material-symbols-rounded">{{ item.icon }}</span
              >{{ item.label }}</a
            >
          }
        </nav>
        <div class="mt-4">
          <div
            class="mb-3 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 p-4 text-white"
          >
            <span class="material-symbols-rounded">support_agent</span
            ><strong class="mt-2 block text-sm">Yardıma mı ihtiyacınız var?</strong
            ><span class="mt-1 block text-xs text-violet-100">Odivon destek ekibi yanınızda.</span>
          </div>
          <button type="button" class="odv-btn-ghost w-full justify-start" (click)="logout()">
            <span class="material-symbols-rounded">logout</span>Güvenli çıkış
          </button>
        </div>
      </aside>
      <div class="lg:ms-72">
        <header
          class="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 sm:px-6"
        >
          <div class="flex items-center gap-3">
            <button
              class="odv-icon-btn lg:hidden"
              type="button"
              (click)="mobileOpen.set(true)"
              aria-label="Menüyü aç"
            >
              <span class="material-symbols-rounded">menu</span>
            </button>
            <div>
              <strong class="block text-sm">{{ product.name }}</strong
              ><span class="hidden text-[11px] text-slate-500 sm:block"
                >Uyumluluk operasyon merkezi</span
              >
            </div>
          </div>
          <div class="flex items-center gap-2">
            <label class="sr-only" for="language">Dil</label
            ><select
              id="language"
              class="odv-input !w-auto !py-2"
              [value]="i18n.currentLang()"
              (change)="setLanguage($any($event.target).value)"
            >
              @for (language of i18n.options; track language.code) {
                <option [value]="language.code">
                  {{ language.flag }} {{ language.nativeName }}
                </option>
              }</select
            ><button
              type="button"
              class="odv-icon-btn"
              (click)="toggleTheme()"
              [attr.aria-label]="dark() ? 'Açık temaya geç' : 'Koyu temaya geç'"
            >
              <span class="material-symbols-rounded">{{
                dark() ? 'light_mode' : 'dark_mode'
              }}</span>
            </button>
          </div>
        </header>
        <main id="main" class="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8"><router-outlet /></main>
      </div>
    </div>
  `,
})
export class AppShell {
  readonly product = PRODUCT;
  readonly auth = inject(AuthStore);
  readonly i18n = inject(I18nStore);
  readonly mobileOpen = signal(false);
  readonly dark = signal(localStorage.getItem('odivon:theme') === 'dark');
  readonly menu = [
    { path: '/overview', icon: 'dashboard', label: 'Genel Bakış' },
    ...PRODUCT_NAVIGATION.map((item) => ({
      path: `/${item.path}`,
      icon: item.icon,
      label: item.label,
    })),
    { path: '/activity', icon: 'history', label: 'Aktiviteler' },
    { path: '/settings', icon: 'settings', label: 'Ayarlar' },
  ];
  private readonly router = inject(Router);
  constructor() {
    document.documentElement.classList.toggle('dark', this.dark());
    this.i18n.setLanguage(this.i18n.currentLang());
  }
  setLanguage(value: string): void {
    this.i18n.setLanguage(value as SupportedLang);
  }
  toggleTheme(): void {
    this.dark.update((v) => !v);
    document.documentElement.classList.toggle('dark', this.dark());
    localStorage.setItem('odivon:theme', this.dark() ? 'dark' : 'light');
  }
  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}
