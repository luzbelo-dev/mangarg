import { Injectable, signal, computed } from '@angular/core';
import { SourceManga, SourceChapter, SourcePage } from '../models/source.model';

export interface LocalMangaEntry {
  id: string;
  title: string;
  coverDataUrl: string;
  chapters: LocalChapter[];
  addedAt: number;
  lastReadAt?: number;
}

export interface LocalChapter {
  id: string;
  title: string;
  pages: LocalPage[];
  addedAt: number;
}

export interface LocalPage {
  dataUrl: string;
  index: number;
}

@Injectable({ providedIn: 'root' })
export class LocalMangaService {
  private readonly STORAGE_KEY = 'local_manga_library';

  private readonly entries = signal<LocalMangaEntry[]>(this.loadFromStorage());

  readonly library = computed(() => this.entries());
  readonly count = computed(() => this.entries().length);

  async addFromFiles(files: FileList | File[]): Promise<LocalMangaEntry | null> {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return null;

    const imageFiles = fileArray.filter(f => f.type.startsWith('image/'));
    const archiveFiles = fileArray.filter(f =>
      f.name.endsWith('.cbz') || f.name.endsWith('.cbr') || f.name.endsWith('.zip')
    );

    if (archiveFiles.length > 0) {
      return this.addFromArchive(archiveFiles[0]);
    }

    if (imageFiles.length > 0) {
      return this.addFromImages(imageFiles);
    }

    return null;
  }

