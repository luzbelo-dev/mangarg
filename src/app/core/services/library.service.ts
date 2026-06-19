import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { LibraryManga, LibraryCategory, FavoriteManga, ChapterProgress } from '../models/tracking.model';
import { JikanManga } from '../models/manga.model';

@Injectable({ providedIn: 'root' })
export class LibraryService {
  private readonly STORAGE_KEY = 'mt-library';
  private readonly library$ = new BehaviorSubject<LibraryManga[]>(this.loadFromStorage());

  readonly allEntries$: Observable<LibraryManga[]> = this.library$.asObservable();

  constructor() {
    this.migrateFromFavorites();
  }

  entriesByCategory$(category: LibraryCategory): Observable<LibraryManga[]> {
    return this.library$.pipe(
      map(entries => entries.filter(e => e.category === category))
    );
  }

  add(manga: JikanManga, mangaDexId: string | null, category: LibraryCategory = 'plan_to_read'): void {
    const current = this.library$.value;
    if (current.some(e => e.mal_id === manga.mal_id)) return;

    const entry: LibraryManga = {
      mal_id: manga.mal_id,
      mangaDexId,
      title: manga.title,
      title_english: manga.title_english,
      image_url: manga.images.jpg.image_url,
      score: manga.score,
      status: manga.status,
      chapters: manga.chapters,
      genres: manga.genres.map(g => g.name),
      addedAt: new Date().toISOString(),
      category,
      lastReadAt: null,
      totalChaptersFetched: 0,
    };

    const updated = [...current, entry];
    this.library$.next(updated);
    this.persist(updated);
  }

  remove(malId: number): void {
    const updated = this.library$.value.filter(e => e.mal_id !== malId);
    this.library$.next(updated);
    this.persist(updated);
  }

  updateCategory(malId: number, category: LibraryCategory): void {
    const updated = this.library$.value.map(e =>
      e.mal_id === malId ? { ...e, category } : e
    );
    this.library$.next(updated);
    this.persist(updated);
  }

  updateLastRead(malId: number): void {
    const updated = this.library$.value.map(e =>
      e.mal_id === malId ? { ...e, lastReadAt: new Date().toISOString() } : e
    );
    this.library$.next(updated);
    this.persist(updated);
  }

  updateMangaDexId(malId: number, mangaDexId: string): void {
    const updated = this.library$.value.map(e =>
      e.mal_id === malId ? { ...e, mangaDexId } : e
    );
    this.library$.next(updated);
    this.persist(updated);
  }

  updateTotalChapters(malId: number, total: number): void {
    const updated = this.library$.value.map(e =>
      e.mal_id === malId ? { ...e, totalChaptersFetched: total } : e
    );
    this.library$.next(updated);
    this.persist(updated);
  }

  isInLibrary(malId: number): Observable<boolean> {
    return this.library$.pipe(map(entries => entries.some(e => e.mal_id === malId)));
  }

  isInLibrarySync(malId: number): boolean {
    return this.library$.value.some(e => e.mal_id === malId);
  }

  getEntry(malId: number): LibraryManga | undefined {
    return this.library$.value.find(e => e.mal_id === malId);
  }

  toggle(manga: JikanManga, mangaDexId: string | null): void {
    if (this.isInLibrarySync(manga.mal_id)) {
      this.remove(manga.mal_id);
    } else {
      this.add(manga, mangaDexId);
    }
  }

  private migrateFromFavorites(): void {
    if (localStorage.getItem('mt-favorites-migrated')) return;
    const favsRaw = localStorage.getItem('mt-favorites');
    if (!favsRaw) {
      localStorage.setItem('mt-favorites-migrated', 'true');
      return;
    }

    try {
      const favs: FavoriteManga[] = JSON.parse(favsRaw);
      const progressRaw = localStorage.getItem('mt-chapter-progress');
      const progress: ChapterProgress[] = progressRaw ? JSON.parse(progressRaw) : [];
      const progressMap = new Map(progress.map(p => [p.mal_id, p]));

      const current = this.library$.value;
      const existingIds = new Set(current.map(e => e.mal_id));

      const migrated: LibraryManga[] = favs
        .filter(f => !existingIds.has(f.mal_id))
        .map(f => {
          const prog = progressMap.get(f.mal_id);
          return {
            mal_id: f.mal_id,
            mangaDexId: prog?.mangaDexId ?? null,
            title: f.title,
            title_english: f.title_english,
            image_url: f.image_url,
            score: f.score,
            status: f.status,
            chapters: f.chapters,
            genres: f.genres,
            addedAt: f.addedAt,
            category: 'reading' as LibraryCategory,
            lastReadAt: prog?.lastUpdated ?? null,
            totalChaptersFetched: 0,
          };
        });

      const updated = [...current, ...migrated];
      this.library$.next(updated);
      this.persist(updated);
    } catch { /* ignore */ }

    localStorage.setItem('mt-favorites-migrated', 'true');
  }

  private loadFromStorage(): LibraryManga[] {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY) ?? '[]');
    } catch {
      return [];
    }
  }

  private persist(entries: LibraryManga[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(entries));
  }
}
