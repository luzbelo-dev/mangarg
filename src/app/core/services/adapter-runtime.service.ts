import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AdapterApi, AdapterCache, MangaAdapterInstance } from '../models/adapter.model';

@Injectable({ providedIn: 'root' })
export class AdapterRuntimeService {
  private readonly http = inject(HttpClient);
  private readonly cacheStore = new Map<string, { value: string; expiresAt: number }>();

  createApi(): AdapterApi {
    return {
      get: <T>(url: string, params?: Record<string, any>): Promise<T> => {
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
        return firstValueFrom(this.http.get<T>(fullUrl.toString()));
      },

      getText: (url: string, params?: Record<string, any>): Promise<string> => {
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
        return firstValueFrom(this.http.get(fullUrl.toString(), { responseType: 'text' }));
      },

      postText: (url: string, body?: any): Promise<string> => {
        return firstValueFrom(this.http.post(url, body ?? '', {
          responseType: 'text',
          headers: { 'X-Requested-With': 'XMLHttpRequest' },
        }));
      },

      post: <T>(url: string, body: any, headers?: Record<string, string>): Promise<T> => {
        return firstValueFrom(this.http.post<T>(url, body, {
          headers: headers ?? { 'Content-Type': 'application/json' },
        }));
      },

      fetchBlob: (url: string): Promise<Blob> => {
        return firstValueFrom(this.http.get(url, { responseType: 'blob' }));
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
