import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { LibraryManga, LibraryCategory } from '../../../core/models/tracking.model';
import { TranslateService } from '../../../core/i18n/translate.service';
import { inject } from '@angular/core';

@Component({
  selector: 'mt-library-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './library-card.html',
  styleUrl: './library-card.scss',
})
export class LibraryCardComponent {
  protected readonly i18n = inject(TranslateService);
  t = this.i18n.t;

  entry = input.required<LibraryManga>();
  viewMode = input<'grid' | 'list'>('grid');

  cardClicked = output<number>();
  categoryChanged = output<{ malId: number; category: LibraryCategory }>();
  removed = output<number>();

  displayTitle = computed(() => this.entry().title_english ?? this.entry().title);

  showCategoryMenu = false;

  readonly categories: LibraryCategory[] = ['reading', 'plan_to_read', 'completed', 'on_hold', 'dropped'];

  categoryLabel(cat: LibraryCategory): string {
    const t = this.t();
    const labels: Record<LibraryCategory, string> = {
      reading: t.library.reading,
      plan_to_read: t.library.planToRead,
      completed: t.library.completed,
      on_hold: t.library.onHold,
      dropped: t.library.dropped,
    };
    return labels[cat];
  }

  onCardClick(): void {
    this.cardClicked.emit(this.entry().mal_id);
  }

  onCategoryChange(cat: LibraryCategory): void {
    this.showCategoryMenu = false;
    this.categoryChanged.emit({ malId: this.entry().mal_id, category: cat });
  }

  onRemove(event: Event): void {
    event.stopPropagation();
    this.removed.emit(this.entry().mal_id);
  }

  toggleCategoryMenu(event: Event): void {
    event.stopPropagation();
    this.showCategoryMenu = !this.showCategoryMenu;
  }
}
