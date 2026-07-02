import { Component, inject, computed, OnInit, OnDestroy, NgZone } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { NavbarComponent } from './shared/components/navbar/navbar';
import { MobileHeaderComponent } from './shared/components/mobile-header/mobile-header';
import { MobileTabBarComponent } from './shared/components/mobile-tab-bar/mobile-tab-bar';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container';
import { isCapacitor } from './core/utils/platform';
import { UpdatesService } from './core/services/updates.service';
import { UpdateCheckService } from './core/services/update-check.service';
import { SourceLibraryService } from './core/services/source-library.service';
import { TranslateService } from './core/i18n/translate.service';

// Cada cuanto se chequean capitulos nuevos mientras la app esta en foreground.
const UPDATES_CHECK_INTERVAL_MS = 30 * 60 * 1000;

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
    @if (appUpdate.available(); as upd) {
      <div class="update-banner">
        <span class="update-banner__text">{{ t().update.available }} · v{{ upd.version }}</span>
        <button class="update-banner__action" (click)="appUpdate.openDownload()">{{ t().update.action }}</button>
        <button class="update-banner__later" (click)="appUpdate.dismiss()">{{ t().update.later }}</button>
      </div>
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

    .update-banner {
      position: fixed;
      left: 12px;
      right: 12px;
      bottom: calc(56px + env(safe-area-inset-bottom, 0px) + 12px);
      z-index: 1200;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 14px;
      border-radius: 12px;
      background: #161616;
      border: 1px solid #2a2a2a;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    }

    .update-banner__text {
      flex: 1;
      min-width: 0;
      font-size: 0.85rem;
      color: #fff;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .update-banner__action {
      padding: 8px 14px;
      border: none;
      border-radius: 8px;
      background: var(--accent, #e63946);
      color: #fff;
      font-weight: 600;
      font-size: 0.8rem;
      cursor: pointer;
    }

    .update-banner__later {
      padding: 8px 10px;
      border: none;
      border-radius: 8px;
      background: transparent;
      color: rgba(255, 255, 255, 0.55);
      font-size: 0.8rem;
      cursor: pointer;
    }

    @media (min-width: 769px) {
      .update-banner {
        left: auto;
        right: 20px;
        bottom: 20px;
        max-width: 420px;
      }
    }
  `,
})
export class App implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly ngZone = inject(NgZone);
  private readonly updatesService = inject(UpdatesService);
  private readonly sourceLibrary = inject(SourceLibraryService);
  readonly appUpdate = inject(UpdateCheckService);
  readonly t = inject(TranslateService).t;
  private backButtonCleanup: (() => void) | null = null;
  private resumeListenerCleanup: (() => void) | null = null;
  private updatesIntervalId: ReturnType<typeof setInterval> | null = null;

  private readonly url = toSignal(
    this.router.events.pipe(map(() => this.router.url)),
    { initialValue: this.router.url }
  );

  isReaderRoute = computed(() => {
    const u = this.url();
    return u.match(/\/source\/[^/]+\/reader\//) !== null;
  });

  isLandingRoute = computed(() => this.url() === '/' || this.url() === '');
  hideAppShell = computed(() => this.isReaderRoute() || this.isLandingRoute());

  isSubRoute = computed(() => {
    const u = this.url().split('?')[0];
    return !this.ROOT_ROUTES.includes(u) && !this.isReaderRoute() && !this.isLandingRoute();
  });

  private readonly ROOT_ROUTES = ['/', '/library', '/updates', '/history', '/extensions', '/download'];

  ngOnInit(): void {
    this.setupBackButton();
    this.setupUpdatesCheck();
    // Version nueva de la APP (no de capitulos): silencioso si no hay red.
    void this.appUpdate.check();
  }

  private async setupUpdatesCheck(): Promise<void> {
    await this.sourceLibrary.init();

    // Chequeo inicial en background (no bloquea el arranque) + intervalo
    // mientras la app este en foreground.
    void this.updatesService.checkForUpdates();
    this.updatesIntervalId = setInterval(() => {
      void this.updatesService.checkForUpdates();
    }, UPDATES_CHECK_INTERVAL_MS);

    if (!isCapacitor()) return;

    try {
      const { App: CapApp } = await import('@capacitor/app');
      const listener = await CapApp.addListener('resume', () => {
        this.ngZone.run(() => {
          void this.updatesService.checkForUpdates();
        });
      });
      this.resumeListenerCleanup = () => listener.remove();
    } catch (e) {
      console.error('Failed to setup updates resume listener:', e);
    }
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

    return '/extensions';
  }

  ngOnDestroy(): void {
    this.backButtonCleanup?.();
    this.resumeListenerCleanup?.();
    if (this.updatesIntervalId !== null) {
      clearInterval(this.updatesIntervalId);
    }
  }
}