  async addFromDirectory(dirHandle: FileSystemDirectoryHandle): Promise<LocalMangaEntry | null> {
    const chapters: LocalChapter[] = [];
    let coverDataUrl = '';

    const subDirs: FileSystemDirectoryHandle[] = [];
    const rootImages: File[] = [];

    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'directory') {
        subDirs.push(entry as FileSystemDirectoryHandle);
      } else if (entry.kind === 'file') {
        const file = await (entry as FileSystemFileHandle).getFile();
        if (file.type.startsWith('image/')) {
          rootImages.push(file);
        }
      }
    }

    if (subDirs.length > 0) {
      subDirs.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      for (const subDir of subDirs) {
        const pages = await this.readImagesFromDir(subDir);
        if (pages.length > 0) {
          chapters.push({
            id: crypto.randomUUID(),
            title: subDir.name,
            pages,
            addedAt: Date.now(),
          });
        }
      }
    } else if (rootImages.length > 0) {
      rootImages.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      const pages = await this.filesToPages(rootImages);
      chapters.push({
        id: crypto.randomUUID(),
        title: 'Chapter 1',
        pages,
        addedAt: Date.now(),
      });
    }

    if (chapters.length === 0) return null;

    coverDataUrl = chapters[0]?.pages[0]?.dataUrl || '';

    const entry: LocalMangaEntry = {
      id: crypto.randomUUID(),
      title: dirHandle.name,
      coverDataUrl,
      chapters,
      addedAt: Date.now(),
    };

    this.entries.update(list => [...list, entry]);
    this.saveToStorage();
    return entry;
  }

  remove(id: string): void {
    this.entries.update(list => list.filter(e => e.id !== id));
    this.saveToStorage();
  }

  getById(id: string): LocalMangaEntry | undefined {
    return this.entries().find(e => e.id === id);
  }

  getChapterPages(mangaId: string, chapterId: string): SourcePage[] {
    const manga = this.getById(mangaId);
    const chapter = manga?.chapters.find(c => c.id === chapterId);
    return chapter?.pages.map(p => ({ url: p.dataUrl, index: p.index })) || [];
  }

  toSourceManga(entry: LocalMangaEntry): SourceManga {
    return {
      sourceId: 'local',
      slug: entry.id,
      title: entry.title,
      coverUrl: entry.coverDataUrl,
      description: `${entry.chapters.length} chapters · Local`,
    };
  }

  private async addFromImages(files: File[]): Promise<LocalMangaEntry | null> {
    files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    const pages = await this.filesToPages(files);
    if (pages.length === 0) return null;

    const folderName = files[0].webkitRelativePath
      ? files[0].webkitRelativePath.split('/')[0]
      : 'Local Manga';

    const entry: LocalMangaEntry = {
      id: crypto.randomUUID(),
      title: folderName,
      coverDataUrl: pages[0].dataUrl,
      chapters: [{
        id: crypto.randomUUID(),
        title: 'Chapter 1',
        pages,
        addedAt: Date.now(),
      }],
      addedAt: Date.now(),
    };

    this.entries.update(list => [...list, entry]);
    this.saveToStorage();
    return entry;
  }

  private async addFromArchive(file: File): Promise<LocalMangaEntry | null> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pages = await this.extractImagesFromZip(arrayBuffer);

      const entry: LocalMangaEntry = {
        id: crypto.randomUUID(),
        title: file.name.replace(/\.(cbz|cbr|zip)$/i, ''),
        coverDataUrl: pages[0].dataUrl,
        chapters: [{
          id: crypto.randomUUID(),
          title: file.name.replace(/\.(cbz|cbr|zip)$/i, ''),
          pages,
          addedAt: Date.now(),
        }],
        addedAt: Date.now(),
      };

      this.entries.update(list => [...list, entry]);
      this.saveToStorage();
      return entry;
    } catch {
      return null;
    }
  }

  private async extractImagesFromZip(buffer: ArrayBuffer): Promise<LocalPage[]> {
    const view = new DataView(buffer);
    const files: { name: string; data: Uint8Array }[] = [];
    let offset = 0;

    while (offset < buffer.byteLength - 4) {
      const sig = view.getUint32(offset, true);
      if (sig !== 0x04034b50) break;

      const compressionMethod = view.getUint16(offset + 8, true);
      const compressedSize = view.getUint32(offset + 18, true);
      const uncompressedSize = view.getUint32(offset + 22, true);
      const fileNameLength = view.getUint16(offset + 26, true);
      const extraLength = view.getUint16(offset + 28, true);
      const dataStart = offset + 30 + fileNameLength + extraLength;

      const nameBytes = new Uint8Array(buffer, offset + 30, fileNameLength);
      const name = new TextDecoder().decode(nameBytes);

      if (/\.(jpg|jpeg|png|webp|gif)$/i.test(name) && !name.startsWith('__MACOSX')) {
        const rawData = new Uint8Array(buffer, dataStart, compressedSize);
        if (compressionMethod === 0) {
          files.push({ name, data: rawData });
        } else if (compressionMethod === 8) {
          try {
            const ds = new DecompressionStream('deflate-raw');
            const writer = ds.writable.getWriter();
            writer.write(rawData);
            writer.close();
            const reader = ds.readable.getReader();
            const chunks: Uint8Array[] = [];
            let done = false;
            while (!done) {
              const result = await reader.read();
              done = result.done;
              if (result.value) chunks.push(result.value);
            }
            const totalLen = chunks.reduce((s, c) => s + c.length, 0);
            const decompressed = new Uint8Array(totalLen);
            let pos = 0;
            for (const chunk of chunks) {
              decompressed.set(chunk, pos);
              pos += chunk.length;
            }
            files.push({ name, data: decompressed });
          } catch {
            // skip files that can't be decompressed
          }
        }
      }

      offset = dataStart + compressedSize;
    }

    files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    const pages: LocalPage[] = [];
    for (let i = 0; i < files.length; i++) {
      const ext = files[i].name.split('.').pop()?.toLowerCase() || 'jpg';
      const mimeMap: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };
      const blob = new Blob([files[i].data.buffer as ArrayBuffer], { type: mimeMap[ext] || 'image/jpeg' });
      const dataUrl = await this.blobToDataUrl(blob);
      pages.push({ dataUrl, index: i });
    }

    return pages;
  }

  private async readImagesFromDir(dirHandle: FileSystemDirectoryHandle): Promise<LocalPage[]> {
    const files: File[] = [];
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file') {
        const file = await (entry as FileSystemFileHandle).getFile();
        if (file.type.startsWith('image/')) {
          files.push(file);
        }
      }
    }
    files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    return this.filesToPages(files);
  }

  private async filesToPages(files: File[]): Promise<LocalPage[]> {
    const pages: LocalPage[] = [];
    for (let i = 0; i < files.length; i++) {
      const dataUrl = await this.blobToDataUrl(files[i]);
      pages.push({ dataUrl, index: i });
    }
    return pages;
  }

  private blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private loadFromStorage(): LocalMangaEntry[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.entries()));
    } catch {
      // Storage full — for large manga, should use IndexedDB instead
    }
  }
}
