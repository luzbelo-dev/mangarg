import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom, forkJoin, of, from, catchError, map, switchMap, tap } from 'rxjs';
import { IndexedDbService } from './indexeddb.service';
import { AdapterRuntimeService } from './adapter-runtime.service';
import { InstalledAdapter, MangaAdapterInstance, MangaAdapterManifest } from '../models/adapter.model';

export interface ExtensionRepo {
  id: string;
  name: string;
  url: string;
  addedAt: number;
  lastUpdated?: number;
}

export interface RepoManifest {
  name: string;
  description?: string;
  adapters: MangaAdapterManifest[];
}

const REPOS_KEY = 'mt_extension_repos';

function getDefaultRepoUrl(): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return origin + '/default-repo';
}

@Injectable({ providedIn: 'root' })
export class AdapterLoaderService {
  private readonly http = inject(HttpClient);
  private readonly db = inject(IndexedDbService);
  private readonly runtime = inject(AdapterRuntimeService);

  private readonly loadedAdapters = new Map<string, MangaAdapterInstance>();
  private loaded = false;

  readonly repos = signal<ExtensionRepo[]>(this.loadRepos());
  readonly installedAdapters = signal<InstalledAdapter[]>([]);
  readonly availableAdapters = signal<MangaAdapterManifest[]>([]);
  readonly loading = signal(false);

  readonly installedCount = computed(() => this.installedAdapters().length);
  readonly availableCount = computed(() => this.availableAdapters().length);

  async init(): Promise<void> {
    if (this.loaded) return;
    try {
      const adapters = await firstValueFrom(this.db.getAll<InstalledAdapter>('installed-adapters'));
      this.installedAdapters.set(adapters);
      for (const adapter of adapters) {
        try {
          const instance = this.runtime.execute(adapter.code, adapter.config);
          this.loadedAdapters.set(adapter.id, instance);
        } catch (e) {
          console.error(`Failed to load adapter ${adapter.id}:`, e);
        }
      }
    } catch (e) {
      console.error('Failed to load adapters from DB:', e);
    }
    this.loaded = true;
    if (this.repos().length === 0) {
      await this.addRepo(getDefaultRepoUrl());
    } else {
      await this.refreshRepos();
    }
  }

  getAdapter(id: string): MangaAdapterInstance | null {
    return this.loadedAdapters.get(id) ?? null;
  }

  getAllLoadedAdapters(): MangaAdapterInstance[] {
    return [...this.loadedAdapters.values()];
  }

  getInstalledIds(): string[] {
    return this.installedAdapters().map(a => a.id);
  }

  isInstalled(id: string): boolean {
    return this.installedAdapters().some(a => a.id === id);
  }

  async refreshRepos(): Promise<void> {
    this.loading.set(true);
    const allManifests: MangaAdapterManifest[] = [];

    for (const repo of this.repos()) {
      try {
        const repoBase = repo.url.endsWith('.json')
          ? repo.url.substring(0, repo.url.lastIndexOf('/'))
          : repo.url;
        const manifestUrl = repo.url.endsWith('.json')
          ? repo.url
          : `${repo.url}/manifest.json`;
        const manifest = await firstValueFrom(this.http.get<RepoManifest>(manifestUrl));
        if (manifest?.adapters) {
          for (const adapter of manifest.adapters) {
            if (adapter.adapterUrl && !adapter.adapterUrl.startsWith('http')) {
              adapter.adapterUrl = `${repoBase}/${adapter.adapterUrl}`;
            }
            (adapter as any)._repoId = repo.id;
          }
          allManifests.push(...manifest.adapters);
        }
        repo.lastUpdated = Date.now();
      } catch (e) {
        console.error(`Failed to refresh repo ${repo.url}:`, e);
      }
    }

    const installedIds = new Set(this.installedAdapters().map(a => a.id));
    const available = allManifests.filter(a => !installedIds.has(a.id));
    this.availableAdapters.set(available);
    this.saveRepos();
    this.loading.set(false);
  }

  async installAdapter(manifest: MangaAdapterManifest, repoId: string): Promise<boolean> {
    try {
      const code = await firstValueFrom(
        this.http.get(manifest.adapterUrl, { responseType: 'text' })
      );

      const cfg = manifest.config ?? { baseUrl: manifest.baseUrl, id: manifest.id, name: manifest.name, icon: manifest.icon, iconColor: manifest.iconColor, lang: manifest.lang };
      const instance = this.runtime.execute(code, cfg);
      this.loadedAdapters.set(manifest.id, instance);

      const installed: InstalledAdapter = {
        id: manifest.id,
        repoId,
        name: manifest.name,
        lang: manifest.lang,
        version: manifest.version,
        icon: manifest.icon,
        iconColor: manifest.iconColor,
        baseUrl: manifest.baseUrl,
        description: manifest.description,
        descriptionEs: manifest.descriptionEs,
        features: manifest.features,
        nsfw: manifest.nsfw,
        code,
        config: cfg,
        installedAt: Date.now(),
        updatedAt: Date.now(),
      };

      await firstValueFrom(this.db.put('installed-adapters', installed));
      this.installedAdapters.update(list => [...list, installed]);
      this.availableAdapters.update(list => list.filter(a => a.id !== manifest.id));

      return true;
    } catch (e) {
      console.error(`Failed to install adapter ${manifest.id}:`, e);
      return false;
    }
  }

  async uninstallAdapter(id: string): Promise<void> {
    this.loadedAdapters.delete(id);
    await firstValueFrom(this.db.delete('installed-adapters', id));
    const removed = this.installedAdapters().find(a => a.id === id);
    this.installedAdapters.update(list => list.filter(a => a.id !== id));
    if (removed) {
      const manifest: MangaAdapterManifest = {
        id: removed.id,
        name: removed.name,
        lang: removed.lang,
        version: removed.version,
        icon: removed.icon,
        iconColor: removed.iconColor,
        baseUrl: removed.baseUrl,
        description: removed.description,
        descriptionEs: removed.descriptionEs,
        features: removed.features,
        nsfw: removed.nsfw,
        adapterUrl: '',
      };
      this.availableAdapters.update(list => [...list, manifest]);
    }
  }

  async updateAdapter(id: string): Promise<boolean> {
    const installed = this.installedAdapters().find(a => a.id === id);
    if (!installed) return false;

    const available = this.availableAdapters().find(a => a.id === id);
    if (!available) return false;

    await this.uninstallAdapter(id);
    const repoId = installed.repoId;
    return this.installAdapter(available, repoId);
  }

  async addRepo(url: string): Promise<void> {
    const cleanUrl = url.trim().replace(/\/$/, '');
    if (this.repos().some(r => r.url === cleanUrl)) return;

    const repo: ExtensionRepo = {
      id: crypto.randomUUID(),
      name: this.extractName(cleanUrl),
      url: cleanUrl,
      addedAt: Date.now(),
    };
    this.repos.update(list => [...list, repo]);
    this.saveRepos();
    await this.refreshRepos();
  }

  removeRepo(repoId: string): void {
    this.repos.update(list => list.filter(r => r.id !== repoId));
    this.saveRepos();
  }

  private extractName(url: string): string {
    try {
      const parts = new URL(url).pathname.split('/').filter(Boolean);
      return parts[parts.length - 1] || 'Extension Repo';
    } catch {
      return 'Extension Repo';
    }
  }

  private loadRepos(): ExtensionRepo[] {
    try {
      const stored = localStorage.getItem(REPOS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private saveRepos(): void {
    localStorage.setItem(REPOS_KEY, JSON.stringify(this.repos()));
  }
}
