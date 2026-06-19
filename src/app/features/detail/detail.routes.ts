import { Routes } from '@angular/router';

export const DETAIL_ROUTES: Routes = [
  {
    path: ':id',
    loadComponent: () =>
      import('./manga-detail/manga-detail').then(m => m.MangaDetailComponent),
  },
];
