import { Injectable, inject, signal, computed } from '@angular/core';
import { firstValueFrom, from, concatMap, tap, map, finalize, catchError, of } from 'rxjs';
import { IndexedDbService } from './indexeddb.service';
import { AdapterLoaderService } from './adapter-loader.service';

export interface SourceDownloadedChapter {
  id: string; // chapterId
  mangaId: string; // sourceId + '::' + slug
  sourceId: string;
  mangaSlug: string;
  mangaTitle: string;
  chapterNumber: string;
  chapterTitle?: string;
  totalPages: number;
  downloadedAt: string;
  sizeBytes: number;
}

export interface SourceDownloadedPage {
  id: string; // chapterId + '_' + pageIndex
  chapterId: string;
  pageIndex: number;
  blob: Blob;
  mimeType: string;
}

@Injectable({ providedIn: 'root' })
export class SourceDownloadService {
  private readonly db = inject(IndexedDbService);
  private readonly adapterLoader = inject(AdapterLoaderService);

  private readonly chapters = signal<Map<string, SourceDownloadedChapter>>(new Map());
  private readonly activeDownloads = signal<Map<string, number>>(new Map());
  private readonly abortControllers = new Map<string, AbortController>();
  private loaded = false;

  readonly downloadedChapters = computed(() => [...this.chapters().values()]);
  readonly downloading = this.activeDownloads.asReadonly();

  async init(): Promise<void> {
    if (this.loaded) return;
    try {
      const items = await firstValueFrom(this.db.getAll<SourceDownloadedChapter>('source-downloaded-chapters'));
      const m = new Map(items.map(c => [c.id, c]));
      this.chapters.set(m);
    } catch (e) {
      console.error('Failed to load source downloads:', e);
    }
    this.loaded = true;
  }

  isDownloaded(chapterId: string): boolean {
    return this.chapters().has(chapterId);
  }

  isDownloading(chapterId: string): boolean {
    return this.activeDownloads().has(chapterId);
  }

  getProgress(chapterId: string): number {
    return this.activeDownloads().get(chapterId) ?? 0;
  }

  async downloadChapter(
    sourceId: string,
    mangaSlug: string,
    mangaTitle: string,
    chapterId: string,
    chapterNumber: string,
    chapterTitle?: string,
  ): Promise<void> {
    if (this.isDownloaded(chapterId) || this.isDownloading(chapterId)) return;

    const adapter = this.adapterLoader.getAdapter(sourceId);
    if (!adapter) throw new Error('Adapter not found');

    const controller = new AbortController();
    this.abortControllers.set(chapterId, controller);

    // Set initial progress
    this.activeDownloads.update(m => {
      const next = new Map(m);
      next.set(chapterId, 0);
      return next;
    });

    try {
      const pages = await adapter.getPages(chapterId);
      const total = pages.length;
      let downloaded = 0;
      let totalBytes = 0;

      for (const page of pages) {
        if (controller.signal.aborted) throw new Error('Cancelled');

        try {
          const response = await fetch(page.url, { signal: controller.signal });
          const blob = await response.blob();
          totalBytes += blob.size;

          const pageData: SourceDownloadedPage = {
            id: `${chapterId}_${page.index}`,
            chapterId,
            pageIndex: page.index,
            blob,
            mimeType: blob.type,
          };

          await firstValueFrom(this.db.put('source-downloaded-pages', pageData));

          downloaded++;
          const progress = Math.round((downloaded / total) * 100);
          this.activeDownloads.update(m => {
            const next = new Map(m);
            next.set(chapterId, progress);
            return next;
          });
        } catch (err: any) {
          if (err.message === 'Cancelled' || controller.signal.aborted) throw err;
          // Skip individual page errors, continue downloading
          downloaded++;
          console.error(`Failed to download page ${page.index}:`, err);
        }
      }

      // Save chapter metadata
      const chapter: SourceDownloadedChapter = {
        id: chapterId,
        mangaId: `${sourceId}::${mangaSlug}`,
        sourceId,
        mangaSlug,
        mangaTitle,
        chapterNumber,
        chapterTitle,
        totalPages: total,
        downloadedAt: new Date().toISOString(),
        sizeBytes: totalBytes,
      };

      await firstValueFrom(this.db.put('source-downloaded-chapters', chapter));
      this.chapters.update(m => {
        const next = new Map(m);
        next.set(chapterId, chapter);
        return next;
      });

    } catch (err: any) {
      if (err.message !== 'Cancelled' && !controller.signal.aborted) {
        console.error('Download failed:', err);
      }
    } finally {
      this.abortControllers.delete(chapterId);
      this.activeDownloads.update(m => {
        const next = new Map(m);
        next.delete(chapterId);
        return next;
      });
    }
  }

  cancelDownload(chapterId: string): void {
    this.abortControllers.get(chapterId)?.abort();
    this.abortControllers.delete(chapterId);
  }

  async getDownloadedPages(chapterId: string): Promise<SourceDownloadedPage[]> {
    const pages = await firstValueFrom(
      this.db.getAllByIndex<SourceDownloadedPage>('source-downloaded-pages', 'chapterId', chapterId)
    );
    return pages.sort((a, b) => a.pageIndex - b.pageIndex);
  }

  async deleteChapter(chapterId: string): Promise<void> {
    await firstValueFrom(this.db.deleteByIndex('source-downloaded-pages', 'chapterId', chapterId));
    await firstValueFrom(this.db.delete('source-downloaded-chapters', chapterId));
    this.chapters.update(m => {
      const next = new Map(m);
      next.delete(chapterId);
      return next;
    });
  }

  async deleteAllForManga(sourceId: string, mangaSlug: string): Promise<void> {
    const mangaId = `${sourceId}::${mangaSlug}`;
    const toDelete = [...this.chapters().values()].filter(c => c.mangaId === mangaId);
    for (const ch of toDelete) {
      await this.deleteChapter(ch.id);
    }
  }

  getChaptersForManga(sourceId: string, mangaSlug: string): SourceDownloadedChapter[] {
    const mangaId = `${sourceId}::${mangaSlug}`;
    return [...this.chapters().values()].filter(c => c.mangaId === mangaId);
  }

  getStorageUsage() {
    return this.db.estimateStorage();
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
