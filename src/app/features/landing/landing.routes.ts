import { Routes } from '@angular/router';

export const LANDING_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./landing-page/landing-page').then(m => m.LandingPageComponent),
  },
];
