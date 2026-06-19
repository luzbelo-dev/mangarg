import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { ThemeService } from '../../../core/services/theme.service';
import { LibraryService } from '../../../core/services/library.service';
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
  private readonly libraryService = inject(LibraryService);
  protected readonly i18n = inject(TranslateService);

  isDark = this.themeService.isDark;
  lang = this.i18n.lang;
  t = this.i18n.t;

  libraryCount = toSignal(
    this.libraryService.allEntries$.pipe(map(e => e.length)),
    { initialValue: 0 }
  );

  toggleTheme(): void {
    this.themeService.toggle();
  }

  onLangChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as Lang;
    this.i18n.setLang(value);
  }
}
