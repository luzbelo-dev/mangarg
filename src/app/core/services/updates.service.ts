import { Injectable, inject, signal, computed } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { IndexedDbService } from './indexeddb.service';
import { SourceLibraryService, SourceLibraryEntry } from './source-library.service';
import { AdapterLoaderService } from './adapter-loader.service';
import { UpdateEntry } from '../models/update.model';

const CONCURRENCY = 3;

function sortChapters<T extends { chapterNumber: string }>(chapters: T[]): T[] {
  return [...chapters].sort((a, b) => {
    const numA = parseFloat(a.chapterNumber) || 0;
    const numB = parseFloat(b.chapterNumber) || 0;
    return numA - numB;
  });
}

@Injectable({ providedIn: 'root' })
export class UpdatesService {
  private readonly db = inject(IndexedDbService);
  private readonly sourceLibrary = inject(SourceLibraryService);
  private readonly adapterLoader = inject(AdapterLoaderService);

  private readonly entries = signal<UpdateEntry[]>([]);
  private loaded = false;
  private checking = false;

  readonly isChecking = computed(() => this.checking);
  readonly unreadCount = computed(() => this.entries().filter(e => !e.read).length);

  async init(): Promise<void> {
    if (this.loaded) return;
    try {
      const items = await firstValueFrom(this.db.getAll<UpdateEntry>('chapter-updates'));
      this.entries.set(this.sortFeed(items));
    } catch (e) {
      console.error('Failed to load chapter updates:', e);
    }
    this.loaded = true;
  }

  getFeed() {
    return this.entries.asReadonly();
  }

  private sortFeed(items: UpdateEntry[]): UpdateEntry[] {
    return [...items].sort((a, b) => new Date(b.discoveredAt).getTime() - new Date(a.discoveredAt).getTime());
  }

  async markRead(id: string): Promise<void> {
    const entry = this.entries().find(e => e.id === id);
    if (!entry || entry.read) return;
    const updated = { ...entry, read: true };
    await firstValueFrom(this.db.put('chapter-updates', updated));
    this.entries.update(list => list.map(e => (e.id === id ? updated : e)));
  }

  async markAllRead(): Promise<void> {
    const unread = this.entries().filter(e => !e.read);
    for (const entry of unread) {
      await firstValueFrom(this.db.put('chapter-updates', { ...entry, read: true }));
    }
    this.entries.update(list => list.map(e => ({ ...e, read: true })));
  }

  /**
   * Recorre la biblioteca y compara el ultimo capitulo conocido de cada manga
   * contra lo que devuelve el adapter ahora. La primera vez que se chequea un
   * manga solo se guarda la base (no se listan todos sus capitulos viejos
   * como "nuevos" - solo interesan los que aparecen despues de esa base).
   */
  async checkForUpdates(): Promise<UpdateEntry[]> {
    if (this.checking) return [];
    this.checking = true;
    const discovered: UpdateEntry[] = [];

    try {
      await this.init();
      const libraryEntries = this.sourceLibrary.allEntries();

      for (let i = 0; i < libraryEntries.length; i += CONCURRENCY) {
        const chunk = libraryEntries.slice(i, i + CONCURRENCY);
        const results = await Promise.all(chunk.map(entry => this.checkOne(entry)));
        for (const found of results) discovered.push(...found);
      }
    } finally {
      this.checking = false;
    }

    return discovered;
  }

  private async checkOne(entry: SourceLibraryEntry): Promise<UpdateEntry[]> {
    const adapter = this.adapterLoader.getAdapter(entry.sourceId);
    if (!adapter) return [];

    let chapters;
    try {
      chapters = sortChapters(await adapter.getChapters(entry.slug));
    } catch (e) {
      console.error(`Failed to check updates for ${entry.sourceId}/${entry.slug}:`, e);
      return [];
    }
    if (chapters.length === 0) return [];

    const now = new Date().toISOString();
    const knownCount = entry.lastKnownChapterCount;
    const latest = chapters[chapters.length - 1];

    if (knownCount === undefined) {
      // Primer chequeo: solo fijar la base, no generar "nuevos" retroactivos.
      await this.sourceLibrary.updateCheckState(entry.sourceId, entry.slug, {
        lastKnownChapterId: latest.id,
        lastKnownChapterCount: chapters.length,
        lastCheckedAt: now,
      });
      return [];
    }

    if (chapters.length <= knownCount || latest.id === entry.lastKnownChapterId) {
      await this.sourceLibrary.updateCheckState(entry.sourceId, entry.slug, { lastCheckedAt: now });
      return [];
    }

    const newChapters = chapters.slice(knownCount);
    const newEntries: UpdateEntry[] = newChapters.map(ch => ({
      id: `${entry.sourceId}::${entry.slug}::${ch.id}`,
      sourceId: entry.sourceId,
      mangaSlug: entry.slug,
      mangaTitle: entry.title,
      coverUrl: entry.coverUrl,
      chapterId: ch.id,
      chapterNumber: ch.chapterNumber,
      chapterTitle: ch.title,
      discoveredAt: now,
      read: false,
    }));

    for (const update of newEntries) {
      await firstValueFrom(this.db.put('chapter-updates', update));
    }
    this.entries.update(list => this.sortFeed([...newEntries, ...list]));

    await this.sourceLibrary.updateCheckState(entry.sourceId, entry.slug, {
      lastKnownChapterId: latest.id,
      lastKnownChapterCount: chapters.length,
      lastCheckedAt: now,
    });

    return newEntries;
  }
}
