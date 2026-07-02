import { Routes } from '@angular/router';

export const HISTORY_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./history-page/history-page').then(m => m.HistoryPageComponent),
  },
];
