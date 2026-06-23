import { ChangeDetectionStrategy, Component, inject, signal, OnInit, OnDestroy, DestroyRef, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { from } from 'rxjs';
import { AdapterLoaderService } from '../../../core/services/adapter-loader.service';
import { SourcePage } from '../../../core/models/source.model';
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
  private readonly destroyRef = inject(DestroyRef);

  pages = signal<SourcePage[]>([]);
  loading = signal(true);
  showHeader = signal(true);
  currentPage = signal(0);
  error = signal<string | null>(null);
  chapterNumber = signal('');
  mangaSlug = signal('');

  private sourceId = '';
  private chapterId = '';
  private failedPages = new Set<number>();
  private preloadedPages = new Set<number>();
  private headerTimeout: ReturnType<typeof setTimeout> | null = null;

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

    this.loadPages();
    this.startHeaderTimer();
  }

  ngOnDestroy(): void {
    document.body.classList.remove(READER_BODY_CLASS);
    if (this.headerTimeout) {
      clearTimeout(this.headerTimeout);
    }
  }

  toggleHeader(): void {
    this.showHeader.update(v => !v);
    if (this.showHeader()) {
      this.startHeaderTimer();
    }
  }

  goBack(): void {
    if (this.mangaSlug()) {
      this.router.navigate(['/source', this.sourceId, 'manga', this.mangaSlug()]);
    } else {
      this.router.navigate(['/source', this.sourceId]);
    }
  }

  onPageLoad(index: number): void {
    this.preloadAhead(index);
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
    // Force re-render by updating pages signal with same data
    this.pages.update(current => [...current]);
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

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.goBack();
    }
  }

  private loadPages(): void {
    const adapter = this.adapterLoader.getAdapter(this.sourceId);
    if (!adapter) {
      this.error.set('Source adapter not found or not installed.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.failedPages.clear();
    this.preloadedPages.clear();

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
