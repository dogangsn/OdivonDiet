import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MemberPortal } from '../../core/data/member-portal';
import { CHANNEL_ICONS, CHANNEL_LABELS } from '../../domain/diet.models';
import { TASK_CATEGORY_ICONS } from '../../domain/portal.models';
import { EmptyState } from '../../shared/ui/empty-state';
import { ProgressBar } from '../../shared/ui/progress-bar';
import { toneClass } from '../../shared/ui/tone';
import { ConsentCard } from './consent-card';

@Component({
  selector: 'app-portal-home',
  imports: [RouterLink, DatePipe, DecimalPipe, ProgressBar, EmptyState, ConsentCard],
  template: `
    @if (member.view(); as v) {
      <div class="animate-fade-up space-y-6">
        <header>
          <p class="text-xs font-bold text-emerald-700 dark:text-emerald-400">{{ greeting() }}</p>
          <h1 class="text-2xl font-extrabold tracking-tight sm:text-[1.75rem]">
            {{ v.client.firstName }}, bugün de hedefinize bir adım daha yakınsınız.
          </h1>
        </header>

        @if (!v.client.consentAt) {
          <app-consent-card />
        }

        <section class="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Özet">
          <div class="odv-card p-4">
            <span class="odv-eyebrow">Güncel kilo</span>
            <strong class="tabular mt-1 block text-2xl font-extrabold"
              >{{ v.currentWeightKg | number: '1.0-1' }} <small class="text-xs text-slate-400">kg</small></strong
            >
            <span class="text-xs font-semibold" [class.text-emerald-600]="changeGood()" [class.text-amber-600]="!changeGood()"
              >{{ v.changeKg > 0 ? '+' : '' }}{{ v.changeKg | number: '1.0-1' }} kg başlangıçtan</span
            >
          </div>
          <div class="odv-card p-4">
            <span class="odv-eyebrow">Hedef · {{ v.client.targetWeightKg }} kg</span>
            <strong class="tabular mt-1 block text-2xl font-extrabold">%{{ v.progress }}</strong>
            <app-progress-bar class="mt-2" [value]="v.progress" label="Hedefe ilerleme" />
          </div>
          <div class="odv-card p-4">
            <span class="odv-eyebrow">Beden kitle indeksi</span>
            <strong class="tabular mt-1 block text-2xl font-extrabold">{{ v.bmi | number: '1.1-1' }}</strong>
            <span class="odv-badge mt-0.5" [class]="bmiTone()">{{ v.bmiBand.label }}</span>
          </div>
          <div class="odv-card p-4">
            <span class="odv-eyebrow">Günlük hedef</span>
            <strong class="tabular mt-1 block text-2xl font-extrabold"
              >{{ v.activePlan?.kcal ?? v.tdee }} <small class="text-xs text-slate-400">kcal</small></strong
            >
            <span class="text-xs text-slate-500">{{ v.activePlan ? 'Planınıza göre' : 'Tahmini ihtiyaç' }}</span>
          </div>
        </section>

        <div class="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <section class="odv-card p-5">
            <div class="mb-3 flex items-center justify-between">
              <h2 class="odv-section-title">Bugünkü öğünleriniz</h2>
              <a routerLink="/portal/plan" class="odv-btn-soft">Planın tamamı</a>
            </div>
            @if (v.activePlan; as plan) {
              <ol class="space-y-2">
                @for (meal of plan.meals; track $index) {
                  <li
                    class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm"
                    [class]="isCurrentMeal($index) ? 'bg-emerald-50 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:ring-emerald-900' : 'bg-slate-50 dark:bg-slate-800/60'"
                  >
                    <span class="tabular w-12 font-semibold text-slate-500">{{ meal.time }}</span>
                    <strong class="flex-1">{{ meal.name }}</strong>
                    @if (isCurrentMeal($index)) {
                      <span class="odv-badge odv-tone-positive">Sıradaki</span>
                    }
                    <span class="tabular text-xs text-slate-500">{{ meal.kcal }} kcal</span>
                  </li>
                }
              </ol>
            } @else {
              <app-empty-state icon="restaurant_menu" title="Aktif planınız yok" body="Diyetisyeniniz planınızı yayınladığında burada görünecek." />
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
                      <span class="material-symbols-rounded text-emerald-600" aria-hidden="true">{{ taskIcons[t.category] }}</span>
                      <span class="min-w-0 flex-1">
                        <strong class="block truncate text-sm">{{ t.title }}</strong>
                        @if (t.dueDate) {
                          <span class="text-xs text-slate-500">Son tarih {{ t.dueDate | date: 'd MMM' }}</span>
                        }
                      </span>
                      <span class="material-symbols-rounded directional-icon text-slate-400" aria-hidden="true">chevron_right</span>
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
                  <span class="grid size-11 place-items-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-300"
                    ><span class="material-symbols-rounded" aria-hidden="true">{{ channelIcons[next.channel] }}</span></span
                  >
                  <div>
                    <strong class="block text-sm">{{ next.at | date: 'd MMMM EEEE, HH:mm' }}</strong>
                    <span class="text-xs text-slate-500">{{ channelLabels[next.channel] }}</span>
                  </div>
                </div>
              } @else {
                <p class="text-sm text-slate-500">Planlanmış randevunuz yok.</p>
              }
              <a routerLink="/portal/requests" [queryParams]="{ new: 'appointment' }" class="odv-btn-secondary mt-4 w-full">
                <span class="material-symbols-rounded !text-lg">event</span>Randevu talep et
              </a>
            </section>

            <a
              routerLink="/portal/messages"
              class="odv-card odv-card-hover flex items-center gap-3 p-5"
            >
              <span class="grid size-11 place-items-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300"
                ><span class="material-symbols-rounded" aria-hidden="true">forum</span></span
              >
              <span class="flex-1">
                <strong class="block text-sm">Diyetisyeninize yazın</strong>
                <span class="text-xs text-slate-500">{{
                  member.unread() ? member.unread() + ' okunmamış mesajınız var' : 'Soru sorun, fotoğraf paylaşın'
                }}</span>
              </span>
              @if (member.unread()) {
                <span class="tabular rounded-full bg-violet-600 px-2 py-0.5 text-xs font-bold text-white">{{ member.unread() }}</span>
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
  readonly taskIcons = TASK_CATEGORY_ICONS;
  readonly channelIcons = CHANNEL_ICONS;
  readonly channelLabels = CHANNEL_LABELS;

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
}
