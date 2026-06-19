import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { TranslateService } from '../../../core/i18n/translate.service';

@Component({
  selector: 'mt-download-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './download-page.html',
  styleUrl: './download-page.scss',
})
export class DownloadPageComponent implements OnInit {
  protected readonly i18n = inject(TranslateService);
  t = this.i18n.t;

  canInstallPwa = signal(false);
  isIos = signal(false);
  isAndroid = signal(false);
  installed = signal(false);

  private deferredPrompt: any = null;

  readonly githubReleasesUrl = 'https://github.com/alearenass090/mi-manga-dinamita/releases';
  readonly githubRepoUrl = 'https://github.com/alearenass090/mi-manga-dinamita';

  ngOnInit(): void {
    const ua = navigator.userAgent.toLowerCase();
    this.isIos.set(/iphone|ipad|ipod/.test(ua));
    this.isAndroid.set(/android/.test(ua));

    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.installed.set(true);
    }

    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.canInstallPwa.set(true);
    });

    window.addEventListener('appinstalled', () => {
      this.installed.set(true);
      this.canInstallPwa.set(false);
      this.deferredPrompt = null;
    });
  }

  async installPwa(): Promise<void> {
    if (!this.deferredPrompt) return;
    this.deferredPrompt.prompt();
    const result = await this.deferredPrompt.userChoice;
    if (result.outcome === 'accepted') {
      this.installed.set(true);
      this.canInstallPwa.set(false);
    }
    this.deferredPrompt = null;
  }
}
