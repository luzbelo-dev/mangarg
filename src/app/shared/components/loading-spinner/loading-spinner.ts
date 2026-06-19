import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'mt-loading-spinner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="spinner" [class]="size()"></div>`,
  styles: `
    .spinner {
      border: 3px solid var(--border-color);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    .sm { width: 20px; height: 20px; }
    .md { width: 36px; height: 36px; }
    .lg { width: 52px; height: 52px; }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `,
})
export class LoadingSpinnerComponent {
  size = input<'sm' | 'md' | 'lg'>('md');
}
