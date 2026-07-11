import { ChangeDetectionStrategy, Component, inject, signal, computed, effect, OnInit, OnDestroy, DestroyRef, HostListener, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { from } from 'rxjs';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { AdapterLoaderService } from '../../../core/services/adapter-loader.service';
import { ImageFetchService } from '../../../core/services/image-fetch.service';
import { ReaderSettingsService } from '../../../core/services/reader-settings.service';
import { SourceDownloadService } from '../../../core/services/source-download.service';
import { ReadingHistoryService } from '../../../core/services/reading-history.service';
import { ToastService } from '../../../core/services/toast.service';
import { SourcePage, SourceChapter } from '../../../core/models/source.model';
import { ReaderMode } from '../../../core/models/reader.model';
import { ReadingHistory } from '../../../core/models/tracking.model';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner';
import { PagedZoomEngine, DOUBLE_TAP_MS, DOUBLE_TAP_SCALE } from './paged-zoom';
import { LongstripPinchZoom } from './longstrip-zoom';

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
  private readonly imageFetch = inject(ImageFetchService);
  private readonly sourceDownload = inject(SourceDownloadService);
  private readonly readingHistory = inject(ReadingHistoryService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  readonly readerSettings = inject(ReaderSettingsService);

  @ViewChild('longstripContainer') longstripContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('stripContent') stripContent?: ElementRef<HTMLDivElement>;
  @ViewChild('pageViewport') pageViewport?: ElementRef<HTMLDivElement>;

  settings = this.readerSettings.settings;

  pages = signal<SourcePage[]>([]);
  loading = signal(true);
  showHeader = signal(true);
  showSettings = signal(false);
  currentPage = signal(0);
  error = signal<string | null>(null);
  chapterNumber = signal('');
  mangaSlug = signal('');
  mangaTitle = signal('');
  coverUrl = signal('');
  isOffline = signal(false);
  chapters = signal<SourceChapter[]>([]);
  loadingChapters = signal(false);

  private readonly chapterIdSignal = signal('');

  prevChapter = computed(() => {
    const chs = this.chapters();
    const id = this.chapterIdSignal();
    const currentIdx = chs.findIndex(c => c.id === id);
    if (currentIdx > 0) return chs[currentIdx - 1];
    return null;
  });

  nextChapter = computed(() => {
    const chs = this.chapters();
    const id = this.chapterIdSignal();
    const currentIdx = chs.findIndex(c => c.id === id);
    if (currentIdx >= 0 && currentIdx < chs.length - 1) return chs[currentIdx + 1];
    return null;
  });

  private sourceId = '';
  private failedPages = new Set<number>();
  private preloadedPages = new Set<number>();
  private pageRetries = new Map<number, number>();
  private originalPageUrls = new Map<number, string>();
  private prefetchGeneration = 0;
  private headerTimeout: ReturnType<typeof setTimeout> | null = null;
  private blobUrls: string[] = [];

  private resumePage: number | null = null;

  private lastClickTime = 0;
  private lastClickX = 0;
  private lastClickY = 0;
  private pendingTapAction: ReturnType<typeof setTimeout> | null = null;

  // Motores de zoom (ver paged-zoom.ts y longstrip-zoom.ts): el modo pagina
  // usa un transform sobre la pagina actual; el longstrip persiste el ancho.
  private readonly pagedZoom = new PagedZoomEngine({
    viewport: () => this.pageViewport?.nativeElement ?? null,
    currentLayer: () => {
      const vp = this.pageViewport?.nativeElement;
      if (!vp) return null;
      const layers = vp.querySelectorAll<HTMLElement>('.reader__zoom');
      return layers[this.toDomIndex(this.currentPage())] ?? null;
    },
    onTapWhileZoomed: () => this.toggleHeader(),
  });
  readonly isZoomed = this.pagedZoom.isZoomed;
  readonly zoomDisplay = this.pagedZoom.zoomDisplay;

  private readonly stripZoom = new LongstripPinchZoom({
    container: () => this.longstripContainer?.nativeElement ?? null,
    strip: () => this.stripContent?.nativeElement ?? null,
    zoom: () => this.settings().zoom,
    setZoom: zoom => this.readerSettings.setZoom(zoom),
  });

  constructor() {
    // Centraliza el registro de progreso: cualquier cambio real de pagina
    // (scroll, tap, teclado, slider) termina actualizando currentPage, asi
    // que reaccionar a la signal evita repetir la llamada en cada handler.
    effect(() => {
      const idx = this.currentPage();
      const total = this.pages().length;
      if (total === 0 || this.isOffline()) return;
      this.recordProgress(idx, total);
    });
  }

  ngOnInit(): void {
    document.body.classList.add(READER_BODY_CLASS);

    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(qp => {
        this.mangaSlug.set(qp['manga'] || qp['mangaSlug'] || '');
        this.chapterNumber.set(qp['ch'] || qp['chapterNumber'] || '');
        this.mangaTitle.set(qp['title'] || '');
        this.coverUrl.set(qp['cover'] || '');
        const resume = qp['resume'];
        this.resumePage = resume !== undefined ? parseInt(resume, 10) : null;
      });

    this.readingHistory.loadHistory().subscribe();

    this.sourceDownload.init().then(() => {
      this.route.params
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(params => {
          const newChapterId = params['chapterId'];
          const changed = this.chapterIdSignal() !== '' && this.chapterIdSignal() !== newChapterId;
          this.sourceId = params['sourceId'];
          this.chapterIdSignal.set(newChapterId);
          this.loadPages();
          if (!changed) {
            this.loadChapterList();
          }
        });
    });

    this.startHeaderTimer();
  }

  ngOnDestroy(): void {
    document.body.classList.remove(READER_BODY_CLASS);
    this.prefetchGeneration++; // corta los workers de prefetch en curso
    if (this.headerTimeout) {
      clearTimeout(this.headerTimeout);
    }
    if (this.pendingTapAction) {
      clearTimeout(this.pendingTapAction);
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
    const img = event.target as HTMLImageElement;
    // blob: es una descarga offline o un fallback que ya fallo — no hay red
    // que reintentar sobre esa URL.
    if (this.isOffline() || page.url.startsWith('blob:')) {
      this.failedPages.add(page.index);
      img.style.display = 'none';
      return;
    }
    const attempts = this.pageRetries.get(page.index) ?? 0;
    this.pageRetries.set(page.index, attempts + 1);
    if (attempts === 0) {
      // 1er fallo: casi siempre es hotlink 403 (el sitio exige un Referer que
      // el <img> no puede mandar). Se baja por HTTP nativo/proxy con Referer
      // y se reemplaza la URL por un blob local. De paso cubre hiccups de CDN.
      const referer = this.adapterLoader.getAdapter(this.sourceId)?.baseUrl;
      this.imageFetch
        .fetchBlobUrl(page.url, referer)
        .then(blobUrl => {
          if (!this.originalPageUrls.has(page.index)) {
            this.originalPageUrls.set(page.index, page.url);
          }
          this.blobUrls.push(blobUrl);
          this.pages.update(all => all.map(p => (p.index === page.index ? { ...p, url: blobUrl } : p)));
        })
        .catch(() => {
          // 2do intento: recarga directa despues de una pausa
          setTimeout(() => {
            if (!img.isConnected) return;
            const url = page.url;
            img.src = '';
            img.src = url;
          }, 1000);
        });
      return;
    }
    this.failedPages.add(page.index);
    img.style.display = 'none';
  }

  isPageFailed(index: number): boolean {
    return this.failedPages.has(index);
  }

  retryPage(page: SourcePage): void {
    this.pageRetries.delete(page.index);
    this.failedPages.delete(page.index);
    // Si la URL habia sido reemplazada por un blob que fallo, se vuelve a la
    // URL original de la fuente para rearrancar la escalera de reintentos.
    const original = this.originalPageUrls.get(page.index);
    if (original && !this.isOffline()) {
      this.pages.update(all => all.map(p => (p.index === page.index ? { ...p, url: original } : p)));
    } else {
      this.pages.update(current => [...current]);
    }
  }

  getPageUrl(pageIndex: number): string {
    const allPages = this.pages();
    if (pageIndex < 0 || pageIndex >= allPages.length) return '';
    return allPages[pageIndex].url;
  }

  // Paginas en el orden en que deben quedar en el DOM/scroll. El manga RTL se
  // lee de derecha a izquierda: la pagina 0 (primera a leer) tiene que ser el
  // ultimo elemento del DOM (el mas a la derecha en un flex row normal). Se
  // invierte el array en vez de usar CSS flex-direction:row-reverse, que
  // tiene su propia semantica de scrollLeft/scroll-snap facil de arruinar.
  displayPages = computed(() => {
    const all = this.pages();
    return this.isRtl() ? [...all].reverse() : all;
  });

  isRtl(): boolean {
    return this.settings().mode === 'page-rtl';
  }

  isVerticalPaged(): boolean {
    return this.settings().mode === 'page-vertical';
  }

  isPagedMode(): boolean {
    const m = this.settings().mode;
    return m === 'page' || m === 'page-rtl' || m === 'page-vertical';
  }

  private toDomIndex(readingIndex: number): number {
    const total = this.pages().length;
    return this.isRtl() ? total - 1 - readingIndex : readingIndex;
  }

  private toReadingIndex(domIndex: number): number {
    const total = this.pages().length;
    return this.isRtl() ? total - 1 - domIndex : domIndex;
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
      if (this.isPagedMode()) {
        this.scrollToPage(page);
      } else {
        this.currentPage.set(page);
        if (this.longstripContainer) {
          const images = this.longstripContainer.nativeElement.querySelectorAll('.reader__page');
          if (images[page]) {
            images[page].scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }
    }
  }

  onSliderChange(event: Event): void {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    this.goToPage(value);
  }

  nextPage(): void {
    if (this.isPagedMode()) {
      this.scrollToPage(this.currentPage() + 1);
    } else if (this.currentPage() < this.pages().length - 1) {
      this.currentPage.update(p => p + 1);
    }
  }

  prevPage(): void {
    if (this.isPagedMode()) {
      this.scrollToPage(this.currentPage() - 1);
    } else if (this.currentPage() > 0) {
      this.currentPage.update(p => p - 1);
    }
  }

  setMode(mode: ReaderMode): void {
    this.pagedZoom.reset(false);
    this.readerSettings.setMode(mode);
    this.currentPage.set(0);
  }

  // En modo pagina los botones manejan el zoom por transform de la pagina
  // actual; en longstrip ajustan el ancho persistente de las imagenes.
  zoomIn(): void {
    if (this.isPagedMode()) {
      this.pagedZoom.stepIn();
      return;
    }
    this.readerSettings.zoomIn();
  }

  zoomOut(): void {
    if (this.isPagedMode()) {
      this.pagedZoom.stepOut();
      return;
    }
    this.readerSettings.zoomOut();
  }

  async saveCurrentImage(): Promise<void> {
    const pageIndex = this.currentPage();
    const allPages = this.pages();
    if (pageIndex < 0 || pageIndex >= allPages.length) return;

    const pageUrl = allPages[pageIndex].url;
    const fileName = `manga_ch${this.chapterNumber()}_p${pageIndex + 1}.jpg`;

    try {
      let blob: Blob;
      if (pageUrl.startsWith('blob:')) {
        const resp = await fetch(pageUrl);
        blob = await resp.blob();
      } else {
        const resp = await fetch(pageUrl, { mode: 'cors', referrerPolicy: 'no-referrer' });
        blob = await resp.blob();
      }

      if (Capacitor.isNativePlatform()) {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        await Filesystem.writeFile({
          path: `Download/${fileName}`,
          data: base64,
          directory: Directory.ExternalStorage,
          recursive: true,
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      this.toast.success('✓ Imagen guardada');
    } catch (err) {
      console.error('Error saving image:', err);
      this.toast.error('✕ Error al guardar imagen');
    }

    this.showSettings.set(false);
  }

  onPageClick(event: MouseEvent): void {
    // Zoomeado no llegan clicks (el touchstart hace preventDefault); esto
    // cubre el caso mouse en desktop.
    if (this.pagedZoom.currentScale > 1) return;

    const now = Date.now();
    const dist = Math.hypot(event.clientX - this.lastClickX, event.clientY - this.lastClickY);
    if (now - this.lastClickTime < DOUBLE_TAP_MS && dist < 48) {
      // doble tap: zoom anclado en el punto tocado
      if (this.pendingTapAction) {
        clearTimeout(this.pendingTapAction);
        this.pendingTapAction = null;
      }
      this.lastClickTime = 0;
      this.pagedZoom.zoomTo(DOUBLE_TAP_SCALE, event.clientX, event.clientY);
      return;
    }
    this.lastClickTime = now;
    this.lastClickX = event.clientX;
    this.lastClickY = event.clientY;

    // El tap simple se difiere un instante para poder distinguirlo del doble
    // tap (si no, el primer tap del doble pasaria de pagina).
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const clientX = event.clientX;
    const clientY = event.clientY;
    if (this.pendingTapAction) clearTimeout(this.pendingTapAction);
    this.pendingTapAction = setTimeout(() => {
      this.pendingTapAction = null;
      this.handleSingleTap(clientX, clientY, rect);
    }, DOUBLE_TAP_MS);
  }

  private handleSingleTap(clientX: number, clientY: number, rect: DOMRect): void {
    if (this.isVerticalPaged()) {
      const y = clientY - rect.top;
      const height = rect.height;
      if (y < height * 0.3) {
        this.prevPage();
      } else if (y > height * 0.7) {
        this.nextPage();
      } else {
        this.toggleHeader();
      }
      return;
    }

    const x = clientX - rect.left;
    const width = rect.width;
    // En RTL "adelante" queda del lado izquierdo de la pantalla, asi que las
    // zonas de tap se invierten respecto de LTR.
    const backwardZone = this.isRtl() ? x > width * 0.7 : x < width * 0.3;
    const forwardZone = this.isRtl() ? x < width * 0.3 : x > width * 0.7;

    if (backwardZone) {
      this.prevPage();
    } else if (forwardZone) {
      this.nextPage();
    } else {
      this.toggleHeader();
    }
  }

  onPageScroll(event: Event): void {
    if (this.isZoomed()) return; // congelado: no hay cambio de pagina con zoom
    const container = event.target as HTMLElement;

    if (this.isVerticalPaged()) {
      const pageHeight = container.clientHeight;
      if (pageHeight === 0) return;
      const domIdx = Math.round(container.scrollTop / pageHeight);
      const readingIdx = this.toReadingIndex(domIdx);
      if (readingIdx !== this.currentPage()) this.currentPage.set(readingIdx);
      return;
    }

    const pageWidth = container.clientWidth;
    if (pageWidth === 0) return;
    const domIdx = Math.round(container.scrollLeft / pageWidth);
    const readingIdx = this.toReadingIndex(domIdx);
    if (readingIdx !== this.currentPage()) {
      this.currentPage.set(readingIdx);
    }
  }

  private scrollToPage(index: number): void {
    if (index < 0 || index >= this.pages().length) return;
    // antes de cambiar currentPage: limpia el transform de la pagina actual
    if (this.pagedZoom.currentScale > 1) this.pagedZoom.reset(false);
    this.currentPage.set(index);
    if (!this.pageViewport) return;

    const el = this.pageViewport.nativeElement;
    const domIndex = this.toDomIndex(index);

    if (this.isVerticalPaged()) {
      const pageHeight = el.clientHeight;
      el.scrollTo({ top: domIndex * pageHeight, behavior: 'smooth' });
    } else {
      const pageWidth = el.clientWidth;
      el.scrollTo({ left: domIndex * pageWidth, behavior: 'smooth' });
    }
  }

  // Los swipes de pagina y los taps normales los maneja el browser (snap
  // nativo + click); los gestos de zoom viven en los motores de zoom.
  onViewportTouchStart(event: TouchEvent): void {
    this.pagedZoom.onTouchStart(event);
  }

  onViewportTouchMove(event: TouchEvent): void {
    this.pagedZoom.onTouchMove(event);
  }

  onViewportTouchEnd(event: TouchEvent): void {
    this.pagedZoom.onTouchEnd(event);
  }

  onViewportTouchCancel(): void {
    this.pagedZoom.onTouchCancel();
  }

  onLongstripTouchStart(event: TouchEvent): void {
    this.stripZoom.onTouchStart(event);
  }

  onLongstripTouchMove(event: TouchEvent): void {
    this.stripZoom.onTouchMove(event);
  }

  onLongstripTouchEnd(event: TouchEvent): void {
    this.stripZoom.onTouchEnd(event);
  }

  onLongstripTouchCancel(): void {
    this.stripZoom.onTouchCancel();
  }

  onPageWheel(event: WheelEvent): void {
    if (!this.isPagedMode()) return;
    if (this.pagedZoom.onWheel(event)) return;
    // El scroll-snap vertical nativo ya maneja la rueda en modo vertical;
    // aca solo traducimos rueda (vertical por naturaleza) a paginas
    // horizontales, que si necesitan ayuda manual.
    if (this.isVerticalPaged()) return;
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
        if (this.isRtl()) this.nextPage(); else this.prevPage();
        break;
      case 'ArrowRight':
        event.preventDefault();
        if (this.isRtl()) this.prevPage(); else this.nextPage();
        break;
      case 'ArrowUp':
        if (this.isVerticalPaged()) {
          event.preventDefault();
          this.prevPage();
        }
        break;
      case 'ArrowDown':
        if (this.isVerticalPaged()) {
          event.preventDefault();
          this.nextPage();
        }
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
          title: this.mangaTitle() || undefined,
          cover: this.coverUrl() || undefined,
        },
      }
    );
  }

  private recordProgress(pageIndex: number, totalPages: number): void {
    const chapterId = this.chapterIdSignal();
    if (!chapterId || !this.sourceId) return;

    const entry: ReadingHistory = {
      chapterId,
      sourceId: this.sourceId,
      mangaSlug: this.mangaSlug(),
      mangaTitle: this.mangaTitle(),
      coverUrl: this.coverUrl() || undefined,
      chapterNumber: this.chapterNumber() || null,
      chapterTitle: null,
      lastPage: pageIndex,
      totalPages,
      readAt: new Date().toISOString(),
      completed: pageIndex >= totalPages - 1,
    };
    this.readingHistory.markPageRead(entry);
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
    this.pagedZoom.reset(false);
    this.currentPage.set(0);
    this.failedPages.clear();
    this.preloadedPages.clear();
    this.pageRetries.clear();
    this.originalPageUrls.clear();
    this.prefetchGeneration++; // cancela los workers de prefetch del capitulo anterior
    for (const url of this.blobUrls) {
      URL.revokeObjectURL(url);
    }
    this.blobUrls = [];

    // Check if chapter is downloaded first
    if (this.sourceDownload.isDownloaded(this.chapterIdSignal())) {
      try {
        const downloadedPages = await this.sourceDownload.getDownloadedPages(this.chapterIdSignal());
        if (downloadedPages.length > 0) {
          const pages: SourcePage[] = downloadedPages.map(p => {
            const blobUrl = URL.createObjectURL(p.blob);
            this.blobUrls.push(blobUrl);
            return { url: blobUrl, index: p.pageIndex };
          });
          this.pages.set(pages);
          this.isOffline.set(true);
          this.loading.set(false);

          const resumeTo = this.resumePage;
          this.resumePage = null;
          if (resumeTo !== null && resumeTo > 0 && resumeTo < pages.length) {
            setTimeout(() => this.goToPage(resumeTo));
          }
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

    from(adapter.getPages(this.chapterIdSignal()))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.pages.set(data);
          this.loading.set(false);
          if (data.length === 0) return;

          const resumeTo = this.resumePage;
          this.resumePage = null;
          if (resumeTo !== null && resumeTo > 0 && resumeTo < data.length) {
            this.preloadAhead(resumeTo);
            this.startChapterPrefetch(resumeTo);
            // El viewport recien existe en el DOM despues de este render;
            // esperamos al siguiente tick para poder medir/scrollear.
            setTimeout(() => this.goToPage(resumeTo));
          } else {
            this.preloadAhead(0);
            this.startChapterPrefetch(0);
          }
        },
        error: (err) => {
          console.error('Failed to load chapter pages:', err);
          this.error.set('Failed to load chapter pages. Please try again.');
          this.loading.set(false);
        },
      });
  }

  // Cuantas paginas se precargan hacia adelante. Buffer rodante: al cargarse
  // una pagina se precargan las siguientes, asi el scroll nunca espera.
  // Mihon/Tachiyomi usan ~4-6; 5 da un buen margen sin saturar memoria.
  private static readonly PRELOAD_AHEAD = 5;

  private preloadAhead(fromIndex: number): void {
    const allPages = this.pages();
    for (let i = 1; i <= SourceReaderComponent.PRELOAD_AHEAD; i++) {
      const target = fromIndex + i;
      if (target >= allPages.length || this.preloadedPages.has(target)) continue;
      this.preloadedPages.add(target);
      const img = new Image();
      // Sin esto, una precarga que falla (red, hotlink bloqueado, etc.) deja
      // el indice marcado como "ya intentado" para siempre y nunca se
      // reintenta, aunque el usuario todavia no haya llegado a esa pagina.
      img.onerror = () => {
        this.preloadedPages.delete(target);
      };
      img.src = allPages[target].url;
    }
  }

  // --- Prefetch progresivo del capitulo completo ---
  // El buffer rodante (preloadAhead) cubre lo inmediato; esta cola baja el
  // RESTO del capitulo en segundo plano con concurrencia limitada, arrancando
  // desde la pagina actual hacia adelante (y al final, lo anterior, por si se
  // retomo a mitad). En una conexion rapida el capitulo entero queda en cache
  // HTTP en segundos y el lector nunca vuelve a esperar una imagen.
  private static readonly PREFETCH_CONCURRENCY = 3;

  private startChapterPrefetch(fromIndex: number): void {
    if (this.isOffline()) return;
    const generation = this.prefetchGeneration;
    const all = this.pages();
    const order: number[] = [];
    for (let i = fromIndex + 1; i < all.length; i++) order.push(i);
    for (let i = 0; i < fromIndex; i++) order.push(i);

    let cursor = 0;
    const next = () => {
      // Si cambio el capitulo (o se destruyo el componente), la generacion
      // avanza y este worker muere solo.
      if (generation !== this.prefetchGeneration) return;
      while (cursor < order.length && this.preloadedPages.has(order[cursor])) cursor++;
      if (cursor >= order.length) return;
      const target = order[cursor++];
      this.preloadedPages.add(target);
      const img = new Image();
      img.onload = () => next();
      img.onerror = () => {
        this.preloadedPages.delete(target);
        next();
      };
      img.src = all[target].url;
    };

    for (let w = 0; w < SourceReaderComponent.PREFETCH_CONCURRENCY; w++) next();
  }

  private startHeaderTimer(): void {
    if (this.headerTimeout) {
      clearTimeout(this.headerTimeout);
    }
    this.headerTimeout = setTimeout(() => this.showHeader.set(false), 3000);
  }
}
