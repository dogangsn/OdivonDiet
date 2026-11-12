import {
  applyPayment,
  PLANS,
  TRIAL_DAYS,
  canAddClient,
  createTrial,
  planById,
  subscriptionState,
} from './billing';

describe('billing', () => {
  const start = new Date('2026-11-01T10:00:00Z');

  it('starts a 14-day trial of the Profesyonel package', () => {
    const trial = createTrial(start);
    const state = subscriptionState(trial, start);
    expect(trial.plan).toBe('pro');
    expect(state.trialing).toBe(true);
    expect(state.daysLeft).toBe(TRIAL_DAYS);
    expect(state.trialUsedPct).toBe(0);
  });

  it('counts down and expires after the trial', () => {
    const trial = createTrial(start);
    const day10 = new Date(start.getTime() + 10 * 86_400_000);
    expect(subscriptionState(trial, day10).daysLeft).toBe(4);
    const after = new Date(start.getTime() + 14 * 86_400_000 + 1000);
    const state = subscriptionState(trial, after);
    expect(state.expired).toBe(true);
    expect(state.daysLeft).toBe(0);
  });

  it('keeps an active paid package open until its period ends', () => {
    const later = new Date(start.getTime() + 30 * 86_400_000);
    const paid = {
      ...createTrial(start),
      status: 'active' as const,
      currentPeriodEnd: new Date(later.getTime() + 86_400_000).toISOString(),
    };
    expect(subscriptionState(paid, later).status).toBe('active');
  });

  it('enforces the client limit per package', () => {
    expect(canAddClient(planById('starter'), 29)).toBe(true);
    expect(canAddClient(planById('starter'), 30)).toBe(false);
    expect(canAddClient(planById('clinic'), 10_000)).toBe(true);
    expect(PLANS.every((p) => p.yearlyMonthlyPrice < p.monthlyPrice)).toBe(true);
  });

  it('activates a paid package once per payment and extends early renewals', () => {
    const now = new Date('2026-11-10T10:00:00Z');
    const paid = applyPayment(createTrial(start), 'starter', 'monthly', 'ODSM1', now);
    expect(paid.status).toBe('active');
    expect(paid.plan).toBe('starter');
    expect(paid.currentPeriodEnd).toBe(new Date('2026-12-10T10:00:00Z').toISOString());
    expect(applyPayment(paid, 'starter', 'monthly', 'ODSM1', now)).toBe(paid);
    const renewed = applyPayment(paid, 'pro', 'yearly', 'ODPY2', now);
    expect(renewed.currentPeriodEnd).toBe(new Date('2027-12-10T10:00:00Z').toISOString());
    expect(subscriptionState(renewed, now).status).toBe('active');
  });
});
