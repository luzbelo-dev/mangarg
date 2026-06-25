import { Component, inject, computed, OnInit, OnDestroy, NgZone } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { NavbarComponent } from './shared/components/navbar/navbar';
import { MobileHeaderComponent } from './shared/components/mobile-header/mobile-header';
import { MobileTabBarComponent } from './shared/components/mobile-tab-bar/mobile-tab-bar';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container';

function isCapacitor(): boolean {
  return typeof (window as any)?.Capacitor !== 'undefined';
}

@Component({
  selector: 'mt-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, MobileHeaderComponent, MobileTabBarComponent, ToastContainerComponent],
  host: {
    '[class.landing-active]': 'isLandingRoute()',
  },
  template: `
    @if (!hideAppShell()) {
      <mt-navbar class="desktop-only" />
      <mt-mobile-header class="mobile-only" [showBack]="isSubRoute()" />
    }
    <main [class.main-content]="!hideAppShell()" [class.main-content--mobile]="!hideAppShell()">
      <router-outlet />
    </main>
    @if (!hideAppShell()) {
      <mt-mobile-tab-bar class="mobile-only" />
    }
    <mt-toast-container />
  `,
  styles: `
    :host {
      display: block;
      overflow-x: hidden;
      max-width: 100vw;
    }

    :host.landing-active {
      background: #0a0a0a;
    }

    .desktop-only {
      display: block;
    }

    .mobile-only {
      display: none;
    }

    .main-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px;
      min-height: calc(100vh - 60px);
      overflow-x: hidden;
    }

    @media (max-width: 768px) {
      .desktop-only {
        display: none;
      }

      .mobile-only {
        display: block;
      }

      .main-content--mobile {
        padding-top: calc(48px + env(safe-area-inset-top, 0px) + 16px);
        padding-bottom: calc(56px + env(safe-area-inset-bottom, 0px) + 16px);
        min-height: 100vh;
      }
    }
  `,
})
export class App implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly ngZone = inject(NgZone);
  private backButtonCleanup: (() => void) | null = null;

  private readonly url = toSignal(
    this.router.events.pipe(map(() => this.router.url)),
    { initialValue: this.router.url }
  );

  isReaderRoute = computed(() => {
    const u = this.url();
    return u.startsWith('/reader') || u.match(/\/source\/[^/]+\/reader\//) !== null;
  });

  isLandingRoute = computed(() => this.url() === '/' || this.url() === '');
  hideAppShell = computed(() => this.isReaderRoute() || this.isLandingRoute());

  isSubRoute = computed(() => {
    const u = this.url().split('?')[0];
    return !this.ROOT_ROUTES.includes(u) && !this.isReaderRoute() && !this.isLandingRoute();
  });

  private readonly ROOT_ROUTES = ['/', '/search', '/explore', '/library', '/extensions', '/download'];

  ngOnInit(): void {
    this.setupBackButton();
  }

  private async setupBackButton(): Promise<void> {
    if (!isCapacitor()) return;

    try {
      const { App: CapApp } = await import('@capacitor/app');

      const listener = await CapApp.addListener('backButton', ({ canGoBack }) => {
        this.ngZone.run(() => {
          const currentUrl = this.router.url.split('?')[0];

          if (this.ROOT_ROUTES.includes(currentUrl)) {
            CapApp.minimizeApp();
            return;
          }

          const parentRoute = this.getParentRoute(currentUrl);
          if (parentRoute) {
            this.router.navigate([parentRoute], { replaceUrl: true });
          } else if (canGoBack) {
            window.history.back();
          } else {
            CapApp.minimizeApp();
          }
        });
      });

      this.backButtonCleanup = () => listener.remove();
    } catch (e) {
      console.error('Failed to setup back button:', e);
    }
  }

  private getParentRoute(url: string): string | null {
    const readerMatch = url.match(/^\/source\/([^/]+)\/reader\//);
    if (readerMatch) {
      const queryParams = new URLSearchParams(this.router.url.split('?')[1] || '');
      const mangaSlug = queryParams.get('manga');
      if (mangaSlug) {
        return `/source/${readerMatch[1]}/manga/${mangaSlug}`;
      }
      return `/source/${readerMatch[1]}`;
    }

    const mangaMatch = url.match(/^\/source\/([^/]+)\/manga\//);
    if (mangaMatch) {
      return `/source/${mangaMatch[1]}`;
    }

    if (url.match(/^\/source\/[^/]+$/)) {
      return '/extensions';
    }

    if (url.startsWith('/manga/')) return '/search';
    if (url.startsWith('/reader/')) return '/search';

    return '/extensions';
  }

  ngOnDestroy(): void {
    this.backButtonCleanup?.();
  }
}
