import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthStore } from '../../core/auth/auth-store';
import { DietStore } from '../../core/data/diet-store';
import { PortalStore } from '../../core/data/portal-store';
import {
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_TONES,
  REQUEST_TYPE_ICONS,
  REQUEST_TYPE_LABELS,
  RequestStatus,
} from '../../domain/portal.models';
import { AttachmentList } from '../../shared/ui/attachment-list';
import { Avatar } from '../../shared/ui/avatar';
import { EmptyState } from '../../shared/ui/empty-state';
import { PageHeader } from '../../shared/ui/page-header';
import { SlideOver } from '../../shared/ui/slide-over';
import { toneClass } from '../../shared/ui/tone';

type Filter = 'active' | 'closed' | 'all';

@Component({
  selector: 'app-requests-page',
  imports: [PageHeader, Avatar, EmptyState, SlideOver, AttachmentList, DatePipe, RouterLink],
  template: `
    <div class="animate-fade-up space-y-6">
      <app-page-header
        eyebrow="Danışan portalı"
        title="Danışan talepleri"
        description="Danışanlarınızın portaldan ilettiği randevu, plan değişikliği ve belge taleplerini yanıtlayın."
      />

      <div class="odv-segment" role="group" aria-label="Talep filtresi">
        <button type="button" class="odv-segment-item" [attr.aria-pressed]="filter() === 'active'" (click)="filter.set('active')">
          Bekleyen <span class="tabular text-slate-400">{{ activeCount() }}</span>
        </button>
        <button type="button" class="odv-segment-item" [attr.aria-pressed]="filter() === 'closed'" (click)="filter.set('closed')">
          Sonuçlanan
        </button>
        <button type="button" class="odv-segment-item" [attr.aria-pressed]="filter() === 'all'" (click)="filter.set('all')">
          Tümü
        </button>
      </div>

      <ul class="odv-card divide-y divide-slate-100 overflow-hidden dark:divide-slate-800">
        @for (r of list(); track r.id) {
          <li>
            <button
              type="button"
              class="flex w-full flex-col gap-3 px-5 py-4 text-start transition hover:bg-slate-50 sm:flex-row sm:items-center dark:hover:bg-slate-800/60"
              (click)="openRequest(r.id)"
            >
              <span
                class="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300"
                ><span class="material-symbols-rounded" aria-hidden="true">{{ typeIcons[r.type] }}</span></span
              >
              <span class="min-w-0 flex-1">
                <span class="flex flex-wrap items-center gap-2">
                  <strong class="text-sm">{{ r.subject }}</strong>
                  <span class="odv-badge" [class]="tone(r.status)">{{ statusLabels[r.status] }}</span>
                </span>
                <span class="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
                  <span class="inline-flex items-center gap-1.5"
                    ><app-avatar [name]="diet.clientName(r.clientId)" size="sm" />{{
                      diet.clientName(r.clientId)
                    }}</span
                  >
                  <span>{{ typeLabels[r.type] }}</span>
                  <span>{{ r.createdAt | date: 'd MMM, HH:mm' }}</span>
                  @if (r.attachments.length) {
                    <span class="inline-flex items-center gap-1"
                      ><span class="material-symbols-rounded !text-sm" aria-hidden="true">attach_file</span
                      >{{ r.attachments.length }} dosya</span
                    >
                  }
                </span>
              </span>
              <span class="material-symbols-rounded directional-icon hidden text-slate-400 sm:block" aria-hidden="true"
                >chevron_right</span
              >
            </button>
          </li>
        } @empty {
          <li>
            <app-empty-state
              icon="inbox"
              title="Talep yok"
              body="Danışanlarınız portaldan talep oluşturduğunda burada görünür."
            />
          </li>
        }
      </ul>
    </div>

    <app-slide-over
      [open]="!!selected()"
      icon="inbox"
      eyebrow="Danışan talebi"
      [title]="selected()?.subject ?? 'Talep'"
      [dirty]="!!response().trim()"
      submitLabel="Yanıtı gönder"
      (closed)="openRequest(null)"
      (submitted)="respond()"
    >
      @if (selected(); as r) {
        <div class="odv-card space-y-3 p-5">
          <div class="flex flex-wrap items-center gap-2">
            <app-avatar [name]="diet.clientName(r.clientId)" size="sm" />
            <strong class="text-sm">{{ diet.clientName(r.clientId) }}</strong>
            <span class="odv-badge" [class]="tone(r.status)">{{ statusLabels[r.status] }}</span>
            <span class="text-xs text-slate-500">{{ typeLabels[r.type] }} · {{ r.createdAt | date: 'd MMM y, HH:mm' }}</span>
          </div>
          <p class="whitespace-pre-line text-sm text-slate-700 dark:text-slate-200">{{ r.detail || '—' }}</p>
          @if (r.attachments.length) {
            <app-attachment-list [attachments]="r.attachments" />
          }
          @if (r.response) {
            <div class="rounded-xl bg-violet-50 p-3 text-sm dark:bg-violet-950/40">
              <span class="odv-eyebrow">Son yanıtınız</span>
              <p class="mt-1 whitespace-pre-line">{{ r.response }}</p>
            </div>
          }
          <a class="odv-btn-soft" routerLink="/messages" [queryParams]="{ client: r.clientId }">
            <span class="material-symbols-rounded !text-base">forum</span>Sohbete git
          </a>
        </div>

        <div class="odv-card space-y-4 p-5">
          <fieldset>
            <legend class="odv-label">Yeni durum</legend>
            <div class="odv-segment flex-wrap">
              @for (s of statuses; track s) {
                <button type="button" class="odv-segment-item" [attr.aria-pressed]="status() === s" (click)="status.set(s)">
                  {{ statusLabels[s] }}
                </button>
              }
            </div>
          </fieldset>
          <label class="block">
            <span class="odv-label">Yanıtınız</span>
            <textarea
              class="odv-input min-h-28 resize-y"
              placeholder="Yanıt danışanın sohbetine ve talep kartına düşer."
              [value]="response()"
              (input)="response.set($any($event.target).value)"
            ></textarea>
          </label>
        </div>
      }
    </app-slide-over>
  `,
})
export class RequestsPage {
  /** `?id=` query parameter: the request to open. */
  readonly id = input<string>();
  readonly diet = inject(DietStore);
  private readonly portal = inject(PortalStore);
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  readonly typeIcons = REQUEST_TYPE_ICONS;
  readonly typeLabels = REQUEST_TYPE_LABELS;
  readonly statusLabels = REQUEST_STATUS_LABELS;
  readonly statuses: RequestStatus[] = ['in_progress', 'resolved', 'rejected'];
  readonly filter = signal<Filter>('active');
  readonly status = signal<RequestStatus>('resolved');
  readonly response = signal('');

  readonly activeCount = computed(
    () => this.portal.requests().filter((r) => r.status === 'open' || r.status === 'in_progress').length,
  );

  readonly list = computed(() => {
    const filter = this.filter();
    return [...this.portal.requests()]
      .filter((r) => {
        const open = r.status === 'open' || r.status === 'in_progress';
        return filter === 'all' || (filter === 'active' ? open : !open);
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });

  readonly selected = computed(() => {
    const id = this.id();
    return id ? (this.portal.request(id) ?? null) : null;
  });

  constructor() {
    effect(() => {
      const r = this.selected();
      untracked(() => {
        this.response.set('');
        this.status.set(r?.status === 'open' ? 'in_progress' : (r?.status ?? 'resolved'));
      });
    });
  }

  tone(status: RequestStatus): string {
    return toneClass(REQUEST_STATUS_TONES[status]);
  }

  openRequest(id: string | null): void {
    void this.router.navigate([], { queryParams: { id }, replaceUrl: true });
  }

  respond(): void {
    const r = this.selected();
    if (!r) return;
    this.portal.respondToRequest(r.id, this.status(), this.response(), this.auth.session()?.name ?? 'Diyetisyen');
    this.openRequest(null);
  }
}
