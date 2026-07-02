import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { isCapacitor } from './core/utils/platform';

const appRedirectGuard = () => {
  const router = inject(Router);
  // En la APK nativa arrancamos directo en /extensions; en web (incluido
  // localhost y dominio propio) mostramos la landing.
  if (isCapacitor()) {
    return router.createUrlTree(['/extensions']);
  }
  return true;
};

export const routes: Routes = [
  {
    path: '',
    loadChildren: () =>
      import('./features/landing/landing.routes').then(m => m.LANDING_ROUTES),
    pathMatch: 'full',
    canActivate: [appRedirectGuard],
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
    path: 'source',
    loadChildren: () =>
      import('./features/source/source.routes').then(m => m.SOURCE_ROUTES),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
