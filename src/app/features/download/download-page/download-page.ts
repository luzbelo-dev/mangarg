import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslateService } from '../../../core/i18n/translate.service';

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

  readonly apkUrl = 'https://github.com/alearenass090/mi-manga-dinamita/releases/latest/download/mi-manga-dinamita.apk';
  readonly exeUrl = 'https://github.com/alearenass090/mi-manga-dinamita/releases/latest/download/Mi.Manga.Dinamita.1.0.0.exe';
  readonly githubRepoUrl = 'https://github.com/alearenass090/mi-manga-dinamita';
}
