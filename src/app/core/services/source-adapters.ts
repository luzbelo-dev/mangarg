import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { SourceManga } from '../models/source.model';

// ─── Utility functions ──────────────────────────────────────────────────────────

function encodeForProxy(url: string): string {
  return btoa(url).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function buildProxyUrl(targetUrl: string, method = 'GET'): string {
  const useProxy = window.location.hostname.includes('netlify.app');
  if (!useProxy) return targetUrl;
  const encoded = encodeForProxy(targetUrl);
  return `/.netlify/functions/source-proxy?url=${encoded}&method=${method}`;
}

// ─── Interface ──────────────────────────────────────────────────────────────────

export interface SourceAdapter {
  readonly sourceId: string;
  readonly sourceName: string;
  readonly iconColor: string;
  search(query: string, http: HttpClient, limit?: number): Observable<SourceManga[]>;
}

// ─── ComicK Adapter ─────────────────────────────────────────────────────────────

export class ComickAdapter implements SourceAdapter {
  readonly sourceId = 'comick';
  readonly sourceName = 'ComicK';
  readonly iconColor = '#5c6bc0';

  search(query: string, http: HttpClient, limit = 10): Observable<SourceManga[]> {
    const apiUrl = `https://api.comick.fun/v1.0/search?q=${encodeURIComponent(query)}&limit=${limit}&type=comic`;
    const url = buildProxyUrl(apiUrl);

    return http.get<any[]>(url).pipe(
      map(results => {
        if (!Array.isArray(results)) return [];
        return results.map(item => {
          const cover = item.md_covers && item.md_covers.length > 0
            ? `https://meo.comick.pictures/${item.md_covers[0].b2key}`
            : '';
          return {
            sourceId: this.sourceId,
            slug: item.slug || '',
            title: item.title || '',
            coverUrl: cover,
            score: item.rating ? parseFloat(item.rating) : undefined,
            contentRating: item.content_rating || undefined,
          } as SourceManga;
        });
      }),
      catchError(() => of([]))
    );
  }
}

// ─── Kitsu Adapter ──────────────────────────────────────────────────────────────

export class KitsuAdapter implements SourceAdapter {
  readonly sourceId = 'kitsu';
  readonly sourceName = 'Kitsu';
  readonly iconColor = '#fd8320';

  search(query: string, http: HttpClient, limit = 10): Observable<SourceManga[]> {
    const apiUrl = `https://kitsu.io/api/edge/manga?filter[text]=${encodeURIComponent(query)}&page[limit]=${limit}&fields[manga]=canonicalTitle,coverImage,synopsis,status,averageRating,subtype`;
    const url = buildProxyUrl(apiUrl);

    return http.get<any>(url).pipe(
      map(response => {
        const data = response?.data;
        if (!Array.isArray(data)) return [];
        return data.map((item: any) => {
          const attrs = item.attributes || {};
          const coverImage = attrs.coverImage || {};
          return {
            sourceId: this.sourceId,
            slug: item.id?.toString() || '',
            title: attrs.canonicalTitle || '',
            coverUrl: coverImage.small || coverImage.medium || '',
            score: attrs.averageRating ? parseFloat(attrs.averageRating) / 10 : undefined,
            description: attrs.synopsis || undefined,
            status: attrs.status || undefined,
          } as SourceManga;
        });
      }),
      catchError(() => of([]))
    );
  }
}

// ─── AniList Adapter ────────────────────────────────────────────────────────────

export class AniListAdapter implements SourceAdapter {
  readonly sourceId = 'anilist';
  readonly sourceName = 'AniList';
  readonly iconColor = '#02a9ff';

  private readonly graphqlQuery = `query($search:String){Page(perPage:10){media(search:$search,type:MANGA){id title{romaji english native} coverImage{medium large} description(asHtml:false) status averageScore genres}}}`;

  search(query: string, http: HttpClient, _limit?: number): Observable<SourceManga[]> {
    const apiUrl = 'https://graphql.anilist.co';
    const body = JSON.stringify({
      query: this.graphqlQuery,
      variables: { search: query }
    });

    const useProxy = window.location.hostname.includes('netlify.app');

    if (useProxy) {
      const proxyUrl = buildProxyUrl(apiUrl, 'POST');
      return http.post<any>(proxyUrl, body, {
        headers: { 'Content-Type': 'application/json' }
      }).pipe(
        map(response => this.mapResponse(response)),
        catchError(() => of([]))
      );
    }

    return http.post<any>(apiUrl, body, {
      headers: { 'Content-Type': 'application/json' }
    }).pipe(
      map(response => this.mapResponse(response)),
      catchError(() => of([]))
    );
  }

  private mapResponse(response: any): SourceManga[] {
    const media = response?.data?.Page?.media;
    if (!Array.isArray(media)) return [];
    return media.map((item: any) => {
      const title = item.title || {};
      const coverImage = item.coverImage || {};
      return {
        sourceId: this.sourceId,
        slug: item.id?.toString() || '',
        title: title.english || title.romaji || '',
        coverUrl: coverImage.medium || coverImage.large || '',
        score: item.averageScore ? item.averageScore / 10 : undefined,
        description: item.description || undefined,
        status: item.status || undefined,
        genres: item.genres || undefined,
      } as SourceManga;
    });
  }
}

// ─── MangaUpdates Adapter ───────────────────────────────────────────────────────

export class MangaUpdatesAdapter implements SourceAdapter {
  readonly sourceId = 'mangaupdates';
  readonly sourceName = 'MangaUpdates';
  readonly iconColor = '#f57c00';

  search(query: string, http: HttpClient, limit = 10): Observable<SourceManga[]> {
    const apiUrl = 'https://api.mangaupdates.com/v1/series/search';
    const body = JSON.stringify({ search: query, per_page: limit });

    const useProxy = window.location.hostname.includes('netlify.app');

    if (useProxy) {
      const proxyUrl = buildProxyUrl(apiUrl, 'POST');
      return http.post<any>(proxyUrl, body, {
        headers: { 'Content-Type': 'application/json' }
      }).pipe(
        map(response => this.mapResponse(response)),
        catchError(() => of([]))
      );
    }

    return http.post<any>(apiUrl, body, {
      headers: { 'Content-Type': 'application/json' }
    }).pipe(
      map(response => this.mapResponse(response)),
      catchError(() => of([]))
    );
  }

  private mapResponse(response: any): SourceManga[] {
    const results = response?.results;
    if (!Array.isArray(results)) return [];
    return results.map((item: any) => {
      const record = item.record || {};
      const imageUrl = record.image?.url?.original || '';
      const genres = Array.isArray(record.genres)
        ? record.genres.map((g: any) => g.genre).filter(Boolean)
        : undefined;
      return {
        sourceId: this.sourceId,
        slug: record.series_id?.toString() || '',
        title: record.title || '',
        coverUrl: imageUrl,
        score: record.bayesian_rating || undefined,
        description: record.description || undefined,
        genres: genres && genres.length > 0 ? genres : undefined,
      } as SourceManga;
    });
  }
}

// ─── Factory ────────────────────────────────────────────────────────────────────

const ADAPTER_MAP: Record<string, SourceAdapter> = {
  comick: new ComickAdapter(),
  kitsu: new KitsuAdapter(),
  anilist: new AniListAdapter(),
  mangaupdates: new MangaUpdatesAdapter(),
};

export function getAdapter(sourceId: string): SourceAdapter | null {
  return ADAPTER_MAP[sourceId] || null;
}

export function getAllAdapterIds(): string[] {
  return ['comick', 'kitsu', 'anilist', 'mangaupdates'];
}
