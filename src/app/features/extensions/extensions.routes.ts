import { Routes } from '@angular/router';

export const EXTENSIONS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./extensions-page/extensions-page').then(m => m.ExtensionsPageComponent),
  },
];
