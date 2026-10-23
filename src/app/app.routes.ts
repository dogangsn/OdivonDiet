import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'workspace',
    loadComponent: () => import('./features/workspace/workspace-page').then(module => module.WorkspacePage),
  },
];
