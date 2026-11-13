import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MemberPortal } from '../../core/data/member-portal';
import { Notify } from '../../core/notify/notify';
import { isoDate } from '../../domain/diet-calc';
import { CHANNEL_ICONS, CHANNEL_LABELS } from '../../domain/diet.models';
import { TASK_CATEGORY_ICONS } from '../../domain/portal.models';
import { EmptyState } from '../../shared/ui/empty-state';
import { ProgressBar } from '../../shared/ui/progress-bar';
import { toneClass } from '../../shared/ui/tone';
import { ConsentCard } from './consent-card';

interface DailyHabitState {
  readonly waterGlasses: number;
  readonly completedMeals: number[];
  readonly mood: 'great' | 'good' | 'tired' | null;
}

@Component({
  selector: 'app-portal-home',
  imports: [RouterLink, DatePipe, DecimalPipe, ProgressBar, EmptyState, ConsentCard],
  template: `
    @if (member.view(); as v) {
      <div class="animate-fade-up space-y-6">
        <header class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p class="text-xs font-bold text-emerald-700 dark:text-emerald-400">{{ greeting() }}</p>
            <h1 class="text-2xl font-extrabold tracking-tight sm:text-[1.75rem]">
              {{ v.client.firstName }}, bugün de hedefinize bir adım daha yakınsınız.
            </h1>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <span
              class="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3.5 py-1.5 text-xs font-extrabold text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-800"
            >
              <span class="material-symbols-rounded icon-fill !text-base text-amber-500" aria-hidden="true"
                >local_fire_department</span
              >
              {{ streakDays() }} Günlük Seri
            </span>
            <span
              class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1.5 text-xs font-extrabold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-800"
            >
              <span class="material-symbols-rounded !text-base" aria-hidden="true">verified</span>
              Bugünkü Uyum: %{{ dailyAdherencePct() }}
            </span>
          </div>
        </header>

        @if (!v.client.consentAt) {
          <app-consent-card />
        }

        <section class="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Özet">
          <div class="odv-card p-4">
            <span class="odv-eyebrow">Güncel kilo</span>
            <strong class="tabular mt-1 block text-2xl font-extrabold"
              >{{ v.currentWeightKg | number: '1.0-1' }}
              <small class="text-xs text-slate-400">kg</small></strong
            >
            <span
              class="text-xs font-semibold"
              [class.text-emerald-600]="changeGood()"
              [class.text-amber-600]="!changeGood()"
              >{{ v.changeKg > 0 ? '+' : '' }}{{ v.changeKg | number: '1.0-1' }} kg
              başlangıçtan</span
            >
          </div>
          <div class="odv-card p-4">
            <span class="odv-eyebrow">Hedef · {{ v.client.targetWeightKg }} kg</span>
            <strong class="tabular mt-1 block text-2xl font-extrabold">%{{ v.progress }}</strong>
            <app-progress-bar class="mt-2" [value]="v.progress" label="Hedefe ilerleme" />
          </div>
          <div class="odv-card p-4">
            <span class="odv-eyebrow">Beden kitle indeksi</span>
            <strong class="tabular mt-1 block text-2xl font-extrabold">{{
              v.bmi | number: '1.1-1'
            }}</strong>
            <span class="odv-badge mt-0.5" [class]="bmiTone()">{{ v.bmiBand.label }}</span>
          </div>
          <div class="odv-card p-4">
            <span class="odv-eyebrow">Günlük hedef</span>
            <strong class="tabular mt-1 block text-2xl font-extrabold"
              >{{ v.activePlan?.kcal ?? v.tdee }}
              <small class="text-xs text-slate-400">kcal</small></strong
            >
            <span class="text-xs text-slate-500">{{
              v.activePlan ? 'Planınıza göre' : 'Tahmini ihtiyaç'
            }}</span>
          </div>
        </section>

        <!-- Günlük Su Takibi & Hızlı Check-in -->
        <section
          class="grid gap-4 md:grid-cols-2"
          aria-label="Günlük su ve enerji takibi"
        >
          <div class="odv-card flex flex-col justify-between p-5">
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-center gap-3">
                <span
                  class="grid size-11 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-300"
                >
                  <span class="material-symbols-rounded icon-fill" aria-hidden="true">water_drop</span>
                </span>
                <div>
                  <h2 class="text-sm font-extrabold">Günlük Su Takibi</h2>
                  <p class="text-xs text-slate-500">
                    Hedef: {{ waterTargetMl() }} ml ({{ waterTargetGlasses() }} bardak)
                  </p>
                </div>
              </div>
              <div class="text-end">
                <strong class="tabular text-lg font-extrabold text-sky-600 dark:text-sky-400">
                  {{ waterGlasses() * 250 }} ml
                </strong>
                <span class="block text-[11px] text-slate-400">
                  {{ waterGlasses() }} / {{ waterTargetGlasses() }} bardak
                </span>
              </div>
            </div>

            <div class="my-3">
              <app-progress-bar
                [value]="waterPct()"
                label="Günlük su hedefi ilerlemesi"
              />
            </div>

            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-1.5">
                <button
                  type="button"
                  class="odv-btn-ghost !min-h-8 !px-2.5 text-xs"
                  (click)="addWater(-1)"
                  [disabled]="waterGlasses() === 0"
                  aria-label="Bir bardak su eksilt"
                >
                  −250 ml
                </button>
                <button
                  type="button"
                  class="odv-btn-soft !min-h-8 !px-3 text-xs font-bold"
                  (click)="addWater(1)"
                >
                  <span class="material-symbols-rounded !text-base" aria-hidden="true">add</span>
                  +1 Bardak (250 ml)
                </button>
              </div>
              @if (waterGlasses() >= waterTargetGlasses()) {
                <span class="odv-badge odv-tone-positive">Günlük su hedefi tamam! 💧</span>
              }
            </div>
          </div>

          <div class="odv-card flex flex-col justify-between p-5">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h2 class="text-sm font-extrabold">Günlük Enerji & Tartı Check-in</h2>
                <p class="text-xs text-slate-500">
                  Bugün kendinizi nasıl hissediyorsunuz? Diyetisyeninizle anında paylaşın.
                </p>
              </div>
              <span class="odv-badge odv-tone-primary">Canlı Takip</span>
            </div>

            <div class="my-3 flex flex-wrap gap-2" role="group" aria-label="Günlük enerji durumu">
              @for (m of moodOptions; track m.key) {
                <button
                  type="button"
                  (click)="setMood(m.key)"
                  [attr.aria-pressed]="mood() === m.key"
                  class="flex-1 rounded-xl border px-3 py-2 text-xs font-bold transition"
                  [class]="
                    mood() === m.key
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950/60 dark:text-emerald-200'
                      : 'border-slate-200 bg-slate-50/70 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300'
                  "
                >
                  {{ m.label }}
                </button>
              }
            </div>

            <form class="flex items-center gap-2" (submit)="quickWeightSubmit($event, wInput.value)">
              <label class="sr-only" for="quick-weight-input">Sabah tartı sonucu (kg)</label>
              <input
                #wInput
                id="quick-weight-input"
                type="number"
                step="0.1"
                min="30"
                max="250"
                [value]="v.currentWeightKg"
                class="odv-input !py-1.5 text-xs"
                placeholder="Örn. 67.8 kg"
              />
              <button type="submit" class="odv-btn-primary shrink-0 !min-h-8 !px-3 text-xs">
                Tartı Kaydet
              </button>
            </form>
          </div>
        </section>

        <div class="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <section class="odv-card p-5">
            <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 class="odv-section-title">Bugünkü öğünleriniz</h2>
                <p class="text-xs text-slate-500">
                  Tükettiğiniz öğünleri işaretleyin; muadil besinleri görmek için öğüne dokunun.
                </p>
              </div>
              <a routerLink="/portal/plan" class="odv-btn-soft">Planın tamamı</a>
            </div>
            @if (v.activePlan; as plan) {
              <ol class="space-y-2.5">
                @for (meal of plan.meals; track $index) {
                  <li
                    class="rounded-xl p-3 text-sm transition"
                    [class]="
                      isMealDone($index)
                        ? 'bg-emerald-50/80 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:ring-emerald-900/60'
                        : isCurrentMeal($index)
                          ? 'bg-violet-50/70 ring-1 ring-violet-200 dark:bg-violet-950/30 dark:ring-violet-900'
                          : 'bg-slate-50 dark:bg-slate-800/60'
                    "
                  >
                    <div class="flex items-center gap-3">
                      <button
                        type="button"
                        (click)="toggleMealDone($index)"
                        [attr.aria-pressed]="isMealDone($index)"
                        [attr.aria-label]="meal.name + ' öğününü tamamlandı olarak işaretle'"
                        class="grid size-7 shrink-0 place-items-center rounded-lg border transition"
                        [class]="
                          isMealDone($index)
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-slate-300 bg-white text-transparent hover:border-emerald-500 dark:border-slate-700 dark:bg-slate-900'
                        "
                      >
                        <span class="material-symbols-rounded !text-base" aria-hidden="true"
                          >check</span
                        >
                      </button>
                      <span class="tabular w-12 font-semibold text-slate-500">{{ meal.time }}</span>
                      <strong
                        class="flex-1"
                        [class.line-through]="isMealDone($index)"
                        [class.text-slate-400]="isMealDone($index)"
                      >
                        {{ meal.name }}
                      </strong>
                      @if (isMealDone($index)) {
                        <span class="odv-badge odv-tone-positive">Yedim ✓</span>
                      } @else if (isCurrentMeal($index)) {
                        <span class="odv-badge odv-tone-primary">Sıradaki</span>
                      }
                      <span class="tabular text-xs font-semibold text-slate-500"
                        >{{ meal.kcal }} kcal</span
                      >
                    </div>

                    @if (meal.items && meal.items.length) {
                      <ul class="mt-2 space-y-1 border-t border-slate-200/60 ps-10 pt-2 text-xs text-slate-600 dark:border-slate-700/60 dark:text-slate-300">
                        @for (item of meal.items; track $index) {
                          <li class="flex flex-wrap items-center justify-between gap-1">
                            <span>
                              • {{ item.name }} ({{ item.portions }} × {{ item.unit }})
                              @if (item.alternative) {
                                <strong class="text-violet-600 dark:text-violet-300">
                                  · Muadil: {{ item.alternative }}
                                </strong>
                              }
                            </span>
                            <span class="tabular text-[11px] text-slate-400">{{ item.kcal }} kcal</span>
                          </li>
                        }
                      </ul>
                    }
                  </li>
                }
              </ol>
            } @else {
              <app-empty-state
                icon="restaurant_menu"
                title="Aktif planınız yok"
                body="Diyetisyeniniz planınızı yayınladığında burada görünecek."
              />
            }
          </section>

          <div class="space-y-6">
            <section class="odv-card p-5">
              <div class="mb-3 flex items-center justify-between">
                <h2 class="odv-section-title">Görevleriniz</h2>
                <a routerLink="/portal/tasks" class="odv-btn-soft">Tümü</a>
              </div>
              <ul class="space-y-2">
                @for (t of member.openTasks().slice(0, 3); track t.id) {
                  <li>
                    <a
                      routerLink="/portal/tasks"
                      [queryParams]="{ task: t.id }"
                      class="flex items-center gap-3 rounded-xl border border-slate-100 p-3 hover:border-emerald-200 dark:border-slate-800"
                    >
                      <span class="material-symbols-rounded text-emerald-600" aria-hidden="true">{{
                        taskIcons[t.category]
                      }}</span>
                      <span class="min-w-0 flex-1">
                        <strong class="block truncate text-sm">{{ t.title }}</strong>
                        @if (t.dueDate) {
                          <span class="text-xs text-slate-500"
                            >Son tarih {{ t.dueDate | date: 'd MMM' }}</span
                          >
                        }
                      </span>
                      <span
                        class="material-symbols-rounded directional-icon text-slate-400"
                        aria-hidden="true"
                        >chevron_right</span
                      >
                    </a>
                  </li>
                } @empty {
                  <li class="text-sm text-slate-500">Bekleyen göreviniz yok. Harika! 🎉</li>
                }
              </ul>
            </section>

            <section class="odv-card p-5">
              <h2 class="odv-section-title mb-3">Sıradaki randevu</h2>
              @if (member.upcoming()[0]; as next) {
                <div class="flex items-center gap-3">
                  <span
                    class="grid size-11 place-items-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-300"
                    ><span class="material-symbols-rounded" aria-hidden="true">{{
                      channelIcons[next.channel]
                    }}</span></span
                  >
                  <div>
                    <strong class="block text-sm">{{ next.at | date: 'd MMMM EEEE, HH:mm' }}</strong>
                    <span class="text-xs text-slate-500">{{ channelLabels[next.channel] }}</span>
                  </div>
                </div>
              } @else {
                <p class="text-sm text-slate-500">Planlanmış randevunuz yok.</p>
              }
              <a
                routerLink="/portal/requests"
                [queryParams]="{ new: 'appointment' }"
                class="odv-btn-secondary mt-4 w-full"
              >
                <span class="material-symbols-rounded !text-lg">event</span>Randevu talep et
              </a>
            </section>

            <a
              routerLink="/portal/messages"
              class="odv-card odv-card-hover flex items-center gap-3 p-5"
            >
              <span
                class="grid size-11 place-items-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300"
                ><span class="material-symbols-rounded" aria-hidden="true">forum</span></span
              >
              <span class="flex-1">
                <strong class="block text-sm">Diyetisyeninize yazın</strong>
                <span class="text-xs text-slate-500">{{
                  member.unread()
                    ? member.unread() + ' okunmamış mesajınız var'
                    : 'Soru sorun, fotoğraf paylaşın'
                }}</span>
              </span>
              @if (member.unread()) {
                <span
                  class="tabular rounded-full bg-violet-600 px-2 py-0.5 text-xs font-bold text-white"
                  >{{ member.unread() }}</span
                >
              }
            </a>
          </div>
        </div>
      </div>
    }
  `,
})
export class PortalHome {
  readonly member = inject(MemberPortal);
  private readonly notify = inject(Notify);
  readonly taskIcons = TASK_CATEGORY_ICONS;
  readonly channelIcons = CHANNEL_ICONS;
  readonly channelLabels = CHANNEL_LABELS;

