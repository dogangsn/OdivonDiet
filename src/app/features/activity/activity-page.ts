import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { DietStore } from '../../core/data/diet-store';
import { EmptyState } from '../../shared/ui/empty-state';
import { PageHeader } from '../../shared/ui/page-header';
import { TONE_ICON_BG } from '../../shared/ui/tone';

@Component({
  selector: 'app-activity-page',
  imports: [PageHeader, EmptyState, DatePipe],
  template: `
    <div class="animate-fade-up space-y-6">
      <app-page-header
        eyebrow="Sistem"
        title="Aktiviteler"
        description="Çalışma alanında yapılan son işlemler."
      />
      <section class="odv-card p-5 sm:p-6">
        <ol class="relative space-y-6 border-s border-slate-200 ps-6 dark:border-slate-800">
          @for (item of store.activity(); track item.id) {
            <li class="relative">
              <span
                class="absolute -start-[2.45rem] grid size-8 place-items-center rounded-full ring-4 ring-white dark:ring-slate-900"
                [class]="toneBg[item.tone]"
              >
                <span class="material-symbols-rounded !text-base">{{ item.icon }}</span>
              </span>
              <div class="flex flex-wrap items-baseline justify-between gap-2">
                <strong class="text-sm">{{ item.title }}</strong>
                <time class="text-xs text-slate-400">{{ item.at | date: 'd MMMM, HH:mm' }}</time>
              </div>
              <p class="mt-0.5 text-xs text-slate-500">{{ item.detail }}</p>
            </li>
          } @empty {
            <li><app-empty-state icon="history" title="Henüz işlem yok" /></li>
          }
        </ol>
      </section>
    </div>
  `,
})
export class ActivityPage {
  readonly store = inject(DietStore);
  readonly toneBg = TONE_ICON_BG;
}
