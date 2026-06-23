import { ApplicationConfig, provideBrowserGlobalErrorListeners, isDevMode, APP_INITIALIZER, inject } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { rateLimitInterceptor } from './core/interceptors/rate-limit.interceptor';
import { provideServiceWorker } from '@angular/service-worker';
import { AdapterLoaderService } from './core/services/adapter-loader.service';

function initAdapters() {
  const loader = inject(AdapterLoaderService);
  return () => loader.init();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([rateLimitInterceptor])),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    {
      provide: APP_INITIALIZER,
      useFactory: initAdapters,
      multi: true,
    },
  ],
};
