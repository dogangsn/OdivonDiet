import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { SubscriptionStore } from '../../core/billing/subscription-store';
import { DietStore } from '../../core/data/diet-store';
import { Notify } from '../../core/notify/notify';
import {
  BillingCycle,
  PLANS,
  Plan,
  TRIAL_DAYS,
  formatTry,
  planById,
  yearlyTotal,
} from '../../domain/billing';
import { PageHeader } from '../../shared/ui/page-header';

@Component({
  selector: 'app-billing-page',
  imports: [PageHeader, DatePipe, DecimalPipe],
  template: `
    <div class="animate-fade-up space-y-6">
      <app-page-header
        eyebrow="Sistem"
        title="Abonelik ve paketler"
        description="Paketinizi seçin, deneme sürenizi ve kullanımınızı takip edin."
      />

      @if (subs.isSample()) {
        <section
          class="odv-card flex items-start gap-3 border-amber-200 bg-amber-50/60 p-5 dark:border-amber-900 dark:bg-amber-950/30"
        >
          <span class="material-symbols-rounded text-amber-600" aria-hidden="true">science</span>
          <div class="text-sm">
            <strong class="block">Demo hesabındasınız</strong>
            <span class="text-slate-600 dark:text-slate-300"
              >Ücretsiz hesap açtığınızda boş bir muayenehaneyle başlarsınız ve {{ trialDays }} gün
              boyunca Profesyonel paketin tamamını denersiniz.</span
            >
          </div>
        </section>
      }

      @if (subs.state(); as s) {
        @if (s.expired) {
          <section
            role="alert"
            class="odv-card flex flex-col gap-3 border-rose-200 bg-rose-50/70 p-5 dark:border-rose-900 dark:bg-rose-950/30 sm:flex-row sm:items-center"
          >
            <span
              class="grid size-11 shrink-0 place-items-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-900/60 dark:text-rose-200"
            >
              <span class="material-symbols-rounded" aria-hidden="true">lock_clock</span>
            </span>
            <div class="flex-1 text-sm">
              <strong class="block text-base">
                {{
                  s.subscription.status === 'active'
                    ? 'Abonelik süreniz doldu'
                    : 'Deneme süreniz doldu'
                }}
              </strong>
              <span class="text-slate-600 dark:text-slate-300"
                >Verileriniz güvende. Panele devam etmek için aşağıdan bir paket seçin.</span
              >
            </div>
          </section>
        }

        <section class="odv-card grid gap-5 p-5 sm:p-6 md:grid-cols-[1.3fr_1fr]">
          <div>
            <p class="odv-label !mb-1">Mevcut durum</p>
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-xl font-extrabold tracking-tight">{{ s.plan.name }}</h2>
              <span
                class="rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                [class]="statusClass()"
                >{{ statusLabel() }}</span
              >
            </div>
            @if (s.trialing) {
              <p class="mt-1 text-sm text-slate-500">
                Deneme
                <strong class="text-slate-900 dark:text-white">{{
                  s.subscription.trialEndsAt | date: 'd MMMM y'
                }}</strong>
                tarihinde bitiyor · <strong class="tabular">{{ s.daysLeft }} gün</strong> kaldı
              </p>
              <div
                class="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
                role="progressbar"
                aria-label="Deneme süresi"
                [attr.aria-valuenow]="s.trialUsedPct | number: '1.0-0'"
                aria-valuemin="0"
                aria-valuemax="100"
              >
                <div
                  class="h-full rounded-full"
                  [class]="s.daysLeft <= 3 ? 'bg-amber-500' : 'bg-violet-600'"
                  [style.width.%]="s.trialUsedPct"
                ></div>
              </div>
            } @else if (s.status === 'active') {
              <p class="mt-1 text-sm text-slate-500">
                Sonraki yenileme
                {{ s.subscription.currentPeriodEnd | date: 'd MMMM y' }}
              </p>
            }
            @if (s.subscription.requestedPlan; as requested) {
              <div
                class="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-violet-50 px-3 py-2.5 text-xs text-violet-800 dark:bg-violet-500/15 dark:text-violet-200"
              >
                <span class="material-symbols-rounded !text-base" aria-hidden="true">schedule</span>
                <span class="flex-1"
                  ><strong>{{ requestedName() }}</strong> ({{
                    s.subscription.requestedCycle === 'yearly' ? 'yıllık' : 'aylık'
                  }}) talebiniz alındı. Ödeme bağlantısı e-posta ile gönderilecek.</span
                >
                <button type="button" class="font-bold underline" (click)="subs.cancelRequest()">
                  Vazgeç
                </button>
              </div>
            }
          </div>
          <dl class="grid grid-cols-2 gap-3 text-sm">
            <div class="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <dt class="text-xs text-slate-500">Aktif danışan</dt>
              <dd class="tabular mt-1 text-lg font-extrabold">
                {{ activeClients()
                }}<span class="text-sm font-semibold text-slate-400">
                  / {{ s.plan.clientLimit ?? '∞' }}</span
                >
              </dd>
            </div>
            <div class="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <dt class="text-xs text-slate-500">Diyetisyen hesabı</dt>
              <dd class="tabular mt-1 text-lg font-extrabold">
                1<span class="text-sm font-semibold text-slate-400"> / {{ s.plan.seats }}</span>
              </dd>
            </div>
          </dl>
        </section>
      }

      <section aria-labelledby="plans-title" class="space-y-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="plans-title" class="odv-section-title">Paketler</h2>
          <div
            class="inline-flex self-start rounded-xl border border-slate-200 bg-white p-1 text-xs font-bold sm:self-auto dark:border-slate-700 dark:bg-slate-900"
            role="radiogroup"
            aria-label="Ödeme dönemi"
          >
            @for (option of cycles; track option.id) {
              <button
                type="button"
                role="radio"
                [attr.aria-checked]="cycle() === option.id"
                class="rounded-lg px-3 py-1.5 transition"
                [class]="
                  cycle() === option.id
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                "
                (click)="cycle.set(option.id)"
              >
                {{ option.label }}
                @if (option.id === 'yearly') {
                  <span
                    class="ms-1 rounded-full px-1.5 py-0.5 text-[10px]"
                    [class]="
                      cycle() === 'yearly'
                        ? 'bg-white/20'
                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    "
                    >2 ay bedava</span
                  >
                }
              </button>
            }
          </div>
        </div>

        <div class="grid gap-4 lg:grid-cols-3">
          @for (plan of plans; track plan.id) {
            <article
              class="odv-card relative flex flex-col p-5 sm:p-6"
              [class.ring-2]="plan.highlight"
              [class.ring-violet-500]="plan.highlight"
            >
              @if (plan.highlight) {
                <span
                  class="absolute -top-3 start-5 rounded-full bg-violet-600 px-2.5 py-1 text-[11px] font-bold text-white shadow"
                  >En çok tercih edilen</span
                >
              }
              <h3 class="text-lg font-extrabold">{{ plan.name }}</h3>
              <p class="mt-1 min-h-10 text-xs text-slate-500">{{ plan.tagline }}</p>
              <p class="mt-4 flex items-end gap-1">
                <span class="tabular text-3xl font-extrabold tracking-tight">{{
                  price(plan)
                }}</span>
                <span class="pb-1 text-xs font-semibold text-slate-500">/ ay</span>
              </p>
              <p class="mt-1 h-4 text-[11px] text-slate-500">
                @if (cycle() === 'yearly') {
                  Yıllık {{ yearly(plan) }} olarak faturalanır
                } @else {
                  KDV dahil, aylık faturalanır
                }
              </p>
              <ul class="mt-5 flex-1 space-y-2.5 text-sm">
                @for (feature of plan.features; track feature) {
                  <li class="flex gap-2">
                    <span
                      class="material-symbols-rounded !text-lg text-emerald-600 dark:text-emerald-400"
                      aria-hidden="true"
                      >check_circle</span
                    >{{ feature }}
                  </li>
                }
              </ul>
              <button
                type="button"
                class="mt-6 w-full justify-center"
                [class]="plan.highlight ? 'odv-btn-primary' : 'odv-btn-secondary'"
                [disabled]="subs.isSample() || isRequested(plan)"
                (click)="choose(plan)"
              >
                {{ buttonLabel(plan) }}
              </button>
            </article>
          }
        </div>
        <p class="text-center text-xs text-slate-500">
          Tüm paketlerde KVKK uyumlu veri saklama ve SSL bulunur. İstediğiniz zaman paket
          değiştirebilir ya da iptal edebilirsiniz.
        </p>
      </section>
    </div>
  `,
})
export class BillingPage {
  readonly subs = inject(SubscriptionStore);
  private readonly diet = inject(DietStore);
  private readonly notify = inject(Notify);
  readonly plans = PLANS;
  readonly trialDays = TRIAL_DAYS;
  readonly cycle = signal<BillingCycle>('monthly');
  readonly cycles: { id: BillingCycle; label: string }[] = [
    { id: 'monthly', label: 'Aylık' },
    { id: 'yearly', label: 'Yıllık' },
  ];

