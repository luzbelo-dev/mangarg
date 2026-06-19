import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, shareReplay, catchError, of } from 'rxjs';
import {
  JikanManga,
  JikanPaginatedResponse,
  JikanResponse,
} from '../models/manga.model';

export interface MangaGenre {
  id: number;
  name: string;
  nameEs: string;
}

export const MANGA_GENRES: MangaGenre[] = [
  { id: 1, name: 'Action', nameEs: 'Acción' },
  { id: 2, name: 'Adventure', nameEs: 'Aventura' },
  { id: 4, name: 'Comedy', nameEs: 'Comedia' },
  { id: 8, name: 'Drama', nameEs: 'Drama' },
  { id: 10, name: 'Fantasy', nameEs: 'Fantasía' },
  { id: 14, name: 'Horror', nameEs: 'Horror' },
  { id: 7, name: 'Mystery', nameEs: 'Misterio' },
  { id: 22, name: 'Romance', nameEs: 'Romance' },
  { id: 24, name: 'Sci-Fi', nameEs: 'Ciencia Ficción' },
  { id: 36, name: 'Slice of Life', nameEs: 'Recuentos de la vida' },
  { id: 30, name: 'Sports', nameEs: 'Deportes' },
  { id: 37, name: 'Supernatural', nameEs: 'Sobrenatural' },
  { id: 41, name: 'Thriller', nameEs: 'Suspenso' },
  { id: 40, name: 'Psychological', nameEs: 'Psicológico' },
  { id: 13, name: 'Historical', nameEs: 'Histórico' },
  { id: 23, name: 'School', nameEs: 'Escolar' },
  { id: 35, name: 'Harem', nameEs: 'Harem' },
  { id: 46, name: 'Award Winning', nameEs: 'Premiado' },
  { id: 25, name: 'Shoujo', nameEs: 'Shoujo' },
  { id: 27, name: 'Shounen', nameEs: 'Shounen' },
  { id: 42, name: 'Seinen', nameEs: 'Seinen' },
  { id: 43, name: 'Josei', nameEs: 'Josei' },
  { id: 18, name: 'Mecha', nameEs: 'Mecha' },
  { id: 38, name: 'Military', nameEs: 'Militar' },
  { id: 9, name: 'Ecchi', nameEs: 'Ecchi' },
];

@Injectable({ providedIn: 'root' })
export class JikanService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'https://api.jikan.moe/v4';

  searchManga(query: string, page = 1): Observable<JikanPaginatedResponse<JikanManga>> {
    return this.http.get<JikanPaginatedResponse<JikanManga>>(
      `${this.baseUrl}/manga`,
      {
        params: {
          q: query,
          limit: '25',
          page: page.toString(),
          sfw: 'true',
        },
      }
    ).pipe(
      catchError(() => of({
        data: [],
        pagination: {
          last_visible_page: 0,
          has_next_page: false,
          current_page: 1,
          items: { count: 0, total: 0, per_page: 25 },
        },
      }))
    );
  }

  getTopManga(
    filter: 'bypopularity' | 'favorite' = 'bypopularity',
    page = 1,
    limit = 10
  ): Observable<JikanPaginatedResponse<JikanManga>> {
    return this.http.get<JikanPaginatedResponse<JikanManga>>(
      `${this.baseUrl}/top/manga`,
      {
        params: {
          filter,
          page: page.toString(),
          limit: limit.toString(),
          sfw: 'true',
        },
      }
    ).pipe(
      catchError(() => of({
        data: [],
        pagination: {
          last_visible_page: 0,
          has_next_page: false,
          current_page: 1,
          items: { count: 0, total: 0, per_page: limit },
        },
      }))
    );
  }

  getTopScoredManga(page = 1, limit = 10): Observable<JikanPaginatedResponse<JikanManga>> {
    return this.http.get<JikanPaginatedResponse<JikanManga>>(
      `${this.baseUrl}/top/manga`,
      {
        params: {
          page: page.toString(),
          limit: limit.toString(),
          sfw: 'true',
        },
      }
    ).pipe(
      catchError(() => of({
        data: [],
        pagination: {
          last_visible_page: 0,
          has_next_page: false,
          current_page: 1,
          items: { count: 0, total: 0, per_page: limit },
        },
      }))
    );
  }

  browseByGenres(
    genreIds: number[],
    page = 1,
    sfw = true,
    orderBy: 'score' | 'popularity' | 'title' | 'start_date' = 'score',
    sort: 'desc' | 'asc' = 'desc',
    limit = 25
  ): Observable<JikanPaginatedResponse<JikanManga>> {
    let params = new HttpParams()
      .set('genres', genreIds.join(','))
      .set('order_by', orderBy)
      .set('sort', sort)
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (sfw) {
      params = params.set('sfw', 'true');
    }

    return this.http.get<JikanPaginatedResponse<JikanManga>>(
      `${this.baseUrl}/manga`,
      { params }
    ).pipe(
      catchError(() => of({
        data: [],
        pagination: {
          last_visible_page: 0,
          has_next_page: false,
          current_page: 1,
          items: { count: 0, total: 0, per_page: limit },
        },
      }))
    );
  }

  getMangaById(id: number): Observable<JikanManga | null> {
    return this.http.get<JikanResponse<JikanManga>>(
      `${this.baseUrl}/manga/${id}`
    ).pipe(
      map(res => res.data),
      shareReplay(1),
      catchError(() => of(null))
    );
  }

  getMangaFull(id: number): Observable<JikanManga | null> {
    return this.http.get<JikanResponse<JikanManga>>(
      `${this.baseUrl}/manga/${id}/full`
    ).pipe(
      map(res => res.data),
      shareReplay(1),
      catchError(() => of(null))
    );
  }
}
