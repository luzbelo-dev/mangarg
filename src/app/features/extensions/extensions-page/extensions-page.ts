import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '../../../core/i18n/translate.service';
import { AdapterLoaderService } from '../../../core/services/adapter-loader.service';
import { InstalledAdapter, MangaAdapterManifest } from '../../../core/models/adapter.model';

@Component({
  selector: 'mt-extensions-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './extensions-page.html',
  styleUrl: './extensions-page.scss',
})
export class ExtensionsPageComponent implements OnInit {
  private readonly router = inject(Router);
  protected readonly i18n = inject(TranslateService);
  protected readonly loader = inject(AdapterLoaderService);

  t = this.i18n.t;
  lang = this.i18n.lang;

  activeTab = signal<'installed' | 'available' | 'repos'>('installed');
  searchQuery = signal('');
  activeLang = signal('All');
  installingId = signal<string | null>(null);
  repoUrlInput = signal('');

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

  async install(adapter: MangaAdapterManifest): Promise<void> {
    this.installingId.set(adapter.id);
    const repo = this.loader.repos()[0];
    await this.loader.installAdapter(adapter, repo?.id ?? 'default');
    this.installingId.set(null);
  }

  async uninstall(adapter: InstalledAdapter): Promise<void> {
    await this.loader.uninstallAdapter(adapter.id);
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
  }

  removeRepo(repoId: string): void {
    this.loader.removeRepo(repoId);
  }

  refreshRepos(): void {
    this.loader.refreshRepos();
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
