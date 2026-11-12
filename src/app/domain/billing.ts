/** SaaS subscription packages and the 14-day trial. Prices are in TRY, VAT included. */

export type PlanId = 'starter' | 'pro' | 'clinic';
export type BillingCycle = 'monthly' | 'yearly';
export type SubscriptionStatus = 'trialing' | 'active' | 'expired';

export interface Plan {
  readonly id: PlanId;
  readonly name: string;
  readonly tagline: string;
  readonly monthlyPrice: number;
  /** Price per month when paid yearly (two months free). */
  readonly yearlyMonthlyPrice: number;
  /** Active clients allowed; `null` = unlimited. */
  readonly clientLimit: number | null;
  readonly seats: number;
  readonly portal: boolean;
  readonly features: readonly string[];
  readonly highlight?: boolean;
}

export const TRIAL_DAYS = 14;
/** The trial unlocks this package so the dietitian can try everything. */
export const TRIAL_PLAN: PlanId = 'pro';

export const PLANS: readonly Plan[] = [
  {
    id: 'starter',
    name: 'Başlangıç',
    tagline: 'Yeni başlayan, tek diyetisyenli muayenehaneler için.',
    monthlyPrice: 499,
    yearlyMonthlyPrice: 416,
    clientLimit: 30,
    seats: 1,
    portal: false,
    features: [
      '30 aktif danışan',
      'Beslenme planları ve ölçüm takibi',
      'Görüşme takvimi',
      'Temel ilerleme raporları',
      'E-posta desteği',
    ],
  },
  {
    id: 'pro',
    name: 'Profesyonel',
    tagline: 'Danışan portalıyla büyüyen muayenehaneler için.',
    monthlyPrice: 999,
    yearlyMonthlyPrice: 833,
    clientLimit: 150,
    seats: 1,
    portal: true,
    highlight: true,
    features: [
      '150 aktif danışan',
      'Başlangıç paketindeki her şey',
      'Danışan portalı: mesaj, görev, talep',
      'Gelişmiş raporlar ve PDF çıktısı',
      'Öncelikli destek',
    ],
  },
  {
    id: 'clinic',
    name: 'Klinik',
    tagline: 'Birden fazla diyetisyenin çalıştığı klinikler için.',
    monthlyPrice: 1999,
    yearlyMonthlyPrice: 1666,
    clientLimit: null,
    seats: 5,
    portal: true,
    features: [
      'Sınırsız danışan',
      'Profesyonel paketteki her şey',
      '5 diyetisyen hesabı',
      'Klinik geneli raporlar',
      'Kurulum ve veri aktarımı desteği',
    ],
  },
];

export interface Subscription {
  readonly plan: PlanId;
  readonly status: SubscriptionStatus;
  readonly cycle: BillingCycle;
  readonly trialStartedAt: string;
  readonly trialEndsAt: string;
  /** Set once a paid package is active. */
  readonly currentPeriodEnd: string | null;
  /** A package chosen while online payment is not connected yet. */
  readonly requestedPlan: PlanId | null;
  readonly requestedCycle: BillingCycle | null;
  readonly requestedAt: string | null;
  /** PayTR order of the last confirmed payment (prevents applying it twice). */
  readonly lastPaymentOid?: string | null;
}

export interface SubscriptionState {
  readonly subscription: Subscription;
  readonly plan: Plan;
  readonly status: SubscriptionStatus;
  readonly trialing: boolean;
  readonly expired: boolean;
  /** Whole days left in the trial or paid period (0 once it ended). */
  readonly daysLeft: number;
  /** 0–100, how much of the trial has been used. */
  readonly trialUsedPct: number;
}

const DAY_MS = 86_400_000;

export function planById(id: PlanId): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[1];
}

export function createTrial(now: Date): Subscription {
  return {
    plan: TRIAL_PLAN,
    status: 'trialing',
    cycle: 'monthly',
    trialStartedAt: now.toISOString(),
    trialEndsAt: new Date(now.getTime() + TRIAL_DAYS * DAY_MS).toISOString(),
    currentPeriodEnd: null,
    requestedPlan: null,
    requestedCycle: null,
    requestedAt: null,
  };
}

/** Works out the live status: a trial or paid period that has passed counts as expired. */
export function subscriptionState(subscription: Subscription, now: Date): SubscriptionState {
  const end =
    subscription.status === 'active' && subscription.currentPeriodEnd
      ? subscription.currentPeriodEnd
      : subscription.trialEndsAt;
  const msLeft = new Date(end).getTime() - now.getTime();
  const status: SubscriptionStatus =
    subscription.status === 'active' && msLeft > 0
      ? 'active'
      : subscription.status === 'trialing' && msLeft > 0
        ? 'trialing'
        : 'expired';
  const trialTotal =
    new Date(subscription.trialEndsAt).getTime() - new Date(subscription.trialStartedAt).getTime();
  const trialUsed = now.getTime() - new Date(subscription.trialStartedAt).getTime();
  return {
    subscription,
    plan: planById(subscription.plan),
    status,
    trialing: status === 'trialing',
    expired: status === 'expired',
    daysLeft: Math.max(0, Math.ceil(msLeft / DAY_MS)),
    trialUsedPct: trialTotal > 0 ? Math.min(100, Math.max(0, (trialUsed / trialTotal) * 100)) : 100,
  };
}

/**
 * Applies a confirmed payment: the package becomes active for one month or year, counted
 * from the end of a still-running paid period so renewing early loses no days.
 */
export function applyPayment(
  subscription: Subscription,
  plan: PlanId,
  cycle: BillingCycle,
  oid: string,
  now: Date,
): Subscription {
  if (subscription.lastPaymentOid === oid) return subscription;
  const running =
    subscription.status === 'active' && subscription.currentPeriodEnd
      ? new Date(subscription.currentPeriodEnd)
      : null;
  const start = running && running > now ? running : now;
  const end = new Date(start);
  end.setMonth(end.getMonth() + (cycle === 'yearly' ? 12 : 1));
  return {
    ...subscription,
    plan,
    cycle,
    status: 'active',
    currentPeriodEnd: end.toISOString(),
    requestedPlan: null,
    requestedCycle: null,
    requestedAt: null,
    lastPaymentOid: oid,
  };
}

/** Whether one more active client fits in the package. */
export function canAddClient(plan: Plan, activeClients: number): boolean {
  return plan.clientLimit === null || activeClients < plan.clientLimit;
}

export function yearlyTotal(plan: Plan): number {
  return plan.yearlyMonthlyPrice * 12;
}

export function formatTry(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(amount);
}
