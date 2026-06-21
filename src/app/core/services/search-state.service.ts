import { Injectable } from '@angular/core';
import { JikanManga } from '../models/manga.model';
import { SourceManga } from '../models/source.model';

@Injectable({ providedIn: 'root' })
export class SearchStateService {
  query = '';
  results: JikanManga[] = [];
  comickResults: SourceManga[] = [];
  hasSearched = false;

  save(query: string, results: JikanManga[]): void {
    this.query = query;
    this.results = results;
    this.hasSearched = true;
  }

  saveComick(results: SourceManga[]): void {
    this.comickResults = results;
  }

  clear(): void {
    this.query = '';
    this.results = [];
    this.comickResults = [];
    this.hasSearched = false;
  }
}
