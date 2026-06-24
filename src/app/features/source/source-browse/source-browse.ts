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
  searchQuery = signal('');
  activeTab = signal<BrowseTab>('popular');
  error = signal<string | null>(null);

  private sourceId = '';

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

    if (tab === 'popular') {
      this.loadPopular();
    } else if (tab === 'latest') {
      this.loadLatest();
    }
    // Search tab doesn't auto-load; user triggers via input
  }

  loadPopular(): void {
    const instance = this.adapter();
    if (!instance) return;

    this.loading.set(true);
    this.error.set(null);
    this.results.set([]);

    from(instance.getPopular())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.results.set(data);
          this.loading.set(false);
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
    this.results.set([]);

    from(instance.getLatest())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.results.set(data);
          this.loading.set(false);
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

    from(instance.search(query))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.results.set(data);
          this.loading.set(false);
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
    // Show the placeholder that sits behind the image
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
