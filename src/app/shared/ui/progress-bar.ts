import { Component, input } from '@angular/core';

@Component({
  selector: 'app-progress-bar',
  host: { class: 'block' },
  template: `
    <div
      class="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
      role="progressbar"
      [attr.aria-valuenow]="value()"
      aria-valuemin="0"
      aria-valuemax="100"
      [attr.aria-label]="label()"
    >
      <div
        class="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-[width] duration-500"
        [style.width.%]="value()"
      ></div>
    </div>
  `,
})
export class ProgressBar {
  readonly value = input.required<number>();
  readonly label = input('İlerleme');
}
