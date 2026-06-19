import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslateService } from '../../../../core/i18n/translate.service';

@Component({
  selector: 'mt-downloads-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="downloads">
      <h1>{{ t().library.downloads }}</h1>
      <p style="color: var(--text-muted); margin-top: 24px;">{{ t().library.empty }}</p>
    </div>
  `,
  styles: `
    .downloads { padding: 24px 0; }
    h1 { font-size: 2rem; font-weight: 700; }
  `,
})
export class DownloadsPageComponent {
  protected readonly i18n = inject(TranslateService);
  t = this.i18n.t;
}
