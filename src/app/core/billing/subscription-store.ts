import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import {
  BillingCycle,
  PlanId,
  Subscription,
  SubscriptionState,
  applyPayment,
  canAddClient,
  createTrial,
  subscriptionState,
} from '../../domain/billing';
import { AuthStore } from '../auth/auth-store';
import { SAMPLE_WORKSPACE, isSampleSession, workspaceKeyFor } from '../data/workspace';

const PREFIX = 'odivon:sub:';

/**
 * The dietitian's SaaS subscription. A new workspace starts a 14-day trial of the
 * Profesyonel package the first time it is opened (right after e-mail verification).
 *
 * Kept in local storage until MainAPI owns billing; `requestPlan` is the seam where the
 * payment provider's checkout will go.
 */
@Injectable({ providedIn: 'root' })
export class SubscriptionStore {
  private readonly auth = inject(AuthStore);
  /** Ticks once a minute so the days-left counter and expiry stay current. */
  private readonly now = signal(new Date());
  private readonly owner = computed(() => {
    const session = this.auth.session();
    if (!session || isSampleSession(session) || (session.role ?? 'dietitian') !== 'dietitian') {
      return null;
    }
    return workspaceKeyFor(session);
  });
  readonly subscription = signal<Subscription | null>(null);

  readonly state = computed<SubscriptionState | null>(() => {
    const subscription = this.subscription();
    return subscription ? subscriptionState(subscription, this.now()) : null;
  });
  readonly expired = computed(() => this.state()?.expired ?? false);
  /** The sample account shows every feature and no billing. */
  readonly isSample = computed(() => isSampleSession(this.auth.session()));

  constructor() {
    this.load(untracked(this.owner));
    effect(() => {
      const owner = this.owner();
      untracked(() => this.load(owner));
    });
    if (typeof window !== 'undefined') {
      setInterval(() => this.now.set(new Date()), 60_000);
    }
  }

  /** Whether the package allows one more active client (always true for the demo). */
  canAddClient(activeClients: number): boolean {
    const state = this.state();
    return !state || canAddClient(state.plan, activeClients);
  }

  /**
   * Records the chosen package. Online payment is not connected yet, so the request is
   * kept and the team activates it after payment.
   */
  requestPlan(plan: PlanId, cycle: BillingCycle): void {
    const current = this.subscription();
    if (!current) return;
    this.save({
      ...current,
      requestedPlan: plan,
      requestedCycle: cycle,
      requestedAt: new Date().toISOString(),
    });
  }

  /** A PayTR payment was confirmed by the server: activate the paid package. */
  activatePaid(plan: PlanId, cycle: BillingCycle, oid: string): void {
    const current = this.subscription();
    if (!current) return;
    this.save(applyPayment(current, plan, cycle, oid, new Date()));
  }

  cancelRequest(): void {
    const current = this.subscription();
    if (!current) return;
    this.save({ ...current, requestedPlan: null, requestedCycle: null, requestedAt: null });
  }

  /** Refreshes the clock (tests, or after the tab was asleep). */
  refresh(now = new Date()): void {
    this.now.set(now);
  }

  private load(owner: string | null): void {
    if (!owner || owner === SAMPLE_WORKSPACE) {
      this.subscription.set(null);
      return;
    }
    let saved: Subscription | null = null;
    try {
      saved = JSON.parse(localStorage.getItem(PREFIX + owner) ?? 'null') as Subscription | null;
    } catch {
      saved = null;
    }
    if (saved) {
      this.subscription.set(saved);
      return;
    }
    this.subscription.set(null);
    this.save(createTrial(new Date()), owner);
  }

  private save(subscription: Subscription, owner = this.owner()): void {
    if (!owner) return;
    try {
      localStorage.setItem(PREFIX + owner, JSON.stringify(subscription));
    } catch {
      // keep it in memory
    }
    this.subscription.set(subscription);
  }
}
