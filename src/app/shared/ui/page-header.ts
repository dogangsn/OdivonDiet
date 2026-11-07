import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  host: { class: 'block' },
  template: `
    <header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div class="min-w-0">
        @if (eyebrow()) {
          <p class="mb-1.5 text-xs font-bold text-violet-600 dark:text-violet-400">
            {{ eyebrow() }}
          </p>
        }
        <h1
          class="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-[1.75rem]"
        >
          {{ title() }}
        </h1>
        @if (description()) {
          <p class="mt-1.5 max-w-[70ch] text-sm text-slate-500 dark:text-slate-400">
            {{ description() }}
          </p>
        }
      </div>
      <div class="no-print flex flex-wrap items-center gap-2">
        <ng-content select="[actions]" />
      </div>
    </header>
  `,
})
export class PageHeader {
  readonly eyebrow = input('');
  readonly title = input.required<string>();
  readonly description = input('');
}
