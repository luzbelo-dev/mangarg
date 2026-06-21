import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { Router } from '@angular/router';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { map, forkJoin } from 'rxjs';
import { DecimalPipe } from '@angular/common';
import { SearchBarComponent } from '../search-bar/search-bar';
import { MangaCardComponent } from '../../../shared/components/manga-card/manga-card';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner';
import { LibraryService } from '../../../core/services/library.service';
import { JikanService } from '../../../core/services/jikan.service';
import { ComickService } from '../../../core/services/comick.service';
import { SearchStateService } from '../../../core/services/search-state.service';
import { SourceRegistryService } from '../../../core/services/source-registry.service';
import { TranslateService } from '../../../core/i18n/translate.service';
import { JikanManga } from '../../../core/models/manga.model';
import { SourceManga } from '../../../core/models/source.model';

export type SourceTab = 'all' | 'jikan' | 'comick';

export interface SourceStatus {
  id: string;
  name: string;
  loading: boolean;
  count: number;
}

@Component({
  selector: 'mt-search-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SearchBarComponent, MangaCardComponent, LoadingSpinnerComponent, DecimalPipe],
  templateUrl: './search-page.html',
  styleUrl: './search-page.scss',
})
export class SearchPageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly libraryService = inject(LibraryService);
  private readonly jikanService = inject(JikanService);
  private readonly comickService = inject(ComickService);
  private readonly searchState = inject(SearchStateService);
  private readonly sourceRegistry = inject(SourceRegistryService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly i18n = inject(TranslateService);

  results = signal<JikanManga[]>([]);
  comickResults = signal<SourceManga[]>([]);
  hasSearched = signal(false);
  t = this.i18n.t;

  topScored = signal<JikanManga[]>([]);
  topPopular = signal<JikanManga[]>([]);
  rankingsLoading = signal(true);

  // Multi-source search state
  searchingJikan = signal(false);
  searchingComick = signal(false);
  noSourcesInstalled = signal(false);

  // Source tabs
  activeTab = signal<SourceTab>('all');

  // Source statuses for individual loading indicators
  sourceStatuses = computed<SourceStatus[]>(() => {
    const statuses: SourceStatus[] = [];
    if (this.hasSearched() || this.searchingJikan()) {
      statuses.push({
        id: 'jikan',
        name: 'Jikan (MAL)',
        loading: this.searchingJikan(),
        count: this.results().length,
      });
    }
    if (this.searchingComick() || this.comickResults().length > 0) {
      statuses.push({
        id: 'comick',
        name: 'ComicK',
        loading: this.searchingComick(),
        count: this.comickResults().length,
      });
    }
    return statuses;
  });

  // Total count for "All" tab
  totalCount = computed(() => this.results().length + this.comickResults().length);

  // Whether any source is still searching
  isSearching = computed(() => this.searchingJikan() || this.searchingComick());

  private libraryIds = toSignal(
    this.libraryService.allEntries$.pipe(
      map(entries => new Set(entries.map(e => e.mal_id)))
    ),
    { initialValue: new Set<number>() }
  );

  ngOnInit(): void {
    if (this.searchState.hasSearched) {
      this.results.set(this.searchState.results);
      this.comickResults.set(this.searchState.comickResults);
      this.hasSearched.set(true);
    }

    // Check if any sources installed
    this.noSourcesInstalled.set(this.sourceRegistry.installed().length === 0);

    forkJoin({
      scored: this.jikanService.getTopScoredManga(1, 10),
      popular: this.jikanService.getTopManga('bypopularity', 1, 10),
    }).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(({ scored, popular }) => {
      this.topScored.set(scored.data);
      this.topPopular.set(popular.data);
      this.rankingsLoading.set(false);
    });
  }

  onSearchResults(mangas: JikanManga[]): void {
    this.results.set(mangas);
    this.hasSearched.set(true);
    this.searchingJikan.set(false);
  }

  onSearchStarted(): void {
    this.searchingJikan.set(true);
  }

  onQueryChanged(query: string): void {
    if (!query || query.length < 3) {
      this.comickResults.set([]);
      this.searchingComick.set(false);
      this.searchingJikan.set(false);
      this.activeTab.set('all');
      return;
    }

    this.searchingJikan.set(true);

    // Search ComicK if installed
    if (this.sourceRegistry.isInstalled('comick')) {
      this.searchingComick.set(true);

      this.comickService.searchManga(query, 10).pipe(
        takeUntilDestroyed(this.destroyRef),
      ).subscribe(results => {
        this.comickResults.set(results);
        this.searchingComick.set(false);
        this.searchState.saveComick(results);
      });
    } else {
      this.comickResults.set([]);
    }
  }

  setActiveTab(tab: SourceTab): void {
    this.activeTab.set(tab);
  }

  isInLibrary(malId: number): boolean {
    return this.libraryIds().has(malId);
  }

  onFavoriteToggle(manga: JikanManga): void {
    this.libraryService.toggle(manga, null);
  }

  onCardClick(malId: number): void {
    this.router.navigate(['/manga', malId]);
  }

  onComickCardClick(manga: SourceManga): void {
    window.open(`https://comick.io/comic/${manga.slug}`, '_blank');
  }

  get hasAnyResults(): boolean {
    return this.results().length > 0 || this.comickResults().length > 0;
  }

  get showResults(): boolean {
    return this.hasSearched() && this.hasAnyResults;
  }
}
