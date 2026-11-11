import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MemberPortal } from '../../core/data/member-portal';
import { daysBetween } from '../../domain/diet-calc';
import { PLAN_STATUS_LABELS } from '../../domain/diet.models';
import { EmptyState } from '../../shared/ui/empty-state';
import { MacroBar } from '../../shared/ui/macro-bar';
import { PageHeader } from '../../shared/ui/page-header';
import { ProgressBar } from '../../shared/ui/progress-bar';

@Component({
  selector: 'app-portal-plan',
  imports: [PageHeader, MacroBar, ProgressBar, EmptyState, DatePipe, RouterLink],
  template: `
    <div class="animate-fade-up space-y-6">
      <app-page-header eyebrow="Beslenme" title="Beslenme planım" description="Diyetisyeninizin sizin için hazırladığı güncel plan.">
        <a actions routerLink="/portal/requests" [queryParams]="{ new: 'plan_change' }" class="odv-btn-secondary">
          <span class="material-symbols-rounded !text-lg">edit_note</span>Değişiklik iste
        </a>
      </app-page-header>

      @if (active(); as plan) {
        <section class="odv-card p-5 sm:p-6">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span class="odv-badge odv-tone-positive">Aktif plan</span>
              <h2 class="mt-2 text-xl font-extrabold tracking-tight">{{ plan.title }}</h2>
              <p class="text-xs text-slate-500">{{ plan.startDate | date: 'd MMMM' }} – {{ plan.endDate | date: 'd MMMM y' }}</p>
            </div>
            <p class="tabular text-3xl font-extrabold">
              {{ plan.kcal }} <small class="text-sm text-slate-400">kcal / gün</small>
            </p>
          </div>
          <div class="mt-4">
            <div class="mb-1 flex justify-between text-xs text-slate-500">
              <span>Plan süresi</span><span>{{ timeline().label }}</span>
            </div>
            <app-progress-bar [value]="timeline().pct" label="Plan süresinin geçen kısmı" />
          </div>
          <app-macro-bar class="mt-5 block" [kcal]="plan.kcal" [protein]="plan.proteinPct" [carb]="plan.carbPct" [fat]="plan.fatPct" [detailed]="true" />
          <h3 class="odv-section-title mt-6 text-sm">Günlük öğün programı ve porsiyonlar</h3>
          <ol class="mt-3 grid gap-3 sm:grid-cols-2">
            @for (meal of plan.meals; track $index) {
              <li class="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
                <div class="flex items-center gap-3">
                  <span class="tabular w-12 text-sm font-semibold text-violet-600 dark:text-violet-300">{{ meal.time }}</span>
                  <strong class="flex-1 text-sm">{{ meal.name }}</strong>
                  <span class="tabular text-xs font-bold text-slate-600 dark:text-slate-300">{{ meal.kcal }} kcal</span>
                </div>
                @if (meal.items && meal.items.length) {
                  <ul class="mt-2.5 space-y-1 border-t border-slate-200/70 pt-2 text-xs dark:border-slate-700/70">
                    @for (item of meal.items; track $index) {
                      <li class="flex items-start justify-between gap-2">
                        <span>
                          <strong class="font-medium">{{ item.name }}</strong>
                          <span class="text-slate-500"> · {{ item.portions }} × {{ item.unit }} ({{ item.grams }}g)</span>
                          @if (item.alternative) {
                            <em class="block text-[11px] text-violet-600 dark:text-violet-300">Alternatif: {{ item.alternative }}</em>
                          }
                        </span>
                        <span class="tabular text-slate-500">{{ item.kcal }} kcal</span>
                      </li>
                    }
                  </ul>
                }
              </li>
            }
          </ol>
          @if (plan.notes) {
            <div class="mt-5 rounded-xl bg-violet-50 p-4 text-sm dark:bg-violet-950/40">
              <span class="odv-eyebrow">Diyetisyeninizin notu</span>
              <p class="mt-1 whitespace-pre-line">{{ plan.notes }}</p>
            </div>
          }
          @if (allergies().length) {
            <p class="mt-4 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
              Planınız şu hassasiyetler dikkate alınarak hazırlandı:
              @for (a of allergies(); track a) {
                <span class="odv-badge odv-tone-danger">{{ a }}</span>
              }
            </p>
          }
          <button type="button" class="odv-btn-ghost no-print mt-4" (click)="print()">
            <span class="material-symbols-rounded !text-lg">print</span>Yazdır
          </button>
        </section>
      } @else {
        <div class="odv-card">
          <app-empty-state icon="restaurant_menu" title="Aktif planınız yok" body="Diyetisyeniniz planınızı yayınladığında burada görünecek." />
        </div>
      }

      @if (past().length) {
        <section>
          <h2 class="odv-section-title mb-3">Önceki planlar</h2>
          <ul class="odv-card divide-y divide-slate-100 dark:divide-slate-800">
            @for (p of past(); track p.id) {
              <li class="flex flex-wrap items-center gap-3 px-5 py-3.5 text-sm">
                <strong class="flex-1">{{ p.title }}</strong>
                <span class="text-xs text-slate-500">{{ p.startDate | date: 'd MMM' }} – {{ p.endDate | date: 'd MMM y' }}</span>
                <span class="tabular text-xs">{{ p.kcal }} kcal</span>
                <span class="odv-badge odv-tone-neutral">{{ statusLabels[p.status] }}</span>
              </li>
            }
          </ul>
        </section>
      }
    </div>
  `,
})
export class PortalPlan {
  private readonly member = inject(MemberPortal);
  readonly statusLabels = PLAN_STATUS_LABELS;
  readonly active = computed(() => this.member.plans().find((p) => p.status === 'active') ?? null);
  readonly past = computed(() => this.member.plans().filter((p) => p.status !== 'active'));
  readonly allergies = computed(() => this.member.view()?.client.allergies ?? []);

  readonly timeline = computed(() => {
    const plan = this.active();
    if (!plan) return { pct: 0, label: '' };
    const total = Math.max(1, daysBetween(plan.startDate, plan.endDate));
    const passed = Math.min(total, Math.max(0, daysBetween(plan.startDate, new Date())));
    return { pct: Math.round((passed / total) * 100), label: `${passed}. gün / ${total} gün` };
  });

  print(): void {
    window.print();
  }
}
