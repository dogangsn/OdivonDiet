import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserRole } from '../../domain/portal.models';
import { AuthStore } from './auth-store';

export const authGuard: CanActivateFn = () =>
  inject(AuthStore).isAuthenticated() ? true : inject(Router).createUrlTree(['/login']);

/**
 * Shows the public marketing landing page at `/` for visitors, and sends signed-in users
 * straight to their workspace (`/overview` or `/portal`).
 */
export const landingGuard: CanActivateFn = () => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  return auth.isAuthenticated() ? router.createUrlTree([auth.homePath()]) : true;
};

/**
 * Lets only the given role in. Anyone else signed in is sent to their own home,
 * so a member typing `/clients` lands back on the portal.
 */
export function roleGuard(role: UserRole): CanActivateFn {
  return () => {
    const auth = inject(AuthStore);
    const router = inject(Router);
    if (!auth.isAuthenticated()) {
      return router.createUrlTree([role === 'member' ? '/portal/login' : '/login']);
    }
    return auth.role() === role ? true : router.createUrlTree([auth.homePath()]);
  };
}
