import { Component, computed, input } from '@angular/core';
import { initials } from '../../domain/diet-calc';

const PALETTE = [
  'from-violet-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-sky-500 to-blue-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-fuchsia-500 to-purple-600',
];

@Component({
  selector: 'app-avatar',
  host: { class: 'inline-flex shrink-0' },
  template: `
    <span
      aria-hidden="true"
      class="grid place-items-center rounded-full bg-gradient-to-br font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-900"
      [class]="gradient()"
      [class.size-8]="size() === 'sm'"
      [class.text-[11px]]="size() === 'sm'"
      [class.size-10]="size() === 'md'"
      [class.text-xs]="size() === 'md'"
      [class.size-16]="size() === 'lg'"
      [class.text-xl]="size() === 'lg'"
      >{{ letters() }}</span
    >
  `,
})
export class Avatar {
  readonly name = input.required<string>();
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly letters = computed(() => initials(this.name()));
  readonly gradient = computed(() => {
    let hash = 0;
    for (const ch of this.name()) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    return PALETTE[hash % PALETTE.length];
  });
}
