import { ChangeDetectionStrategy, Component, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { from } from 'rxjs';
import { AdapterLoaderService } from '../../../core/services/adapter-loader.service';
import { TranslateService } from '../../../core/i18n/translate.service';
import { MangaAdapterInstance } from '../../../core/models/adapter.model';
import { SourceManga } from '../../../core/models/source.model';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner';

type BrowseTab = 'popular' | 'latest' | 'search';

@Component({
  selector: 'mt-source-browse',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LoadingSpinnerComponent],
  templateUrl: './source-browse.html',
  styleUrl: './source-browse.scss',
})
export class SourceBrowseComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly appLocation = inject(Location);
  private readonly adapterLoader = inject(AdapterLoaderService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly i18n = inject(TranslateService);

  t = this.i18n.t;
  lang = this.i18n.lang;

  adapter = signal<MangaAdapterInstance | null>(null);
  results = signal<SourceManga[]>([]);
  loading = signal(false);
  loadingMore = signal(false);
  searchQuery = signal('');
  activeTab = signal<BrowseTab>('popular');
  error = signal<string | null>(null);
  hasMore = signal(true);

  private sourceId = '';
  private currentPage = 1;
  private searchPage = 1;

  ngOnInit(): void {
    this.route.params
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        this.sourceId = params['sourceId'];
        const instance = this.adapterLoader.getAdapter(this.sourceId);
        this.adapter.set(instance);

        if (instance) {
          this.loadPopular();
        } else {
          this.error.set(
            this.lang() === 'es'
              ? 'Extensión no encontrada o no instalada'
              : 'Extension not found or not installed'
          );
        }
      });
  }

  setTab(tab: BrowseTab): void {
    this.activeTab.set(tab);
    this.error.set(null);
    this.currentPage = 1;
    this.searchPage = 1;
    this.hasMore.set(true);

    if (tab === 'popular') {
      this.results.set([]);
      this.loadPopular();
    } else if (tab === 'latest') {
      this.results.set([]);
      this.loadLatest();
    } else {
      this.results.set([]);
    }
  }

  loadPopular(): void {
    const instance = this.adapter();
    if (!instance) return;

    this.loading.set(true);
    this.error.set(null);
    this.currentPage = 1;
    this.results.set([]);

    from(instance.getPopular(1))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.results.set(data);
          this.loading.set(false);
          this.hasMore.set(data.length >= 5);
        },
        error: (err) => {
          console.error('Failed to load popular manga:', err);
          this.error.set(
            this.lang() === 'es'
              ? 'Error al cargar manga popular'
              : 'Failed to load popular manga'
          );
          this.loading.set(false);
        },
      });
  }

  loadLatest(): void {
    const instance = this.adapter();
    if (!instance || !instance.getLatest) {
      this.error.set(
        this.lang() === 'es'
          ? 'Esta fuente no soporta la pestaña "Últimos"'
          : 'This source does not support the "Latest" tab'
      );
      this.results.set([]);
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.currentPage = 1;
    this.results.set([]);

    from(instance.getLatest(1))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.results.set(data);
          this.loading.set(false);
          this.hasMore.set(data.length >= 5);
        },
        error: (err) => {
          console.error('Failed to load latest manga:', err);
          this.error.set(
            this.lang() === 'es'
              ? 'Error al cargar últimos manga'
              : 'Failed to load latest manga'
          );
          this.loading.set(false);
        },
      });
  }

  loadMore(): void {
    const instance = this.adapter();
    if (!instance || this.loadingMore()) return;

    this.loadingMore.set(true);
    const tab = this.activeTab();
    let nextPage: number;
    let request: Promise<SourceManga[]>;

    if (tab === 'search') {
      this.searchPage++;
      nextPage = this.searchPage;
      request = instance.search(this.searchQuery(), nextPage);
    } else if (tab === 'latest' && instance.getLatest) {
      this.currentPage++;
      nextPage = this.currentPage;
      request = instance.getLatest(nextPage);
    } else {
      this.currentPage++;
      nextPage = this.currentPage;
      request = instance.getPopular(nextPage);
    }

    from(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          const existing = this.results();
          const existingSlugs = new Set(existing.map(m => m.slug));
          const newItems = data.filter(m => !existingSlugs.has(m.slug));
          this.results.set([...existing, ...newItems]);
          this.loadingMore.set(false);
          this.hasMore.set(data.length >= 5);
        },
        error: () => {
          this.loadingMore.set(false);
          this.hasMore.set(false);
        },
      });
  }

  onSearchInput(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  onSearch(): void {
    const query = this.searchQuery().trim();
    const instance = this.adapter();
    if (!instance || !query) return;

    this.loading.set(true);
    this.error.set(null);
    this.results.set([]);
    this.searchPage = 1;
    this.hasMore.set(true);

    from(instance.search(query, 1))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.results.set(data);
          this.loading.set(false);
          this.hasMore.set(data.length >= 5);
        },
        error: (err) => {
          console.error('Search failed:', err);
          this.error.set(
            this.lang() === 'es'
              ? 'Error en la búsqueda. Intentá de nuevo.'
              : 'Search failed. Please try again.'
          );
          this.loading.set(false);
        },
      });
  }

  onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.onSearch();
    }
  }

  onMangaClick(manga: SourceManga): void {
    this.router.navigate(['/source', this.sourceId, 'manga', manga.slug]);
  }

  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    const parent = img.parentElement;
    if (parent) {
      parent.classList.add('img-error');
    }
  }

  goBack(): void {
    this.appLocation.back();
  }

  get hasLatest(): boolean {
    const instance = this.adapter();
    return !!instance?.getLatest;
  }
}
