import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { SourceManga, SourceChapter, SourcePage } from '../models/source.model';

interface ComickSearchResult {
  title: string;
  id: number;
  slug: string;
  md_covers?: { b2key: string; w: number; h: number }[];
  rating?: string;
  follow_count?: number;
  content_rating?: string;
  desc?: string;
  status?: number;
  genres?: string[];
}

interface ComickComicDetail {
  comic: {
    title: string;
    desc: string;
    status: number;
    slug: string;
    hid: string;
    md_covers?: { b2key: string; w: number; h: number }[];
    content_rating?: string;
  };
  genres?: { name: string; slug: string }[];
}

interface ComickChapterItem {
  id: number;
  chap: string;
  vol?: string;
  hid: string;
  created_at: string;
  title?: string;
  lang?: string;
  md_groups?: { title: string }[];
}

interface ComickChaptersResponse {
  chapters: ComickChapterItem[];
  total: number;
}

interface ComickChapterDetail {
  chapter: {
    md_images: { b2key: string; w: number; h: number }[];
  };
}

@Injectable({ providedIn: 'root' })
export class ComickService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'https://api.comick.fun';
  private readonly coverBaseUrl = 'https://meo.comick.pictures';

  searchManga(query: string, limit = 10): Observable<SourceManga[]> {
    return this.http.get<ComickSearchResult[]>(
      `${this.baseUrl}/v1.0/search`,
      { params: { q: query, limit: limit.toString(), type: 'comic' } }
    ).pipe(
      map(results => results.map(item => this.mapToSourceManga(item))),
      catchError(() => of([]))
    );
  }

  getPopular(limit = 20): Observable<SourceManga[]> {
    return this.http.get<ComickSearchResult[]>(
      `${this.baseUrl}/top`,
      { params: { comic_types: 'manga', accept_mature_content: 'false' } }
    ).pipe(
      map(results => results.slice(0, limit).map(item => this.mapToSourceManga(item))),
      catchError(() => of([]))
    );
  }

  getComicBySlug(slug: string): Observable<ComickComicDetail | null> {
    return this.http.get<ComickComicDetail>(
      `${this.baseUrl}/comic/${slug}`
    ).pipe(
      catchError(() => of(null))
    );
  }

  getChapters(hid: string, lang = 'en', limit = 30): Observable<SourceChapter[]> {
    return this.http.get<ComickChaptersResponse>(
      `${this.baseUrl}/comic/${hid}/chapters`,
      { params: { lang, limit: limit.toString() } }
    ).pipe(
      map(response => response.chapters.map(ch => this.mapToSourceChapter(ch, hid))),
      catchError(() => of([]))
    );
  }

  getChapterPages(hid: string): Observable<SourcePage[]> {
    return this.http.get<ComickChapterDetail>(
      `${this.baseUrl}/chapter/${hid}`
    ).pipe(
      map(response => response.chapter.md_images.map((img, index) => ({
        url: `${this.coverBaseUrl}/${img.b2key}`,
        index,
      }))),
      catchError(() => of([]))
    );
  }

  private mapToSourceManga(item: ComickSearchResult): SourceManga {
    const coverKey = item.md_covers?.[0]?.b2key;
    return {
      sourceId: 'comick',
      slug: item.slug,
      title: item.title,
      coverUrl: coverKey ? `${this.coverBaseUrl}/${coverKey}` : '',
      description: item.desc,
      score: item.rating ? parseFloat(item.rating) : undefined,
      contentRating: item.content_rating,
    };
  }

  private mapToSourceChapter(ch: ComickChapterItem, mangaHid: string): SourceChapter {
    return {
      id: ch.hid,
      sourceId: 'comick',
      mangaSlug: mangaHid,
      chapterNumber: ch.chap || '0',
      title: ch.title,
      language: ch.lang || 'en',
      groupName: ch.md_groups?.[0]?.title,
      publishDate: ch.created_at,
    };
  }
}
