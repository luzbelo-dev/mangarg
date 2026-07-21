// Capa de compatibilidad con extensiones de Mangayomi (https://github.com/kodjodevf/mangayomi).
// Mangayomi tambien usa extensiones en JavaScript, pero con otra forma que la
// nuestra: `class DefaultExtension extends MProvider` + clases globales
// `Client` (HTTP), `Document` (parser tipo Jsoup) y `SharedPreferences`. Esta
// capa provee esos globales apoyados en nuestro runtime y envuelve la instancia
// en un MangaAdapterInstance nativo, para correr el catalogo de Mangayomi casi
// tal cual. Cubre las fuentes de manga (JSON API + scraping HTML); no cubre
// anime/novela ni features exoticas (WebView/Unbaser).

import { MangaAdapterInstance, MangaDetail } from '../models/adapter.model';
import { SourceManga, SourceChapter, SourcePage } from '../models/source.model';

export interface MangayomiHttpDeps {
  // Devuelven el cuerpo como texto. `headers` puede incluir Referer/User-Agent;
  // en la APK se mandan nativos, en web el proxy usa el Referer.
  httpGet(url: string, headers?: Record<string, string>): Promise<string>;
  httpPost(url: string, headers?: Record<string, string>, body?: string): Promise<string>;
}

export interface MangayomiSourceMeta {
  name: string;
  lang: string;
  baseUrl: string;
  iconUrl?: string;
}

export function isMangayomiExtension(code: string): boolean {
  return /extends\s+MProvider/.test(code) && /mangayomiSources/.test(code);
}

// --- Parser HTML estilo Jsoup sobre DOMParser ---

class MangayomiElement {
  constructor(private readonly el: Element) {}

  get text(): string {
    return (this.el.textContent || '').trim();
  }

  get outerHtml(): string {
    return this.el.outerHTML;
  }

  get html(): string {
    return this.el.innerHTML;
  }

  attr(name: string): string {
    // Jsoup soporta "abs:href" para resolver absoluto; devolvemos el crudo y el
    // adapter resuelve (como hacen casi todas las extensiones).
    const clean = name.startsWith('abs:') ? name.slice(4) : name;
    return this.el.getAttribute(clean) ?? '';
  }

  select(selector: string): MangayomiElement[] {
    return queryAll(this.el, selector).map(e => new MangayomiElement(e));
  }

  selectFirst(selector: string): MangayomiElement | null {
    const found = queryAll(this.el, selector)[0];
    return found ? new MangayomiElement(found) : null;
  }
}

class MangayomiDocument {
  private readonly doc: HTMLDocument;
  constructor(html: string) {
    this.doc = new DOMParser().parseFromString(html ?? '', 'text/html');
  }
  select(selector: string): MangayomiElement[] {
    return queryAll(this.doc, selector).map(e => new MangayomiElement(e));
  }
  selectFirst(selector: string): MangayomiElement | null {
    const found = queryAll(this.doc, selector)[0];
    return found ? new MangayomiElement(found) : null;
  }
}

// querySelectorAll no soporta el pseudo `:contains(texto)` de Jsoup. Lo
// manejamos a mano; el resto va directo. Todo envuelto en try/catch para que un
// selector invalido nunca tumbe al adapter (a lo sumo devuelve vacio).
function queryAll(root: Element | HTMLDocument, selector: string): Element[] {
  const groups = selector.split(',').map(s => s.trim()).filter(Boolean);
  const out: Element[] = [];
  const seen = new Set<Element>();
  for (const group of groups) {
    for (const el of queryGroup(root, group)) {
      if (!seen.has(el)) { seen.add(el); out.push(el); }
    }
  }
  return out;
}

