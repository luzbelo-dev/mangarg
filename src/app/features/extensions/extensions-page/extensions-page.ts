import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '../../../core/i18n/translate.service';
import { AdapterLoaderService } from '../../../core/services/adapter-loader.service';
import { InstalledAdapter, MangaAdapterManifest, MangaAdapterInstance } from '../../../core/models/adapter.model';
import { SourceManga } from '../../../core/models/source.model';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner';
import { ToastService } from '../../../core/services/toast.service';

interface UniversalSearchGroup {
  sourceId: string;
  sourceName: string;
  sourceIcon: string;
  sourceIconColor: string;
  results: SourceManga[];
}

@Component({
  selector: 'mt-extensions-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LoadingSpinnerComponent],
  templateUrl: './extensions-page.html',
  styleUrl: './extensions-page.scss',
})
export class ExtensionsPageComponent implements OnInit {
  private readonly router = inject(Router);
  protected readonly i18n = inject(TranslateService);
  protected readonly loader = inject(AdapterLoaderService);
  private readonly toast = inject(ToastService);

  t = this.i18n.t;
  lang = this.i18n.lang;

  activeTab = signal<'installed' | 'available' | 'repos'>('installed');
  searchQuery = signal('');
  activeLang = signal('All');
  installingId = signal<string | null>(null);
  repoUrlInput = signal('');

  // Universal search
  universalQuery = signal('');
  universalSearching = signal(false);
  universalResults = signal<UniversalSearchGroup[]>([]);
  universalSearched = signal(false);

  // Confirmation dialog
  confirmAdapter = signal<MangaAdapterManifest | null>(null);

  // Manual install
  manualUrlInput = signal('');
  manualInstalling = signal(false);

  readonly langFilters = ['All', 'Multi', 'EN', 'ES', 'JP', 'KO', 'ZH', 'FR', 'PT', 'ID'];

  private readonly langLabels: Record<string, string> = {
    Multi: 'Multi', EN: 'English', ES: 'Spanish', JP: 'Japanese',
    KO: 'Korean', ZH: 'Chinese', FR: 'French', PT: 'Portuguese', ID: 'Indonesian',
  };

  readonly filteredInstalled = computed(() => {
    return this.filterItems(this.loader.installedAdapters(), 'installed');
  });

  readonly filteredAvailable = computed(() => {
    return this.filterItems(this.loader.availableAdapters(), 'available');
  });

  readonly groupedInstalled = computed(() => {
    return this.groupByLang(this.filteredInstalled());
  });

  readonly groupedAvailable = computed(() => {
    return this.groupByLang(this.filteredAvailable());
  });

  ngOnInit(): void {
    this.loader.refreshRepos();
  }

  setTab(tab: 'installed' | 'available' | 'repos'): void {
    this.activeTab.set(tab);
  }

  setLangFilter(lang: string): void {
    this.activeLang.set(lang);
  }

