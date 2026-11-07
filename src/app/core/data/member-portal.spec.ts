import { TestBed } from '@angular/core/testing';
import { AuthStore } from '../auth/auth-store';
import { DietStore } from './diet-store';
import { MemberPortal } from './member-portal';
import { PortalStore } from './portal-store';

describe('MemberPortal', () => {
  let member: MemberPortal;
  let auth: AuthStore;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    member = TestBed.inject(MemberPortal);
    auth = TestBed.inject(AuthStore);
  });

  afterEach(() => localStorage.clear());

  it('shows nothing to a dietitian session', () => {
    auth.continueDemo();
    expect(member.clientId()).toBeNull();
    expect(member.messages()).toEqual([]);
  });

  it("scopes every read to the member's own client", async () => {
    await auth.continueMemberDemo();
    expect(auth.role()).toBe('member');
    expect(member.clientId()).toBe('c-1');
    expect(member.tasks().every((t) => t.clientId === 'c-1')).toBe(true);
    expect(member.messages().every((m) => m.clientId === 'c-1')).toBe(true);
    expect(member.plans().every((p) => p.clientId === 'c-1' && p.status !== 'draft')).toBe(true);
  });

  it("hides the dietitian's private consultation notes", async () => {
    await auth.continueMemberDemo();
    const consultations = member.consultations();
    expect(consultations.length).toBeGreaterThan(0);
    expect(consultations.some((c) => 'notes' in c)).toBe(false);
  });

  it("refuses to complete someone else's task", async () => {
    await auth.continueMemberDemo();
    expect(() => member.completeTask('t-4', '')).toThrow();
    expect(TestBed.inject(PortalStore).task('t-4')?.status).toBe('open');
  });

  it('records self-reported weight for the dietitian to see', async () => {
    await auth.continueMemberDemo();
    member.logWeight(74.1, 'Sabah');
    const view = TestBed.inject(DietStore).view('c-1')!;
    expect(view.currentWeightKg).toBe(74.1);
    expect(view.lastMeasurement?.source).toBe('member');
  });

  it('rejects member logins without portal access in demo mode', async () => {
    await expect(auth.signInMember('kimse@ornek.com', 'parola123')).rejects.toThrow(
      /portal erişimi/,
    );
  });
});
