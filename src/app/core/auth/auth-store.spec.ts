import { TestBed } from '@angular/core/testing';
import { AuthStore, EmailNotVerifiedError, VerificationError } from './auth-store';

describe('AuthStore e-mail verification (demo mode)', () => {
  let auth: AuthStore;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    auth = TestBed.inject(AuthStore);
  });

  afterEach(() => localStorage.clear());

  it('does not activate a new account until the e-mail is verified', async () => {
    await auth.register('Dyt. Ayşe', 'ayse@klinik.com', 'sifre1234', 'Ayşe Klinik');
    expect(auth.isAuthenticated()).toBe(false);
    const pending = auth.pendingVerification();
    expect(pending?.email).toBe('ayse@klinik.com');
    expect(pending?.code).toMatch(/^\d{6}$/);
  });

  it('blocks sign-in for an unverified address', async () => {
    await auth.register('Dyt. Ayşe', 'ayse@klinik.com', 'sifre1234');
    await expect(auth.signIn('AYSE@klinik.com', 'sifre1234')).rejects.toBeInstanceOf(
      EmailNotVerifiedError,
    );
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('rejects a wrong code and activates with the right one', async () => {
    await auth.register('Dyt. Ayşe', 'ayse@klinik.com', 'sifre1234', 'Ayşe Klinik');
    const code = auth.pendingVerification()!.code!;
    const wrong = code === '000000' ? '111111' : '000000';
    expect(() => auth.verifyCode(wrong)).toThrow(VerificationError);
    expect(auth.isAuthenticated()).toBe(false);

    auth.verifyCode(code);
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.session()?.practice).toBe('Ayşe Klinik');
    expect(auth.pendingVerification()).toBeNull();
  });

  it('rejects an expired code', async () => {
    await auth.register('Dyt. Ayşe', 'ayse@klinik.com', 'sifre1234');
    const code = auth.pendingVerification()!.code!;
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 16 * 60_000);
    expect(() => auth.verifyCode(code)).toThrow(/süresi doldu/);
    vi.restoreAllMocks();
  });

  it('enforces the resend cooldown', async () => {
    await auth.register('Dyt. Ayşe', 'ayse@klinik.com', 'sifre1234');
    expect(auth.resendWaitSeconds()).toBeGreaterThan(0);
    await expect(auth.resendVerification()).rejects.toBeInstanceOf(VerificationError);
    const sentAt = auth.pendingVerification()!.sentAt;
    expect(auth.resendWaitSeconds(sentAt + 61_000)).toBe(0);
  });
});
