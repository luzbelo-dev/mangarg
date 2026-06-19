import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'mt-score-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe],
  template: `
    <span class="badge" [class]="colorClass()">
      {{ score() | number:'1.1-1' }}
    </span>
  `,
  styles: `
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .high { background: rgba(46, 204, 113, 0.15); color: var(--score-high); }
    .mid { background: rgba(243, 156, 18, 0.15); color: var(--score-mid); }
    .low { background: rgba(231, 76, 60, 0.15); color: var(--score-low); }
  `,
})
export class ScoreBadgeComponent {
  score = input.required<number>();

  colorClass = computed(() => {
    const s = this.score();
    if (s >= 7) return 'high';
    if (s >= 5) return 'mid';
    return 'low';
  });
}
