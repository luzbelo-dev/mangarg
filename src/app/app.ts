import { Component, inject, computed } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { NavbarComponent } from './shared/components/navbar/navbar';
import { MobileHeaderComponent } from './shared/components/mobile-header/mobile-header';
import { MobileTabBarComponent } from './shared/components/mobile-tab-bar/mobile-tab-bar';

@Component({
  selector: 'mt-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, MobileHeaderComponent, MobileTabBarComponent],
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
  `,
  styles: `
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
export class App {
  private readonly router = inject(Router);

  private readonly url = toSignal(
    this.router.events.pipe(map(() => this.router.url)),
    { initialValue: this.router.url }
  );

  isReaderRoute = computed(() => this.url().startsWith('/reader'));
  isLandingRoute = computed(() => this.url() === '/' || this.url() === '');
  hideAppShell = computed(() => this.isReaderRoute() || this.isLandingRoute());
}
