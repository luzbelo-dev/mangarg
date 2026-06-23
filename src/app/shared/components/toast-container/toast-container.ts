import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'mt-toast-container',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toast-wrap">
      @for (toast of toasts(); track toast.id) {
        <div class="toast" [class]="'toast--' + toast.type" (click)="dismiss(toast.id)">
          @if (toast.type === 'error') {
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
          } @else if (toast.type === 'success') {
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          } @else {
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
          }
          {{ toast.message }}
        </div>
      }
    </div>
  `,
  styles: `
    .toast-wrap {
      position: fixed;
      bottom: calc(70px + env(safe-area-inset-bottom, 0px));
      right: 16px;
      left: 16px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 8px;
      pointer-events: none;
    }

    .toast {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      border-radius: 10px;
      font-size: 0.82rem;
      font-weight: 500;
      pointer-events: auto;
      cursor: pointer;
      animation: toast-in 0.3s ease;
      max-width: 400px;
      backdrop-filter: blur(12px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);

      &--error {
        background: rgba(231, 76, 60, 0.92);
        color: white;
      }
      &--success {
        background: rgba(46, 204, 113, 0.92);
        color: white;
      }
      &--info {
        background: rgba(108, 92, 231, 0.92);
        color: white;
      }
    }

    @keyframes toast-in {
      from { opacity: 0; transform: translateY(12px) scale(0.95); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    @media (min-width: 769px) {
      .toast-wrap {
        bottom: 24px;
        right: 24px;
        left: auto;
      }
    }
  `,
})
export class ToastContainerComponent {
  private readonly toastService = inject(ToastService);
  toasts = this.toastService.toasts;
  dismiss(id: number) { this.toastService.dismiss(id); }
}
