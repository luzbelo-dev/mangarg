import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { LibraryService } from '../../../core/services/library.service';
import { SourceLibraryService, SourceLibraryEntry } from '../../../core/services/source-library.service';
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
export class LibraryPageComponent implements OnInit {
  private readonly libraryService = inject(LibraryService);
  private readonly sourceLibrary = inject(SourceLibraryService);
  private readonly router = inject(Router);
  protected readonly i18n = inject(TranslateService);

  t = this.i18n.t;
  lang = this.i18n.lang;

  allEntries = toSignal(this.libraryService.allEntries$, { initialValue: [] });
  activeCategory = signal<LibraryCategory | 'all'>('all');
  sortBy = signal<LibrarySortBy>('last_read');
  viewMode = signal<LibraryViewMode>('grid');
  activeTab = signal<'classic' | 'sources'>('sources');

  readonly categories: (LibraryCategory | 'all')[] = ['all', 'reading', 'plan_to_read', 'completed', 'on_hold', 'dropped'];

  sourceEntries = computed(() => this.sourceLibrary.allEntries());

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

  ngOnInit(): void {
    this.sourceLibrary.init();
  }

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

  onSourceCardClick(entry: SourceLibraryEntry): void {
    this.router.navigate(['/source', entry.sourceId, 'manga', entry.slug]);
  }

  onCategoryChange(event: { malId: number; category: LibraryCategory }): void {
    this.libraryService.updateCategory(event.malId, event.category);
  }

  onRemove(malId: number): void {
    this.libraryService.remove(malId);
  }

  async onRemoveSource(entry: SourceLibraryEntry): Promise<void> {
    await this.sourceLibrary.remove(entry.sourceId, entry.slug);
  }

  goToSearch(): void {
    this.router.navigate(['/search']);
  }

  goToExtensions(): void {
    this.router.navigate(['/extensions']);
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

  setTab(tab: 'classic' | 'sources'): void {
    this.activeTab.set(tab);
  }
}
