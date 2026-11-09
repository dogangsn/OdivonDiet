import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormField, form, max, min, required, submit, validate } from '@angular/forms/signals';
import { DietStore } from '../../core/data/diet-store';
import { isoDate, suggestedKcal } from '../../domain/diet-calc';
import { Meal } from '../../domain/diet.models';
import { MacroBar } from '../../shared/ui/macro-bar';
import { SlideOver } from '../../shared/ui/slide-over';
import { QuickActions } from './quick-actions';
import { Notify } from '../../core/notify/notify';

interface PlanDraft {
  clientId: string;
  title: string;
  startDate: string;
  weeks: number | null;
  kcal: number | null;
  proteinPct: number | null;
  carbPct: number | null;
  fatPct: number | null;
  mealsPerDay: number;
  activate: boolean;
  notes: string;
}

const MEAL_LAYOUTS: Record<number, ReadonlyArray<[string, string, number]>> = {
  3: [
    ['Kahvaltı', '08:00', 0.3],
    ['Öğle', '13:00', 0.35],
    ['Akşam', '19:00', 0.35],
  ],
  4: [
    ['Kahvaltı', '08:00', 0.25],
    ['Öğle', '13:00', 0.3],
    ['Ara öğün', '16:00', 0.15],
    ['Akşam', '19:00', 0.3],
  ],
  5: [
    ['Kahvaltı', '08:00', 0.25],
    ['Ara öğün', '10:30', 0.1],
    ['Öğle', '13:00', 0.3],
    ['Ara öğün', '16:00', 0.1],
    ['Akşam', '19:00', 0.25],
  ],
  6: [
    ['Kahvaltı', '08:00', 0.2],
    ['Ara öğün', '10:30', 0.1],
    ['Öğle', '13:00', 0.25],
    ['Ara öğün', '16:00', 0.1],
    ['Akşam', '19:00', 0.25],
    ['Gece', '21:30', 0.1],
  ],
};

