import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { AuthStore } from './auth-store';
import { roleGuard } from './auth.guard';

describe('roleGuard', () => {
  const run = (role: 'dietitian' | 'member') =>
    TestBed.runInInjectionContext(() =>
      roleGuard(role)({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
  const path = (result: unknown) => (result instanceof UrlTree ? result.toString() : result);

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  afterEach(() => localStorage.clear());

  it('sends signed-out visitors to the matching login', () => {
    expect(path(run('dietitian'))).toBe('/login');
    expect(path(run('member'))).toBe('/portal/login');
  });

  it('keeps members out of the dietitian workspace', async () => {
    await TestBed.inject(AuthStore).continueMemberDemo();
    expect(path(run('dietitian'))).toBe('/portal');
    expect(run('member')).toBe(true);
  });

  it('keeps dietitians out of the member portal', () => {
    TestBed.inject(AuthStore).continueDemo();
    expect(path(run('member'))).toBe('/overview');
    expect(run('dietitian')).toBe(true);
  });
});
