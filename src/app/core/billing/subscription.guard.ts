import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { staffRoleById } from '../../domain/staff-rbac';
import { AuthStore } from '../auth/auth-store';
import { Notify } from '../notify/notify';
import { SubscriptionStore } from './subscription-store';

/** Pages that stay open after the trial ends, so the dietitian can pick a package. */
const ALWAYS_OPEN = ['/billing', '/settings'];
const PORTAL_ROUTES = ['/messages', '/requests', '/tasks'];

/**
 * Enforces:
 * 1. Subscription / trial expiration (locks all pages except `/billing` and `/settings`).
 * 2. Package feature entitlements (`Starter` package locks Member Portal routes).
 * 3. Staff Role-Based Access Control (RBAC) screen permissions (`owner`, `dietitian`, `assistant`, `reception`).
 */
export const subscriptionGuard: CanActivateChildFn = (_route, state) => {
  const subs = inject(SubscriptionStore);
  const auth = inject(AuthStore);
  const notify = inject(Notify);
  const router = inject(Router);

  if (subs.expired()) {
    if (ALWAYS_OPEN.some((path) => state.url.startsWith(path))) return true;
    notify.warning(
      'Abonelik veya deneme süreniz doldu',
      'Verileriniz güvende; ekranların kilidini açmak için bir paket seçin.',
    );
    return router.createUrlTree(['/billing']);
  }

  if (!subs.canUsePortal() && PORTAL_ROUTES.some((path) => state.url.startsWith(path))) {
    notify.warning(
      'Danışan Portalı Profesyonel ve Klinik pakette aktiftir',
      'Mesaj, talep ve görev ekranlarını kullanmak için paketinizi yükseltin.',
    );
    return router.createUrlTree(['/billing']);
  }

  if (!auth.canAccessPath(state.url)) {
    const roleDef = staffRoleById(auth.staffRole());
    notify.warning(
      'Rol ekran yetkisi kısıtlı',
      `"${roleDef.label}" rolü bu ekrana erişemez. Klinik yöneticinizle görüşün.`,
    );
    return router.createUrlTree(['/overview']);
  }

  return true;
};
