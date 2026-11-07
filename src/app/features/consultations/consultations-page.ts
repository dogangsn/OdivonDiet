import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import Swal from 'sweetalert2';
import { DietStore } from '../../core/data/diet-store';
import { isoDate, startOfDay } from '../../domain/diet-calc';
import { CHANNEL_ICONS, CHANNEL_LABELS, Consultation } from '../../domain/diet.models';
import { Avatar } from '../../shared/ui/avatar';
import { EmptyState } from '../../shared/ui/empty-state';
import { PageHeader } from '../../shared/ui/page-header';
import { QuickActions } from '../forms/quick-actions';

@Component({
  selector: 'app-consultations-page',
  imports: [PageHeader, Avatar, EmptyState, DatePipe],
  template: `
    <div class="animate-fade-up space-y-6">
      <app-page-header
        eyebrow="Danışan takibi"
        title="Takip görüşmeleri"
        description="Randevuları planlayın, görüşme notlarını ve plana uyumu kaydedin."
      >
        <button actions type="button" class="odv-btn-primary" (click)="qa.open('consultation')">
          <span class="material-symbols-rounded !text-lg">event</span>Görüşme planla
        </button>
      </app-page-header>

      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="odv-segment" role="group" aria-label="Görüşme listesi">
          <button
            type="button"
            class="odv-segment-item"
            [attr.aria-pressed]="tab() === 'upcoming'"
            (click)="tab.set('upcoming')"
          >
            Yaklaşan <span class="tabular text-slate-400">{{ upcomingCount() }}</span>
          </button>
          <button
            type="button"
            class="odv-segment-item"
            [attr.aria-pressed]="tab() === 'past'"
            (click)="tab.set('past')"
          >
            Geçmiş
          </button>
        </div>
      </div>

      @for (group of groups(); track group.key) {
        <section [attr.aria-label]="group.label">
          <h2
            class="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500"
          >
            {{ group.label }}
            @if (group.today) {
              <span class="odv-badge odv-tone-primary normal-case tracking-normal">Bugün</span>
            }
          </h2>
          <ul class="odv-card divide-y divide-slate-100 overflow-hidden dark:divide-slate-800">
            @for (item of group.items; track item.id) {
              <li class="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                <div class="flex min-w-0 flex-1 items-center gap-4">
                  <strong class="tabular w-12 shrink-0 text-sm">{{
                    item.at | date: 'HH:mm'
                  }}</strong>
                  <app-avatar [name]="store.clientName(item.clientId)" size="sm" />
                  <div class="min-w-0 flex-1">
                    <button
                      type="button"
                      class="truncate text-sm font-bold hover:text-violet-600"
                      (click)="qa.open('client-detail', item.clientId)"
                    >
                      {{ store.clientName(item.clientId) }}
                    </button>
                    <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span class="inline-flex items-center gap-1"
                        ><span class="material-symbols-rounded !text-sm">{{
                          icons[item.channel]
                        }}</span
                        >{{ labels[item.channel] }}</span
                      >
                      @if (item.notes) {
                        <span class="truncate">{{ item.notes }}</span>
                      }
                    </div>
                    @if (item.nextAction) {
                      <p class="mt-1 text-xs font-semibold text-violet-600 dark:text-violet-300">
                        → {{ item.nextAction }}
                      </p>
                    }
                  </div>
                </div>
                <div class="flex shrink-0 items-center gap-2 sm:justify-end">
                  @switch (item.status) {
                    @case ('scheduled') {
                      <button
                        type="button"
                        class="odv-btn-ghost !min-h-9 text-xs"
                        (click)="cancel(item)"
                      >
                        İptal
                      </button>
                      <button
                        type="button"
                        class="odv-btn-soft"
                        (click)="qa.open('consultation-complete', item.clientId, item.id)"
                      >
                        <span class="material-symbols-rounded !text-base">task_alt</span>Tamamla
                      </button>
                    }
                    @case ('done') {
                      @if (item.adherence) {
                        <span
                          class="odv-badge odv-tone-warning"
                          [attr.aria-label]="'Uyum ' + item.adherence + ' / 5'"
                        >
                          @for (n of [1, 2, 3, 4, 5]; track n) {
                            <span
                              class="material-symbols-rounded !text-[13px]"
                              [class.icon-fill]="n <= item.adherence"
                              [class.opacity-30]="n > item.adherence"
                              >star</span
                            >
                          }
                        </span>
                      }
                      <span class="odv-badge odv-tone-positive">Tamamlandı</span>
                    }
                    @case ('cancelled') {
                      <span class="odv-badge odv-tone-neutral">İptal edildi</span>
                    }
                  }
                </div>
              </li>
            }
          </ul>
        </section>
      } @empty {
        <div class="odv-card">
          <app-empty-state
            icon="event_available"
            [title]="tab() === 'upcoming' ? 'Yaklaşan görüşme yok' : 'Geçmiş görüşme yok'"
            body="Yeni bir takip görüşmesi planlayın."
          >
            <button type="button" class="odv-btn-primary" (click)="qa.open('consultation')">
              Görüşme planla
            </button>
          </app-empty-state>
        </div>
      }
    </div>
  `,
})
export class ConsultationsPage {
  readonly store = inject(DietStore);
  readonly qa = inject(QuickActions);
  readonly labels = CHANNEL_LABELS;
  readonly icons = CHANNEL_ICONS;
  readonly tab = signal<'upcoming' | 'past'>('upcoming');

  private readonly isUpcoming = (c: Consultation) =>
    c.status === 'scheduled' ||
    (c.status !== 'cancelled' && new Date(c.at) >= startOfDay(new Date()));

  readonly upcomingCount = computed(
    () => this.store.consultations().filter((c) => c.status === 'scheduled').length,
  );

  readonly groups = computed(() => {
    const upcoming = this.tab() === 'upcoming';
    const list = this.store
      .consultations()
      .filter((c) => (upcoming ? this.isUpcoming(c) : !this.isUpcoming(c)))
      .sort((a, b) => (upcoming ? a.at.localeCompare(b.at) : b.at.localeCompare(a.at)));
    const fmt = new Intl.DateTimeFormat('tr-TR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    const todayKey = isoDate(new Date());
    const map = new Map<
      string,
      { key: string; label: string; today: boolean; items: Consultation[] }
    >();
    for (const item of list) {
      const key = isoDate(new Date(item.at));
      if (!map.has(key)) {
        map.set(key, {
          key,
          label: fmt.format(new Date(item.at)),
          today: key === todayKey,
          items: [],
        });
      }
      map.get(key)!.items.push(item);
    }
    return [...map.values()];
  });

  async cancel(item: Consultation): Promise<void> {
    const result = await Swal.fire({
      title: 'Görüşme iptal edilsin mi?',
      text: `${this.store.clientName(item.clientId)} ile planlanan görüşme iptal edilecek.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'İptal et',
      cancelButtonText: 'Vazgeç',
      customClass: {
        popup: 'odv-swal-popup',
        confirmButton: 'odv-swal-danger',
        cancelButton: 'odv-swal-cancel',
      },
    });
    if (result.isConfirmed) this.store.cancelConsultation(item.id);
  }
}
