import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateService } from '../../../core/i18n/translate.service';

@Component({
  selector: 'mt-mobile-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <header class="mobile-header">
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
      justify-content: space-between;
      height: calc(48px + env(safe-area-inset-top, 0px));
      padding-top: env(safe-area-inset-top, 0px);
      padding-left: 16px;
      padding-right: 12px;
      background: var(--bg-nav);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border-color);
    }

    .mobile-header__title {
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: -0.01em;
      text-decoration: none;
    }

    .mobile-header__search-btn {
      width: 44px;
      height: 44px;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-secondary);
      transition: background 0.2s ease, color 0.2s ease;

      &:hover, &:active {
        background: var(--accent-light);
        color: var(--text-primary);
      }
    }

    @media (min-width: 769px) {
      .mobile-header {
        display: none;
      }
    }
  `,
})
export class MobileHeaderComponent {
  protected readonly i18n = inject(TranslateService);
  t = this.i18n.t;
}
