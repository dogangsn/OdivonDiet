import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { SubscriptionStore } from './subscription-store';

/** Pages that stay open after the trial ends, so the dietitian can pick a package. */
const ALWAYS_OPEN = ['/billing', '/settings'];

/**
 * Once the trial (or a paid period) has ended, the workspace is locked and every page
 * except billing and settings sends the dietitian to the package selection. Data is kept.
 */
export const subscriptionGuard: CanActivateChildFn = (_route, state) => {
  const subs = inject(SubscriptionStore);
  if (!subs.expired()) return true;
  if (ALWAYS_OPEN.some((path) => state.url.startsWith(path))) return true;
  return inject(Router).createUrlTree(['/billing']);
};
