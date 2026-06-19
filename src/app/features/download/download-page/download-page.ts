import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslateService } from '../../../core/i18n/translate.service';
import { DOWNLOAD_LINKS } from '../../../core/constants/download-links';

@Component({
  selector: 'mt-download-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './download-page.html',
  styleUrl: './download-page.scss',
})
export class DownloadPageComponent {
  protected readonly i18n = inject(TranslateService);
  t = this.i18n.t;

  readonly apkUrl = DOWNLOAD_LINKS.apk;
  readonly exeUrl = DOWNLOAD_LINKS.exe;
  readonly githubRepoUrl = DOWNLOAD_LINKS.repo;
}
