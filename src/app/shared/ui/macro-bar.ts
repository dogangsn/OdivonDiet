import { Component, computed, input } from '@angular/core';
import { macroGrams } from '../../domain/diet-calc';

@Component({
  selector: 'app-macro-bar',
  host: { class: 'block' },
  template: `
    <div
      class="flex h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
      role="img"
      [attr.aria-label]="'Protein %' + protein() + ', karbonhidrat %' + carb() + ', yağ %' + fat()"
    >
      <span class="bg-violet-500" [style.width.%]="protein()"></span>
      <span class="bg-sky-400" [style.width.%]="carb()"></span>
      <span class="bg-amber-400" [style.width.%]="fat()"></span>
    </div>
    @if (detailed()) {
      <div class="mt-2 grid grid-cols-3 gap-2 text-[11px]">
        <span class="flex items-center gap-1.5 text-slate-500"
          ><span class="size-2 rounded-full bg-violet-500"></span>Protein
          <b class="tabular ms-auto text-slate-800 dark:text-slate-200"
            >{{ grams().protein }} g</b
          ></span
        >
        <span class="flex items-center gap-1.5 text-slate-500"
          ><span class="size-2 rounded-full bg-sky-400"></span>Karb.
          <b class="tabular ms-auto text-slate-800 dark:text-slate-200"
            >{{ grams().carb }} g</b
          ></span
        >
        <span class="flex items-center gap-1.5 text-slate-500"
          ><span class="size-2 rounded-full bg-amber-400"></span>Yağ
          <b class="tabular ms-auto text-slate-800 dark:text-slate-200"
            >{{ grams().fat }} g</b
          ></span
        >
      </div>
    }
  `,
})
export class MacroBar {
  readonly kcal = input(0);
  readonly protein = input.required<number>();
  readonly carb = input.required<number>();
  readonly fat = input.required<number>();
  readonly detailed = input(false);
  readonly grams = computed(() => macroGrams(this.kcal(), this.protein(), this.carb(), this.fat()));
}
