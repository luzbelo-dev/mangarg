import { Component, inject, computed, OnInit, OnDestroy, NgZone } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { Location } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { NavbarComponent } from './shared/components/navbar/navbar';
import { MobileHeaderComponent } from './shared/components/mobile-header/mobile-header';
import { MobileTabBarComponent } from './shared/components/mobile-tab-bar/mobile-tab-bar';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container';

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
      <mt-mobile-header class="mobile-only" />
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
  private readonly location = inject(Location);
  private readonly ngZone = inject(NgZone);

  private backButtonHandler: (() => void) | null = null;

  private readonly url = toSignal(
    this.router.events.pipe(map(() => this.router.url)),
    { initialValue: this.router.url }
  );

  isReaderRoute = computed(() => {
    const u = this.url();
    return u.startsWith('/reader') || u.match(/^\/source\/[^/]+\/reader\//) !== null;
  });
  isLandingRoute = computed(() => this.url() === '/' || this.url() === '');
  hideAppShell = computed(() => this.isReaderRoute() || this.isLandingRoute());

  ngOnInit(): void {
    // Handle Android hardware back button via document backbutton event (Capacitor)
    // and popstate for general PWA/WebView back navigation
    this.backButtonHandler = () => {
      this.ngZone.run(() => {
        // If at a root-level route, let the default behavior (exit app) happen
        const currentUrl = this.router.url;
        const rootRoutes = ['/', '/search', '/explore', '/library', '/extensions'];
        if (rootRoutes.includes(currentUrl.split('?')[0])) {
          // At top-level, allow default back behavior (exit)
          return;
        }
        // Otherwise navigate back in history
        this.location.back();
      });
    };

    document.addEventListener('backbutton', this.backButtonHandler);
  }

  ngOnDestroy(): void {
    if (this.backButtonHandler) {
      document.removeEventListener('backbutton', this.backButtonHandler);
    }
  }
}
