import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/auth-page').then((m) => m.AuthPage),
    data: { mode: 'login' },
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/auth-page').then((m) => m.AuthPage),
    data: { mode: 'register' },
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/app-shell').then((m) => m.AppShell),
    children: [
      {
        path: 'overview',
        title: 'Genel bakış · OdivonDiet',
        loadComponent: () =>
          import('./features/overview/overview-page').then((m) => m.OverviewPage),
      },
      {
        path: 'clients',
        title: 'Danışanlar · OdivonDiet',
        loadComponent: () => import('./features/clients/clients-page').then((m) => m.ClientsPage),
      },
      {
        path: 'plans',
        title: 'Beslenme planları · OdivonDiet',
        loadComponent: () => import('./features/plans/plans-page').then((m) => m.PlansPage),
      },
      {
        path: 'measurements',
        title: 'Ölçümler · OdivonDiet',
        loadComponent: () =>
          import('./features/measurements/measurements-page').then((m) => m.MeasurementsPage),
      },
      {
        path: 'consultations',
        title: 'Görüşmeler · OdivonDiet',
        loadComponent: () =>
          import('./features/consultations/consultations-page').then((m) => m.ConsultationsPage),
      },
      {
        path: 'reports',
        title: 'Raporlar · OdivonDiet',
        loadComponent: () => import('./features/reports/reports-page').then((m) => m.ReportsPage),
      },
      {
        path: 'activity',
        title: 'Aktiviteler · OdivonDiet',
        loadComponent: () =>
          import('./features/activity/activity-page').then((m) => m.ActivityPage),
      },
      {
        path: 'settings',
        title: 'Ayarlar · OdivonDiet',
        loadComponent: () =>
          import('./features/settings/settings-page').then((m) => m.SettingsPage),
      },
      { path: '', pathMatch: 'full', redirectTo: 'overview' },
    ],
  },
  { path: '**', redirectTo: '' },
];
