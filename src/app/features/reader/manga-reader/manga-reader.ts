import { ChangeDetectionStrategy, Component, inject, signal, DestroyRef, OnInit, HostListener, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { switchMap, tap, catchError, of } from 'rxjs';
import { MangaDexImageService } from '../../../core/services/mangadex-image.service';
import { MangaDexService } from '../../../core/services/mangadex.service';
import { ReaderSettingsService } from '../../../core/services/reader-settings.service';
import { ReadingHistoryService } from '../../../core/services/reading-history.service';
import { TranslateService } from '../../../core/i18n/translate.service';
import { ChapterImages } from '../../../core/models/reader.model';
import { MangaDexChapter } from '../../../core/models/mangadex.model';
import { ReadingHistory } from '../../../core/models/tracking.model';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner';

@Component({
  selector: 'mt-manga-reader',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LoadingSpinnerComponent],
  templateUrl: './manga-reader.html',
  styleUrl: './manga-reader.scss',
})
export class MangaReaderComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly imageService = inject(MangaDexImageService);
  private readonly mangaDexService = inject(MangaDexService);
  readonly readerSettings = inject(ReaderSettingsService);
  private readonly historyService = inject(ReadingHistoryService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly i18n = inject(TranslateService);

  @ViewChild('longstripContainer') longstripContainer?: ElementRef<HTMLDivElement>;

  t = this.i18n.t;
  settings = this.readerSettings.settings;

  chapterId = signal('');
  images = signal<ChapterImages | null>(null);
  currentPage = signal(0);
  totalPages = signal(0);
  loading = signal(true);
  error = signal<string | null>(null);
  showToolbar = signal(true);
  showSettings = signal(false);
  isLastPage = signal(false);
  nextChapter = signal<MangaDexChapter | null>(null);
  prevChapterData = signal<MangaDexChapter | null>(null);

  failedPages = signal<Set<number>>(new Set());
  retryingPages = signal<Set<number>>(new Set());

  private toolbarTimeout: ReturnType<typeof setTimeout> | null = null;
  private malId = 0;
  private mangaDexId = '';
  private chapters: MangaDexChapter[] = [];
  private retryCounts = new Map<number, number>();
  private preloadedPages = new Set<number>();

  ngOnInit(): void {
    this.historyService.loadHistory().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();

    this.malId = Number(this.route.snapshot.queryParams['malId']) || 0;
    this.mangaDexId = this.route.snapshot.queryParams['mangaDexId'] || '';

    this.route.params.pipe(
      tap(params => {
        this.chapterId.set(params['chapterId']);
        this.loading.set(true);
        this.error.set(null);
        this.currentPage.set(0);
        this.isLastPage.set(false);
        this.failedPages.set(new Set());
        this.retryingPages.set(new Set());
        this.retryCounts.clear();
        this.preloadedPages.clear();
        this.updateAdjacentChapters();
      }),
      switchMap(params =>
        this.imageService.getChapterImages(params['chapterId']).pipe(
          catchError(() => {
            this.error.set(this.t().reader.loadError);
            return of(null);
          })
        )
      ),
      tap(() => this.loading.set(false)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(images => {
      if (images) {
        this.images.set(images);
        const filenames = this.settings().quality === 'full' ? images.filenameFull : images.filenameSaver;
        this.totalPages.set(filenames.length);

        const progress = this.historyService.getChapterProgress(this.chapterId());
        if (progress && !progress.completed) {
          this.currentPage.set(progress.lastPage);
        }
        this.preloadAhead(this.currentPage());
      }
    });

    if (this.mangaDexId) {
      this.mangaDexService.getChapterFeedStreaming(this.mangaDexId).pipe(
        takeUntilDestroyed(this.destroyRef),
      ).subscribe(({ chapters }) => {
        this.chapters = chapters;
        this.updateAdjacentChapters();
      });
    }

    this.startToolbarTimer();
  }

  private updateAdjacentChapters(): void {
    const currentId = this.chapterId();
    const idx = this.chapters.findIndex(ch => ch.id === currentId);
    if (idx === -1) return;
    this.nextChapter.set(idx < this.chapters.length - 1 ? this.chapters[idx + 1] : null);
    this.prevChapterData.set(idx > 0 ? this.chapters[idx - 1] : null);
  }

  getPageUrl(pageIndex: number): string {
    const imgs = this.images();
    if (!imgs) return '';
    const failed = this.failedPages();
    if (failed.has(pageIndex) && this.settings().quality === 'full') {
      return this.imageService.buildImageUrl(imgs, pageIndex, 'dataSaver');
    }
    return this.imageService.buildImageUrl(imgs, pageIndex, this.settings().quality);
  }

  get allPageUrls(): string[] {
    const imgs = this.images();
    if (!imgs) return [];
    const count = this.totalPages();
    return Array.from({ length: count }, (_, i) => this.getPageUrl(i));
  }

  onImageError(event: Event, pageIndex: number): void {
    const img = event.target as HTMLImageElement;
    const retries = this.retryCounts.get(pageIndex) ?? 0;

    if (retries < 2) {
      this.retryCounts.set(pageIndex, retries + 1);
      const retrying = new Set(this.retryingPages());
      retrying.add(pageIndex);
      this.retryingPages.set(retrying);

      setTimeout(() => {
        const currentSrc = img.src;
        img.src = '';
        img.src = currentSrc + (currentSrc.includes('?') ? '&' : '?') + 'r=' + retries;
        const r = new Set(this.retryingPages());
        r.delete(pageIndex);
        this.retryingPages.set(r);
      }, 1000 * (retries + 1));
      return;
    }

    if (this.settings().quality === 'full') {
      const imgs = this.images();
      if (imgs) {
        this.retryCounts.set(pageIndex, 0);
        img.src = this.imageService.buildImageUrl(imgs, pageIndex, 'dataSaver');
        return;
      }
    }

    const failed = new Set(this.failedPages());
    failed.add(pageIndex);
    this.failedPages.set(failed);
  }

  isPageFailed(pageIndex: number): boolean {
    return this.failedPages().has(pageIndex);
  }

  retryPage(pageIndex: number): void {
    this.retryCounts.delete(pageIndex);
    const failed = new Set(this.failedPages());
    failed.delete(pageIndex);
    this.failedPages.set(failed);

    const imgs = this.images();
    if (imgs) {
      this.imageService.clearCache();
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages() - 1) {
      this.currentPage.update(p => p + 1);
      this.isLastPage.set(this.currentPage() >= this.totalPages() - 1);
      this.saveProgress();
      this.preloadAhead(this.currentPage());
    }
  }

  prevPage(): void {
    if (this.currentPage() > 0) {
      this.currentPage.update(p => p - 1);
      this.isLastPage.set(false);
      this.saveProgress();
      this.preloadAhead(this.currentPage());
    }
  }

  private preloadAhead(fromPage: number): void {
    const total = this.totalPages();
    const imgs = this.images();
    if (!imgs) return;

    for (let i = 1; i <= 3; i++) {
      const target = fromPage + i;
      if (target >= total || this.preloadedPages.has(target)) continue;
      this.preloadedPages.add(target);
      const img = new Image();
      img.src = this.imageService.buildImageUrl(imgs, target, this.settings().quality);
    }
  }

  goToNextChapter(): void {
    const next = this.nextChapter();
    if (!next) return;
    this.router.navigate(['/reader', next.id], {
      queryParams: {
        malId: this.malId,
        mangaDexId: this.mangaDexId,
      },
    });
  }

  goToPrevChapter(): void {
    const prev = this.prevChapterData();
    if (!prev) return;
    this.router.navigate(['/reader', prev.id], {
      queryParams: {
        malId: this.malId,
        mangaDexId: this.mangaDexId,
      },
    });
  }

  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages()) {
      this.currentPage.set(page);
      this.isLastPage.set(page >= this.totalPages() - 1);
      this.saveProgress();

      if (this.settings().mode === 'longstrip' && this.longstripContainer) {
        const images = this.longstripContainer.nativeElement.querySelectorAll('img');
        if (images[page]) {
          images[page].scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }
  }

  onSliderChange(event: Event): void {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    this.goToPage(value);
  }

  onLongstripScroll(event: Event): void {
    const container = event.target as HTMLElement;
    const images = container.querySelectorAll('img');
    const scrollTop = container.scrollTop;
    const containerHeight = container.clientHeight;

    let currentIdx = 0;
    for (let i = 0; i < images.length; i++) {
      const img = images[i] as HTMLElement;
      const imgTop = img.offsetTop - container.offsetTop;
      if (imgTop <= scrollTop + containerHeight / 3) {
        currentIdx = i;
      }
    }

    if (currentIdx !== this.currentPage()) {
      this.currentPage.set(currentIdx);
      this.isLastPage.set(currentIdx >= this.totalPages() - 1);
      this.saveProgress();
    }
  }

  private saveProgress(): void {
    const entry: ReadingHistory = {
      chapterId: this.chapterId(),
      mal_id: this.malId,
      mangaDexId: this.mangaDexId,
      chapterNumber: null,
      chapterTitle: null,
      lastPage: this.currentPage(),
      totalPages: this.totalPages(),
      readAt: new Date().toISOString(),
      completed: this.currentPage() >= this.totalPages() - 1,
    };
    this.historyService.markPageRead(entry);
  }

  onPageClick(event: MouseEvent): void {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const width = rect.width;

    if (x < width * 0.35) {
      this.nextPage();
    } else if (x > width * 0.65) {
      this.prevPage();
    } else {
      this.toggleToolbar();
    }
  }

  onLongstripClick(event: MouseEvent): void {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const height = rect.height;

    if (y < height * 0.3) {
      target.scrollBy({ top: -400, behavior: 'smooth' });
    } else if (y > height * 0.7) {
      target.scrollBy({ top: 400, behavior: 'smooth' });
    } else {
      this.toggleToolbar();
    }
  }

  onPageWheel(event: WheelEvent): void {
    if (this.settings().mode !== 'page') return;
    event.preventDefault();
    if (event.deltaY > 0) {
      this.nextPage();
    } else if (event.deltaY < 0) {
      this.prevPage();
    }
  }

  toggleToolbar(): void {
    this.showToolbar.update(v => !v);
    if (this.showToolbar()) this.startToolbarTimer();
  }

  toggleSettings(): void {
    this.showSettings.update(v => !v);
  }

  private startToolbarTimer(): void {
    if (this.toolbarTimeout) clearTimeout(this.toolbarTimeout);
    this.toolbarTimeout = setTimeout(() => this.showToolbar.set(false), 4000);
  }

  onMouseMove(): void {
    this.showToolbar.set(true);
    this.startToolbarTimer();
  }

  toggleFullscreen(): void {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  }

  setMode(mode: 'page' | 'longstrip'): void {
    this.readerSettings.setMode(mode);
  }

  setQuality(quality: 'full' | 'dataSaver'): void {
    this.readerSettings.setQuality(quality);
    const imgs = this.images();
    if (imgs) {
      const filenames = quality === 'full' ? imgs.filenameFull : imgs.filenameSaver;
      this.totalPages.set(filenames.length);
    }
  }

  setFitMode(fitMode: 'width' | 'height' | 'original'): void {
    this.readerSettings.setFitMode(fitMode);
  }

  zoomIn(): void {
    this.readerSettings.zoomIn();
  }

  zoomOut(): void {
    this.readerSettings.zoomOut();
  }

  setZoom(event: Event): void {
    const value = parseInt((event.target as HTMLSelectElement).value, 10);
    this.readerSettings.setZoom(value);
  }

  close(): void {
    this.saveProgress();
    if (this.malId) {
      this.router.navigate(['/manga', this.malId]);
    } else {
      this.router.navigate(['/library']);
    }
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        this.nextPage();
        break;
      case 'ArrowRight':
        event.preventDefault();
        this.prevPage();
        break;
      case ' ':
        event.preventDefault();
        this.nextPage();
        break;
      case 'ArrowDown':
        if (this.settings().mode === 'page') {
          event.preventDefault();
          this.nextPage();
        }
        break;
      case 'ArrowUp':
        if (this.settings().mode === 'page') {
          event.preventDefault();
          this.prevPage();
        }
        break;
      case 'f':
      case 'F':
        this.toggleFullscreen();
        break;
      case '+':
      case '=':
        event.preventDefault();
        this.zoomIn();
        break;
      case '-':
        event.preventDefault();
        this.zoomOut();
        break;
      case 'Escape':
        if (this.showSettings()) {
          this.showSettings.set(false);
        } else {
          this.close();
        }
        break;
    }
  }
}
