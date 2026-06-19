import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
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
export class LandingPageComponent implements OnInit {
  protected readonly i18n = inject(TranslateService);
  t = this.i18n.t;
  lang = this.i18n.lang;

  canInstallPwa = signal(false);
  private deferredPrompt: any = null;

  readonly githubReleasesUrl = 'https://github.com/alearenass090/mi-manga-dinamita/releases';

  readonly extensions = [
    { name: 'Mihon (Tachiyomi)', platform: 'Android', url: 'https://mihon.app' },
    { name: 'Paperback', platform: 'iOS', url: 'https://paperback.moe' },
    { name: 'Kotatsu', platform: 'Android', url: 'https://kotatsu.app' },
    { name: 'Suwayomi', platform: 'PC', url: 'https://github.com/Suwayomi/Suwayomi-Server' },
    { name: 'MangaDex', platform: 'Web', url: 'https://mangadex.org' },
    { name: 'Manga Plus', platform: 'Web / App', url: 'https://mangaplus.shueisha.co.jp' },
  ];

  ngOnInit(): void {
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.canInstallPwa.set(true);
    });
  }

  async installPwa(): Promise<void> {
    if (!this.deferredPrompt) return;
    this.deferredPrompt.prompt();
    await this.deferredPrompt.userChoice;
    this.canInstallPwa.set(false);
    this.deferredPrompt = null;
  }
}
