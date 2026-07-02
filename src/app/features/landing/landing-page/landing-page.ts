import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateService } from '../../../core/i18n/translate.service';
import { DOWNLOAD_LINKS } from '../../../core/constants/download-links';
import { APP_VERSION } from '../../../core/constants/app-version';

@Component({
  selector: 'mt-landing-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.scss',
})
export class LandingPageComponent {
  private readonly i18n = inject(TranslateService);

  readonly t = this.i18n.t;
  readonly apkUrl = DOWNLOAD_LINKS.apk;
  readonly exeUrl = DOWNLOAD_LINKS.exe;
  readonly githubRepoUrl = DOWNLOAD_LINKS.repo;
  readonly version = APP_VERSION;

  scrollToDownload(): void {
    document.getElementById('download')?.scrollIntoView({ behavior: 'smooth' });
  }
}
