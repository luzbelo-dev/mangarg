import { ChangeDetectionStrategy, Component, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { Router } from '@angular/router';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { map, forkJoin } from 'rxjs';
import { DecimalPipe } from '@angular/common';
import { SearchBarComponent } from '../search-bar/search-bar';
import { MangaCardComponent } from '../../../shared/components/manga-card/manga-card';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner';
import { LibraryService } from '../../../core/services/library.service';
import { JikanService } from '../../../core/services/jikan.service';
import { SearchStateService } from '../../../core/services/search-state.service';
import { TranslateService } from '../../../core/i18n/translate.service';
import { JikanManga } from '../../../core/models/manga.model';

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
  private readonly searchState = inject(SearchStateService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly i18n = inject(TranslateService);

  results = signal<JikanManga[]>([]);
  hasSearched = signal(false);
  t = this.i18n.t;

  topScored = signal<JikanManga[]>([]);
  topPopular = signal<JikanManga[]>([]);
  rankingsLoading = signal(true);

  private libraryIds = toSignal(
    this.libraryService.allEntries$.pipe(
      map(entries => new Set(entries.map(e => e.mal_id)))
    ),
    { initialValue: new Set<number>() }
  );

  ngOnInit(): void {
    if (this.searchState.hasSearched) {
      this.results.set(this.searchState.results);
      this.hasSearched.set(true);
    }

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
}
