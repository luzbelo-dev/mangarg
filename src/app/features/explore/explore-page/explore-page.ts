import { ChangeDetectionStrategy, Component, inject, signal, DestroyRef, computed } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { JikanService, MANGA_GENRES, MangaGenre } from '../../../core/services/jikan.service';
import { LibraryService } from '../../../core/services/library.service';
import { TranslateService } from '../../../core/i18n/translate.service';
import { JikanManga } from '../../../core/models/manga.model';
import { MangaCardComponent } from '../../../shared/components/manga-card/manga-card';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner';

@Component({
  selector: 'mt-explore-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MangaCardComponent, LoadingSpinnerComponent],
  templateUrl: './explore-page.html',
  styleUrl: './explore-page.scss',
})
export class ExplorePageComponent {
  private readonly jikanService = inject(JikanService);
  private readonly libraryService = inject(LibraryService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly i18n = inject(TranslateService);

  t = this.i18n.t;
  lang = this.i18n.lang;
  genres = MANGA_GENRES;
  selectedGenres = signal<Set<number>>(new Set());
  results = signal<JikanManga[]>([]);
  loading = signal(false);
  sfw = signal(true);
  orderBy = signal<'score' | 'popularity' | 'title'>('score');
  hasSearched = signal(false);

  private libraryIds = toSignal(
    this.libraryService.allEntries$.pipe(map(e => new Set(e.map(x => x.mal_id)))),
    { initialValue: new Set<number>() }
  );

  genreName(genre: MangaGenre): string {
    return this.lang() === 'es' ? genre.nameEs : genre.name;
  }

  toggleGenre(genreId: number): void {
    const current = new Set(this.selectedGenres());
    if (current.has(genreId)) {
      current.delete(genreId);
    } else {
      current.add(genreId);
    }
    this.selectedGenres.set(current);

    if (current.size > 0) {
      this.search();
    } else {
      this.results.set([]);
      this.hasSearched.set(false);
    }
  }

  isSelected(genreId: number): boolean {
    return this.selectedGenres().has(genreId);
  }

  search(): void {
    const ids = [...this.selectedGenres()];
    if (ids.length === 0) return;

    this.loading.set(true);
    this.jikanService.browseByGenres(ids, 1, this.sfw(), this.orderBy()).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(res => {
      this.results.set(res.data);
      this.loading.set(false);
      this.hasSearched.set(true);
    });
  }

  toggleSfw(): void {
    this.sfw.update(v => !v);
    if (this.selectedGenres().size > 0) this.search();
  }

  setOrderBy(event: Event): void {
    this.orderBy.set((event.target as HTMLSelectElement).value as 'score' | 'popularity' | 'title');
    if (this.selectedGenres().size > 0) this.search();
  }

  clearAll(): void {
    this.selectedGenres.set(new Set());
    this.results.set([]);
    this.hasSearched.set(false);
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
