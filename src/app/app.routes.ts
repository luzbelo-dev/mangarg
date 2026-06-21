import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

const mobileRedirectGuard = () => {
  const router = inject(Router);
  if (window.innerWidth <= 768 || navigator.userAgent.includes('Capacitor')) {
    return router.createUrlTree(['/search']);
  }
  return true;
};

export const routes: Routes = [
  {
    path: '',
    loadChildren: () =>
      import('./features/landing/landing.routes').then(m => m.LANDING_ROUTES),
    pathMatch: 'full',
    canActivate: [mobileRedirectGuard],
  },
  {
    path: 'search',
    loadChildren: () =>
      import('./features/search/search.routes').then(m => m.SEARCH_ROUTES),
  },
  {
    path: 'manga',
    loadChildren: () =>
      import('./features/detail/detail.routes').then(m => m.DETAIL_ROUTES),
  },
  {
    path: 'explore',
    loadChildren: () =>
      import('./features/explore/explore.routes').then(m => m.EXPLORE_ROUTES),
  },
  {
    path: 'download',
    loadChildren: () =>
      import('./features/download/download.routes').then(m => m.DOWNLOAD_ROUTES),
  },
  {
    path: 'extensions',
    loadChildren: () =>
      import('./features/extensions/extensions.routes').then(m => m.EXTENSIONS_ROUTES),
  },
  {
    path: 'library',
    loadChildren: () =>
      import('./features/library/library.routes').then(m => m.LIBRARY_ROUTES),
  },
  {
    path: 'reader',
    loadChildren: () =>
      import('./features/reader/reader.routes').then(m => m.READER_ROUTES),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
