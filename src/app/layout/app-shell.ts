import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStore } from '../core/auth/auth-store';
import { SubscriptionStore } from '../core/billing/subscription-store';
import { DietStore } from '../core/data/diet-store';
import { PortalStore } from '../core/data/portal-store';
import { I18nStore, SupportedLang } from '../core/i18n/i18n';
import { ThemeStore } from '../core/theme/theme-store';
import { PRODUCT_NAVIGATION } from '../domain/domain-navigation';
import { PRODUCT } from '../domain/product-manifest';
import { staffRoleById } from '../domain/staff-rbac';
import { QuickActionHost } from '../features/forms/quick-action-host';
import { QuickActions } from '../features/forms/quick-actions';
import { Avatar } from '../shared/ui/avatar';
import { VersionBadge } from '../shared/ui/version-badge';

@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, Avatar, QuickActionHost, VersionBadge],
  host: {
    '(window:keydown)': 'onGlobalKeydown($event)',
  },
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
                    @if (isNavLocked(item.path)) {
                      <span
                        class="material-symbols-rounded !text-base text-rose-500"
                        aria-label="Kilitli ekran"
                        title="Paket veya rol kısıtlaması"
                        >lock</span
                      >
                    } @else if (badge(item.path); as count) {
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
          @if (subs.isSample()) {
            <div
              class="mb-2 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
            >
              <span class="material-symbols-rounded !text-base">science</span>Demo hesabı · örnek
              veriler
            </div>
          } @else if (subs.state(); as s) {
            <a
              routerLink="/billing"
              class="mb-2 block rounded-xl px-3 py-2.5 text-[11px] font-semibold transition"
              [class]="trialPillClass()"
              (click)="mobileOpen.set(false)"
            >
              <span class="flex items-center gap-2">
                <span class="material-symbols-rounded !text-base" aria-hidden="true">{{
                  s.expired ? 'lock_clock' : s.trialing ? 'hourglass_top' : 'workspace_premium'
                }}</span>
                <span class="flex-1">
                  @if (s.expired) {
                    Süre doldu · paket seçin
                  } @else if (s.trialing) {
                    Deneme · {{ s.daysLeft }} gün kaldı
                  } @else {
                    {{ s.plan.name }} paketi
                  }
                </span>
                @if (s.trialing) {
                  <span class="font-bold underline">Yükselt</span>
                }
              </span>
              @if (s.trialing) {
                <span class="mt-2 block h-1 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                  <span
                    class="block h-full rounded-full bg-current"
                    [style.width.%]="s.trialUsedPct"
                  ></span>
                </span>
              }
            </a>
          }
          <div class="flex items-center gap-3 rounded-xl p-2">
            <app-avatar [name]="auth.session()?.name ?? '?'" size="sm" />
            <div class="min-w-0 flex-1">
              <strong class="block truncate text-xs">{{ auth.session()?.name }}</strong>
              <span class="block truncate text-[11px] text-slate-500">{{ userSubtitle() }}</span>
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
              class="odv-input !py-2 pe-16 ps-10"
              placeholder="Danışan ara…"
              autocomplete="off"
            />
            <button
              type="button"
              (click)="paletteOpen.set(true)"
              aria-label="Hızlı komut paletini aç (Ctrl+K)"
              class="absolute end-2 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              Ctrl K
            </button>
          </form>
          <div class="ms-auto flex items-center gap-1.5">
            <button
              type="button"
              class="odv-btn-ghost !min-h-9 !px-2.5 text-xs md:hidden"
              (click)="paletteOpen.set(true)"
              aria-label="Hızlı arama ve komut paleti"
            >
              <span class="material-symbols-rounded !text-lg">search</span>
            </button>
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

      @if (paletteOpen()) {
        <div
          class="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/50 p-4 pt-16 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-label="Hızlı arama ve komut paleti"
        >
          <div
            class="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
          >
            <div class="flex items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
              <span class="material-symbols-rounded text-violet-600" aria-hidden="true">bolt</span>
              <label class="sr-only" for="palette-input">Komut veya danışan ara</label>
              <input
                id="palette-input"
                type="search"
                class="flex-1 bg-transparent text-sm font-medium outline-none"
                placeholder="Danışan adı, hızlı işlem veya modül yazın…"
                [value]="paletteQuery()"
                (input)="paletteQuery.set($any($event.target).value)"
                autocomplete="off"
              />
              <button
                type="button"
                class="rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                (click)="paletteOpen.set(false)"
              >
                ESC
              </button>
            </div>

            <div class="custom-scroll max-h-96 space-y-4 overflow-y-auto p-4">
              <div>
                <p class="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  Hızlı Klinik İşlemler
                </p>
                <div class="grid gap-1.5 sm:grid-cols-2">
                  <button
                    type="button"
                    (click)="runQuickAction('client-new')"
                    class="flex items-center gap-2.5 rounded-xl border border-slate-100 p-2.5 text-start text-xs font-bold hover:border-violet-300 hover:bg-violet-50/50 dark:border-slate-800 dark:hover:bg-slate-800"
                  >
                    <span class="material-symbols-rounded !text-base text-violet-600">person_add</span>
                    Yeni Danışan Ekle
                  </button>
                  <button
                    type="button"
                    (click)="runQuickAction('plan')"
                    class="flex items-center gap-2.5 rounded-xl border border-slate-100 p-2.5 text-start text-xs font-bold hover:border-violet-300 hover:bg-violet-50/50 dark:border-slate-800 dark:hover:bg-slate-800"
                  >
                    <span class="material-symbols-rounded !text-base text-emerald-600"
                      >restaurant_menu</span
                    >
                    Yeni Beslenme Programı
                  </button>
                  <button
                    type="button"
                    (click)="runQuickAction('measurement')"
                    class="flex items-center gap-2.5 rounded-xl border border-slate-100 p-2.5 text-start text-xs font-bold hover:border-violet-300 hover:bg-violet-50/50 dark:border-slate-800 dark:hover:bg-slate-800"
                  >
                    <span class="material-symbols-rounded !text-base text-sky-600"
                      >monitor_weight</span
                    >
                    InBody / Ölçüm Kaydet
                  </button>
                  <button
                    type="button"
                    (click)="runQuickAction('consultation')"
                    class="flex items-center gap-2.5 rounded-xl border border-slate-100 p-2.5 text-start text-xs font-bold hover:border-violet-300 hover:bg-violet-50/50 dark:border-slate-800 dark:hover:bg-slate-800"
                  >
                    <span class="material-symbols-rounded !text-base text-amber-600">event</span>
                    Yeni Randevu Planla
                  </button>
                </div>
              </div>

              <div>
                <p class="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  Danışanlar ({{ paletteClients().length }})
                </p>
                <ul class="space-y-1">
                  @for (v of paletteClients(); track v.client.id) {
                    <li>
                      <button
                        type="button"
                        (click)="openClientFromPalette(v.client.id)"
                        class="flex w-full items-center justify-between rounded-xl px-3 py-2 text-start text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <span class="flex items-center gap-2.5">
                          <app-avatar [name]="v.fullName" size="sm" />
                          <span>
                            <strong class="block text-slate-800 dark:text-white">{{
                              v.fullName
                            }}</strong>
                            <span class="text-[11px] text-slate-500"
                              >{{ v.currentWeightKg }} kg → Hedef {{ v.client.targetWeightKg }} kg ·
                              TDEE {{ v.tdee }} kcal</span
                            >
                          </span>
                        </span>
                        <span class="odv-badge odv-tone-primary">360° Profil Aç</span>
                      </button>
                    </li>
                  } @empty {
                    <li class="px-2 py-2 text-xs text-slate-400">Eşleşen danışan bulunamadı.</li>
                  }
                </ul>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class AppShell {
  readonly product = PRODUCT;
  readonly navigation = PRODUCT_NAVIGATION;
  readonly auth = inject(AuthStore);
  readonly subs = inject(SubscriptionStore);
  readonly i18n = inject(I18nStore);
  readonly theme = inject(ThemeStore);
  readonly qa = inject(QuickActions);
  private readonly store = inject(DietStore);
  private readonly portal = inject(PortalStore);
  private readonly router = inject(Router);
  readonly mobileOpen = signal(false);
  readonly paletteOpen = signal(false);
  readonly paletteQuery = signal('');

  readonly paletteClients = computed(() => {
    const q = this.paletteQuery().trim().toLocaleLowerCase('tr');
    const list = this.store.activeClients();
    if (!q) return list.slice(0, 5);
    return list
      .filter(
        (v) =>
          v.fullName.toLocaleLowerCase('tr').includes(q) ||
          v.client.email.toLocaleLowerCase('tr').includes(q),
      )
      .slice(0, 6);
  });

  readonly trialPillClass = computed(() => {
    const s = this.subs.state();
    if (s?.expired) return 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300';
    if (s?.trialing && s.daysLeft <= 3)
      return 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300';
    if (s?.trialing)
      return 'bg-violet-50 text-violet-700 hover:bg-violet-100 dark:bg-violet-500/15 dark:text-violet-200';
    return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300';
  });

  readonly userSubtitle = computed(() => {
    const roleLabel = staffRoleById(this.auth.staffRole()).label;
    return roleLabel;
  });

  isNavLocked(path: string): boolean {
    return this.subs.isRouteLocked(path) || !this.auth.canAccessPath(path);
  }

  private readonly badges = computed<Record<string, number>>(() => ({
    '/clients': this.store.activeClients().length,
    '/consultations': this.store.todaysConsultations().filter((c) => c.status === 'scheduled')
      .length,
    '/messages': this.portal.dietitianUnread(),
    '/requests': this.portal.openRequestCount(),
    '/tasks': this.portal.overdueTaskCount(),
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

  onGlobalKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.paletteOpen.update((v) => !v);
    } else if (event.key === 'Escape' && this.paletteOpen()) {
      this.paletteOpen.set(false);
    }
  }

  runQuickAction(kind: 'client-new' | 'plan' | 'measurement' | 'consultation'): void {
    this.paletteOpen.set(false);
    this.qa.open(kind);
  }

  openClientFromPalette(clientId: string): void {
    this.paletteOpen.set(false);
    this.qa.open('client-detail', clientId);
  }
}
