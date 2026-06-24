import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AdapterApi, AdapterCache, MangaAdapterInstance } from '../models/adapter.model';

function isCapacitor(): boolean {
  return typeof (window as any)?.Capacitor !== 'undefined';
}

function needsProxy(url: string): boolean {
  if (isCapacitor()) return false;
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'localhost') return false;
    if (parsed.hostname.includes('netlify.app')) return false;
    if (parsed.hostname.includes('mangadex.org')) return false;
    return true;
  } catch {
    return false;
  }
}

function proxyUrl(targetUrl: string, method = 'GET'): string {
  const encoded = btoa(targetUrl).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `/.netlify/functions/source-proxy?url=${encoded}&method=${method}`;
}

function buildUrl(url: string, params?: Record<string, any>): string {
  const fullUrl = new URL(url);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (Array.isArray(v)) {
        for (const item of v) fullUrl.searchParams.append(k, String(item));
      } else {
        fullUrl.searchParams.set(k, String(v));
      }
    }
  }
  return fullUrl.toString();
}

@Injectable({ providedIn: 'root' })
export class AdapterRuntimeService {
  private readonly http = inject(HttpClient);
  private readonly cacheStore = new Map<string, { value: string; expiresAt: number }>();

  createApi(): AdapterApi {
    return {
      get: <T>(url: string, params?: Record<string, any>): Promise<T> => {
        const target = buildUrl(url, params);
        const fetchUrl = needsProxy(target) ? proxyUrl(target) : target;
        return firstValueFrom(this.http.get<T>(fetchUrl));
      },

      getText: (url: string, params?: Record<string, any>): Promise<string> => {
        const target = buildUrl(url, params);
        const fetchUrl = needsProxy(target) ? proxyUrl(target) : target;
        return firstValueFrom(this.http.get(fetchUrl, { responseType: 'text' }));
      },

      postText: (url: string, body?: any): Promise<string> => {
        const fetchUrl = needsProxy(url) ? proxyUrl(url, 'POST') : url;
        return firstValueFrom(this.http.post(fetchUrl, body ?? '', {
          responseType: 'text',
          headers: { 'X-Requested-With': 'XMLHttpRequest' },
        }));
      },

      post: <T>(url: string, body: any, headers?: Record<string, string>): Promise<T> => {
        const fetchUrl = needsProxy(url) ? proxyUrl(url, 'POST') : url;
        return firstValueFrom(this.http.post<T>(fetchUrl, body, {
          headers: headers ?? { 'Content-Type': 'application/json' },
        }));
      },

      fetchBlob: (url: string): Promise<Blob> => {
        const fetchUrl = needsProxy(url) ? proxyUrl(url) : url;
        return firstValueFrom(this.http.get(fetchUrl, { responseType: 'blob' }));
      },

      cache: this.createCache(),
    };
  }

  execute(code: string, config?: Record<string, any>): MangaAdapterInstance {
    const api = this.createApi();
    const cfg = config ?? {};
    const factory = new Function('api', 'config', `"use strict"; return (${code})(api, config);`);
    return factory(api, cfg);
  }

  private createCache(): AdapterCache {
    const store = this.cacheStore;
    return {
      async get(key: string): Promise<string | null> {
        const entry = store.get(key);
        if (!entry) return null;
        if (entry.expiresAt > 0 && Date.now() > entry.expiresAt) {
          store.delete(key);
          return null;
        }
        return entry.value;
      },
      async set(key: string, value: string, ttlMs?: number): Promise<void> {
        store.set(key, {
          value,
          expiresAt: ttlMs ? Date.now() + ttlMs : 0,
        });
      },
      async delete(key: string): Promise<void> {
        store.delete(key);
      },
    };
  }
}
