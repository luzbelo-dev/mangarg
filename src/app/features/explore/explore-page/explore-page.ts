import { ChangeDetectionStrategy, Component, inject, signal, computed, DestroyRef, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { JikanService, MANGA_GENRES, MangaGenre } from '../../../core/services/jikan.service';
import { ComickService } from '../../../core/services/comick.service';
import { LibraryService } from '../../../core/services/library.service';
import { TranslateService } from '../../../core/i18n/translate.service';
import { JikanManga } from '../../../core/models/manga.model';
import { MangaCardComponent } from '../../../shared/components/manga-card/manga-card';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner';
import { SourceRegistryService } from '../../../core/services/source-registry.service';
import { MangaSource, SourceManga } from '../../../core/models/source.model';

type ExploreTab = 'popular' | 'top' | 'genres' | 'sources';

interface LangGroup {
  lang: string;
  label: string;
  sources: MangaSource[];
}

@Component({
  selector: 'mt-explore-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MangaCardComponent, LoadingSpinnerComponent],
  templateUrl: './explore-page.html',
  styleUrl: './explore-page.scss',
})
export class ExplorePageComponent implements OnInit {
  private readonly jikanService = inject(JikanService);
  private readonly comickService = inject(ComickService);
  private readonly libraryService = inject(LibraryService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly i18n = inject(TranslateService);
  protected readonly registry = inject(SourceRegistryService);

  t = this.i18n.t;
  lang = this.i18n.lang;
  genres = MANGA_GENRES;

  // Tab state
  activeTab = signal<ExploreTab>('popular');

  // Sources tab
  sourceSubTab = signal<'installed' | 'available'>('available');
  sourceSearch = signal('');
  sourceLang = signal('All');
  readonly langFilters = ['All', 'Multi', 'EN', 'ES', 'JP', 'KO', 'ZH', 'FR', 'PT', 'ID'];
  private readonly langLabels: Record<string, string> = {
    Multi: 'Multi', EN: 'English', ES: 'Spanish', JP: 'Japanese',
    KO: 'Korean', ZH: 'Chinese', FR: 'French', PT: 'Portuguese', ID: 'Indonesian',
  };

  readonly filteredInstalled = computed(() => this.filterSources(this.registry.installed()));
  readonly filteredAvailable = computed(() => this.filterSources(this.registry.notInstalled()));
  readonly groupedInstalled = computed(() => this.groupByLang(this.filteredInstalled()));
  readonly groupedAvailable = computed(() => this.groupByLang(this.filteredAvailable()));
  readonly installedCount = computed(() => this.filteredInstalled().length);
  readonly availableCount = computed(() => this.filteredAvailable().length);

  // Popular tab
  popularResults = signal<JikanManga[]>([]);
  popularLoading = signal(false);

  // Top Rated tab
  topResults = signal<JikanManga[]>([]);
  topLoading = signal(false);

  // Genres tab (existing functionality)
  selectedGenres = signal<Set<number>>(new Set());
  results = signal<JikanManga[]>([]);
  loading = signal(false);
  sfw = signal(true);
  orderBy = signal<'score' | 'popularity' | 'title'>('score');
  hasSearched = signal(false);

  // Source browsing state
  browseSource = signal<MangaSource | null>(null);
  browseResults = signal<SourceManga[]>([]);
  browseLoading = signal(false);

  // Animation state for install/uninstall
  animatingSourceId = signal<string | null>(null);

  private libraryIds = toSignal(
    this.libraryService.allEntries$.pipe(map(e => new Set(e.map(x => x.mal_id)))),
    { initialValue: new Set<number>() }
  );

  ngOnInit(): void {
    this.loadPopular();
  }

  setTab(tab: ExploreTab): void {
    this.activeTab.set(tab);
    if (tab === 'popular' && this.popularResults().length === 0 && !this.popularLoading()) {
      this.loadPopular();
    } else if (tab === 'top' && this.topResults().length === 0 && !this.topLoading()) {
      this.loadTopRated();
    }
  }

  private loadPopular(): void {
    this.popularLoading.set(true);
    this.jikanService.getTopManga('bypopularity', 1, 25).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(res => {
      this.popularResults.set(res.data);
      this.popularLoading.set(false);
    });
  }

  private loadTopRated(): void {
    this.topLoading.set(true);
    this.jikanService.getTopScoredManga(1, 25).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(res => {
      this.topResults.set(res.data);
      this.topLoading.set(false);
    });
  }

  genreName(genre: MangaGenre): string {
    return this.lang() === 'es' ? genre.nameEs : genre.name;
  }

  toggleGenre(genreId: number): void {
    const current = new Set(this.selectedGenres());
    if (current.has(genreId)) {
      current.delete(genreId);
    } else {
      current.add(genreId);
    }
    this.selectedGenres.set(current);

    if (current.size > 0) {
      this.search();
    } else {
      this.results.set([]);
      this.hasSearched.set(false);
    }
  }

  isSelected(genreId: number): boolean {
    return this.selectedGenres().has(genreId);
  }

  search(): void {
    const ids = [...this.selectedGenres()];
    if (ids.length === 0) return;

    this.loading.set(true);
    this.jikanService.browseByGenres(ids, 1, this.sfw(), this.orderBy()).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(res => {
      this.results.set(res.data);
      this.loading.set(false);
      this.hasSearched.set(true);
    });
  }

  toggleSfw(): void {
    this.sfw.update(v => !v);
    if (this.selectedGenres().size > 0) this.search();
  }

  setOrderBy(event: Event): void {
    this.orderBy.set((event.target as HTMLSelectElement).value as 'score' | 'popularity' | 'title');
    if (this.selectedGenres().size > 0) this.search();
  }

  clearAll(): void {
    this.selectedGenres.set(new Set());
    this.results.set([]);
    this.hasSearched.set(false);
  }

  isInLibrary(malId: number): boolean {
    return this.libraryIds().has(malId);
  }

  onFavoriteToggle(manga: JikanManga): void {
    this.libraryService.toggle(manga, null);
  }

  onCardClick(malId: number): void {
    this.router.navigate(['/manga', malId]);
  }

  // Sources tab methods
  setSourceSubTab(tab: 'installed' | 'available'): void {
    this.sourceSubTab.set(tab);
    // When switching to installed tab, clear browse state
    if (tab === 'available') {
      this.browseSource.set(null);
      this.browseResults.set([]);
    }
  }

  setSourceLang(lang: string): void {
    this.sourceLang.set(lang);
  }

  onSourceSearch(event: Event): void {
    this.sourceSearch.set((event.target as HTMLInputElement).value);
  }

  getSourceDescription(source: MangaSource): string {
    return this.lang() === 'es' ? source.descriptionEs : source.description;
  }

  installSource(source: MangaSource): void {
    this.animatingSourceId.set(source.id);
    setTimeout(() => {
      this.registry.install(source.id);
      this.animatingSourceId.set(null);
    }, 300);
  }

  uninstallSource(source: MangaSource): void {
    this.animatingSourceId.set(source.id);
    setTimeout(() => {
      this.registry.uninstall(source.id);
      this.animatingSourceId.set(null);
    }, 300);
  }

  // Source browsing methods
  onSourceTap(source: MangaSource): void {
    if (source.id === 'jikan' || source.id === 'mangadex') {
      // Switch to Popular tab which already shows Jikan data
      this.setTab('popular');
      return;
    }

    if (source.id === 'comick') {
      this.browseSource.set(source);
      this.browseLoading.set(true);
      this.comickService.getPopular(20).pipe(
        takeUntilDestroyed(this.destroyRef),
      ).subscribe(results => {
        this.browseResults.set(results);
        this.browseLoading.set(false);
      });
      return;
    }

    // Other sources: open externally
    window.open(source.baseUrl, '_blank');
  }

  closeBrowse(): void {
    this.browseSource.set(null);
    this.browseResults.set([]);
  }

  onBrowseCardClick(manga: SourceManga): void {
    window.open(`https://comick.io/comic/${manga.slug}`, '_blank');
  }

  private filterSources(sources: MangaSource[]): MangaSource[] {
    const query = this.sourceSearch().toLowerCase().trim();
    const lang = this.sourceLang();
    return sources.filter(s => {
      const matchesLang = lang === 'All' || s.lang === lang;
      const matchesSearch = !query || s.name.toLowerCase().includes(query);
      return matchesLang && matchesSearch;
    });
  }

  private groupByLang(sources: MangaSource[]): LangGroup[] {
    const langOrder = ['Multi', 'EN', 'ES', 'JP', 'KO', 'ZH', 'FR', 'PT', 'ID'];
    const groups = new Map<string, MangaSource[]>();
    for (const source of sources) {
      const list = groups.get(source.lang) || [];
      list.push(source);
      groups.set(source.lang, list);
    }
    for (const [, list] of groups) {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return langOrder
      .filter(l => groups.has(l) && groups.get(l)!.length > 0)
      .map(l => ({ lang: l, label: this.langLabels[l] || l, sources: groups.get(l)! }));
  }
}