function queryGroup(root: Element | HTMLDocument, group: string): Element[] {
  if (!group.includes(':contains(')) {
    try {
      return Array.from(root.querySelectorAll(group));
    } catch {
      return [];
    }
  }
  // Patron "A:contains(X) + B": heading que contiene X -> hermano B
  const sibling = group.match(/^(.*?):contains\(([^)]*)\)\s*\+\s*(.+)$/i);
  if (sibling) {
    const [, base, needle, next] = sibling;
    const hits = matchContains(root, base.trim() || '*', needle);
    const res: Element[] = [];
    for (const h of hits) {
      const sib = h.nextElementSibling;
      if (sib) {
        try { if (sib.matches(next.trim())) res.push(sib); } catch { /* ignore */ }
      }
    }
    return res;
  }
  // Patron simple "A:contains(X)"
  const plain = group.match(/^(.*?):contains\(([^)]*)\)\s*$/i);
  if (plain) {
    return matchContains(root, plain[1].trim() || '*', plain[2]);
  }
  // Otros casos con :contains -> intento sin el pseudo (best-effort)
  try {
    return Array.from(root.querySelectorAll(group.replace(/:contains\([^)]*\)/gi, '')));
  } catch {
    return [];
  }
}

function matchContains(root: Element | HTMLDocument, base: string, needle: string): Element[] {
  const target = needle.replace(/^["']|["']$/g, '').toLowerCase();
  try {
    return Array.from(root.querySelectorAll(base)).filter(
      el => (el.textContent || '').toLowerCase().includes(target)
    );
  } catch {
    return [];
  }
}

// --- Fabrica de globales del runtime Mangayomi ---

function slugify(text: string): string {
  return (text || 'source')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'source';
}

// base64url para meter una URL como slug/id de ruta sin romper el router.
function encodeId(url: string): string {
  return btoa(unescape(encodeURIComponent(url)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function decodeId(id: string): string {
  try {
    const std = id.replace(/-/g, '+').replace(/_/g, '/');
    return decodeURIComponent(escape(atob(std)));
  } catch {
    return id; // si no era base64, asumimos que ya es una URL/slug crudo
  }
}

function statusToString(status: unknown): string {
  switch (status) {
    case 0: return 'ongoing';
    case 1: return 'completed';
    case 2: return 'hiatus';
    case 3: return 'cancelled';
    default: return '';
  }
}

function firstNumber(text: string): string {
  const m = (text || '').match(/[\d]+(\.[\d]+)?/);
  return m ? m[0] : '0';
}

/**
 * Ejecuta el codigo de una extension Mangayomi y devuelve un
 * MangaAdapterInstance nativo. Lanza si el codigo no expone lo esperado.
 */
export function buildMangayomiAdapter(code: string, deps: MangayomiHttpDeps): MangaAdapterInstance {
  const ctx = { sourceId: '' };

  const Client = class {
    async get(url: string, headers?: Record<string, string>) {
      const body = await deps.httpGet(url, headers);
      return { body, statusCode: 200, headers: {} };
    }
    async post(url: string, headers?: Record<string, string>, body?: string) {
      const resBody = await deps.httpPost(url, headers, body);
      return { body: resBody, statusCode: 200, headers: {} };
    }
  };

  const SharedPreferences = class {
    private key(k: string): string { return `mangayomi:${ctx.sourceId}:${k}`; }
    get(k: string): string { return localStorage.getItem(this.key(k)) ?? ''; }
    getString(k: string, def = ''): string { return localStorage.getItem(this.key(k)) ?? def; }
    set(k: string, v: string): void { localStorage.setItem(this.key(k), String(v)); }
    setString(k: string, v: string): void { localStorage.setItem(this.key(k), String(v)); }
  };

  // Base minima: la app real setea `source`; aca lo hace el wrapper. NO define
  // `supportsLatest`: las extensiones que soportan Latest lo agregan con un
  // getter propio; si lo pusiera aca como campo, sombrearia ese getter. El
  // wrapper trata `undefined` como false.
  const MProvider = class {
    source: any;
    getHeaders(_url?: string): Record<string, string> { return {}; }
    getPreference(key: string): string { return new SharedPreferences().get(key); }
  };

  // fetch minimo para las pocas extensiones que lo usan directo.
  const fetchShim = async (url: string, opts?: any) => {
    const method = (opts?.method || 'GET').toUpperCase();
    const headers = opts?.headers || {};
    const body = method === 'GET'
      ? await deps.httpGet(url, headers)
      : await deps.httpPost(url, headers, opts?.body);
    return {
      ok: true,
      status: 200,
      async json() { return JSON.parse(body); },
      async text() { return body; },
    };
  };

  const Filter = class {};

  const factory = new Function(
    'MProvider', 'Client', 'Document', 'SharedPreferences', 'Filter', 'fetch', 'console',
    `"use strict";\n${code}\n; return { sources: mangayomiSources, Provider: DefaultExtension };`
  );

  const result = factory(MProvider, Client, MangayomiDocument, SharedPreferences, Filter, fetchShim, console);
  const source: MangayomiSourceMeta = result.sources?.[0];
  const Provider = result.Provider;
  if (!source || typeof Provider !== 'function') {
    throw new Error('Extension Mangayomi invalida: falta mangayomiSources o DefaultExtension');
  }

  const provider: any = new Provider();
  provider.source = source;

  const id = `my-${slugify(source.name)}-${source.lang || 'all'}`;
  ctx.sourceId = id;

  const baseUrl = (source.baseUrl || '').replace(/\/$/, '');
  const abs = (u: string): string => {
    if (!u) return '';
    if (u.startsWith('http')) return u;
    if (u.startsWith('//')) return 'https:' + u;
    if (u.startsWith('/')) return baseUrl + u;
    return u;
  };

  const mapList = (res: any): SourceManga[] => {
    const list = Array.isArray(res) ? res : (res?.list ?? []);
    return list
      .filter((m: any) => m && m.link)
      .map((m: any) => ({
        sourceId: id,
        slug: encodeId(m.link),
        title: m.name || '',
        coverUrl: abs(m.imageUrl || ''),
      }));
  };

  // getDetail es caro (baja la pagina entera con capitulos); Mangarg pide
  // detalle y capitulos por separado, asi que memorizamos brevemente por URL.
  const detailCache = new Map<string, { at: number; data: Promise<any> }>();
  const getDetail = (mangaUrl: string): Promise<any> => {
    const now = Date.now();
    const cached = detailCache.get(mangaUrl);
    if (cached && now - cached.at < 60000) return cached.data;
    const data = Promise.resolve(provider.getDetail(mangaUrl));
    detailCache.set(mangaUrl, { at: now, data });
    return data;
  };

  return {
    id,
    name: source.name,
    lang: source.lang || 'all',
    baseUrl,
    icon: source.name.substring(0, 2).toUpperCase(),
    iconColor: '#e63946',

    async search(query: string, page = 1): Promise<SourceManga[]> {
      return mapList(await provider.search(query, page, []));
    },

    async getPopular(page = 1): Promise<SourceManga[]> {
      return mapList(await provider.getPopular(page));
    },

    async getLatest(page = 1): Promise<SourceManga[]> {
      if (!provider.supportsLatest || typeof provider.getLatestUpdates !== 'function') return [];
      return mapList(await provider.getLatestUpdates(page));
    },

    async getMangaDetail(slug: string): Promise<MangaDetail> {
      const url = decodeId(slug);
      const d = await getDetail(url);
      return {
        slug,
        title: d.title || '',
        coverUrl: abs(d.imageUrl || ''),
        description: d.description || '',
        status: statusToString(d.status),
        genres: Array.isArray(d.genre) ? d.genre : [],
        author: d.author || undefined,
      };
    },

    async getChapters(mangaSlug: string): Promise<SourceChapter[]> {
      const url = decodeId(mangaSlug);
      const d = await getDetail(url);
      const chapters = Array.isArray(d.chapters) ? d.chapters : [];
      return chapters
        .filter((c: any) => c && c.url)
        .map((c: any) => ({
          id: encodeId(c.url),
          sourceId: id,
          mangaSlug,
          chapterNumber: firstNumber(c.name),
          title: c.name || '',
          language: source.lang || 'all',
          groupName: c.scanlator || undefined,
          publishDate: c.dateUpload || '',
        }));
    },

    async getPages(chapterId: string): Promise<SourcePage[]> {
      const url = decodeId(chapterId);
      const urls = await provider.getPageList(url);
      return (Array.isArray(urls) ? urls : [])
        .map((u: any, index: number) => ({ url: abs(typeof u === 'string' ? u : (u?.url || '')), index }))
        .filter((p: SourcePage) => p.url);
    },
  };
}
