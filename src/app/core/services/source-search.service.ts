import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { SourceManga } from '../models/source.model';
import { SourceRegistryService } from './source-registry.service';
import { getAdapter } from './source-adapters';

export interface SourceSearchResult {
  sourceId: string;
  sourceName: string;
  iconColor: string;
  results: SourceManga[];
}

@Injectable({ providedIn: 'root' })
export class SourceSearchService {
  private readonly http = inject(HttpClient);
  private readonly registry = inject(SourceRegistryService);

  searchAll(query: string): Observable<SourceSearchResult[]> {
    if (!query || !query.trim()) {
      return of([]);
    }

    const installedSources = this.registry.getInstalled();
    const searchObservables: Observable<SourceSearchResult>[] = [];

    for (const source of installedSources) {
      const adapter = getAdapter(source.id);
      if (!adapter) continue;

      const obs = adapter.search(query, this.http).pipe(
        map(results => ({
          sourceId: adapter.sourceId,
          sourceName: adapter.sourceName,
          iconColor: adapter.iconColor,
          results,
        })),
        catchError(() => of({
          sourceId: adapter.sourceId,
          sourceName: adapter.sourceName,
          iconColor: adapter.iconColor,
          results: [] as SourceManga[],
        }))
      );

      searchObservables.push(obs);
    }

    if (searchObservables.length === 0) {
      return of([]);
    }

    return forkJoin(searchObservables);
  }

  searchSource(sourceId: string, query: string): Observable<SourceManga[]> {
    if (!query || !query.trim()) {
      return of([]);
    }

    const adapter = getAdapter(sourceId);
    if (!adapter) {
      return of([]);
    }

    return adapter.search(query, this.http).pipe(
      catchError(() => of([]))
    );
  }
}
