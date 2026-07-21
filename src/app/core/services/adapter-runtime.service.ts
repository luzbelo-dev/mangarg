import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AdapterApi, AdapterCache, MangaAdapterInstance } from '../models/adapter.model';
import { isCapacitor } from '../utils/platform';
import { isMangayomiExtension, buildMangayomiAdapter } from './mangayomi-runtime';

const CORS_SAFE_DOMAINS: string[] = [];

// Metodos/propiedades minimos que debe exponer un adapter valido. Se usa para
// validar la forma del objeto que devuelve el codigo remoto antes de confiar
// en el (defensa contra codigo de extensiones malformado o malicioso).
const REQUIRED_METHODS = ['search', 'getPopular', 'getChapters', 'getPages'] as const;
const REQUIRED_STRINGS = ['id', 'name'] as const;

export function validateAdapterInstance(instance: any): string | null {
  if (!instance || typeof instance !== 'object') return 'el adapter no devolvio un objeto';
  for (const p of REQUIRED_STRINGS) {
    if (typeof instance[p] !== 'string' || !instance[p]) return `falta la propiedad "${p}"`;
  }
  for (const m of REQUIRED_METHODS) {
    if (typeof instance[m] !== 'function') return `falta el metodo "${m}()"`;
  }
  return null;
}

export function needsProxy(url: string): boolean {
  if (isCapacitor()) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    // Una URL malformada de un adapter debe fallar con un error claro,
    // no pedirse tal cual (antes devolvia false y fallaba confuso mas abajo).
    throw new Error(`Invalid URL from adapter: ${url}`);
  }
  for (const domain of CORS_SAFE_DOMAINS) {
    if (parsed.hostname === domain || parsed.hostname.endsWith('.' + domain)) return false;
  }
  return true;
}

export function proxyUrl(targetUrl: string, method = 'GET', referer?: string): string {
  const encoded = btoa(targetUrl).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  let url = `/.netlify/functions/source-proxy?url=${encoded}&method=${method}`;
  if (referer) {
    const encodedRef = btoa(referer).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    url += `&referer=${encodedRef}`;
  }
  return url;
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

  // Punto de entrada unico: detecta el formato (nativo Mangarg vs Mangayomi) y
  // construye el MangaAdapterInstance correspondiente. El loader usa esto.
  build(code: string, config?: Record<string, any>): MangaAdapterInstance {
    if (isMangayomiExtension(code)) {
      return buildMangayomiAdapter(code, {
        httpGet: (url, headers) => this.headerAwareGet(url, headers),
        httpPost: (url, headers, body) => this.headerAwarePost(url, headers, body),
      });
    }
    return this.execute(code, config);
  }

  // GET/POST que respetan headers (Referer/User-Agent). En web van por el proxy
  // (que aplica el Referer server-side); en la APK van directo con headers
  // nativos via CapacitorHttp.
  private headerAwareGet(url: string, headers?: Record<string, string>): Promise<string> {
    const referer = headers?.['Referer'] ?? headers?.['referer'];
    const fetchUrl = needsProxy(url) ? proxyUrl(url, 'GET', referer) : url;
    const options: { responseType: 'text'; headers?: HttpHeaders } = { responseType: 'text' };
    if (!needsProxy(url) && headers) options.headers = new HttpHeaders(headers);
    return firstValueFrom(this.http.get(fetchUrl, options));
  }

  private headerAwarePost(url: string, headers?: Record<string, string>, body?: string): Promise<string> {
    const referer = headers?.['Referer'] ?? headers?.['referer'];
    const fetchUrl = needsProxy(url) ? proxyUrl(url, 'POST', referer) : url;
    const h = new HttpHeaders(headers ?? { 'Content-Type': 'application/x-www-form-urlencoded' });
    return firstValueFrom(this.http.post(fetchUrl, body ?? '', { responseType: 'text', headers: h }));
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
