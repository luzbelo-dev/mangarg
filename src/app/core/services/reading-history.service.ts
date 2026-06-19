import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';
import { IndexedDbService } from './indexeddb.service';
import { ReadingHistory } from '../models/tracking.model';

@Injectable({ providedIn: 'root' })
export class ReadingHistoryService {
  private readonly db = inject(IndexedDbService);
  private readonly history$ = new BehaviorSubject<Map<string, ReadingHistory>>(new Map());
  private loaded = false;

  loadHistory(): Observable<void> {
    if (this.loaded) return new Observable(s => { s.next(); s.complete(); });
    return this.db.getAll<ReadingHistory>('reading-history').pipe(
      tap(entries => {
        const m = new Map(entries.map(e => [e.chapterId, e]));
        this.history$.next(m);
        this.loaded = true;
      }),
      map(() => undefined)
    );
  }

  markPageRead(entry: ReadingHistory): void {
    const current = new Map(this.history$.value);
    current.set(entry.chapterId, entry);
    this.history$.next(current);
    this.db.put('reading-history', entry).subscribe();
  }

  markChapterComplete(chapterId: string): void {
    const entry = this.history$.value.get(chapterId);
    if (!entry) return;
    const updated = { ...entry, completed: true, readAt: new Date().toISOString() };
    this.markPageRead(updated);
  }

  getChapterProgress(chapterId: string): ReadingHistory | undefined {
    return this.history$.value.get(chapterId);
  }

  isChapterRead(chapterId: string): boolean {
    return this.history$.value.get(chapterId)?.completed ?? false;
  }

  getHistoryForManga(malId: number): Observable<ReadingHistory[]> {
    return this.history$.pipe(
      map(m => [...m.values()].filter(h => h.mal_id === malId))
    );
  }

  getRecentHistory(limit: number): Observable<ReadingHistory[]> {
    return this.history$.pipe(
      map(m => [...m.values()]
        .sort((a, b) => new Date(b.readAt).getTime() - new Date(a.readAt).getTime())
        .slice(0, limit)
      )
    );
  }

  getLastReadChapter(malId: number): ReadingHistory | undefined {
    const entries = [...this.history$.value.values()]
      .filter(h => h.mal_id === malId)
      .sort((a, b) => new Date(b.readAt).getTime() - new Date(a.readAt).getTime());
    return entries[0];
  }

  clearHistory(): Observable<void> {
    this.history$.next(new Map());
    this.loaded = false;
    return new Observable(subscriber => {
      this.db.getAll<ReadingHistory>('reading-history').subscribe(entries => {
        if (entries.length === 0) {
          subscriber.next();
          subscriber.complete();
          return;
        }
        let deleted = 0;
        for (const entry of entries) {
          this.db.delete('reading-history', entry.chapterId).subscribe(() => {
            deleted++;
            if (deleted === entries.length) {
              subscriber.next();
              subscriber.complete();
            }
          });
        }
      });
    });
  }
}
