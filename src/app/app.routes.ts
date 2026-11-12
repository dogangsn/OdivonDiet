import { Routes } from '@angular/router';
import { landingGuard, roleGuard } from './core/auth/auth.guard';
import { subscriptionGuard } from './core/billing/subscription.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [landingGuard],
    title: 'OdivonDiet · Klinik Beslenme, Menü Mühendisliği & Danışan Yönetim Platformu',
    loadComponent: () => import('./features/landing/landing-page').then((m) => m.LandingPage),
  },
  {
    path: 'tanitim',
    title: 'Ürün Tanıtımı & Özellikler · OdivonDiet',
    loadComponent: () => import('./features/landing/landing-page').then((m) => m.LandingPage),
  },
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
    path: 'verify-email',
    title: 'E-posta doğrulama · OdivonDiet',
    loadComponent: () => import('./features/auth/auth-page').then((m) => m.AuthPage),
    data: { mode: 'verify' },
  },
  {
    path: 'portal/login',
    title: 'Danışan girişi · OdivonDiet',
    loadComponent: () => import('./features/auth/auth-page').then((m) => m.AuthPage),
    data: { mode: 'member' },
  },
  {
    path: 'portal',
    canActivate: [roleGuard('member')],
    loadChildren: () => import('./features/portal/portal.routes').then((m) => m.PORTAL_ROUTES),
  },
  {
    path: '',
    canActivate: [roleGuard('dietitian')],
    canActivateChild: [subscriptionGuard],
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
        path: 'foods',
        title: 'Besin & yemek kütüphanesi · OdivonDiet',
        loadComponent: () => import('./features/foods/foods-page').then((m) => m.FoodsPage),
      },
      {
        path: 'clinical-lab',
        title: 'Klinik analiz & biyobelirteç stüdyosu · OdivonDiet',
        loadComponent: () =>
          import('./features/clinical-lab/clinical-lab-page').then((m) => m.ClinicalLabPage),
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
        path: 'messages',
        title: 'Mesajlar · OdivonDiet',
        loadComponent: () =>
          import('./features/messages/messages-page').then((m) => m.MessagesPage),
      },
      {
        path: 'requests',
        title: 'Talepler · OdivonDiet',
        loadComponent: () =>
          import('./features/requests/requests-page').then((m) => m.RequestsPage),
      },
      {
        path: 'tasks',
        title: 'Görevler · OdivonDiet',
        loadComponent: () => import('./features/tasks/tasks-page').then((m) => m.TasksPage),
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
      {
        path: 'billing',
        title: 'Abonelik · OdivonDiet',
        loadComponent: () => import('./features/billing/billing-page').then((m) => m.BillingPage),
      },
      { path: '', pathMatch: 'full', redirectTo: 'overview' },
    ],
  },
  { path: '**', redirectTo: '' },
];
