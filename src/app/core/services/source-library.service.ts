import { Injectable, inject, signal, computed } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { IndexedDbService } from './indexeddb.service';

export interface SourceLibraryEntry {
  id: string; // sourceId + '::' + slug
  sourceId: string;
  slug: string;
  title: string;
  coverUrl: string;
  description?: string;
  author?: string;
  status?: string;
  genres?: string[];
  addedAt: string;
}

@Injectable({ providedIn: 'root' })
export class SourceLibraryService {
  private readonly db = inject(IndexedDbService);
  private readonly entries = signal<SourceLibraryEntry[]>([]);
  private loaded = false;

  readonly allEntries = this.entries.asReadonly();
  readonly count = computed(() => this.entries().length);

  async init(): Promise<void> {
    if (this.loaded) return;
    try {
      const items = await firstValueFrom(this.db.getAll<SourceLibraryEntry>('source-library'));
      this.entries.set(items);
    } catch (e) {
      console.error('Failed to load source library:', e);
    }
    this.loaded = true;
  }

  private makeId(sourceId: string, slug: string): string {
    return sourceId + '::' + slug;
  }

  isInLibrary(sourceId: string, slug: string): boolean {
    return this.entries().some(e => e.id === this.makeId(sourceId, slug));
  }

  async add(entry: Omit<SourceLibraryEntry, 'id' | 'addedAt'>): Promise<void> {
    const id = this.makeId(entry.sourceId, entry.slug);
    if (this.entries().some(e => e.id === id)) return;

    const item: SourceLibraryEntry = {
      ...entry,
      id,
      addedAt: new Date().toISOString(),
    };

    await firstValueFrom(this.db.put('source-library', item));
    this.entries.update(list => [...list, item]);
  }

  async remove(sourceId: string, slug: string): Promise<void> {
    const id = this.makeId(sourceId, slug);
    await firstValueFrom(this.db.delete('source-library', id));
    this.entries.update(list => list.filter(e => e.id !== id));
  }

  async toggle(entry: Omit<SourceLibraryEntry, 'id' | 'addedAt'>): Promise<void> {
    if (this.isInLibrary(entry.sourceId, entry.slug)) {
      await this.remove(entry.sourceId, entry.slug);
    } else {
      await this.add(entry);
    }
  }
}
