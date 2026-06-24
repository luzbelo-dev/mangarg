import { Component, inject, computed, OnInit, OnDestroy, NgZone } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { Location } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, filter } from 'rxjs';
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

  private backButtonHandler: ((e: Event) => void) | null = null;
  private historyLength = 0;

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

  private readonly ROOT_ROUTES = ['/', '/search', '/explore', '/library', '/extensions'];

  ngOnInit(): void {
    // Track navigation history length so we know if back navigation is possible
    this.historyLength = 0;
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        this.historyLength++;
      });

    // Handle Android hardware back button.
    // The 'backbutton' event fires on Capacitor/Cordova Android when the hardware back is pressed.
    // We also push a dummy history state so popstate fires as a fallback for PWA/WebView.
    this.backButtonHandler = (e: Event) => {
      e.preventDefault();
      this.ngZone.run(() => {
        const currentUrl = this.router.url.split('?')[0];
        if (this.ROOT_ROUTES.includes(currentUrl)) {
          // At a root tab: minimize app if possible, otherwise do nothing (don't exit)
          if ((window as any).navigator?.app?.exitApp) {
            (window as any).navigator.app.exitApp();
          }
          // For PWA: do nothing, prevents exit
          return;
        }
        // Navigate back
        this.location.back();
      });
    };

    document.addEventListener('backbutton', this.backButtonHandler);

    // For PWA / Android WebView without Capacitor plugin:
    // Push an initial history state so the first back press fires popstate
    // instead of closing the app
    if (this.historyLength === 0) {
      window.history.pushState({ mtInit: true }, '');
    }

    window.addEventListener('popstate', this.onPopState);
  }

  private onPopState = (e: PopStateEvent): void => {
    this.ngZone.run(() => {
      const currentUrl = this.router.url.split('?')[0];
      if (this.ROOT_ROUTES.includes(currentUrl)) {
        // Re-push state so the user can't accidentally exit
        window.history.pushState({ mtInit: true }, '');
      }
      // Angular router handles popstate navigation automatically
    });
  };

  ngOnDestroy(): void {
    if (this.backButtonHandler) {
      document.removeEventListener('backbutton', this.backButtonHandler);
    }
    window.removeEventListener('popstate', this.onPopState);
  }
}
