import { Routes } from '@angular/router';

export const DOWNLOAD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./download-page/download-page').then(m => m.DownloadPageComponent),
  },
];
