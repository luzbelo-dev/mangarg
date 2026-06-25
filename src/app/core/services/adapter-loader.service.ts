import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
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

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function isCapacitor(): boolean {
  return typeof (window as any)?.Capacitor !== 'undefined';
}

function getDefaultRepoUrl(): string {
  if (isCapacitor()) {
    return '/default-repo';
  }
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return origin + '/default-repo';
}

function resolveGitHubUrl(url: string): string {
  const ghMatch = url.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/?(.*)$/);
  if (!ghMatch) return url;
  const [, owner, repo, rest] = ghMatch;
  const cleanRepo = repo.replace(/\.git$/, '');
  const path = rest?.replace(/^(tree|blob)\/(main|master)\//, '') || '';
  if (path && path.endsWith('.json')) {
    return `https://raw.githubusercontent.com/${owner}/${cleanRepo}/main/${path}`;
  }
  if (path) {
    return `https://raw.githubusercontent.com/${owner}/${cleanRepo}/main/${path}`;
  }
  return `https://raw.githubusercontent.com/${owner}/${cleanRepo}/main`;
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

        const manifest = await this.fetchJson<RepoManifest>(manifestUrl);
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
      const code = await this.fetchText(manifest.adapterUrl);

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

  async installFromCode(code: string, sourceUrl?: string): Promise<{ success: boolean; name?: string; error?: string }> {
    try {
      const instance = this.runtime.execute(code, {});
      if (!instance || !instance.id || !instance.name) {
        return { success: false, error: 'Invalid adapter: missing id or name' };
      }

      if (this.isInstalled(instance.id)) {
        await this.uninstallAdapter(instance.id);
      }

      this.loadedAdapters.set(instance.id, instance);

      const installed: InstalledAdapter = {
        id: instance.id,
        repoId: 'manual',
        name: instance.name,
        lang: instance.lang || 'Multi',
        version: '1.0.0',
        icon: instance.icon || instance.name.substring(0, 2).toUpperCase(),
        iconColor: instance.iconColor || '#e63946',
        baseUrl: instance.baseUrl || '',
        description: `Installed from ${sourceUrl || 'manual input'}`,
        descriptionEs: `Instalado desde ${sourceUrl || 'entrada manual'}`,
        features: [],
        nsfw: false,
        code,
        config: {},
        installedAt: Date.now(),
        updatedAt: Date.now(),
      };

      await firstValueFrom(this.db.put('installed-adapters', installed));
      this.installedAdapters.update(list => [...list, installed]);

      return { success: true, name: instance.name };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to execute adapter code' };
    }
  }

  async installFromUrl(jsUrl: string): Promise<{ success: boolean; name?: string; error?: string }> {
    try {
      const code = await this.fetchText(jsUrl);
      return this.installFromCode(code, jsUrl);
    } catch (e: any) {
      return { success: false, error: `Failed to fetch: ${e.message || 'Network error'}` };
    }
  }

  async uninstallAdapter(id: string): Promise<void> {
    this.loadedAdapters.delete(id);
    await firstValueFrom(this.db.delete('installed-adapters', id));
    const removed = this.installedAdapters().find(a => a.id === id);
    this.installedAdapters.update(list => list.filter(a => a.id !== id));
    if (removed && removed.repoId !== 'manual') {
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
    let cleanUrl = url.trim().replace(/\/$/, '');

    // GitHub URL detection
    if (cleanUrl.includes('github.com') && !cleanUrl.includes('raw.githubusercontent.com')) {
      cleanUrl = resolveGitHubUrl(cleanUrl);
    }

    if (this.repos().some(r => r.url === cleanUrl)) return;

    const repo: ExtensionRepo = {
      id: generateId(),
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
    this.availableAdapters.update(list => list.filter(a => (a as any)._repoId !== repoId));
    this.saveRepos();
  }

  private async fetchJson<T>(url: string): Promise<T> {
    if (this.isLocalUrl(url)) {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    }
    return firstValueFrom(this.http.get<T>(url));
  }

  private async fetchText(url: string): Promise<string> {
    if (this.isLocalUrl(url)) {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.text();
    }
    return firstValueFrom(this.http.get(url, { responseType: 'text' }));
  }

  private isLocalUrl(url: string): boolean {
    if (url.startsWith('/') && !url.startsWith('//')) return true;
    try {
      const parsed = new URL(url);
      return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    } catch {
      return false;
    }
  }

  private extractName(url: string): string {
    if (url.includes('raw.githubusercontent.com')) {
      const parts = url.split('/').filter(Boolean);
      const idx = parts.indexOf('raw.githubusercontent.com');
      if (idx >= 0 && parts[idx + 1] && parts[idx + 2]) {
        return `${parts[idx + 1]}/${parts[idx + 2]}`;
      }
    }
    try {
      const parts = new URL(url).pathname.split('/').filter(Boolean);
      return parts[parts.length - 1] || 'Extension Repo';
    } catch {
      return url.split('/').pop() || 'Extension Repo';
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
