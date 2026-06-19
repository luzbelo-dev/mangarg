import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateService } from '../../../core/i18n/translate.service';

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

  readonly apkUrl = 'https://github.com/alearenass090/mi-manga-dinamita/releases/latest/download/mi-manga-dinamita.apk';
  readonly exeUrl = 'https://github.com/alearenass090/mi-manga-dinamita/releases/latest/download/Mi.Manga.Dinamita.1.0.0.exe';
  readonly githubRepoUrl = 'https://github.com/alearenass090/mi-manga-dinamita';

  readonly extensions = [
    { name: 'Mihon (Tachiyomi)', platform: 'Android', url: 'https://mihon.app' },
    { name: 'Paperback', platform: 'iOS', url: 'https://paperback.moe' },
    { name: 'Kotatsu', platform: 'Android', url: 'https://kotatsu.app' },
    { name: 'Suwayomi', platform: 'PC', url: 'https://github.com/Suwayomi/Suwayomi-Server' },
    { name: 'MangaDex', platform: 'Web', url: 'https://mangadex.org' },
    { name: 'Manga Plus', platform: 'Web / App', url: 'https://mangaplus.shueisha.co.jp' },
  ];
}
