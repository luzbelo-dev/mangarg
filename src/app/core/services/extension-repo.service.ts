import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, forkJoin, map } from 'rxjs';
import { MangaSource } from '../models/source.model';

export interface ExtensionRepo {
  id: string;
  name: string;
  url: string;
  addedAt: number;
  lastUpdated?: number;
  extensionCount?: number;
}

export interface RepoManifest {
  name: string;
  description?: string;
  extensions: RepoExtension[];
}

export interface RepoExtension {
  id: string;
  name: string;
  lang: string;
  version: string;
  icon: string;
  iconColor: string;
  baseUrl: string;
  description: string;
  descriptionEs: string;
  features: string[];
  nsfw: boolean;
  adapterUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class ExtensionRepoService {
  private readonly http = inject(HttpClient);
  private readonly REPOS_KEY = 'extension_repos';
  private readonly REPO_EXTENSIONS_KEY = 'repo_extensions';

  private readonly repos = signal<ExtensionRepo[]>(this.loadRepos());
  private readonly repoExtensions = signal<MangaSource[]>(this.loadRepoExtensions());

  readonly allRepos = computed(() => this.repos());
  readonly allRepoExtensions = computed(() => this.repoExtensions());
  readonly repoCount = computed(() => this.repos().length);

  addRepo(url: string): Observable<ExtensionRepo | null> {
    const cleanUrl = url.trim().replace(/\/$/, '');
    const manifestUrl = cleanUrl.endsWith('.json') ? cleanUrl : `${cleanUrl}/manifest.json`;

    return this.http.get<RepoManifest>(manifestUrl).pipe(
      map(manifest => {
        const repo: ExtensionRepo = {
          id: crypto.randomUUID(),
          name: manifest.name || this.extractRepoName(cleanUrl),
          url: cleanUrl,
          addedAt: Date.now(),
          lastUpdated: Date.now(),
          extensionCount: manifest.extensions?.length || 0,
        };

        this.repos.update(list => [...list, repo]);
        this.saveRepos();

        if (manifest.extensions) {
          const newSources = manifest.extensions.map(ext => this.repoExtToSource(ext, repo.id));
          this.repoExtensions.update(list => [...list, ...newSources]);
          this.saveRepoExtensions();
        }

        return repo;
      }),
      catchError(() => of(null))
    );
  }

  removeRepo(repoId: string): void {
    this.repos.update(list => list.filter(r => r.id !== repoId));
    this.repoExtensions.update(list => list.filter(s => !(s as any)._repoId || (s as any)._repoId !== repoId));
    this.saveRepos();
    this.saveRepoExtensions();
  }

  refreshRepo(repoId: string): Observable<boolean> {
    const repo = this.repos().find(r => r.id === repoId);
    if (!repo) return of(false);

    const manifestUrl = repo.url.endsWith('.json') ? repo.url : `${repo.url}/manifest.json`;
    return this.http.get<RepoManifest>(manifestUrl).pipe(
      map(manifest => {
        this.repoExtensions.update(list =>
          list.filter(s => (s as any)._repoId !== repoId)
        );

        if (manifest.extensions) {
          const newSources = manifest.extensions.map(ext => this.repoExtToSource(ext, repoId));
          this.repoExtensions.update(list => [...list, ...newSources]);
        }

        this.repos.update(list => list.map(r =>
          r.id === repoId
            ? { ...r, lastUpdated: Date.now(), extensionCount: manifest.extensions?.length || 0 }
            : r
        ));

        this.saveRepos();
        this.saveRepoExtensions();
        return true;
      }),
      catchError(() => of(false))
    );
  }

  refreshAll(): Observable<boolean[]> {
    if (this.repos().length === 0) return of([]);
    return forkJoin(this.repos().map(r => this.refreshRepo(r.id)));
  }

  private repoExtToSource(ext: RepoExtension, repoId: string): MangaSource {
    const source: any = {
      id: `repo_${ext.id}`,
      name: ext.name,
      lang: ext.lang,
      version: ext.version,
      icon: ext.icon,
      iconColor: ext.iconColor,
      baseUrl: ext.baseUrl,
      description: ext.description,
      descriptionEs: ext.descriptionEs,
      features: ext.features,
      nsfw: ext.nsfw,
      _repoId: repoId,
    };
    return source;
  }

  private extractRepoName(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.hostname.replace('www.', '');
    } catch {
      return url.split('/').pop() || 'Unknown Repo';
    }
  }

  private loadRepos(): ExtensionRepo[] {
    try {
      const stored = localStorage.getItem(this.REPOS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private saveRepos(): void {
    localStorage.setItem(this.REPOS_KEY, JSON.stringify(this.repos()));
  }

  private loadRepoExtensions(): MangaSource[] {
    try {
      const stored = localStorage.getItem(this.REPO_EXTENSIONS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private saveRepoExtensions(): void {
    localStorage.setItem(this.REPO_EXTENSIONS_KEY, JSON.stringify(this.repoExtensions()));
  }
}
