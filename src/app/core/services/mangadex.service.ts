import { Injectable, inject, isDevMode } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of, expand, reduce, EMPTY } from 'rxjs';
import {
  MangaDexResponse,
  MangaDexManga,
  MangaDexChapter,
  MangaDexAtHomeResponse,
} from '../models/mangadex.model';

@Injectable({ providedIn: 'root' })
export class MangaDexService {
  private readonly http = inject(HttpClient);
  private readonly isDev = isDevMode();
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

    if (this.isDev) {
      return fullUrl.toString();
    }
    return `/.netlify/functions/mangadex-proxy?url=${encodeURIComponent(fullUrl.toString())}`;
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

  getChapterFeed(mangaDexId: string, offset = 0, limit = 100): Observable<{ chapters: MangaDexChapter[]; total: number }> {
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

  getChapterFeedAll(mangaDexId: string): Observable<MangaDexChapter[]> {
    const limit = 100;
    return this.getChapterFeed(mangaDexId, 0, limit).pipe(
      expand(result => {
        const fetched = result.chapters.length;
        if (fetched === 0 || fetched < limit) return EMPTY;
        const nextOffset = result.chapters.length;
        return this.getChapterFeed(mangaDexId, nextOffset, limit);
      }),
      reduce((acc, result) => [...acc, ...result.chapters], [] as MangaDexChapter[])
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