  readonly activeClients = computed(() => this.diet.activeClients().length);
  readonly requestedName = computed(() => {
    const id = this.subs.state()?.subscription.requestedPlan;
    return id ? planById(id).name : '';
  });
  readonly statusLabel = computed(() => {
    const s = this.subs.state();
    if (!s) return '';
    if (s.trialing) return `${TRIAL_DAYS} günlük deneme`;
    if (s.status === 'active') return 'Aktif';
    return 'Süresi doldu';
  });
  readonly statusClass = computed(() => {
    const s = this.subs.state();
    if (s?.status === 'active')
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';
    if (s?.expired) return 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300';
    return 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200';
  });

  price(plan: Plan): string {
    return formatTry(this.cycle() === 'yearly' ? plan.yearlyMonthlyPrice : plan.monthlyPrice);
  }

  yearly(plan: Plan): string {
    return formatTry(yearlyTotal(plan));
  }

  isRequested(plan: Plan): boolean {
    const sub = this.subs.state()?.subscription;
    return sub?.requestedPlan === plan.id && sub.requestedCycle === this.cycle();
  }

  buttonLabel(plan: Plan): string {
    const s = this.subs.state();
    if (this.isRequested(plan)) return 'Talep alındı';
    if (s?.status === 'active' && s.plan.id === plan.id) return 'Mevcut paketiniz';
    return s?.trialing && s.plan.id === plan.id ? 'Bu paketle devam et' : 'Bu paketi seç';
  }

  async choose(plan: Plan): Promise<void> {
    const limit = plan.clientLimit;
    if (limit !== null && this.activeClients() > limit) {
      this.notify.warning(
        `${plan.name} paketi ${limit} aktif danışana kadar`,
        'Bu paketi seçmeden önce bazı danışanları arşivleyin ya da daha büyük bir paket seçin.',
      );
      return;
    }
    const cycleLabel = this.cycle() === 'yearly' ? 'yıllık' : 'aylık';
    const ok = await this.notify.confirm({
      title: `${plan.name} paketi (${cycleLabel})`,
      text: `${this.price(plan)} / ay. Online ödeme çok yakında; talebinizi kaydedip ödeme bağlantısını e-posta adresinize göndereceğiz.`,
      confirmText: 'Talep oluştur',
      icon: 'workspace_premium',
    });
    if (!ok) return;
    this.subs.requestPlan(plan.id, this.cycle());
    this.notify.success('Paket talebiniz alındı', 'Ödeme bağlantısı e-posta ile gönderilecek.');
  }
}
