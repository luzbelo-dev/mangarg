import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { LibraryService } from '../../../core/services/library.service';
import { TranslateService } from '../../../core/i18n/translate.service';
import { LibraryCategory, LibrarySortBy, LibraryViewMode, LibraryManga } from '../../../core/models/tracking.model';
import { LibraryCardComponent } from '../library-card/library-card';

@Component({
  selector: 'mt-library-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LibraryCardComponent],
  templateUrl: './library-page.html',
  styleUrl: './library-page.scss',
})
export class LibraryPageComponent {
  private readonly libraryService = inject(LibraryService);
  private readonly router = inject(Router);
  protected readonly i18n = inject(TranslateService);

  t = this.i18n.t;

  allEntries = toSignal(this.libraryService.allEntries$, { initialValue: [] });
  activeCategory = signal<LibraryCategory | 'all'>('all');
  sortBy = signal<LibrarySortBy>('last_read');
  viewMode = signal<LibraryViewMode>('grid');

  readonly categories: (LibraryCategory | 'all')[] = ['all', 'reading', 'plan_to_read', 'completed', 'on_hold', 'dropped'];

  filteredEntries = computed(() => {
    let entries = this.allEntries();
    const cat = this.activeCategory();
    if (cat !== 'all') {
      entries = entries.filter(e => e.category === cat);
    }

    const sort = this.sortBy();
    return [...entries].sort((a, b) => {
      switch (sort) {
        case 'last_read':
          return (b.lastReadAt ?? '').localeCompare(a.lastReadAt ?? '');
        case 'title':
          return (a.title_english ?? a.title).localeCompare(b.title_english ?? b.title);
        case 'date_added':
          return b.addedAt.localeCompare(a.addedAt);
        default:
          return 0;
      }
    });
  });

  categoryLabel(cat: LibraryCategory | 'all'): string {
    const t = this.t();
    if (cat === 'all') return t.library.all;
    const labels: Record<LibraryCategory, string> = {
      reading: t.library.reading,
      plan_to_read: t.library.planToRead,
      completed: t.library.completed,
      on_hold: t.library.onHold,
      dropped: t.library.dropped,
    };
    return labels[cat];
  }

  onCardClick(malId: number): void {
    this.router.navigate(['/manga', malId]);
  }

  onCategoryChange(event: { malId: number; category: LibraryCategory }): void {
    this.libraryService.updateCategory(event.malId, event.category);
  }

  onRemove(malId: number): void {
    this.libraryService.remove(malId);
  }

  goToSearch(): void {
    this.router.navigate(['/search']);
  }

  setCategory(cat: LibraryCategory | 'all'): void {
    this.activeCategory.set(cat);
  }

  setSortBy(event: Event): void {
    this.sortBy.set((event.target as HTMLSelectElement).value as LibrarySortBy);
  }

  toggleView(): void {
    this.viewMode.update(v => v === 'grid' ? 'list' : 'grid');
  }
}
