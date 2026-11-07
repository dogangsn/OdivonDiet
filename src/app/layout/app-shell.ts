import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStore } from '../core/auth/auth-store';
import { DietStore } from '../core/data/diet-store';
import { I18nStore, SupportedLang } from '../core/i18n/i18n';
import { ThemeStore } from '../core/theme/theme-store';
import { PRODUCT_NAVIGATION } from '../domain/domain-navigation';
import { PRODUCT } from '../domain/product-manifest';
import { QuickActionHost } from '../features/forms/quick-action-host';
import { QuickActions } from '../features/forms/quick-actions';
import { Avatar } from '../shared/ui/avatar';
import { VersionBadge } from '../shared/ui/version-badge';

@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, Avatar, QuickActionHost, VersionBadge],
  template: `
    <div class="min-h-screen text-slate-900 dark:text-slate-100">
      <a
        href="#main"
        class="odv-btn-primary sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[80]"
        >İçeriğe geç</a
      >

      @if (mobileOpen()) {
        <button
          type="button"
          class="fixed inset-0 z-30 bg-slate-950/40 backdrop-blur-[2px] lg:hidden"
          aria-label="Menüyü kapat"
          (click)="mobileOpen.set(false)"
        ></button>
      }

      <aside
        class="no-print fixed inset-y-0 start-0 z-40 flex w-[260px] flex-col border-e border-slate-200/80 bg-white transition-transform duration-200 dark:border-slate-800 dark:bg-slate-900 lg:translate-x-0"
        [class]="mobileOpen() ? '' : '-translate-x-full rtl:translate-x-full lg:rtl:translate-x-0'"
        aria-label="Kenar menüsü"
      >
        <div class="flex h-16 items-center justify-between px-5">
          <a
            routerLink="/overview"
            class="flex items-center gap-2.5"
            (click)="mobileOpen.set(false)"
          >
            <span
              class="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md shadow-violet-500/25"
            >
              <span class="material-symbols-rounded icon-fill !text-xl">nutrition</span>
            </span>
            <span class="leading-tight">
              <strong class="block text-[15px] font-extrabold tracking-tight">{{
                product.name
              }}</strong>
              <span class="block text-[11px] font-medium text-slate-400">Diyetisyen paneli</span>
            </span>
          </a>
          <button
            type="button"
            class="odv-icon-btn lg:hidden"
            (click)="mobileOpen.set(false)"
            aria-label="Menüyü kapat"
          >
            <span class="material-symbols-rounded">close</span>
          </button>
        </div>

        <nav aria-label="Ana menü" class="custom-scroll flex-1 overflow-y-auto px-3 pb-4">
          @for (group of navigation; track group.label) {
            <p
              class="px-3 pb-1.5 pt-5 text-[11px] font-bold uppercase tracking-wider text-slate-400"
            >
              {{ group.label }}
            </p>
            <ul class="space-y-0.5">
              @for (item of group.items; track item.path) {
                <li>
                  <a
                    [routerLink]="item.path"
                    routerLinkActive="!bg-violet-50 !text-violet-700 dark:!bg-violet-500/15 dark:!text-violet-200"
                    #rla="routerLinkActive"
                    [attr.aria-current]="rla.isActive ? 'page' : null"
                    class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                    (click)="mobileOpen.set(false)"
                  >
                    <span
                      class="nav-icon material-symbols-rounded"
                      [class.icon-fill]="rla.isActive"
                      >{{ item.icon }}</span
                    >
                    <span class="flex-1">{{ item.label }}</span>
                    @if (badge(item.path); as count) {
                      <span
                        class="tabular rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500 group-hover:bg-white dark:bg-slate-800 dark:text-slate-300"
                        >{{ count }}</span
                      >
                    }
                  </a>
                </li>
              }
            </ul>
          }
        </nav>

        <div class="border-t border-slate-100 p-3 dark:border-slate-800">
          @if (auth.session()?.demo) {
            <div
              class="mb-2 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
            >
              <span class="material-symbols-rounded !text-base">science</span>Demo modu · veriler
              kaydedilmez
            </div>
          }
          <div class="flex items-center gap-3 rounded-xl p-2">
            <app-avatar [name]="auth.session()?.name ?? '?'" size="sm" />
            <div class="min-w-0 flex-1">
              <strong class="block truncate text-xs">{{ auth.session()?.name }}</strong>
              <span class="block truncate text-[11px] text-slate-500">{{
                auth.session()?.practice || auth.session()?.email
              }}</span>
            </div>
            <button
              type="button"
              class="odv-icon-btn !size-9"
              (click)="logout()"
              aria-label="Güvenli çıkış"
            >
              <span class="material-symbols-rounded !text-lg">logout</span>
            </button>
          </div>
          <div class="mt-1 text-center"><odv-version-badge /></div>
        </div>
      </aside>

      <div class="lg:ms-[260px]">
        <header
          class="no-print sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80 sm:px-6"
        >
          <button
            class="odv-icon-btn lg:hidden"
            type="button"
            (click)="mobileOpen.set(true)"
            aria-label="Menüyü aç"
          >
            <span class="material-symbols-rounded">menu</span>
          </button>
          <form
            class="relative hidden max-w-md flex-1 md:block"
            role="search"
            (submit)="search($event, searchInput.value)"
          >
            <label class="sr-only" for="global-search">Danışan ara</label>
            <span
              class="material-symbols-rounded pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-400"
              >search</span
            >
            <input
              #searchInput
              id="global-search"
              type="search"
              class="odv-input !py-2 ps-10"
              placeholder="Danışan ara…"
              autocomplete="off"
            />
          </form>
          <div class="ms-auto flex items-center gap-1.5">
            <button
              type="button"
              class="odv-btn-primary !min-h-9 !px-3"
              (click)="qa.open('client-new')"
            >
              <span class="material-symbols-rounded !text-lg">add</span
              ><span class="hidden sm:inline">Danışan</span>
            </button>
            <label class="sr-only" for="language">Dil</label>
            <select
              id="language"
              class="odv-input !w-auto !border-transparent !bg-transparent !py-2 !pe-2 text-xs font-semibold"
              [value]="i18n.currentLang()"
              (change)="setLanguage($any($event.target).value)"
            >
              @for (language of i18n.options; track language.code) {
                <option [value]="language.code">
                  {{ language.flag }} {{ language.code.toUpperCase() }}
                </option>
              }
            </select>
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
        </header>
        <main id="main" class="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8"><router-outlet /></main>
      </div>

      <app-quick-action-host />
    </div>
  `,
})
export class AppShell {
  readonly product = PRODUCT;
  readonly navigation = PRODUCT_NAVIGATION;
  readonly auth = inject(AuthStore);
  readonly i18n = inject(I18nStore);
  readonly theme = inject(ThemeStore);
  readonly qa = inject(QuickActions);
  private readonly store = inject(DietStore);
  private readonly router = inject(Router);
  readonly mobileOpen = signal(false);

  private readonly badges = computed<Record<string, number>>(() => ({
    '/clients': this.store.activeClients().length,
    '/consultations': this.store.todaysConsultations().filter((c) => c.status === 'scheduled')
      .length,
  }));

  constructor() {
    this.i18n.setLanguage(this.i18n.currentLang());
  }

  badge(path: string): number {
    return this.badges()[path] ?? 0;
  }

  search(event: Event, value: string): void {
    event.preventDefault();
    void this.router.navigate(['/clients'], { queryParams: { q: value.trim() || null } });
  }

  setLanguage(value: string): void {
    this.i18n.setLanguage(value as SupportedLang);
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}
