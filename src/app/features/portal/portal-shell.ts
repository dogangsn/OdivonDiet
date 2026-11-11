import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStore } from '../../core/auth/auth-store';
import { MemberPortal } from '../../core/data/member-portal';
import { ThemeStore } from '../../core/theme/theme-store';
import { PRODUCT } from '../../domain/product-manifest';
import { Avatar } from '../../shared/ui/avatar';

interface PortalNavItem {
  readonly path: string;
  readonly icon: string;
  readonly label: string;
  /** Shown in the phone tab bar; the rest stay in the header. */
  readonly tab: boolean;
}

const NAV: readonly PortalNavItem[] = [
  { path: '/portal', icon: 'home', label: 'Özet', tab: true },
  { path: '/portal/plan', icon: 'restaurant_menu', label: 'Planım', tab: true },
  { path: '/portal/progress', icon: 'monitoring', label: 'İlerlemem', tab: true },
  { path: '/portal/tasks', icon: 'task_alt', label: 'Görevler', tab: true },
  { path: '/portal/messages', icon: 'forum', label: 'Mesajlar', tab: true },
  { path: '/portal/requests', icon: 'inbox', label: 'Taleplerim', tab: false },
  { path: '/portal/profile', icon: 'person', label: 'Profilim', tab: false },
];