  readonly moodOptions = [
    { key: 'great' as const, label: '⚡ Enerjik & Tok' },
    { key: 'good' as const, label: '🙂 Dengeli' },
    { key: 'tired' as const, label: '😴 Yorgun / Ödemli' },
  ];

  readonly waterGlasses = signal(4);
  readonly completedMeals = signal<number[]>([0]);
  readonly mood = signal<'great' | 'good' | 'tired' | null>('great');

  constructor() {
    effect(() => {
      const id = this.member.clientId();
      if (!id) return;
      const key = `odivon:portal-habit:${id}:${isoDate(new Date())}`;
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw) as DailyHabitState;
          this.waterGlasses.set(parsed.waterGlasses ?? 4);
          this.completedMeals.set(parsed.completedMeals ?? [0]);
          this.mood.set(parsed.mood ?? 'great');
        }
      } catch {
        // default state
      }
    });
  }

  readonly greeting = computed(() => {
    const h = new Date().getHours();
    return h < 12 ? 'Günaydın' : h < 18 ? 'İyi günler' : 'İyi akşamlar';
  });

  readonly changeGood = computed(() => {
    const v = this.member.view();
    if (!v) return true;
    const wantsLoss = v.client.targetWeightKg < v.client.startWeightKg;
    return wantsLoss ? v.changeKg <= 0 : v.changeKg >= 0;
  });

  readonly bmiTone = computed(() => toneClass(this.member.view()?.bmiBand.tone ?? 'neutral'));

  readonly waterTargetMl = computed(() => {
    const w = this.member.view()?.currentWeightKg ?? 70;
    return Math.round((w * 35) / 250) * 250;
  });

  readonly waterTargetGlasses = computed(() => Math.max(6, Math.round(this.waterTargetMl() / 250)));

  readonly waterPct = computed(() =>
    Math.min(100, Math.round((this.waterGlasses() / this.waterTargetGlasses()) * 100)),
  );

  readonly dailyAdherencePct = computed(() => {
    const totalMeals = this.member.view()?.activePlan?.meals.length ?? 0;
    const mealRatio = totalMeals > 0 ? this.completedMeals().length / totalMeals : 0.5;
    const waterRatio = Math.min(1, this.waterGlasses() / this.waterTargetGlasses());
    return Math.min(100, Math.round((mealRatio * 0.7 + waterRatio * 0.3) * 100));
  });

  readonly streakDays = computed(() => {
    const count = this.member.measurements().length;
    return Math.max(3, count + (this.completedMeals().length > 0 ? 1 : 0));
  });

  /** Index of the next meal by clock time (the last meal stays highlighted in the evening). */
  private readonly currentMeal = computed(() => {
    const meals = this.member.view()?.activePlan?.meals ?? [];
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    const index = meals.findIndex((m) => {
      const [h, mm] = m.time.split(':').map(Number);
      return h * 60 + mm >= minutes - 30;
    });
    return index === -1 ? meals.length - 1 : index;
  });

  isCurrentMeal(index: number): boolean {
    return index === this.currentMeal();
  }

  isMealDone(index: number): boolean {
    return this.completedMeals().includes(index);
  }

  toggleMealDone(index: number): void {
    this.completedMeals.update((list) =>
      list.includes(index) ? list.filter((i) => i !== index) : [...list, index],
    );
    this.persistHabitState();
  }

  addWater(delta: number): void {
    this.waterGlasses.update((cur) => Math.max(0, Math.min(24, cur + delta)));
    this.persistHabitState();
  }

  setMood(next: 'great' | 'good' | 'tired'): void {
    this.mood.set(next);
    this.persistHabitState();
  }

  quickWeightSubmit(event: Event, rawValue: string): void {
    event.preventDefault();
    const weight = Number(rawValue);
    if (!Number.isFinite(weight) || weight < 30 || weight > 250) return;
    this.member.logWeight(weight, 'Günlük sabah tartı kaydı');
    this.notify.success(`Güncel kilonuz (${weight} kg) diyetisyeninize iletildi.`);
  }

  private persistHabitState(): void {
    const id = this.member.clientId();
    if (!id) return;
    const key = `odivon:portal-habit:${id}:${isoDate(new Date())}`;
    const payload: DailyHabitState = {
      waterGlasses: this.waterGlasses(),
      completedMeals: this.completedMeals(),
      mood: this.mood(),
    };
    try {
      localStorage.setItem(key, JSON.stringify(payload));
    } catch {
      // ignore storage errors
    }
  }
}
