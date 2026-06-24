import { ChangeDetectionStrategy, Component, inject, signal, DestroyRef, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { switchMap, map, tap, catchError, of } from 'rxjs';
import { DecimalPipe } from '@angular/common';
import { JikanService } from '../../../core/services/jikan.service';
import { MangaDexService } from '../../../core/services/mangadex.service';
import { LibraryService } from '../../../core/services/library.service';
import { JikanManga } from '../../../core/models/manga.model';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner';
import { ScoreBadgeComponent } from '../../../shared/components/score-badge/score-badge';
import { ChapterListComponent } from '../chapter-list/chapter-list';
import { TranslateService } from '../../../core/i18n/translate.service';

@Component({
  selector: 'mt-manga-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LoadingSpinnerComponent, ScoreBadgeComponent, DecimalPipe, ChapterListComponent],
  templateUrl: './manga-detail.html',
  styleUrl: './manga-detail.scss',
})
export class MangaDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly appLocation = inject(Location);
  private readonly jikanService = inject(JikanService);
  private readonly mangaDexService = inject(MangaDexService);
  private readonly libraryService = inject(LibraryService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly i18n = inject(TranslateService);

  t = this.i18n.t;
  manga = signal<JikanManga | null>(null);
  mangaDexId = signal<string | null>(null);
  mangaDexUrl = signal<string | null>(null);
  mangaDexSearchUrl = signal<string | null>(null);
  loading = signal(true);
  inLibrary = signal(false);

  ngOnInit(): void {
    this.route.params.pipe(
      map(params => +params['id']),
      tap(() => this.loading.set(true)),
      switchMap(id =>
        this.jikanService.getMangaFull(id).pipe(
          catchError(() => of(null))
        )
      ),
      switchMap(manga => {
        if (!manga) return of({ manga: null, mangaDex: null });

        this.manga.set(manga);
        this.inLibrary.set(this.libraryService.isInLibrarySync(manga.mal_id));

        const title = manga.title;
        this.mangaDexSearchUrl.set(this.mangaDexService.getMangaDexSearchUrl(title));

        return this.mangaDexService.findMangaByTitle(title).pipe(
          map(mangaDex => ({ manga, mangaDex })),
          catchError(() => of({ manga, mangaDex: null }))
        );
      }),
      tap(() => this.loading.set(false)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(({ manga, mangaDex }) => {
      if (manga) this.manga.set(manga);
      if (mangaDex) {
        this.mangaDexId.set(mangaDex.id);
        this.mangaDexUrl.set(this.mangaDexService.getMangaDexUrl(mangaDex.id));
        if (manga) {
          this.libraryService.updateMangaDexId(manga.mal_id, mangaDex.id);
        }
      }
    });
  }

  toggleLibrary(): void {
    const m = this.manga();
    if (!m) return;
    this.libraryService.toggle(m, this.mangaDexId());
    this.inLibrary.set(this.libraryService.isInLibrarySync(m.mal_id));
  }

  goBack(): void {
    this.appLocation.back();
  }

  get displayTitle(): string {
    const m = this.manga();
    return m?.title_english ?? m?.title ?? '';
  }
}
