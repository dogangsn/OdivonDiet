import { HttpClient } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { environment } from '../../../environments/environment';
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
  private readonly http = inject(HttpClient, { optional: true });
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
  readonly sandboxOverride = signal<Subscription | null>(null);

  readonly state = computed<SubscriptionState | null>(() => {
    const subscription = this.sandboxOverride() ?? this.subscription();
    return subscription ? subscriptionState(subscription, this.now()) : null;
  });
  readonly expired = computed(() => this.state()?.expired ?? false);
  /** The sample account shows every feature and no billing unless sandbox simulation is enabled. */
  readonly isSample = computed(
    () => isSampleSession(this.auth.session()) && this.sandboxOverride() === null,
  );

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

  /** Whether the package includes the Member Portal (`/messages`, `/requests`, `/tasks`, invitations). */
  canUsePortal(): boolean {
    const state = this.state();
    return !state || state.plan.portal;
  }

  /** Whether the package allows one more active dietitian/staff seat. */
  canAddStaffSeat(activeSeats: number): boolean {
    const state = this.state();
    return !state || activeSeats < state.plan.seats;
  }

  /** Returns whether a route path is locked by subscription expiry or package tier (`starter` portal lock). */
  isRouteLocked(path: string): boolean {
    const clean = '/' + (path.split('?')[0]?.replace(/^\/+/, '').split('/')[0] ?? 'overview');
    if (this.expired()) {
      return clean !== '/billing' && clean !== '/settings';
    }
    if (!this.canUsePortal() && ['/messages', '/requests', '/tasks'].includes(clean)) {
      return true;
    }
    return false;
  }

  /**
   * Live test/simulation helper so the clinic owner can verify day counting, expiry screen locking,
   * Starter package portal restriction, and Clinic 5-seat limit at any time.
   */
  simulateScenario(
    scenario: 'trial_14' | 'trial_2' | 'expired' | 'starter_active' | 'clinic_active' | 'reset',
  ): void {
    const now = new Date();
    const dayMs = 86_400_000;
    if (scenario === 'reset') {
      this.sandboxOverride.set(null);
      return;
    }
    if (scenario === 'trial_14') {
      this.sandboxOverride.set(createTrial(now));
      return;
    }
    if (scenario === 'trial_2') {
      const start = new Date(now.getTime() - 12 * dayMs);
      const end = new Date(now.getTime() + 2 * dayMs);
      this.sandboxOverride.set({
        ...createTrial(start),
        trialStartedAt: start.toISOString(),
        trialEndsAt: end.toISOString(),
      });
      return;
    }
    if (scenario === 'expired') {
      const start = new Date(now.getTime() - 16 * dayMs);
      const end = new Date(now.getTime() - 2 * dayMs);
      this.sandboxOverride.set({
        ...createTrial(start),
        trialStartedAt: start.toISOString(),
        trialEndsAt: end.toISOString(),
      });
      return;
    }
    if (scenario === 'starter_active') {
      this.sandboxOverride.set(
        applyPayment(createTrial(now), 'starter', 'monthly', 'SIM-STARTER', now),
      );
      return;
    }
    if (scenario === 'clinic_active') {
      this.sandboxOverride.set(
        applyPayment(createTrial(now), 'clinic', 'yearly', 'SIM-CLINIC', now),
      );
    }
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
      this.pullRemoteSubscription(owner);
      return;
    }
    this.subscription.set(null);
    this.save(createTrial(new Date()), owner);
    this.pullRemoteSubscription(owner);
  }

  private save(subscription: Subscription, owner = this.owner(), pushRemote = true): void {
    if (!owner) return;
    try {
      localStorage.setItem(PREFIX + owner, JSON.stringify(subscription));
    } catch {
      // keep it in memory
    }
    this.subscription.set(subscription);
    if (pushRemote) {
      this.pushRemoteSubscription(subscription);
    }
  }

  private pullRemoteSubscription(owner: string): void {
    const session = untracked(this.auth.session);
    if (!this.http || !session || session.demo || owner === SAMPLE_WORKSPACE) return;
    this.http.get<Subscription>(`${environment.apiBaseUrl}/diet/subscription`).subscribe({
      next: (remote) => {
        if (!remote || this.owner() !== owner) return;
        this.save(remote, owner, false);
      },
      error: () => {},
    });
  }

  private pushRemoteSubscription(subscription: Subscription): void {
    const session = untracked(this.auth.session);
    if (!this.http || !session || session.demo) return;
    this.http
      .put(`${environment.apiBaseUrl}/diet/subscription`, subscription)
      .subscribe({ error: () => {} });
  }
}
