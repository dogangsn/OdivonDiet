import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  template: `
    <header
      class="relative mb-6 overflow-hidden rounded-3xl border border-slate-200/80 bg-white px-5 py-5 shadow-[0_18px_55px_rgba(15,23,42,.06)] dark:border-slate-800 dark:bg-slate-900 sm:px-7 sm:py-6"
    >
      <div
        class="pointer-events-none absolute -end-16 -top-20 size-56 rounded-full bg-violet-500/10 blur-3xl"
      ></div>
      <div
        class="pointer-events-none absolute end-28 top-0 h-px w-40 bg-gradient-to-r from-transparent via-violet-500/50 to-transparent"
      ></div>
      <div class="relative flex flex-wrap items-center justify-between gap-5">
        <div class="min-w-0">
          <div
            class="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[.16em] text-violet-700 dark:border-violet-900 dark:bg-violet-950/60 dark:text-violet-300"
          >
            <span class="size-1.5 rounded-full bg-violet-500"></span>{{ eyebrow() }}
          </div>
          <div class="flex items-center gap-3">
            <span
              class="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-700 text-white shadow-lg shadow-violet-500/20"
            >
              <span class="material-symbols-rounded" aria-hidden="true">{{ icon() }}</span>
            </span>
            <div>
              <h1
                class="m-0 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl"
              >
                {{ title() }}
              </h1>
              @if (description()) {
                <p
                  class="mb-0 mt-1.5 max-w-[70ch] text-xs font-medium leading-5 text-slate-500 dark:text-slate-400 sm:text-sm"
                >
                  {{ description() }}
                </p>
              }
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2"><ng-content select="[actions]" /></div>
      </div>
    </header>
  `,
})
export class PageHeader {
  readonly eyebrow = input('');
  readonly icon = input('dashboard');
  readonly title = input.required<string>();
  readonly description = input('');
}
