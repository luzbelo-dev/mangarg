import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

const DB_NAME = 'manga-ale-db';
const DB_VERSION = 6;

@Injectable({ providedIn: 'root' })
export class IndexedDbService {
  private db: IDBDatabase | null = null;
  // Cachea la promesa en vuelo (no solo el resultado): si dos servicios piden
  // abrir la DB antes de que la primera llamada resuelva, comparten el mismo
  // request en vez de disparar dos indexedDB.open() en paralelo - eso podia
  // dejar a uno de los dos con un handle abierto antes de que el otro
  // terminara de crear los object stores nuevos.
  private openPromise: Promise<IDBDatabase> | null = null;

  private openDb(): Promise<IDBDatabase> {
    if (this.db) return Promise.resolve(this.db);
    if (this.openPromise) return this.openPromise;

    this.openPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        const tx = request.transaction;

        // Legacy MangaDex/Jikan/ComicK-era stores — the classic system that
        // wrote to these was removed; the app is now 100% extension-based.
        for (const legacyStore of ['downloaded-chapters', 'downloaded-pages', 'chapter-cache']) {
          if (db.objectStoreNames.contains(legacyStore)) {
            db.deleteObjectStore(legacyStore);
          }
        }

        if (!db.objectStoreNames.contains('reading-history')) {
          const historyStore = db.createObjectStore('reading-history', { keyPath: 'chapterId' });
          historyStore.createIndex('readAt', 'readAt', { unique: false });
        } else if (tx?.objectStore('reading-history').indexNames.contains('mal_id')) {
          // Reading history is no longer keyed by the legacy MyAnimeList id.
          tx.objectStore('reading-history').deleteIndex('mal_id');
        }

        if (!db.objectStoreNames.contains('installed-adapters')) {
          db.createObjectStore('installed-adapters', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('source-library')) {
          db.createObjectStore('source-library', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('source-downloaded-chapters')) {
          const sdcStore = db.createObjectStore('source-downloaded-chapters', { keyPath: 'id' });
          sdcStore.createIndex('mangaId', 'mangaId', { unique: false });
        }

        if (!db.objectStoreNames.contains('source-downloaded-pages')) {
          const sdpStore = db.createObjectStore('source-downloaded-pages', { keyPath: 'id' });
          sdpStore.createIndex('chapterId', 'chapterId', { unique: false });
        }

        if (!db.objectStoreNames.contains('chapter-updates')) {
          const updatesStore = db.createObjectStore('chapter-updates', { keyPath: 'id' });
          updatesStore.createIndex('discoveredAt', 'discoveredAt', { unique: false });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onerror = () => {
        this.openPromise = null;
        reject(request.error);
      };
    });

    return this.openPromise;
  }

  put<T>(storeName: string, value: T): Observable<void> {
    return new Observable(subscriber => {
      this.openDb().then(db => {
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).put(value);
        tx.oncomplete = () => { subscriber.next(); subscriber.complete(); };
        tx.onerror = () => subscriber.error(tx.error);
      }).catch(err => subscriber.error(err));
    });
  }

  get<T>(storeName: string, key: string): Observable<T | undefined> {
    return new Observable(subscriber => {
      this.openDb().then(db => {
        const tx = db.transaction(storeName, 'readonly');
        const request = tx.objectStore(storeName).get(key);
        request.onsuccess = () => { subscriber.next(request.result as T | undefined); subscriber.complete(); };
        request.onerror = () => subscriber.error(request.error);
      }).catch(err => subscriber.error(err));
    });
  }

  getAll<T>(storeName: string): Observable<T[]> {
    return new Observable(subscriber => {
      this.openDb().then(db => {
        const tx = db.transaction(storeName, 'readonly');
        const request = tx.objectStore(storeName).getAll();
        request.onsuccess = () => { subscriber.next(request.result as T[]); subscriber.complete(); };
        request.onerror = () => subscriber.error(request.error);
      }).catch(err => subscriber.error(err));
    });
  }

  getAllByIndex<T>(storeName: string, indexName: string, key: IDBValidKey): Observable<T[]> {
    return new Observable(subscriber => {
      this.openDb().then(db => {
        const tx = db.transaction(storeName, 'readonly');
        const index = tx.objectStore(storeName).index(indexName);
        const request = index.getAll(key);
        request.onsuccess = () => { subscriber.next(request.result as T[]); subscriber.complete(); };
        request.onerror = () => subscriber.error(request.error);
      }).catch(err => subscriber.error(err));
    });
  }

  delete(storeName: string, key: string): Observable<void> {
    return new Observable(subscriber => {
      this.openDb().then(db => {
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).delete(key);
        tx.oncomplete = () => { subscriber.next(); subscriber.complete(); };
        tx.onerror = () => subscriber.error(tx.error);
      }).catch(err => subscriber.error(err));
    });
  }

  deleteByIndex(storeName: string, indexName: string, key: IDBValidKey): Observable<void> {
    return new Observable(subscriber => {
      this.openDb().then(db => {
        const tx = db.transaction(storeName, 'readwrite');
        const index = tx.objectStore(storeName).index(indexName);
        const cursorReq = index.openCursor(key);
        cursorReq.onsuccess = () => {
          const cursor = cursorReq.result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          }
        };
        tx.oncomplete = () => { subscriber.next(); subscriber.complete(); };
        tx.onerror = () => subscriber.error(tx.error);
      }).catch(err => subscriber.error(err));
    });
  }

  estimateStorage(): Observable<{ usage: number; quota: number } | null> {
    return new Observable(subscriber => {
      if (navigator.storage?.estimate) {
        navigator.storage.estimate().then(estimate => {
          subscriber.next({
            usage: estimate.usage ?? 0,
            quota: estimate.quota ?? 0,
          });
          subscriber.complete();
        }).catch(() => { subscriber.next(null); subscriber.complete(); });
      } else {
        subscriber.next(null);
        subscriber.complete();
      }
    });
  }
}