  onSearchInput(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  getDescription(item: InstalledAdapter | MangaAdapterManifest): string {
    return this.lang() === 'es' ? item.descriptionEs : item.description;
  }

  showInstallConfirm(adapter: MangaAdapterManifest): void {
    this.confirmAdapter.set(adapter);
  }

  cancelInstall(): void {
    this.confirmAdapter.set(null);
  }

  async confirmInstall(): Promise<void> {
    const adapter = this.confirmAdapter();
    if (!adapter) return;
    this.confirmAdapter.set(null);
    await this.install(adapter);
  }

  async install(adapter: MangaAdapterManifest): Promise<void> {
    this.installingId.set(adapter.id);
    const repoId = (adapter as any)._repoId ?? this.loader.repos()[0]?.id ?? 'default';
    const success = await this.loader.installAdapter(adapter, repoId);
    this.installingId.set(null);
    if (success) {
      this.toast.show(this.lang() === 'es' ? `${adapter.name} instalada` : `${adapter.name} installed`);
    } else {
      this.toast.show(this.lang() === 'es' ? `Error instalando ${adapter.name}` : `Error installing ${adapter.name}`);
    }
  }

  async uninstall(adapter: InstalledAdapter): Promise<void> {
    await this.loader.uninstallAdapter(adapter.id);
    this.toast.show(this.lang() === 'es' ? `${adapter.name} desinstalada` : `${adapter.name} uninstalled`);
  }

  browseSource(adapter: InstalledAdapter): void {
    this.router.navigate(['/source', adapter.id]);
  }

  onRepoUrlInput(event: Event): void {
    this.repoUrlInput.set((event.target as HTMLInputElement).value);
  }

  addRepo(): void {
    const url = this.repoUrlInput().trim();
    if (!url) return;
    this.loader.addRepo(url);
    this.repoUrlInput.set('');
    this.toast.show(this.lang() === 'es' ? 'Repositorio agregado' : 'Repository added');
  }

  removeRepo(repoId: string): void {
    this.loader.removeRepo(repoId);
    this.toast.show(this.lang() === 'es' ? 'Repositorio eliminado' : 'Repository removed');
  }

  refreshRepos(): void {
    this.loader.refreshRepos();
  }

  // Manual install from URL
  onManualUrlInput(event: Event): void {
    this.manualUrlInput.set((event.target as HTMLInputElement).value);
  }

  async installFromUrl(): Promise<void> {
    const url = this.manualUrlInput().trim();
    if (!url) return;

    this.manualInstalling.set(true);
    const result = await this.loader.installFromUrl(url);
    this.manualInstalling.set(false);

    if (result.success) {
      this.manualUrlInput.set('');
      this.toast.show(this.lang() === 'es' ? `${result.name} instalada` : `${result.name} installed`);
    } else {
      this.toast.show(result.error || 'Error');
    }
  }

  // Manual install from file
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const code = reader.result as string;
      this.manualInstalling.set(true);
      const result = await this.loader.installFromCode(code, file.name);
      this.manualInstalling.set(false);

      if (result.success) {
        this.toast.show(this.lang() === 'es' ? `${result.name} instalada` : `${result.name} installed`);
      } else {
        this.toast.show(result.error || 'Error');
      }
      input.value = '';
    };
    reader.readAsText(file);
  }

  // Universal search
  onUniversalInput(event: Event): void {
    this.universalQuery.set((event.target as HTMLInputElement).value);
  }

  async onUniversalSearch(): Promise<void> {
    const query = this.universalQuery().trim();
    if (!query) return;

    const adapters = this.loader.getAllLoadedAdapters();
    if (adapters.length === 0) return;

    this.universalSearching.set(true);
    this.universalSearched.set(true);
    this.universalResults.set([]);

    const results = await Promise.allSettled(
      adapters.map(async (adapter) => {
        const mangas = await adapter.search(query);
        return {
          sourceId: adapter.id,
          sourceName: adapter.name,
          sourceIcon: adapter.icon,
          sourceIconColor: adapter.iconColor,
          results: mangas,
        } as UniversalSearchGroup;
      })
    );

    const groups: UniversalSearchGroup[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.results.length > 0) {
        groups.push(result.value);
      }
    }

    this.universalResults.set(groups);
    this.universalSearching.set(false);
  }

  onUniversalResultClick(sourceId: string, slug: string): void {
    this.router.navigate(['/source', sourceId, 'manga', slug]);
  }

  onUniversalCoverError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  private filterItems<T extends { name: string; lang: string }>(items: T[], _type: string): T[] {
    const query = this.searchQuery().toLowerCase().trim();
    const lang = this.activeLang();
    return items.filter(s => {
      const matchesLang = lang === 'All' || s.lang.toUpperCase() === lang;
      const matchesSearch = !query || s.name.toLowerCase().includes(query);
      return matchesLang && matchesSearch;
    });
  }

  private groupByLang<T extends { name: string; lang: string }>(items: T[]): { lang: string; label: string; items: T[] }[] {
    const langOrder = ['Multi', 'EN', 'ES', 'JP', 'KO', 'ZH', 'FR', 'PT', 'ID'];
    const groups = new Map<string, T[]>();
    for (const item of items) {
      const key = item.lang.length <= 3 ? item.lang : 'Multi';
      const list = groups.get(key) || [];
      list.push(item);
      groups.set(key, list);
    }
    return langOrder
      .filter(l => groups.has(l) && groups.get(l)!.length > 0)
      .map(l => ({ lang: l, label: this.langLabels[l] || l, items: groups.get(l)! }));
  }
}
