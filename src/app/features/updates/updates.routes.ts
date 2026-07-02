import { Routes } from '@angular/router';

export const UPDATES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./updates-page/updates-page').then(m => m.UpdatesPageComponent),
  },
];
