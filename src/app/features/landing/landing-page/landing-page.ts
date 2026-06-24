import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslateService } from '../../../core/i18n/translate.service';
import { ThemeService } from '../../../core/services/theme.service';
import { DOWNLOAD_LINKS } from '../../../core/constants/download-links';
import { APP_VERSION } from '../../../core/constants/app-version';

@Component({
  selector: 'mt-landing-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.scss',
})
export class LandingPageComponent {
  protected readonly i18n = inject(TranslateService);
  protected readonly themeService = inject(ThemeService);

  t = this.i18n.t;
  lang = this.i18n.lang;
  isDark = this.themeService.isDark;

  readonly apkUrl = DOWNLOAD_LINKS.apk;
  readonly exeUrl = DOWNLOAD_LINKS.exe;
  readonly githubRepoUrl = DOWNLOAD_LINKS.repo;
  readonly version = APP_VERSION;
  readonly extensionCount = 27;

  toggleTheme(): void {
    this.themeService.toggle();
  }

  scrollToDownload(): void {
    document.getElementById('download')?.scrollIntoView({ behavior: 'smooth' });
  }
}
