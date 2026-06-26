import { Routes } from '@angular/router';

export const DOWNLOAD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../library/downloads/downloads-page/downloads-page').then(m => m.DownloadsPageComponent),
  },
];
