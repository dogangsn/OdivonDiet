import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { AuthStore } from '../../core/auth/auth-store';
import { PortalStore } from '../../core/data/portal-store';

/** Signs the member out if the dietitian closed their portal access meanwhile. */
const portalAccessGuard: CanActivateFn = () => {
  const auth = inject(AuthStore);
  const clientId = auth.session()?.clientId;
  if (clientId && inject(PortalStore).canUsePortal(clientId)) return true;
  auth.logout();
  return inject(Router).createUrlTree(['/portal/login']);
};

export const PORTAL_ROUTES: Routes = [
  {
    path: '',
    canActivateChild: [portalAccessGuard],
    loadComponent: () => import('./portal-shell').then((m) => m.PortalShell),
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Özet · Danışan portalı',
        loadComponent: () => import('./portal-home').then((m) => m.PortalHome),
      },
      {
        path: 'plan',
        title: 'Beslenme planım · Danışan portalı',
        loadComponent: () => import('./portal-plan').then((m) => m.PortalPlan),
      },
      {
        path: 'progress',
        title: 'İlerlemem · Danışan portalı',
        loadComponent: () => import('./portal-progress').then((m) => m.PortalProgress),
      },
      {
        path: 'tasks',
        title: 'Görevlerim · Danışan portalı',
        loadComponent: () => import('./portal-tasks').then((m) => m.PortalTasks),
      },
      {
        path: 'requests',
        title: 'Taleplerim · Danışan portalı',
        loadComponent: () => import('./portal-requests').then((m) => m.PortalRequests),
      },
      {
        path: 'messages',
        title: 'Mesajlar · Danışan portalı',
        loadComponent: () => import('./portal-messages').then((m) => m.PortalMessages),
      },
      {
        path: 'profile',
        title: 'Profilim · Danışan portalı',
        loadComponent: () => import('./portal-profile').then((m) => m.PortalProfile),
      },
    ],
  },
];
