import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PortalStore } from '../../core/data/portal-store';
import { isSameDay } from '../../domain/diet-calc';
import { Message, PORTAL_ACCESS_LABELS } from '../../domain/portal.models';
import { Avatar } from '../../shared/ui/avatar';
import { EmptyState } from '../../shared/ui/empty-state';
import { QuickActions } from '../forms/quick-actions';
import { ChatThread } from './chat-thread';

@Component({
  selector: 'app-messages-page',
  imports: [Avatar, EmptyState, ChatThread, DatePipe],
  template: `
    <div
      class="animate-fade-up odv-card grid h-[calc(100dvh-8rem)] min-h-[32rem] overflow-hidden lg:h-[calc(100dvh-10rem)] lg:grid-cols-[320px_1fr]"
    >
      <aside
        class="min-h-0 flex-col border-e border-slate-100 lg:flex dark:border-slate-800"
        [class.flex]="!active()"
        [class.hidden]="!!active()"
        aria-label="Sohbetler"
      >
        <div class="space-y-3 border-b border-slate-100 p-4 dark:border-slate-800">
          <div class="flex items-center justify-between">
            <h1 class="text-lg font-extrabold tracking-tight">Mesajlar</h1>
            @if (portal.dietitianUnread(); as unread) {
              <span class="odv-badge odv-tone-primary">{{ unread }} okunmamış</span>
            }
          </div>
          <label class="relative block">
            <span class="sr-only">Sohbet ara</span>
            <span
              class="material-symbols-rounded pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
              >search</span
            >
            <input
              type="search"
              class="odv-input !py-2 ps-10"
              placeholder="Danışan ara…"
              [value]="query()"
              (input)="query.set($any($event.target).value)"
            />
          </label>
          <div class="odv-segment w-full" role="group" aria-label="Sohbet filtresi">
            <button
              type="button"
              class="odv-segment-item flex-1 justify-center"
              [attr.aria-pressed]="filter() === 'all'"
              (click)="filter.set('all')"
            >
              Tümü
            </button>
            <button
              type="button"
              class="odv-segment-item flex-1 justify-center"
              [attr.aria-pressed]="filter() === 'unread'"
              (click)="filter.set('unread')"
            >
              Okunmamış
            </button>
            <button
              type="button"
              class="odv-segment-item flex-1 justify-center"
              [attr.aria-pressed]="filter() === 'portal'"
              (click)="filter.set('portal')"
            >
              Portalda
            </button>
          </div>
        </div>
        <ul class="custom-scroll min-h-0 flex-1 overflow-y-auto p-2">
          @for (c of list(); track c.clientId) {
            <li>
              <button
                type="button"
                class="flex w-full items-center gap-3 rounded-xl p-2.5 text-start transition hover:bg-slate-50 dark:hover:bg-slate-800"
                [class.!bg-violet-50]="c.clientId === active()"
                [class.dark:!bg-violet-500/15]="c.clientId === active()"
                [attr.aria-current]="c.clientId === active() ? 'true' : null"
                (click)="select(c.clientId)"
              >
                <span class="relative">
                  <app-avatar [name]="c.name" />
                  @if (c.access.status === 'active') {
                    <span
                      class="absolute -bottom-0.5 -end-0.5 size-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900"
                      title="Portal aktif"
                    ></span>
                  }
                </span>
                <span class="min-w-0 flex-1">
                  <span class="flex items-baseline justify-between gap-2">
                    <strong class="truncate text-sm">{{ c.name }}</strong>
                    @if (c.lastMessage) {
                      <span class="shrink-0 text-[11px] text-slate-400">{{
                        today(c.lastMessage.at)
                          ? (c.lastMessage.at | date: 'HH:mm')
                          : (c.lastMessage.at | date: 'd MMM')
                      }}</span>
                    }
                  </span>
                  <span class="flex items-center gap-2">
                    <span
                      class="flex-1 truncate text-xs"
                      [class.font-bold]="c.unread > 0"
                      [class.text-slate-800]="c.unread > 0"
                      [class.dark:text-slate-100]="c.unread > 0"
                      [class.text-slate-500]="!c.unread"
                    >
                      {{ preview(c.lastMessage) || accessLabels[c.access.status] }}
                    </span>
                    @if (c.openRequests) {
                      <span
                        class="material-symbols-rounded !text-base text-amber-500"
                        [attr.aria-label]="c.openRequests + ' açık talep'"
                        role="img"
                        >inbox</span
                      >
                    }
                    @if (c.unread) {
                      <span
                        class="tabular grid min-w-5 place-items-center rounded-full bg-violet-600 px-1.5 text-[11px] font-bold text-white"
                        [attr.aria-label]="c.unread + ' okunmamış mesaj'"
                        >{{ c.unread }}</span
                      >
                    }
                  </span>
                </span>
              </button>
            </li>
          } @empty {
            <li><app-empty-state icon="forum" title="Sohbet bulunamadı" /></li>
          }
        </ul>
      </aside>

      <section
        class="min-h-0 flex-col lg:flex"
        [class.flex]="!!active()"
        [class.hidden]="!active()"
      >
        @if (activeSummary(); as c) {
          <header
            class="flex items-center gap-3 border-b border-slate-100 px-3 py-3 dark:border-slate-800 sm:px-5"
          >
            <button type="button" class="odv-icon-btn lg:hidden" aria-label="Sohbetlere dön" (click)="select(null)">
              <span class="material-symbols-rounded directional-icon">arrow_back</span>
            </button>
            <app-avatar [name]="c.name" size="sm" />
            <div class="min-w-0 flex-1">
              <strong class="block truncate text-sm">{{ c.name }}</strong>
              <span class="block text-[11px] text-slate-500"
                >{{ accessLabels[c.access.status] }} · {{ c.openTasks }} açık görev ·
                {{ c.openRequests }} açık talep</span
              >
            </div>
            <button type="button" class="odv-btn-soft hidden sm:inline-flex" (click)="qa.open('task', c.clientId)">
              <span class="material-symbols-rounded !text-base">add_task</span>Görev ata
            </button>
            <button
              type="button"
              class="odv-icon-btn"
              aria-label="Danışan profilini aç"
              (click)="qa.open('client-detail', c.clientId)"
            >
              <span class="material-symbols-rounded">person</span>
            </button>
          </header>
          <app-chat-thread
            class="min-h-0 flex-1"
            [clientId]="c.clientId"
            viewer="dietitian"
            [blocked]="!portal.canUsePortal(c.clientId)"
            (assignTask)="qa.open('task', c.clientId)"
          />
        } @else {
          <div class="grid flex-1 place-items-center">
            <app-empty-state
              icon="forum"
              title="Bir sohbet seçin"
              body="Danışanlarınızla mesajlaşın, fotoğraf ve dosya paylaşın, görev atayın."
            />
          </div>
        }
      </section>
    </div>
  `,
})
export class MessagesPage {
  /** `?client=` query parameter, bound by the router. */
  readonly client = input<string>();
  readonly portal = inject(PortalStore);
  readonly qa = inject(QuickActions);
  private readonly router = inject(Router);
  readonly accessLabels = PORTAL_ACCESS_LABELS;
  readonly query = signal('');
  readonly filter = signal<'all' | 'unread' | 'portal'>('all');
  readonly active = computed(() => this.client() ?? null);
  readonly activeSummary = computed(
    () => this.portal.conversations().find((c) => c.clientId === this.active()) ?? null,
  );

  readonly list = computed(() => {
    const q = this.query().trim().toLocaleLowerCase('tr');
    return this.portal.conversations().filter((c) => {
      if (q && !c.name.toLocaleLowerCase('tr').includes(q)) return false;
      if (this.filter() === 'unread') return c.unread > 0;
      if (this.filter() === 'portal') return c.access.status === 'active';
      return true;
    });
  });

  select(clientId: string | null): void {
    void this.router.navigate([], { queryParams: { client: clientId }, replaceUrl: true });
  }

  today(at: string): boolean {
    return isSameDay(at, new Date());
  }

  preview(m: Message | null): string {
    if (!m) return '';
    const prefix = m.author === 'dietitian' ? 'Siz: ' : '';
    if (m.body) return prefix + m.body.split('\n')[0];
    if (m.attachments.length) return `${prefix}📎 ${m.attachments.length} dosya`;
    return '';
  }
}
