import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { SubscriptionStore } from '../billing/subscription-store';
import { subscriptionGuard } from '../billing/subscription.guard';
import { AuthStore, PortalAccessError } from './auth-store';
import { roleGuard } from './auth.guard';

describe('roleGuard & subscriptionGuard (RBAC + Expiry + Package Entitlements)', () => {
  const runRole = (role: 'dietitian' | 'member') =>
    TestBed.runInInjectionContext(() =>
      roleGuard(role)({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
  const runSub = (url: string) =>
    TestBed.runInInjectionContext(() =>
      subscriptionGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );
  const path = (result: unknown) => (result instanceof UrlTree ? result.toString() : result);

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  afterEach(() => localStorage.clear());

  it('sends signed-out visitors to the matching login', () => {
    expect(path(runRole('dietitian'))).toBe('/login');
    expect(path(runRole('member'))).toBe('/portal/login');
  });

  it('keeps members out of the dietitian workspace', async () => {
    await TestBed.inject(AuthStore).continueMemberDemo();
    expect(path(runRole('dietitian'))).toBe('/portal');
    expect(runRole('member')).toBe(true);
  });

  it('keeps dietitians out of the member portal', () => {
    TestBed.inject(AuthStore).continueDemo();
    expect(path(runRole('member'))).toBe('/overview');
    expect(runRole('dietitian')).toBe(true);
  });

  it('blocks screens when trial/subscription expires except /billing and /settings', () => {
    const auth = TestBed.inject(AuthStore);
    const subs = TestBed.inject(SubscriptionStore);
    auth.continueDemo();
    subs.simulateScenario('expired');

    expect(subs.expired()).toBe(true);
    expect(subs.state()?.daysLeft).toBe(0);
    expect(path(runSub('/overview'))).toBe('/billing');
    expect(path(runSub('/clients'))).toBe('/billing');
    expect(path(runSub('/plans'))).toBe('/billing');
    expect(runSub('/billing')).toBe(true);
    expect(runSub('/settings')).toBe(true);
  });

  it('blocks portal routes (/messages, /requests, /tasks) on Starter package', () => {
    const auth = TestBed.inject(AuthStore);
    const subs = TestBed.inject(SubscriptionStore);
    auth.continueDemo();
    subs.simulateScenario('starter_active');

    expect(subs.canUsePortal()).toBe(false);
    expect(subs.canAddStaffSeat(1)).toBe(false);
    expect(path(runSub('/messages'))).toBe('/billing');
    expect(path(runSub('/requests'))).toBe('/billing');
    expect(path(runSub('/tasks'))).toBe('/billing');
    expect(runSub('/clients')).toBe(true);
  });

  it('enforces granular staff role permissions (RBAC) and blocks deactivated staff login', async () => {
    const auth = TestBed.inject(AuthStore);
    auth.continueDemo();

    const receptionUser = auth.addStaffMember({
      name: 'Sekreter Ayşe',
      email: 'ayse@klinik.com',
      role: 'reception',
      specialty: 'Ön Büro',
    });

    auth.setStaffRole('reception');
    expect(runSub('/clients')).toBe(true);
    expect(runSub('/consultations')).toBe(true);
    expect(path(runSub('/clinical-lab'))).toBe('/overview');
    expect(path(runSub('/plans'))).toBe('/overview');
    expect(path(runSub('/billing'))).toBe('/overview');

    auth.toggleStaffMemberActive(receptionUser.id);
    await expect(auth.signIn('ayse@klinik.com', '12345678')).rejects.toThrow(PortalAccessError);
  });
});
