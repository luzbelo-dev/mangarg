import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Location } from '@angular/common';
import { TranslateService } from '../../../core/i18n/translate.service';

@Component({
  selector: 'mt-mobile-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="mobile-header">
      @if (showBack()) {
        <button class="mobile-header__back" (click)="goBack()">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
      }
      <span class="mobile-header__title">Mi Manga Dinamita</span>
    </header>
  `,
  styles: `
    .mobile-header {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 100;
      display: flex;
      align-items: center;
      gap: 4px;
      height: calc(48px + env(safe-area-inset-top, 0px));
      padding-top: env(safe-area-inset-top, 0px);
      padding-left: 8px;
      padding-right: 12px;
      background: var(--bg-nav);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border-color);
    }

    .mobile-header__back {
      width: 44px;
      height: 44px;
      min-width: 44px;
      border: none;
      background: none;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-primary);
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      transition: background 0.2s ease;

      &:active {
        background: var(--accent-light);
      }
    }

    .mobile-header__title {
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: -0.01em;
      text-decoration: none;
    }

    @media (min-width: 769px) {
      .mobile-header {
        display: none;
      }
    }
  `,
})
export class MobileHeaderComponent {
  private readonly location = inject(Location);

  showBack = input(false);

  goBack(): void {
    this.location.back();
  }
}
