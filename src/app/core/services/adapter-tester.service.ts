import { Injectable, inject } from '@angular/core';
import { AdapterLoaderService } from './adapter-loader.service';
import { MangaAdapterInstance } from '../models/adapter.model';

export interface AdapterTestResult {
  adapterId: string;
  adapterName: string;
  searchOk: boolean;
  searchCount: number;
  mangaTitle?: string;
  chaptersOk: boolean;
  chapterCount: number;
  pagesOk: boolean;
  pageCount: number;
  firstPageUrl?: string;
  error?: string;
  durationMs: number;
}

@Injectable({ providedIn: 'root' })
export class AdapterTesterService {
  private readonly loader = inject(AdapterLoaderService);

  async testAdapter(adapter: MangaAdapterInstance, query: string): Promise<AdapterTestResult> {
    const start = Date.now();
    const result: AdapterTestResult = {
      adapterId: adapter.id,
      adapterName: adapter.name,
      searchOk: false,
      searchCount: 0,
      chaptersOk: false,
      chapterCount: 0,
      pagesOk: false,
      pageCount: 0,
      durationMs: 0,
    };

    try {
      const mangas = await adapter.search(query);
      result.searchOk = mangas.length > 0;
      result.searchCount = mangas.length;

      if (mangas.length === 0) {
        result.error = 'No search results';
        result.durationMs = Date.now() - start;
        return result;
      }

      const manga = mangas[0];
      result.mangaTitle = manga.title;

      const chapters = await adapter.getChapters(manga.slug);
      result.chaptersOk = chapters.length > 0;
      result.chapterCount = chapters.length;

      if (chapters.length === 0) {
        result.error = 'No chapters found';
        result.durationMs = Date.now() - start;
        return result;
      }

      const chapter = chapters[0];
      const pages = await adapter.getPages(chapter.id);
      result.pagesOk = pages.length > 0;
      result.pageCount = pages.length;
      result.firstPageUrl = pages[0]?.url;

      if (pages.length === 0) {
        result.error = 'No pages found';
      }
    } catch (e: any) {
      result.error = e?.message || String(e);
    }

    result.durationMs = Date.now() - start;
    return result;
  }

  async testAllInstalled(query = 'one piece'): Promise<AdapterTestResult[]> {
    const adapters = this.loader.getAllLoadedAdapters();
    const results: AdapterTestResult[] = [];

    for (const adapter of adapters) {
      console.log(`Testing ${adapter.name}...`);
      const result = await this.testAdapter(adapter, query);
      results.push(result);
      console.log(
        `  ${result.searchOk ? 'OK' : 'FAIL'} search(${result.searchCount}) → ` +
        `${result.chaptersOk ? 'OK' : 'FAIL'} chapters(${result.chapterCount}) → ` +
        `${result.pagesOk ? 'OK' : 'FAIL'} pages(${result.pageCount}) ` +
        `[${result.durationMs}ms]` +
        (result.error ? ` ERROR: ${result.error}` : '')
      );
    }

    const passed = results.filter(r => r.pagesOk).length;
    console.log(`\n=== RESULTS: ${passed}/${results.length} adapters fully working ===`);
    return results;
  }

  async testRandom(count = 5, queries = ['naruto', 'one piece', 'dragon ball', 'death note', 'attack on titan']): Promise<AdapterTestResult[]> {
    const adapters = this.loader.getAllLoadedAdapters();
    if (adapters.length === 0) {
      console.error('No adapters loaded');
      return [];
    }

    const selected = this.shuffleArray([...adapters]).slice(0, Math.min(count, adapters.length));
    const results: AdapterTestResult[] = [];

    for (let i = 0; i < selected.length; i++) {
      const adapter = selected[i];
      const query = queries[i % queries.length];
      console.log(`\n[${i + 1}/${selected.length}] Testing "${adapter.name}" with query "${query}"...`);
      const result = await this.testAdapter(adapter, query);
      results.push(result);

      if (result.pagesOk) {
        console.log(`  PASS: Found "${result.mangaTitle}" → ${result.chapterCount} chapters → ${result.pageCount} pages`);
        console.log(`  First page: ${result.firstPageUrl?.substring(0, 80)}...`);
      } else {
        console.log(`  FAIL: ${result.error}`);
      }
    }

    const passed = results.filter(r => r.pagesOk).length;
    console.log(`\n=== RANDOM TEST: ${passed}/${results.length} passed ===`);
    return results;
  }

  private shuffleArray<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