@Component({
  selector: 'app-plan-form',
  imports: [SlideOver, FormField, MacroBar],
  template: `
    <app-slide-over
      [open]="open()"
      [wide]="true"
      [dirty]="!!model().title || !!model().notes"
      icon="restaurant_menu"
      eyebrow="Beslenme planı"
      title="Yeni plan oluştur"
      description="Enerji hedefi danışanın günlük ihtiyacından önerilir; dilediğiniz gibi değiştirin."
      submitLabel="Planı kaydet"
      (closed)="qa.close()"
      (submitted)="save()"
    >
      <div class="odv-card space-y-4 p-5">
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="block">
            <span class="odv-label">Danışan <b class="text-rose-500">*</b></span>
            <select class="odv-input" [formField]="f.clientId">
              <option value="" disabled>Danışan seçin</option>
              @for (view of store.activeClients(); track view.client.id) {
                <option [value]="view.client.id">{{ view.fullName }}</option>
              }
            </select>
            @if (f.clientId().touched() && f.clientId().invalid()) {
              <span class="odv-error">Danışan seçin.</span>
            }
          </label>
          <label class="block">
            <span class="odv-label">Plan adı <b class="text-rose-500">*</b></span>
            <input class="odv-input" [formField]="f.title" placeholder="Örn. Kilo verme · Faz 1" />
            @if (f.title().touched() && f.title().invalid()) {
              <span class="odv-error">Plan adı zorunludur.</span>
            }
          </label>
          <label class="block">
            <span class="odv-label">Başlangıç</span>
            <input class="odv-input" type="date" [formField]="f.startDate" />
          </label>
          <label class="block">
            <span class="odv-label">Süre (hafta)</span>
            <input class="odv-input tabular" type="number" [formField]="f.weeks" />
          </label>
        </div>
        @if (allergyNote(); as note) {
          <p
            class="flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
          >
            <span class="material-symbols-rounded !text-base">warning</span>{{ note }}
          </p>
        }
      </div>

      <div class="odv-card space-y-4 p-5">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <label class="block min-w-40 flex-1">
            <span class="odv-label">Günlük enerji (kcal) <b class="text-rose-500">*</b></span>
            <input
              class="odv-input tabular !text-lg !font-bold"
              type="number"
              step="10"
              [formField]="f.kcal"
            />
          </label>
          @if (suggestion(); as s) {
            <button type="button" class="odv-btn-soft" (click)="applySuggestion(s.kcal)">
              <span class="material-symbols-rounded !text-base">auto_awesome</span>Önerilen:
              {{ s.kcal }} kcal
            </button>
          }
        </div>
        @if (suggestion(); as s) {
          <p class="text-[11px] text-slate-500">
            Günlük ihtiyaç {{ s.tdee }} kcal · program: {{ s.program }}
          </p>
        }
        <div class="grid grid-cols-3 gap-3">
          <label class="block">
            <span class="odv-label"
              ><span class="me-1 inline-block size-2 rounded-full bg-violet-500"></span>Protein
              %</span
            >
            <input class="odv-input tabular" type="number" [formField]="f.proteinPct" />
          </label>
          <label class="block">
            <span class="odv-label"
              ><span class="me-1 inline-block size-2 rounded-full bg-sky-400"></span>Karbonhidrat
              %</span
            >
            <input class="odv-input tabular" type="number" [formField]="f.carbPct" />
          </label>
          <label class="block">
            <span class="odv-label"
              ><span class="me-1 inline-block size-2 rounded-full bg-amber-400"></span>Yağ %</span
            >
            <input class="odv-input tabular" type="number" [formField]="f.fatPct" />
          </label>
        </div>
        <app-macro-bar
          [kcal]="model().kcal ?? 0"
          [protein]="model().proteinPct ?? 0"
          [carb]="model().carbPct ?? 0"
          [fat]="model().fatPct ?? 0"
          [detailed]="true"
        />
        @if (macroTotal() !== 100) {
          <span class="odv-error"
            >Makro oranlarının toplamı %100 olmalı (şu an %{{ macroTotal() }}).</span
          >
        }
      </div>

      <div class="odv-card space-y-4 p-5">
        <div>
          <span class="odv-label" id="meals-label">Öğün sayısı</span>
          <div class="odv-segment" role="group" aria-labelledby="meals-label">
            @for (n of [3, 4, 5, 6]; track n) {
              <button
                type="button"
                class="odv-segment-item"
                [attr.aria-pressed]="model().mealsPerDay === n"
                (click)="setMeals(n)"
              >
                {{ n }} öğün
              </button>
            }
          </div>
        </div>
        <ul
          class="divide-y divide-slate-100 rounded-xl border border-slate-100 dark:divide-slate-800 dark:border-slate-800"
        >
          @for (meal of meals(); track $index) {
            <li class="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span class="tabular w-12 text-xs font-semibold text-slate-400">{{ meal.time }}</span>
              <span class="font-semibold">{{ meal.name }}</span>
              <span class="tabular ms-auto text-xs font-bold text-slate-500"
                >{{ meal.kcal }} kcal</span
              >
            </li>
          }
        </ul>
        <label class="block">
          <span class="odv-label">Notlar</span>
          <textarea
            class="odv-input min-h-20 resize-y"
            [formField]="f.notes"
            placeholder="Besin tercihleri, kaçınılacaklar, su hedefi…"
          ></textarea>
        </label>
        <label class="flex items-center gap-3 text-sm">
          <input type="checkbox" class="size-4 accent-violet-600" [formField]="f.activate" />
          <span
            ><strong>Hemen aktifleştir.</strong>
            <span class="text-slate-500"
              >Danışanın mevcut aktif planı tamamlandı olarak kapanır.</span
            ></span
          >
        </label>
      </div>
    </app-slide-over>
  `,
})
export class PlanForm {
  readonly qa = inject(QuickActions);
  readonly store = inject(DietStore);
  private readonly notify = inject(Notify);
  readonly open = computed(() => this.qa.state()?.kind === 'plan');
  readonly model = signal<PlanDraft>(this.empty());
  readonly f = form(this.model, (p) => {
    required(p.clientId);
    required(p.title);
    required(p.startDate);
    required(p.weeks);
    min(p.weeks, 1);
    max(p.weeks, 52);
    required(p.kcal);
    min(p.kcal, 800);
    max(p.kcal, 6000);
    validate(p.proteinPct, ({ valueOf }) => {
      const total =
        (valueOf(p.proteinPct) ?? 0) + (valueOf(p.carbPct) ?? 0) + (valueOf(p.fatPct) ?? 0);
      return total === 100 ? null : { kind: 'macroTotal' };
    });
  });
  readonly macroTotal = computed(() => {
    const v = this.model();
    return (v.proteinPct ?? 0) + (v.carbPct ?? 0) + (v.fatPct ?? 0);
  });
  readonly suggestion = computed(() => {
    const view = this.store.view(this.model().clientId);
    if (!view) return null;
    return {
      kcal: suggestedKcal(view.tdee, view.client.program),
      tdee: view.tdee,
      program: view.client.program,
    };
  });
  readonly allergyNote = computed(() => {
    const view = this.store.view(this.model().clientId);
    if (!view) return '';
    const list = [...view.client.allergies, ...view.client.conditions];
    return list.length ? `Dikkat: ${list.join(', ')}` : '';
  });
  readonly meals = computed<Meal[]>(() => {
    const kcal = this.model().kcal ?? 0;
    return (MEAL_LAYOUTS[this.model().mealsPerDay] ?? MEAL_LAYOUTS[5]).map(
      ([name, time, share]) => ({
        name,
        time,
        kcal: Math.round(kcal * share),
      }),
    );
  });

  constructor() {
    effect(() => {
      if (!this.open()) return;
      const clientId = this.qa.state()?.clientId ?? '';
      untracked(() => {
        const view = clientId ? this.store.view(clientId) : undefined;
        this.model.set({
          ...this.empty(),
          clientId,
          kcal: view ? suggestedKcal(view.tdee, view.client.program) : null,
        });
        this.f().reset();
      });
    });
  }

  applySuggestion(kcal: number): void {
    this.model.update((v) => ({ ...v, kcal }));
  }

  setMeals(n: number): void {
    this.model.update((v) => ({ ...v, mealsPerDay: n }));
  }

  save(): void {
    void submit(this.f, async () => {
      const v = this.model();
      const end = new Date(v.startDate);
      end.setDate(end.getDate() + v.weeks! * 7);
      this.store.savePlan({
        clientId: v.clientId,
        title: v.title.trim(),
        startDate: v.startDate,
        endDate: isoDate(end),
        kcal: v.kcal!,
        proteinPct: v.proteinPct!,
        carbPct: v.carbPct!,
        fatPct: v.fatPct!,
        meals: this.meals(),
        status: v.activate ? 'active' : 'draft',
        notes: v.notes.trim(),
      });
      this.notify.success(v.activate ? 'Plan kaydedildi ve aktifleştirildi' : 'Plan taslak olarak kaydedildi', v.title.trim());
      this.qa.close();
    });
  }

  private empty(): PlanDraft {
    return {
      clientId: '',
      title: '',
      startDate: isoDate(new Date()),
      weeks: 4,
      kcal: null,
      proteinPct: 25,
      carbPct: 45,
      fatPct: 30,
      mealsPerDay: 5,
      activate: true,
      notes: '',
    };
  }
}
