import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit, OnDestroy, DestroyRef, HostListener, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { from } from 'rxjs';
import { AdapterLoaderService } from '../../../core/services/adapter-loader.service';
import { ReaderSettingsService } from '../../../core/services/reader-settings.service';
import { SourceDownloadService } from '../../../core/services/source-download.service';
import { SourcePage, SourceChapter } from '../../../core/models/source.model';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner';

const READER_BODY_CLASS = 'source-reader-active';

@Component({
  selector: 'mt-source-reader',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LoadingSpinnerComponent],
  templateUrl: './source-reader.html',
  styleUrl: './source-reader.scss',
})
export class SourceReaderComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly adapterLoader = inject(AdapterLoaderService);
  private readonly sourceDownload = inject(SourceDownloadService);
  private readonly destroyRef = inject(DestroyRef);
  readonly readerSettings = inject(ReaderSettingsService);

  @ViewChild('longstripContainer') longstripContainer?: ElementRef<HTMLDivElement>;

  settings = this.readerSettings.settings;

  pages = signal<SourcePage[]>([]);
  loading = signal(true);
  showHeader = signal(true);
  showSettings = signal(false);
  currentPage = signal(0);
  error = signal<string | null>(null);
  chapterNumber = signal('');
  mangaSlug = signal('');
  isOffline = signal(false);
  chapters = signal<SourceChapter[]>([]);
  loadingChapters = signal(false);

  prevChapter = computed(() => {
    const chs = this.chapters();
    const currentIdx = chs.findIndex(c => c.id === this.chapterId);
    if (currentIdx > 0) return chs[currentIdx - 1];
    return null;
  });

  nextChapter = computed(() => {
    const chs = this.chapters();
    const currentIdx = chs.findIndex(c => c.id === this.chapterId);
    if (currentIdx >= 0 && currentIdx < chs.length - 1) return chs[currentIdx + 1];
    return null;
  });

  private sourceId = '';
  private chapterId = '';
  private failedPages = new Set<number>();
  private preloadedPages = new Set<number>();
  private headerTimeout: ReturnType<typeof setTimeout> | null = null;
  private blobUrls: string[] = [];

  private touchStartX = 0;
  private touchStartY = 0;
  private touchStartTime = 0;
  private isTouchScrolling = false;

  ngOnInit(): void {
    document.body.classList.add(READER_BODY_CLASS);

    this.route.params
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        this.sourceId = params['sourceId'];
        this.chapterId = params['chapterId'];
      });

    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(qp => {
        this.mangaSlug.set(qp['manga'] || qp['mangaSlug'] || '');
        this.chapterNumber.set(qp['ch'] || qp['chapterNumber'] || '');
      });

    // Initialize download service before loading pages so we can check for offline chapters
    this.sourceDownload.init().then(() => this.loadPages());
    this.loadChapterList();
    this.startHeaderTimer();
  }

  ngOnDestroy(): void {
    document.body.classList.remove(READER_BODY_CLASS);
    if (this.headerTimeout) {
      clearTimeout(this.headerTimeout);
    }
    // Clean up blob URLs
    for (const url of this.blobUrls) {
      URL.revokeObjectURL(url);
    }
  }

  toggleHeader(): void {
    this.showHeader.update(v => !v);
    if (this.showHeader()) {
      this.startHeaderTimer();
    }
  }

  toggleSettings(): void {
    this.showSettings.update(v => !v);
  }

  goBack(): void {
    const slug = this.mangaSlug();
    if (slug) {
      this.router.navigate(['/source', this.sourceId, 'manga', slug]);
    } else {
      this.router.navigate(['/source', this.sourceId]);
    }
  }

  onPageLoad(index: number): void {
    if (!this.isOffline()) {
      this.preloadAhead(index);
    }
  }

  onPageError(event: Event, page: SourcePage): void {
    this.failedPages.add(page.index);
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  isPageFailed(index: number): boolean {
    return this.failedPages.has(index);
  }

  retryPage(page: SourcePage): void {
    this.failedPages.delete(page.index);
    this.pages.update(current => [...current]);
  }

  getPageUrl(pageIndex: number): string {
    const allPages = this.pages();
    if (pageIndex < 0 || pageIndex >= allPages.length) return '';
    return allPages[pageIndex].url;
  }

  onScroll(event: Event): void {
    const container = event.target as HTMLElement;
    const images = container.querySelectorAll('.reader__page');
    const scrollTop = container.scrollTop;
    const containerHeight = container.clientHeight;

    let currentIdx = 0;
    for (let i = 0; i < images.length; i++) {
      const el = images[i] as HTMLElement;
      const elTop = el.offsetTop - container.offsetTop;
      if (elTop <= scrollTop + containerHeight / 3) {
        currentIdx = i;
      }
    }

    if (currentIdx !== this.currentPage()) {
      this.currentPage.set(currentIdx);
    }
  }

  goToPage(page: number): void {
    if (page >= 0 && page < this.pages().length) {
      this.currentPage.set(page);

      if (this.settings().mode === 'longstrip' && this.longstripContainer) {
        const images = this.longstripContainer.nativeElement.querySelectorAll('.reader__page');
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

  nextPage(): void {
    if (this.currentPage() < this.pages().length - 1) {
      this.currentPage.update(p => p + 1);
    }
  }

  prevPage(): void {
    if (this.currentPage() > 0) {
      this.currentPage.update(p => p - 1);
    }
  }

  setMode(mode: 'page' | 'longstrip'): void {
    this.readerSettings.setMode(mode);
    this.currentPage.set(0);
  }

  onPageClick(event: MouseEvent): void {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const width = rect.width;

    if (x < width * 0.35) {
      this.prevPage();
    } else if (x > width * 0.65) {
      this.nextPage();
    } else {
      this.toggleHeader();
    }
  }

  onViewportTouchStart(event: TouchEvent): void {
    if (event.touches.length > 1) return;
    const touch = event.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.touchStartTime = Date.now();
  }

  onViewportTouchEnd(event: TouchEvent): void {
    if (event.changedTouches.length > 1) return;
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - this.touchStartX;
    const deltaY = touch.clientY - this.touchStartY;
    const elapsed = Date.now() - this.touchStartTime;
    const absDx = Math.abs(deltaX);
    const absDy = Math.abs(deltaY);

    if (elapsed < 400 && absDx > 40 && absDx > absDy * 1.5) {
      if (deltaX < 0) {
        this.nextPage();
      } else {
        this.prevPage();
      }
      return;
    }

    if (elapsed < 300 && absDx < 15 && absDy < 15) {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const width = rect.width;

      if (x < width * 0.35) {
        this.prevPage();
      } else if (x > width * 0.65) {
        this.nextPage();
      } else {
        this.toggleHeader();
      }
    }
  }

  onLongstripTouchStart(event: TouchEvent): void {
    const touch = event.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.touchStartTime = Date.now();
    this.isTouchScrolling = false;
  }

  onLongstripTouchMove(): void {
    this.isTouchScrolling = true;
  }

  onLongstripTouchEnd(): void {
    if (this.isTouchScrolling) return;
    const elapsed = Date.now() - this.touchStartTime;
    if (elapsed < 300) {
      this.toggleHeader();
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

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        this.prevPage();
        break;
      case 'ArrowRight':
        event.preventDefault();
        this.nextPage();
        break;
      case ' ':
        event.preventDefault();
        this.nextPage();
        break;
      case 'Escape':
        if (this.showSettings()) {
          this.showSettings.set(false);
        } else {
          this.goBack();
        }
        break;
    }
  }

  navigateToChapter(chapter: SourceChapter): void {
    this.router.navigate(
      ['/source', this.sourceId, 'reader', chapter.id],
      {
        queryParams: {
          manga: this.mangaSlug(),
          ch: chapter.chapterNumber,
        },
      }
    );
  }

  private loadChapterList(): void {
    const slug = this.mangaSlug();
    if (!slug || !this.sourceId) return;

    const adapter = this.adapterLoader.getAdapter(this.sourceId);
    if (!adapter) return;

    this.loadingChapters.set(true);
    from(adapter.getChapters(slug))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (chs) => {
          const sorted = [...chs].sort((a, b) => {
            const numA = parseFloat(a.chapterNumber) || 0;
            const numB = parseFloat(b.chapterNumber) || 0;
            return numA - numB;
          });
          this.chapters.set(sorted);
          this.loadingChapters.set(false);
        },
        error: () => {
          this.loadingChapters.set(false);
        },
      });
  }

  private async loadPages(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.failedPages.clear();
    this.preloadedPages.clear();

    // Check if chapter is downloaded first
    if (this.sourceDownload.isDownloaded(this.chapterId)) {
      try {
        const downloadedPages = await this.sourceDownload.getDownloadedPages(this.chapterId);
        if (downloadedPages.length > 0) {
          const pages: SourcePage[] = downloadedPages.map(p => {
            const blobUrl = URL.createObjectURL(p.blob);
            this.blobUrls.push(blobUrl);
            return { url: blobUrl, index: p.pageIndex };
          });
          this.pages.set(pages);
          this.isOffline.set(true);
          this.loading.set(false);
          return;
        }
      } catch (err) {
        console.error('Failed to load downloaded pages, falling back to online:', err);
      }
    }

    // Fall back to online loading
    const adapter = this.adapterLoader.getAdapter(this.sourceId);
    if (!adapter) {
      this.error.set('Source adapter not found or not installed.');
      this.loading.set(false);
      return;
    }

    from(adapter.getPages(this.chapterId))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.pages.set(data);
          this.loading.set(false);
          if (data.length > 0) {
            this.preloadAhead(0);
          }
        },
        error: (err) => {
          console.error('Failed to load chapter pages:', err);
          this.error.set('Failed to load chapter pages. Please try again.');
          this.loading.set(false);
        },
      });
  }

  private preloadAhead(fromIndex: number): void {
    const allPages = this.pages();
    for (let i = 1; i <= 2; i++) {
      const target = fromIndex + i;
      if (target >= allPages.length || this.preloadedPages.has(target)) continue;
      this.preloadedPages.add(target);
      const img = new Image();
      img.src = allPages[target].url;
    }
  }

  private startHeaderTimer(): void {
    if (this.headerTimeout) {
      clearTimeout(this.headerTimeout);
    }
    this.headerTimeout = setTimeout(() => this.showHeader.set(false), 3000);
  }
}
