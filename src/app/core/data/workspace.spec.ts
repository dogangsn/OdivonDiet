import { TestBed } from '@angular/core/testing';
import { AuthStore } from '../auth/auth-store';
import { SubscriptionStore } from '../billing/subscription-store';
import { DietStore } from './diet-store';
import { PortalStore } from './portal-store';

describe('workspaces', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });
  afterEach(() => localStorage.clear());

  async function registerAndVerify(auth: AuthStore, email: string): Promise<void> {
    await auth.register('Dyt. Ayşe', email, 'sifre1234', 'Ayşe Klinik');
    auth.verifyCode(auth.pendingVerification()!.code!);
  }

  it('opens a new account with an empty practice and a 14-day trial', async () => {
    const auth = TestBed.inject(AuthStore);
    await registerAndVerify(auth, 'ayse@klinik.com');
    const diet = TestBed.inject(DietStore);
    const portal = TestBed.inject(PortalStore);
    const subs = TestBed.inject(SubscriptionStore);
    TestBed.tick();

    expect(auth.session()?.sample).toBe(false);
    expect(diet.clients()).toEqual([]);
    expect(diet.consultations()).toEqual([]);
    expect(portal.messages()).toEqual([]);
    expect(subs.state()?.trialing).toBe(true);
    expect(subs.state()?.daysLeft).toBe(14);
  });

  it('keeps the demo account on sample data without billing', () => {
    const auth = TestBed.inject(AuthStore);
    auth.continueDemo();
    const diet = TestBed.inject(DietStore);
    const subs = TestBed.inject(SubscriptionStore);
    TestBed.tick();
    expect(diet.clients().length).toBeGreaterThan(0);
    expect(subs.state()).toBeNull();
    expect(subs.isSample()).toBe(true);
  });

  it('saves a practice per account and swaps it on login', async () => {
    const auth = TestBed.inject(AuthStore);
    await registerAndVerify(auth, 'ayse@klinik.com');
    const diet = TestBed.inject(DietStore);
    TestBed.tick();
    diet.saveClient({
      firstName: 'Can',
      lastName: 'Er',
      email: 'can@example.com',
      phone: '',
      birthDate: '1990-01-01',
      sex: 'male',
      heightCm: 180,
      startWeightKg: 90,
      targetWeightKg: 80,
      activity: 'moderate',
      program: 'weight_loss',
      conditions: [],
      allergies: [],
      consentAt: null,
      status: 'active',
    });
    TestBed.tick();

    auth.logout();
    await auth.signIn('mehmet@klinik.com', 'x');
    TestBed.tick();
    expect(diet.clients()).toEqual([]);

    auth.logout();
    await auth.signIn('ayse@klinik.com', 'x');
    TestBed.tick();
    expect(diet.clients().map((c) => c.firstName)).toEqual(['Can']);
  });
});
