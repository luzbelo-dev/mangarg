import { Injectable, inject } from '@angular/core';
import { Observable, map, shareReplay, of } from 'rxjs';
import { MangaDexService } from './mangadex.service';
import { ChapterImages, ImageQuality } from '../models/reader.model';

@Injectable({ providedIn: 'root' })
export class MangaDexImageService {
  private readonly mangaDexService = inject(MangaDexService);
  private readonly cache = new Map<string, { images: ChapterImages; obs: Observable<ChapterImages> }>();

  getChapterImages(chapterId: string): Observable<ChapterImages> {
    const cached = this.cache.get(chapterId);
    if (cached && !this.isExpired(cached.images)) {
      return cached.obs;
    }

    const obs = this.mangaDexService.getAtHomeServer(chapterId).pipe(
      map(res => {
        const images: ChapterImages = {
          baseUrl: res.baseUrl,
          hash: res.chapter.hash,
          filenameFull: res.chapter.data,
          filenameSaver: res.chapter.dataSaver,
          expiresAt: Date.now() + 14 * 60 * 1000,
        };
        this.cache.set(chapterId, { images, obs: of(images) });
        return images;
      }),
      shareReplay(1)
    );

    this.cache.set(chapterId, { images: { expiresAt: Date.now() + 14 * 60 * 1000 } as ChapterImages, obs });
    return obs;
  }

  buildImageUrl(images: ChapterImages, pageIndex: number, quality: ImageQuality): string {
    const filenames = quality === 'full' ? images.filenameFull : images.filenameSaver;
    const qualityPath = quality === 'full' ? 'data' : 'data-saver';
    const filename = filenames[pageIndex];
    const rawUrl = `${images.baseUrl}/${qualityPath}/${images.hash}/${filename}`;

    return rawUrl;
  }

  reportImageLoad(url: string, success: boolean, bytes: number, duration: number, cached: boolean): void {
    if (url.includes('mangadex.org')) return;

    fetch('https://api.mangadex.network/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, success, bytes, duration, cached }),
    }).catch(() => {});
  }

  isExpired(images: ChapterImages): boolean {
    return Date.now() >= images.expiresAt;
  }

  clearCache(): void {
    this.cache.clear();
  }
}
