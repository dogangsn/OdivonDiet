import { Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  host: { class: 'block' },
  template: `
    <div class="px-6 py-14 text-center">
      <span
        class="mx-auto grid size-14 place-items-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800"
      >
        <span class="material-symbols-rounded !text-3xl" aria-hidden="true">{{ icon() }}</span>
      </span>
      <h3 class="mt-4 text-sm font-bold text-slate-900 dark:text-white">{{ title() }}</h3>
      @if (body()) {
        <p class="mx-auto mt-1 max-w-sm text-xs text-slate-500">{{ body() }}</p>
      }
      <div class="mt-4 flex justify-center"><ng-content /></div>
    </div>
  `,
})
export class EmptyState {
  readonly icon = input('inbox');
  readonly title = input.required<string>();
  readonly body = input('');
}
