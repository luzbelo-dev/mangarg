import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { TranslateService } from '../../../core/i18n/translate.service';
import { SourceRegistryService } from '../../../core/services/source-registry.service';
import { MangaSource } from '../../../core/models/source.model';

interface LangGroup {
  lang: string;
  label: string;
  sources: MangaSource[];
}

@Component({
  selector: 'mt-extensions-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './extensions-page.html',
  styleUrl: './extensions-page.scss',
})
export class ExtensionsPageComponent {
  protected readonly i18n = inject(TranslateService);
  protected readonly registry = inject(SourceRegistryService);

  t = this.i18n.t;
  lang = this.i18n.lang;

  activeTab = signal<'installed' | 'available'>('installed');
  searchQuery = signal('');
  activeLang = signal('All');

  readonly langFilters = ['All', 'Multi', 'EN', 'ES', 'JP', 'KO', 'ZH', 'FR', 'PT', 'ID'];

  private readonly langLabels: Record<string, string> = {
    Multi: 'Multi',
    EN: 'English',
    ES: 'Spanish',
    JP: 'Japanese',
    KO: 'Korean',
    ZH: 'Chinese',
    FR: 'French',
    PT: 'Portuguese',
    ID: 'Indonesian',
  };

  readonly filteredInstalled = computed(() => {
    return this.filterSources(this.registry.installed());
  });

  readonly filteredAvailable = computed(() => {
    return this.filterSources(this.registry.notInstalled());
  });

  readonly groupedAvailable = computed(() => {
    const sources = this.filteredAvailable();
    return this.groupByLang(sources);
  });

  readonly groupedInstalled = computed(() => {
    const sources = this.filteredInstalled();
    return this.groupByLang(sources);
  });

  readonly installedCount = computed(() => this.filteredInstalled().length);
  readonly availableCount = computed(() => this.filteredAvailable().length);

  setTab(tab: 'installed' | 'available'): void {
    this.activeTab.set(tab);
  }

  setLangFilter(lang: string): void {
    this.activeLang.set(lang);
  }

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  getDescription(source: MangaSource): string {
    return this.lang() === 'es' ? source.descriptionEs : source.description;
  }

  install(source: MangaSource): void {
    this.registry.install(source.id);
  }

  uninstall(source: MangaSource): void {
    this.registry.uninstall(source.id);
  }

  private filterSources(sources: MangaSource[]): MangaSource[] {
    const query = this.searchQuery().toLowerCase().trim();
    const lang = this.activeLang();

    return sources.filter(s => {
      const matchesLang = lang === 'All' || s.lang === lang;
      const matchesSearch = !query || s.name.toLowerCase().includes(query);
      return matchesLang && matchesSearch;
    });
  }

  private groupByLang(sources: MangaSource[]): LangGroup[] {
    const langOrder = ['Multi', 'EN', 'ES', 'JP', 'KO', 'ZH', 'FR', 'PT', 'ID'];
    const groups: Map<string, MangaSource[]> = new Map();

    for (const source of sources) {
      const existing = groups.get(source.lang) || [];
      existing.push(source);
      groups.set(source.lang, existing);
    }

    // Sort within groups alphabetically
    for (const [, list] of groups) {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    const result: LangGroup[] = [];
    for (const lang of langOrder) {
      const list = groups.get(lang);
      if (list && list.length > 0) {
        result.push({
          lang,
          label: this.langLabels[lang] || lang,
          sources: list,
        });
      }
    }

    return result;
  }
}
