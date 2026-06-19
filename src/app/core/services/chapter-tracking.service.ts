import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { ChapterProgress } from '../models/tracking.model';

@Injectable({ providedIn: 'root' })
export class ChapterTrackingService {
  private readonly STORAGE_KEY = 'mt-chapter-progress';
  private readonly progress$ = new BehaviorSubject<Map<number, ChapterProgress>>(
    this.loadFromStorage()
  );

  getProgress(malId: number): Observable<ChapterProgress | undefined> {
    return this.progress$.pipe(map(m => m.get(malId)));
  }

  getAllProgress(): Observable<Map<number, ChapterProgress>> {
    return this.progress$.asObservable();
  }

  updateProgress(
    malId: number,
    chapter: number,
    totalChapters: number | null,
    mangaDexId: string | null
  ): void {
    const current = new Map(this.progress$.value);
    current.set(malId, {
      mal_id: malId,
      currentChapter: Math.max(0, chapter),
      totalChapters,
      lastUpdated: new Date().toISOString(),
      mangaDexId,
    });
    this.progress$.next(current);
    this.persistToStorage(current);
  }

  removeProgress(malId: number): void {
    const current = new Map(this.progress$.value);
    current.delete(malId);
    this.progress$.next(current);
    this.persistToStorage(current);
  }

  private loadFromStorage(): Map<number, ChapterProgress> {
    try {
      const raw: ChapterProgress[] = JSON.parse(
        localStorage.getItem(this.STORAGE_KEY) ?? '[]'
      );
      return new Map(raw.map(p => [p.mal_id, p]));
    } catch {
      return new Map();
    }
  }

  private persistToStorage(progress: Map<number, ChapterProgress>): void {
    localStorage.setItem(
      this.STORAGE_KEY,
      JSON.stringify([...progress.values()])
    );
  }
}
