import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { isCapacitor } from './core/utils/platform';

const appRedirectGuard = () => {
  const router = inject(Router);
  // En la APK nativa arrancamos directo en /library; en web (incluido
  // localhost y dominio propio) mostramos la landing.
  if (isCapacitor()) {
    return router.createUrlTree(['/library']);
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
    path: 'download',
    loadChildren: () =>
      import('./features/download/download.routes').then(m => m.DOWNLOAD_ROUTES),
  },
  {
    path: 'browse',
    loadChildren: () =>
      import('./features/extensions/extensions.routes').then(m => m.EXTENSIONS_ROUTES),
  },
  {
    // Ruta vieja (pre-restructura de navegacion estilo Mihon); se mantiene
    // como redirect para no romper bookmarks/deep-links existentes.
    path: 'extensions',
    redirectTo: 'browse',
  },
  {
    path: 'library',
    loadChildren: () =>
      import('./features/library/library.routes').then(m => m.LIBRARY_ROUTES),
  },
  {
    path: 'updates',
    loadChildren: () =>
      import('./features/updates/updates.routes').then(m => m.UPDATES_ROUTES),
  },
  {
    path: 'history',
    loadChildren: () =>
      import('./features/history/history.routes').then(m => m.HISTORY_ROUTES),
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
