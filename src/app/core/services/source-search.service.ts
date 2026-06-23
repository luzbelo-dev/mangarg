import { Injectable, inject } from '@angular/core';
import { Observable, from, of, forkJoin } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { SourceManga } from '../models/source.model';
import { AdapterLoaderService } from './adapter-loader.service';

export interface SourceSearchResult {
  sourceId: string;
  sourceName: string;
  iconColor: string;
  results: SourceManga[];
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class SourceSearchService {
  private readonly loader = inject(AdapterLoaderService);

  searchAll(query: string): Observable<SourceSearchResult[]> {
    if (!query?.trim()) return of([]);

    const adapters = this.loader.getAllLoadedAdapters();
    if (adapters.length === 0) return of([]);

    const searches = adapters.map(adapter =>
      from(adapter.search(query).catch(err => {
        console.error(`Search failed for ${adapter.id}:`, err);
        return [] as SourceManga[];
      })).pipe(
        map(results => ({
          sourceId: adapter.id,
          sourceName: adapter.name,
          iconColor: adapter.iconColor,
          results,
        } as SourceSearchResult)),
        catchError(() => of({
          sourceId: adapter.id,
          sourceName: adapter.name,
          iconColor: adapter.iconColor,
          results: [] as SourceManga[],
          error: 'Search failed',
        } as SourceSearchResult))
      )
    );

    return forkJoin(searches);
  }

  searchSource(sourceId: string, query: string): Observable<SourceManga[]> {
    if (!query?.trim()) return of([]);

    const adapter = this.loader.getAdapter(sourceId);
    if (!adapter) return of([]);

    return from(adapter.search(query)).pipe(
      catchError(() => of([]))
    );
  }

  getPopular(sourceId: string): Observable<SourceManga[]> {
    const adapter = this.loader.getAdapter(sourceId);
    if (!adapter) return of([]);

    return from(adapter.getPopular()).pipe(
      catchError(() => of([]))
    );
  }

  getChapters(sourceId: string, mangaSlug: string, lang?: string): Observable<any[]> {
    const adapter = this.loader.getAdapter(sourceId);
    if (!adapter) return of([]);

    return from(adapter.getChapters(mangaSlug, lang)).pipe(
      catchError(() => of([]))
    );
  }

  getPages(sourceId: string, chapterId: string): Observable<any[]> {
    const adapter = this.loader.getAdapter(sourceId);
    if (!adapter) return of([]);

    return from(adapter.getPages(chapterId)).pipe(
      catchError(() => of([]))
    );
  }
}
