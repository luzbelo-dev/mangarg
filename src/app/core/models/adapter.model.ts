import { SourceManga, SourceChapter, SourcePage } from './source.model';

export interface MangaAdapterManifest {
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
  adapterUrl: string;
  config?: Record<string, any>;
}

export interface MangaAdapterInstance {
  id: string;
  name: string;
  lang: string;
  baseUrl: string;
  icon: string;
  iconColor: string;

  search(query: string, page?: number): Promise<SourceManga[]>;
  getPopular(page?: number): Promise<SourceManga[]>;
  getLatest?(page?: number): Promise<SourceManga[]>;
  getMangaDetail?(slug: string): Promise<MangaDetail | null>;
  getChapters(mangaSlug: string, lang?: string): Promise<SourceChapter[]>;
  getPages(chapterId: string): Promise<SourcePage[]>;
}

export interface MangaDetail {
  slug: string;
  title: string;
  coverUrl: string;
  description?: string;
  status?: string;
  genres?: string[];
  author?: string;
  artist?: string;
  score?: number;
  totalChapters?: number;
}

export interface InstalledAdapter {
  id: string;
  repoId: string;
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
  code: string;
  config?: Record<string, any>;
  installedAt: number;
  updatedAt: number;
}

export interface AdapterApi {
  get<T = any>(url: string, params?: Record<string, string | number>): Promise<T>;
  getText(url: string, params?: Record<string, string | number>): Promise<string>;
  postText(url: string, body?: any): Promise<string>;
  post<T = any>(url: string, body: any, headers?: Record<string, string>): Promise<T>;
  fetchBlob(url: string): Promise<Blob>;
  cache: AdapterCache;
}

export interface AdapterCache {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlMs?: number): Promise<void>;
  delete(key: string): Promise<void>;
}
