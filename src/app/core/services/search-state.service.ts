import { Injectable } from '@angular/core';
import { JikanManga } from '../models/manga.model';

@Injectable({ providedIn: 'root' })
export class SearchStateService {
  query = '';
  results: JikanManga[] = [];
  hasSearched = false;

  save(query: string, results: JikanManga[]): void {
    this.query = query;
    this.results = results;
    this.hasSearched = true;
  }

  clear(): void {
    this.query = '';
    this.results = [];
    this.hasSearched = false;
  }
}
