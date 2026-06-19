import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateService } from '../../../core/i18n/translate.service';
import { DOWNLOAD_LINKS } from '../../../core/constants/download-links';
import { EXTENSIONS } from '../../../core/constants/extensions';

@Component({
  selector: 'mt-landing-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.scss',
})
export class LandingPageComponent {
  protected readonly i18n = inject(TranslateService);
  t = this.i18n.t;
  lang = this.i18n.lang;

  readonly apkUrl = DOWNLOAD_LINKS.apk;
  readonly exeUrl = DOWNLOAD_LINKS.exe;
  readonly githubRepoUrl = DOWNLOAD_LINKS.repo;

  readonly extensions = EXTENSIONS.slice(0, 6);
}
