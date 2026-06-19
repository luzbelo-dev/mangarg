import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, from, map, tap, concatMap, finalize, catchError, of, switchMap } from 'rxjs';
import { IndexedDbService } from './indexeddb.service';
import { MangaDexImageService } from './mangadex-image.service';
import { DownloadedChapter, DownloadedPage } from '../models/download.model';

@Injectable({ providedIn: 'root' })
export class DownloadService {
  private readonly db = inject(IndexedDbService);
  private readonly imageService = inject(MangaDexImageService);

  private readonly downloads$ = new BehaviorSubject<Map<string, DownloadedChapter>>(new Map());
  private readonly activeDownloads$ = new BehaviorSubject<Map<string, number>>(new Map());
  private readonly abortControllers = new Map<string, AbortController>();
  private loaded = false;

  readonly downloading$ = this.activeDownloads$.asObservable();

  loadDownloads(): Observable<void> {
    if (this.loaded) return of(undefined);
    return this.db.getAll<DownloadedChapter>('downloaded-chapters').pipe(
      tap(chapters => {
        const m = new Map(chapters.map(c => [c.chapterId, c]));
        this.downloads$.next(m);
        this.loaded = true;
      }),
      map(() => undefined)
    );
  }

  isDownloaded(chapterId: string): boolean {
    return this.downloads$.value.has(chapterId);
  }

  downloadChapter(
    chapterId: string,
    mal_id: number,
    mangaDexId: string,
    chapterNumber: string | null,
    chapterTitle: string | null
  ): Observable<number> {
    const controller = new AbortController();
    this.abortControllers.set(chapterId, controller);

    return this.imageService.getChapterImages(chapterId).pipe(
      switchMap(images => {
        const filenames = images.filenameSaver;
        const total = filenames.length;
        let downloaded = 0;
        let totalBytes = 0;

        return from(filenames).pipe(
          concatMap((filename, index) => {
            if (controller.signal.aborted) throw new Error('Cancelled');

            const url = `${images.baseUrl}/data-saver/${images.hash}/${filename}`;
            return from(
              fetch(url, { signal: controller.signal })
                .then(r => r.blob())
                .then(blob => {
                  totalBytes += blob.size;
                  const page: DownloadedPage = {
                    id: `${chapterId}_${index}`,
                    chapterId,
                    pageIndex: index,
                    blob,
                    mimeType: blob.type,
                  };
                  return page;
                })
            ).pipe(
              switchMap(page => this.db.put('downloaded-pages', page).pipe(map(() => page))),
              tap(() => {
                downloaded++;
                const progress = Math.round((downloaded / total) * 100);
                const active = new Map(this.activeDownloads$.value);
                active.set(chapterId, progress);
                this.activeDownloads$.next(active);
              }),
              map(() => Math.round((downloaded / total) * 100))
            );
          }),
          finalize(() => {
            this.abortControllers.delete(chapterId);
            const active = new Map(this.activeDownloads$.value);
            active.delete(chapterId);
            this.activeDownloads$.next(active);

            if (!controller.signal.aborted) {
              const chapter: DownloadedChapter = {
                chapterId,
                mal_id,
                mangaDexId,
                chapterNumber,
                chapterTitle,
                totalPages: total,
                downloadedAt: new Date().toISOString(),
                sizeBytes: totalBytes,
              };
              this.db.put('downloaded-chapters', chapter).subscribe(() => {
                const current = new Map(this.downloads$.value);
                current.set(chapterId, chapter);
                this.downloads$.next(current);
              });
            }
          }),
          catchError(err => {
            if (err.message === 'Cancelled') return of(-1);
            throw err;
          })
        );
      })
    );
  }

  cancelDownload(chapterId: string): void {
    this.abortControllers.get(chapterId)?.abort();
    this.abortControllers.delete(chapterId);
  }

  getDownloadedPages(chapterId: string): Observable<DownloadedPage[]> {
    return this.db.getAllByIndex<DownloadedPage>('downloaded-pages', 'chapterId', chapterId).pipe(
      map(pages => pages.sort((a, b) => a.pageIndex - b.pageIndex))
    );
  }

  deleteChapterDownload(chapterId: string): Observable<void> {
    return this.db.deleteByIndex('downloaded-pages', 'chapterId', chapterId).pipe(
      switchMap(() => this.db.delete('downloaded-chapters', chapterId)),
      tap(() => {
        const current = new Map(this.downloads$.value);
        current.delete(chapterId);
        this.downloads$.next(current);
      })
    );
  }

  deleteAllDownloads(malId: number): Observable<void> {
    const chapters = [...this.downloads$.value.values()].filter(c => c.mal_id === malId);
    if (chapters.length === 0) return of(undefined);

    return from(chapters).pipe(
      concatMap(ch => this.deleteChapterDownload(ch.chapterId))
    );
  }

  getStorageUsage(): Observable<{ used: number; quota: number }> {
    return this.db.estimateStorage().pipe(
      map(est => ({ used: est?.usage ?? 0, quota: est?.quota ?? 0 }))
    );
  }
}
