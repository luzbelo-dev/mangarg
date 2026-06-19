import { Injectable, inject } from '@angular/core';
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
  private readonly baseUrl = 'https://api.mangadex.org';

  findMangaByTitle(title: string): Observable<MangaDexManga | null> {
    return this.http.get<MangaDexResponse<MangaDexManga>>(
      `${this.baseUrl}/manga`,
      {
        params: {
          title: title,
          limit: '5',
          'includes[]': 'cover_art',
          'availableTranslatedLanguage[]': ['en', 'es', 'es-la'],
        },
      }
    ).pipe(
      map(res => res.data[0] ?? null),
      catchError(() => of(null))
    );
  }

  getChapterFeed(mangaDexId: string, offset = 0, limit = 100): Observable<{ chapters: MangaDexChapter[]; total: number }> {
    return this.http.get<MangaDexResponse<MangaDexChapter>>(
      `${this.baseUrl}/manga/${mangaDexId}/feed`,
      {
        params: {
          'translatedLanguage[]': ['en', 'es', 'es-la'],
          'order[chapter]': 'asc',
          'includes[]': 'scanlation_group',
          limit: limit.toString(),
          offset: offset.toString(),
          'includeFuturePublishAt': '0',
        },
      }
    ).pipe(
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
    return this.http.get<MangaDexAtHomeResponse>(
      `${this.baseUrl}/at-home/server/${chapterId}`
    );
  }

  getMangaDexUrl(mangaDexId: string): string {
    return `https://mangadex.org/title/${mangaDexId}`;
  }

  getMangaDexSearchUrl(title: string): string {
    return `https://mangadex.org/search?q=${encodeURIComponent(title)}`;
  }
}
