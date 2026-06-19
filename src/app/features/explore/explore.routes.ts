import { Routes } from '@angular/router';

export const EXPLORE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./explore-page/explore-page').then(m => m.ExplorePageComponent),
  },
];
