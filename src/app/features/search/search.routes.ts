import { Routes } from '@angular/router';

export const SEARCH_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./search-page/search-page').then(m => m.SearchPageComponent),
  },
];
