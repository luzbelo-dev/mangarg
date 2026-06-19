import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
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
export class NavbarComponent implements OnInit {
  private readonly themeService = inject(ThemeService);
  private readonly libraryService = inject(LibraryService);
  protected readonly i18n = inject(TranslateService);

  isDark = this.themeService.isDark;
  lang = this.i18n.lang;
  t = this.i18n.t;
  showInstallBtn = signal(false);

  private deferredPrompt: any = null;

  libraryCount = toSignal(
    this.libraryService.allEntries$.pipe(map(e => e.length)),
    { initialValue: 0 }
  );

  ngOnInit(): void {
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallBtn.set(true);
    });

    window.addEventListener('appinstalled', () => {
      this.showInstallBtn.set(false);
      this.deferredPrompt = null;
    });
  }

  async installApp(): Promise<void> {
    if (!this.deferredPrompt) return;
    this.deferredPrompt.prompt();
    const result = await this.deferredPrompt.userChoice;
    if (result.outcome === 'accepted') {
      this.showInstallBtn.set(false);
    }
    this.deferredPrompt = null;
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }

  onLangChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as Lang;
    this.i18n.setLang(value);
  }
}
