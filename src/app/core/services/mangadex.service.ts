import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of, expand, reduce, EMPTY, switchMap, tap } from 'rxjs';
import {
  MangaDexResponse,
  MangaDexManga,
  MangaDexChapter,
  MangaDexAtHomeResponse,
} from '../models/mangadex.model';
import { IndexedDbService } from './indexeddb.service';

interface ChapterCacheEntry {
  mangaDexId: string;
  chapters: MangaDexChapter[];
  cachedAt: number;
}

const CHAPTER_CACHE_TTL = 24 * 60 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class MangaDexService {
  private readonly http = inject(HttpClient);
  private readonly db = inject(IndexedDbService);
  private readonly apiBase = 'https://api.mangadex.org';

  private getUrl(path: string, params: Record<string, string | string[]> = {}): string {
    const fullUrl = new URL(this.apiBase + path);
    for (const [key, val] of Object.entries(params)) {
      if (Array.isArray(val)) {
        for (const v of val) {
          fullUrl.searchParams.append(key, v);
        }
      } else {
        fullUrl.searchParams.set(key, val);
      }
    }
    return fullUrl.toString();
  }

  findMangaByTitle(title: string): Observable<MangaDexManga | null> {
    const url = this.getUrl('/manga', {
      title,
      limit: '5',
      'includes[]': 'cover_art',
      'availableTranslatedLanguage[]': ['en', 'es', 'es-la'],
    });

    return this.http.get<MangaDexResponse<MangaDexManga>>(url).pipe(
      map(res => res.data[0] ?? null),
      catchError(() => of(null))
    );
  }

  getChapterFeed(mangaDexId: string, offset = 0, limit = 500): Observable<{ chapters: MangaDexChapter[]; total: number }> {
    const url = this.getUrl(`/manga/${mangaDexId}/feed`, {
      'translatedLanguage[]': ['en', 'es', 'es-la'],
      'order[chapter]': 'asc',
      'includes[]': 'scanlation_group',
      limit: limit.toString(),
      offset: offset.toString(),
      includeFuturePublishAt: '0',
    });

    return this.http.get<MangaDexResponse<MangaDexChapter>>(url).pipe(
      map(res => ({ chapters: res.data, total: res.total })),
      catchError(() => of({ chapters: [], total: 0 }))
    );
  }

  getChapterFeedStreaming(mangaDexId: string): Observable<{ chapters: MangaDexChapter[]; done: boolean }> {
    return this.db.get<ChapterCacheEntry>('chapter-cache', mangaDexId).pipe(
      catchError(() => of(undefined)),
      switchMap(cached => {
        if (cached && (Date.now() - cached.cachedAt) < CHAPTER_CACHE_TTL) {
          return of({ chapters: cached.chapters, done: true });
        }
        return this.fetchChapterFeedStreaming(mangaDexId);
      })
    );
  }

  private fetchChapterFeedStreaming(mangaDexId: string): Observable<{ chapters: MangaDexChapter[]; done: boolean }> {
    const limit = 500;
    let accumulated: MangaDexChapter[] = [];
    let offset = 0;
    return this.getChapterFeed(mangaDexId, 0, limit).pipe(
      expand(result => {
        offset += result.chapters.length;
        if (result.chapters.length === 0 || result.chapters.length < limit) return EMPTY;
        return this.getChapterFeed(mangaDexId, offset, limit);
      }),
      map(result => {
        accumulated = [...accumulated, ...result.chapters];
        const done = result.chapters.length < limit;
        return { chapters: accumulated, done };
      }),
      tap(({ done, chapters }) => {
        if (done) {
          const entry: ChapterCacheEntry = { mangaDexId, chapters, cachedAt: Date.now() };
          this.db.put('chapter-cache', entry).subscribe();
        }
      })
    );
  }

  getChapterFeedAll(mangaDexId: string): Observable<MangaDexChapter[]> {
    return this.getChapterFeedStreaming(mangaDexId).pipe(
      reduce((_, result) => result.chapters, [] as MangaDexChapter[])
    );
  }

  getAtHomeServer(chapterId: string): Observable<MangaDexAtHomeResponse> {
    const url = this.getUrl(`/at-home/server/${chapterId}`);
    return this.http.get<MangaDexAtHomeResponse>(url);
  }

  getMangaDexUrl(mangaDexId: string): string {
    return `https://mangadex.org/title/${mangaDexId}`;
  }

  getMangaDexSearchUrl(title: string): string {
    return `https://mangadex.org/search?q=${encodeURIComponent(title)}`;
  }
}