/** Layout for members: sidebar on desktop, bottom tab bar on phones. */
@Component({
  selector: 'app-portal-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Avatar],
  template: `
    <div class="min-h-screen text-slate-900 dark:text-slate-100">
      <a
        href="#portal-main"
        class="odv-btn-primary sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[80]"
        >İçeriğe geç</a
      >
      <aside
        class="fixed inset-y-0 start-0 z-30 hidden w-[240px] flex-col border-e border-slate-200/80 bg-white lg:flex dark:border-slate-800 dark:bg-slate-900"
        aria-label="Portal menüsü"
      >
        <a routerLink="/portal" class="flex h-16 items-center gap-2.5 px-5">
          <span
            class="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25"
          >
            <span class="material-symbols-rounded icon-fill !text-xl" aria-hidden="true">nutrition</span>
          </span>
          <span class="leading-tight">
            <strong class="block text-[15px] font-extrabold tracking-tight">{{ product.name }}</strong>
            <span class="block text-[11px] font-medium text-slate-400">Danışan portalı</span>
          </span>
        </a>
        <nav aria-label="Portal" class="flex-1 px-3 pt-4">
          <ul class="space-y-0.5">
            @for (item of nav; track item.path) {
              <li>
                <a
                  [routerLink]="item.path"
                  routerLinkActive="!bg-emerald-50 !text-emerald-800 dark:!bg-emerald-500/15 dark:!text-emerald-200"
                  [routerLinkActiveOptions]="{ exact: item.path === '/portal' }"
                  #rla="routerLinkActive"
                  [attr.aria-current]="rla.isActive ? 'page' : null"
                  class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  <span class="material-symbols-rounded" [class.icon-fill]="rla.isActive" aria-hidden="true">{{
                    item.icon
                  }}</span>
                  <span class="flex-1">{{ item.label }}</span>
                  @if (badge(item.path); as count) {
                    <span class="tabular rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white">{{
                      count
                    }}</span>
                  }
                </a>
              </li>
            }
          </ul>
        </nav>
        <div class="border-t border-slate-100 p-3 dark:border-slate-800">
          @if (auth.session()?.sample) {
            <div
              class="mb-2 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
            >
              <span class="material-symbols-rounded !text-base" aria-hidden="true">science</span>Demo modu
            </div>
          }
          <div class="flex items-center gap-3 rounded-xl p-2">
            <app-avatar [name]="auth.session()?.name ?? '?'" size="sm" />
            <div class="min-w-0 flex-1">
              <strong class="block truncate text-xs">{{ auth.session()?.name }}</strong>
              <span class="block truncate text-[11px] text-slate-500">{{ auth.session()?.email }}</span>
            </div>
            <button type="button" class="odv-icon-btn !size-9" (click)="logout()" aria-label="Güvenli çıkış">
              <span class="material-symbols-rounded !text-lg">logout</span>
            </button>
          </div>
        </div>
      </aside>

      <div class="lg:ms-[240px]">
        <header
          class="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur-md sm:px-6 dark:border-slate-800 dark:bg-slate-900/80"
        >
          <a routerLink="/portal" class="flex items-center gap-2 lg:hidden">
            <span
              class="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
              ><span class="material-symbols-rounded icon-fill !text-lg" aria-hidden="true">nutrition</span></span
            >
            <strong class="text-sm font-extrabold">{{ product.name }}</strong>
          </a>
          <p class="hidden text-sm text-slate-500 lg:block">
            Diyetisyeniniz: <strong class="text-slate-800 dark:text-slate-200">{{ dietitianName }}</strong>
          </p>
          <div class="ms-auto flex items-center gap-1">
            <a routerLink="/portal/requests" class="odv-icon-btn lg:hidden" aria-label="Taleplerim">
              <span class="material-symbols-rounded">inbox</span>
            </a>
            <a routerLink="/portal/profile" class="odv-icon-btn lg:hidden" aria-label="Profilim">
              <span class="material-symbols-rounded">person</span>
            </a>
            <button
              type="button"
              class="odv-icon-btn"
              (click)="theme.toggle()"
              [attr.aria-label]="theme.dark() ? 'Açık temaya geç' : 'Koyu temaya geç'"
            >
              <span class="material-symbols-rounded">{{ theme.dark() ? 'light_mode' : 'dark_mode' }}</span>
            </button>
            <button type="button" class="odv-icon-btn lg:hidden" (click)="logout()" aria-label="Güvenli çıkış">
              <span class="material-symbols-rounded">logout</span>
            </button>
          </div>
        </header>
        <main id="portal-main" class="mx-auto max-w-[1100px] p-4 pb-28 sm:p-6 sm:pb-28 lg:p-8">
          <router-outlet />
        </main>
      </div>

      <nav
        class="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-900/95"
        aria-label="Portal sekmeleri"
      >
        <ul class="grid grid-cols-5">
          @for (item of tabs; track item.path) {
            <li>
              <a
                [routerLink]="item.path"
                routerLinkActive="!text-emerald-700 dark:!text-emerald-300"
                [routerLinkActiveOptions]="{ exact: item.path === '/portal' }"
                #tab="routerLinkActive"
                [attr.aria-current]="tab.isActive ? 'page' : null"
                class="relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold text-slate-500"
              >
                <span class="material-symbols-rounded" [class.icon-fill]="tab.isActive" aria-hidden="true">{{
                  item.icon
                }}</span>
                {{ item.label }}
                @if (badge(item.path); as count) {
                  <span
                    class="tabular absolute end-[calc(50%-1.25rem)] top-1 grid min-w-4 place-items-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white"
                    [attr.aria-label]="count + ' yeni'"
                    >{{ count }}</span
                  >
                }
              </a>
            </li>
          }
        </ul>
      </nav>
    </div>
  `,
})
export class PortalShell {
  readonly product = PRODUCT;
  readonly nav = NAV;
  readonly tabs = NAV.filter((n) => n.tab);
  /** Single-practice for now; MainAPI's `/portal/me` will return the assigned dietitian. */
  readonly dietitianName = 'Dyt. Deniz Arslan';
  readonly auth = inject(AuthStore);
  readonly theme = inject(ThemeStore);
  private readonly member = inject(MemberPortal);
  private readonly router = inject(Router);

  private readonly badges = computed<Record<string, number>>(() => ({
    '/portal/messages': this.member.unread(),
    '/portal/tasks': this.member.openTasks().length,
  }));

  badge(path: string): number {
    return this.badges()[path] ?? 0;
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/portal/login');
  }
}
