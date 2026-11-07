import { Component, computed, input } from '@angular/core';
import { Tone } from '../../domain/diet.models';
import { TONE_ICON_BG } from './tone';

@Component({
  selector: 'app-kpi-card',
  host: { class: 'block' },
  template: `
    <article class="odv-card h-full p-4 sm:p-5">
      <div class="flex items-start justify-between gap-3">
        <span class="odv-eyebrow">{{ label() }}</span>
        <span
          class="grid size-9 shrink-0 place-items-center rounded-xl sm:size-10"
          [class]="iconBg()"
        >
          <span class="material-symbols-rounded" aria-hidden="true">{{ icon() }}</span>
        </span>
      </div>
      <div class="mt-2 flex items-baseline gap-1.5">
        <strong
          class="tabular text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl"
          >{{ value() }}</strong
        >
        @if (unit()) {
          <span class="text-sm font-semibold text-slate-400">{{ unit() }}</span>
        }
      </div>
      @if (hint()) {
        <p
          class="mt-3 border-t border-slate-100 pt-3 text-[11px] sm:text-xs font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400"
        >
          {{ hint() }}
        </p>
      }
    </article>
  `,
})
export class KpiCard {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly unit = input('');
  readonly hint = input('');
  readonly icon = input('monitoring');
  readonly tone = input<Tone>('primary');
  readonly iconBg = computed(() => TONE_ICON_BG[this.tone()]);
}
