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

  private touchStartX = 0;
  private touchStartY = 0;
  private touchStartTime = 0;
  private resumePage: number | null = null;

  // --- Zoom del modo pagina (estilo Mihon) ---
  // El zoom es un CSS transform sobre la capa .reader__zoom de la pagina
  // actual: pellizco escala (1x-4x), un dedo panea cuando hay zoom, doble tap
  // alterna 1x/2.5x. Mientras hay zoom el viewport queda congelado (clase
  // --zoomed: overflow hidden + snap off) y las paginas no cambian solas.
  private static readonly MAX_SCALE = 4;
  private static readonly DOUBLE_TAP_SCALE = 2.5;
  private static readonly DOUBLE_TAP_MS = 280;

  private zoomScale = 1;
  private zoomTx = 0;
  private zoomTy = 0;
  isZoomed = signal(false);
  zoomDisplay = signal(100);

  private pinchState: { d0: number; s0: number; midX0: number; midY0: number; tx0: number; ty0: number } | null = null;
  private panState: { x: number; y: number; tx0: number; ty0: number } | null = null;
  private lastZoomedTapTime = 0;
  private lastClickTime = 0;
  private lastClickX = 0;
  private lastClickY = 0;
  private pendingTapAction: ReturnType<typeof setTimeout> | null = null;

  // Pinch del longstrip: durante el gesto se escala el strip entero con un
  // transform (GPU, barato); al soltar se persiste como zoom de ancho y se
  // compensa el scroll para que el punto pellizcado no se mueva.
  private stripPinch: {
    d0: number; zoom0: number; fx: number; fy: number;
    sl0: number; st0: number; factor: number;
  } | null = null;

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
    this.resetZoom(false);
    this.readerSettings.setMode(mode);
    this.currentPage.set(0);
  }

  // En modo pagina los botones manejan el zoom por transform de la pagina
  // actual; en longstrip ajustan el ancho persistente de las imagenes.
  zoomIn(): void {
    if (this.isPagedMode()) {
      this.zoomToScale(Math.min(SourceReaderComponent.MAX_SCALE, this.zoomScale * 1.5));
      return;
    }
    this.readerSettings.zoomIn();
  }

  zoomOut(): void {
    if (this.isPagedMode()) {
      const s = this.zoomScale / 1.5;
      if (s <= 1.05) {
        this.resetZoom(true);
      } else {
        this.zoomToScale(s);
      }
      return;
    }
    this.readerSettings.zoomOut();
  }

  // --- Motor de zoom del modo pagina ---

  private currentZoomLayer(): HTMLElement | null {
    const vp = this.pageViewport?.nativeElement;
    if (!vp) return null;
    const layers = vp.querySelectorAll<HTMLElement>('.reader__zoom');
    return layers[this.toDomIndex(this.currentPage())] ?? null;
  }

  private applyZoomTransform(animate = false): void {
    this.zoomDisplay.set(Math.round(this.zoomScale * 100));
    const layer = this.currentZoomLayer();
    if (!layer) return;
    layer.style.transition = animate ? 'transform 0.2s ease' : '';
    layer.style.transform =
      this.zoomScale === 1 && this.zoomTx === 0 && this.zoomTy === 0
        ? ''
        : `translate(${this.zoomTx}px, ${this.zoomTy}px) scale(${this.zoomScale})`;
  }

  private clampPan(): void {
    const vp = this.pageViewport?.nativeElement;
    if (!vp) return;
    const maxTx = Math.max(0, (vp.clientWidth * (this.zoomScale - 1)) / 2);
    const maxTy = Math.max(0, (vp.clientHeight * (this.zoomScale - 1)) / 2);
    this.zoomTx = Math.min(maxTx, Math.max(-maxTx, this.zoomTx));
    this.zoomTy = Math.min(maxTy, Math.max(-maxTy, this.zoomTy));
  }

  private resetZoom(animate: boolean): void {
    this.zoomScale = 1;
    this.zoomTx = 0;
    this.zoomTy = 0;
    this.pinchState = null;
    this.panState = null;
    this.applyZoomTransform(animate);
    this.isZoomed.set(false);
  }

  private zoomToScale(scale: number, clientX?: number, clientY?: number): void {
    const vp = this.pageViewport?.nativeElement;
    if (!vp) return;
    const rect = vp.getBoundingClientRect();
    const s0 = this.zoomScale;
    const s1 = Math.min(SourceReaderComponent.MAX_SCALE, Math.max(1, scale));
    // coordenadas relativas al centro del viewport (transform-origin: center)
    const mx = clientX !== undefined ? clientX - rect.left - rect.width / 2 : 0;
    const my = clientY !== undefined ? clientY - rect.top - rect.height / 2 : 0;
    this.zoomTx = mx - (mx - this.zoomTx) * (s1 / s0);
    this.zoomTy = my - (my - this.zoomTy) * (s1 / s0);
    this.zoomScale = s1;
    this.clampPan();
    this.isZoomed.set(s1 > 1);
    this.applyZoomTransform(true);
  }

  // Si el gesto termino casi en 1x, vuelve a 1x exacto y descongela el viewport.
  private settleZoom(): void {
    if (this.zoomScale < 1.08) {
      this.resetZoom(true);
    }
  }

  private handleZoomedTap(): void {
    const now = Date.now();
    if (now - this.lastZoomedTapTime < SourceReaderComponent.DOUBLE_TAP_MS) {
      this.lastZoomedTapTime = 0;
      this.resetZoom(true);
      return;
    }
    this.lastZoomedTapTime = now;
    this.toggleHeader();
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
    if (this.zoomScale > 1) return;

    const now = Date.now();
    const dist = Math.hypot(event.clientX - this.lastClickX, event.clientY - this.lastClickY);
    if (now - this.lastClickTime < SourceReaderComponent.DOUBLE_TAP_MS && dist < 48) {
      // doble tap: zoom anclado en el punto tocado
      if (this.pendingTapAction) {
        clearTimeout(this.pendingTapAction);
        this.pendingTapAction = null;
      }
      this.lastClickTime = 0;
      this.zoomToScale(SourceReaderComponent.DOUBLE_TAP_SCALE, event.clientX, event.clientY);
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
    }, SourceReaderComponent.DOUBLE_TAP_MS);
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
    if (this.zoomScale > 1) this.resetZoom(false);
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
  // nativo + click); aca solo viven los gestos de zoom: pinch, paneo con un
  // dedo cuando hay zoom, y taps mientras esta zoomeado (los clicks no llegan
  // porque el touchstart hace preventDefault).
  onViewportTouchStart(event: TouchEvent): void {
    if (event.touches.length === 2) {
      // pinch: sin preventDefault el WebView arrancaria un scroll con estos dedos
      event.preventDefault();
      const a = event.touches[0];
      const b = event.touches[1];
      this.pinchState = {
        d0: Math.max(1, Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)),
        s0: this.zoomScale,
        midX0: (a.clientX + b.clientX) / 2,
        midY0: (a.clientY + b.clientY) / 2,
        tx0: this.zoomTx,
        ty0: this.zoomTy,
      };
      this.panState = null;
      this.isZoomed.set(true); // congela el viewport (clase --zoomed) ya mismo
      return;
    }
    const touch = event.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.touchStartTime = Date.now();
    if (this.zoomScale > 1) {
      event.preventDefault(); // zoomeado: un dedo panea, no scrollea
      this.panState = { x: touch.clientX, y: touch.clientY, tx0: this.zoomTx, ty0: this.zoomTy };
    }
  }

  onViewportTouchMove(event: TouchEvent): void {
    if (this.pinchState && event.touches.length >= 2) {
      event.preventDefault();
      const vp = this.pageViewport?.nativeElement;
      if (!vp) return;
      const a = event.touches[0];
      const b = event.touches[1];
      const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const p = this.pinchState;
      const s1 = Math.min(SourceReaderComponent.MAX_SCALE, Math.max(1, p.s0 * (d / p.d0)));
      const rect = vp.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const midX = (a.clientX + b.clientX) / 2;
      const midY = (a.clientY + b.clientY) / 2;
      // el punto de la imagen que estaba bajo el pellizco inicial sigue al
      // punto medio actual: escala + paneo en un solo gesto
      const ratio = s1 / p.s0;
      this.zoomTx = (midX - cx) - ((p.midX0 - cx) - p.tx0) * ratio;
      this.zoomTy = (midY - cy) - ((p.midY0 - cy) - p.ty0) * ratio;
      this.zoomScale = s1;
      this.clampPan();
      this.applyZoomTransform();
      return;
    }
    if (this.panState && event.touches.length === 1) {
      event.preventDefault();
      const touch = event.touches[0];
      this.zoomTx = this.panState.tx0 + (touch.clientX - this.panState.x);
      this.zoomTy = this.panState.ty0 + (touch.clientY - this.panState.y);
      this.clampPan();
      this.applyZoomTransform();
    }
  }

  onViewportTouchEnd(event: TouchEvent): void {
    if (this.pinchState) {
      if (event.touches.length >= 2) return;
      this.pinchState = null;
      if (event.touches.length === 1) {
        // quedo un dedo apoyado: sigue como paneo
        const touch = event.touches[0];
        this.panState = { x: touch.clientX, y: touch.clientY, tx0: this.zoomTx, ty0: this.zoomTy };
        return;
      }
      this.settleZoom();
      return;
    }
    if (this.panState) {
      if (event.touches.length > 0) {
        const touch = event.touches[0];
        this.panState = { x: touch.clientX, y: touch.clientY, tx0: this.zoomTx, ty0: this.zoomTy };
        return;
      }
      this.panState = null;
      const touch = event.changedTouches[0];
      const dx = Math.abs(touch.clientX - this.touchStartX);
      const dy = Math.abs(touch.clientY - this.touchStartY);
      const elapsed = Date.now() - this.touchStartTime;
      if (elapsed < 300 && dx < 12 && dy < 12) {
        this.handleZoomedTap();
      }
      this.settleZoom();
    }
  }

  onViewportTouchCancel(): void {
    this.pinchState = null;
    this.panState = null;
    this.settleZoom();
  }

  onLongstripTouchStart(event: TouchEvent): void {
    if (event.touches.length !== 2) return;
    event.preventDefault();
    const container = this.longstripContainer?.nativeElement;
    const strip = this.stripContent?.nativeElement;
    if (!container || !strip) return;
    const rect = container.getBoundingClientRect();
    const a = event.touches[0];
    const b = event.touches[1];
    const fx = (a.clientX + b.clientX) / 2 - rect.left;
    const fy = (a.clientY + b.clientY) / 2 - rect.top;
    this.stripPinch = {
      d0: Math.max(1, Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)),
      zoom0: this.settings().zoom,
      fx,
      fy,
      sl0: container.scrollLeft,
      st0: container.scrollTop,
      factor: 1,
    };
    // el origen del transform es el punto pellizcado, en coordenadas del contenido
    strip.style.transformOrigin = `${this.stripPinch.sl0 + fx}px ${this.stripPinch.st0 + fy}px`;
    strip.style.willChange = 'transform';
  }

  onLongstripTouchMove(event: TouchEvent): void {
    if (!this.stripPinch || event.touches.length < 2) return;
    event.preventDefault();
    const strip = this.stripContent?.nativeElement;
    if (!strip) return;
    const a = event.touches[0];
    const b = event.touches[1];
    const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const p = this.stripPinch;
    // limita el factor para que el zoom final quede dentro de [50, 300]
    const factor = Math.min(300 / p.zoom0, Math.max(50 / p.zoom0, d / p.d0));
    p.factor = factor;
    strip.style.transform = `scale(${factor})`;
  }

  onLongstripTouchEnd(event: TouchEvent): void {
    if (!this.stripPinch) return;
    if (event.touches.length > 0) return; // esperar a que suelte todos los dedos
    const p = this.stripPinch;
    this.stripPinch = null;
    const strip = this.stripContent?.nativeElement;
    if (strip) {
      strip.style.transform = '';
      strip.style.transformOrigin = '';
      strip.style.willChange = '';
    }
    const newZoom = Math.round(p.zoom0 * p.factor);
    if (newZoom === p.zoom0) return;
    this.readerSettings.setZoom(newZoom);
    // tras el re-layout con el ancho nuevo, recolocar el scroll para que el
    // punto pellizcado quede en el mismo lugar de la pantalla
    const ratio = newZoom / p.zoom0;
    requestAnimationFrame(() => {
      const container = this.longstripContainer?.nativeElement;
      if (!container) return;
      container.scrollTop = (p.st0 + p.fy) * ratio - p.fy;
      container.scrollLeft = (p.sl0 + p.fx) * ratio - p.fx;
    });
  }

  onLongstripTouchCancel(): void {
    if (!this.stripPinch) return;
    this.stripPinch = null;
    const strip = this.stripContent?.nativeElement;
    if (strip) {
      strip.style.transform = '';
      strip.style.transformOrigin = '';
      strip.style.willChange = '';
    }
  }

  onPageWheel(event: WheelEvent): void {
    if (!this.isPagedMode()) return;
    if (event.ctrlKey) {
      // ctrl+rueda: zoom de escritorio anclado al cursor
      event.preventDefault();
      const factor = event.deltaY < 0 ? 1.2 : 1 / 1.2;
      const s = this.zoomScale * factor;
      if (s <= 1.02) {
        this.resetZoom(true);
      } else {
        this.zoomToScale(s, event.clientX, event.clientY);
      }
      return;
    }
    if (this.zoomScale > 1) {
      // zoomeado: la rueda panea la pagina
      event.preventDefault();
      this.zoomTx -= event.deltaX;
      this.zoomTy -= event.deltaY;
      this.clampPan();
      this.applyZoomTransform();
      return;
    }
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
    this.resetZoom(false);
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
