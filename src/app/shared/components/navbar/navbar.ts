import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeService } from '../../../core/services/theme.service';
import { SourceLibraryService } from '../../../core/services/source-library.service';
import { TranslateService } from '../../../core/i18n/translate.service';
import { Lang } from '../../../core/i18n/translations';

@Component({
  selector: 'mt-navbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class NavbarComponent {
  private readonly themeService = inject(ThemeService);
  private readonly sourceLibrary = inject(SourceLibraryService);
  protected readonly i18n = inject(TranslateService);

  isDark = this.themeService.isDark;
  lang = this.i18n.lang;
  t = this.i18n.t;

  libraryCount = this.sourceLibrary.count;

  constructor() {
    void this.sourceLibrary.init();
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }

  onLangChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as Lang;
    this.i18n.setLang(value);
  }
}
