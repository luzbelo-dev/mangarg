import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { TranslateService } from '../../../core/i18n/translate.service';
import { ThemeService } from '../../../core/services/theme.service';
import { CustomizationService, ACCENT_PRESETS, FONT_PRESETS } from '../../../core/services/customization.service';
import { Lang } from '../../../core/i18n/translations';
import { APP_VERSION } from '../../../core/constants/app-version';

@Component({
  selector: 'mt-mobile-tab-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './mobile-tab-bar.html',
  styleUrl: './mobile-tab-bar.scss',
})
export class MobileTabBarComponent {
  protected readonly i18n = inject(TranslateService);
  private readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);
  readonly customization = inject(CustomizationService);

  t = this.i18n.t;
  lang = this.i18n.lang;
  isEnglish = computed(() => this.lang() === 'en');
  isDark = this.themeService.isDark;
  moreOpen = signal(false);
  customizeOpen = signal(false);
  readonly version = APP_VERSION;

  private readonly url = toSignal(
    this.router.events.pipe(map(() => this.router.url)),
    { initialValue: this.router.url },
  );

  // El tab Explorar se marca tambien dentro de una fuente (/source/...):
  // navegar el catalogo de una extension sigue siendo "explorar". Se maneja
  // a mano (no con routerLinkActive) porque /extensions redirige a /browse y
  // el redirect rompe el matching del directive.
  readonly browseActive = computed(() => {
    const u = this.url().split('?')[0];
    return u.startsWith('/browse') || u.startsWith('/extensions') || u.startsWith('/source');
  });

  accentPresets = ACCENT_PRESETS;
  fontPresets = FONT_PRESETS;

  toggleMore(): void {
    this.moreOpen.update(v => !v);
    if (!this.moreOpen()) {
      this.customizeOpen.set(false);
    }
  }

  closeMore(): void {
    this.moreOpen.set(false);
    this.customizeOpen.set(false);
  }

  toggleCustomize(): void {
    this.customizeOpen.update(v => !v);
  }

  onLangChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as Lang;
    this.i18n.setLang(value);
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }
}
