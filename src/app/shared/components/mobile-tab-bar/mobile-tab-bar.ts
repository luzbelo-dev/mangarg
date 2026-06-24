import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslateService } from '../../../core/i18n/translate.service';
import { ThemeService } from '../../../core/services/theme.service';
import { Lang } from '../../../core/i18n/translations';

@Component({
  selector: 'mt-mobile-tab-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="tab-bar" role="tablist">
      <a
        routerLink="/extensions"
        routerLinkActive="tab-bar__tab--active"
        class="tab-bar__tab"
        role="tab"
      >
        <svg class="tab-bar__icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
        <svg class="tab-bar__icon-filled" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5" fill="none" stroke="currentColor" stroke-width="2"/>
          <path d="M2 12l10 5 10-5" fill="none" stroke="currentColor" stroke-width="2"/>
        </svg>
        <span class="tab-bar__label">{{ lang() === 'es' ? 'Extensiones' : 'Extensions' }}</span>
      </a>

      <a
        routerLink="/library"
        routerLinkActive="tab-bar__tab--active"
        class="tab-bar__tab"
        role="tab"
      >
        <svg class="tab-bar__icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        </svg>
        <svg class="tab-bar__icon-filled" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <path d="M6.5 2C5.12 2 4 3.12 4 4.5v15C4 20.88 5.12 22 6.5 22H20V2H6.5zM4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        </svg>
        <span class="tab-bar__label">{{ lang() === 'es' ? 'Biblioteca' : 'Library' }}</span>
      </a>

      <a
        routerLink="/download"
        routerLinkActive="tab-bar__tab--active"
        class="tab-bar__tab"
        role="tab"
      >
        <svg class="tab-bar__icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        <svg class="tab-bar__icon-filled" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4h18z"/>
          <path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2"/>
          <line x1="12" y1="15" x2="12" y2="3" fill="none" stroke="currentColor" stroke-width="2"/>
        </svg>
        <span class="tab-bar__label">{{ lang() === 'es' ? 'Descargas' : 'Downloads' }}</span>
      </a>

      <button
        class="tab-bar__tab"
        [class.tab-bar__tab--active]="moreOpen()"
        role="tab"
        (click)="toggleMore()"
      >
        <svg class="tab-bar__icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="5" r="1"/>
          <circle cx="12" cy="12" r="1"/>
          <circle cx="12" cy="19" r="1"/>
        </svg>
        <svg class="tab-bar__icon-filled" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <circle cx="12" cy="5" r="2"/>
          <circle cx="12" cy="12" r="2"/>
          <circle cx="12" cy="19" r="2"/>
        </svg>
        <span class="tab-bar__label">{{ t().nav.more }}</span>
      </button>
    </nav>

    <!-- More menu overlay -->
    @if (moreOpen()) {
      <div class="more-overlay" (click)="closeMore()">
        <div class="more-sheet" (click)="$event.stopPropagation()">
          <div class="more-sheet__header">
            <span class="more-sheet__title">{{ t().nav.more }}</span>
            <button class="more-sheet__close" (click)="closeMore()" [attr.aria-label]="t().nav.close">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div class="more-sheet__content">
            <div class="more-sheet__item">
              <span class="more-sheet__item-label">{{ t().nav.home === 'Home' ? 'Language' : 'Idioma' }}</span>
              <select
                class="more-sheet__select"
                [value]="lang()"
                (change)="onLangChange($event)"
                aria-label="Language"
              >
                <option value="es">ES</option>
                <option value="en">EN</option>
              </select>
            </div>

            <div class="more-sheet__item">
              <span class="more-sheet__item-label">{{ t().nav.home === 'Home' ? 'Theme' : 'Tema' }}</span>
              <button class="more-sheet__theme-toggle" (click)="toggleTheme()">
                @if (isDark()) {
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                  </svg>
                  <span>{{ t().nav.home === 'Home' ? 'Light' : 'Claro' }}</span>
                } @else {
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                  </svg>
                  <span>{{ t().nav.home === 'Home' ? 'Dark' : 'Oscuro' }}</span>
                }
              </button>
            </div>

            <div class="more-sheet__divider"></div>

            <div class="more-sheet__version">
              Mi Manga Dinamita v1.3.0
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .tab-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 100;
      display: flex;
      align-items: stretch;
      justify-content: space-around;
      height: calc(56px + env(safe-area-inset-bottom, 0px));
      padding-bottom: env(safe-area-inset-bottom, 0px);
      background: var(--bg-nav);
      backdrop-filter: blur(12px);
      border-top: 1px solid var(--border-color);
    }

    .tab-bar__tab {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      flex: 1;
      padding: 6px 0;
      color: var(--text-muted);
      text-decoration: none;
      transition: color 0.2s ease;
      -webkit-tap-highlight-color: transparent;
      background: none;
      border: none;
      cursor: pointer;
      font-family: inherit;

      .tab-bar__icon-filled {
        display: none;
      }

      .tab-bar__icon {
        display: block;
      }

      &--active {
        color: var(--accent);

        .tab-bar__icon-filled {
          display: block;
        }

        .tab-bar__icon {
          display: none;
        }
      }
    }

    .tab-bar__label {
      font-size: 0.625rem;
      font-weight: 600;
      letter-spacing: 0.02em;
    }

    .more-overlay {
      position: fixed;
      inset: 0;
      z-index: 200;
      background: rgba(0, 0, 0, 0.4);
      animation: fadeIn 0.2s ease;
    }

    .more-sheet {
      position: absolute;
      bottom: calc(56px + env(safe-area-inset-bottom, 0px));
      left: 0;
      right: 0;
      background: var(--bg-card);
      border-top-left-radius: 16px;
      border-top-right-radius: 16px;
      padding: 16px;
      animation: slideUp 0.25s ease;
      box-shadow: var(--shadow-lg);
    }

    .more-sheet__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border-color);
    }

    .more-sheet__title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .more-sheet__close {
      width: 44px;
      height: 44px;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-secondary);
      transition: background 0.2s ease;

      &:hover, &:active {
        background: var(--accent-light);
      }
    }

    .more-sheet__content {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .more-sheet__item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px;
      border-radius: var(--radius-sm);
    }

    .more-sheet__item-label {
      font-size: 0.9rem;
      font-weight: 500;
      color: var(--text-primary);
    }

    .more-sheet__select {
      padding: 8px 12px;
      border-radius: 6px;
      border: 1px solid var(--border-color);
      background: var(--bg-input);
      color: var(--text-primary);
      font-size: 0.875rem;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      outline: none;
      transition: border-color 0.2s ease;

      &:focus {
        border-color: var(--accent);
      }

      option {
        background: var(--bg-card);
        color: var(--text-primary);
      }
    }

    .more-sheet__link {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 500;
      transition: background 0.2s ease;

      &:hover, &:active {
        background: var(--accent-light);
      }

      svg {
        color: var(--text-secondary);
        flex-shrink: 0;
      }
    }

    .more-sheet__divider {
      height: 1px;
      background: var(--border-color);
      margin: 8px 0;
    }

    .more-sheet__theme-toggle {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      border-radius: 6px;
      border: 1px solid var(--border-color);
      background: var(--bg-input);
      color: var(--text-primary);
      font-size: 0.85rem;
      font-weight: 500;
      font-family: inherit;
      cursor: pointer;
      transition: border-color 0.2s ease, background 0.2s ease;

      &:active {
        background: var(--accent-light);
        border-color: var(--accent);
      }
    }

    .more-sheet__version {
      text-align: center;
      font-size: 0.75rem;
      color: var(--text-muted);
      padding: 12px 0 4px;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }

    @media (min-width: 769px) {
      .tab-bar {
        display: none;
      }
      .more-overlay {
        display: none;
      }
    }
  `,
})
export class MobileTabBarComponent {
  protected readonly i18n = inject(TranslateService);
  private readonly themeService = inject(ThemeService);

  t = this.i18n.t;
  lang = this.i18n.lang;
  isDark = this.themeService.isDark;
  moreOpen = signal(false);

  toggleMore(): void {
    this.moreOpen.update(v => !v);
  }

  closeMore(): void {
    this.moreOpen.set(false);
  }

  onLangChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as Lang;
    this.i18n.setLang(value);
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }
}
