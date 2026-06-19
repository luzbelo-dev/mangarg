import { Routes } from '@angular/router';

export const LIBRARY_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./library-page/library-page').then(m => m.LibraryPageComponent),
  },
  {
    path: 'downloads',
    loadComponent: () =>
      import('./downloads/downloads-page/downloads-page').then(m => m.DownloadsPageComponent),
  },
];
