import { Injectable, signal } from '@angular/core';
import { ReaderSettings, ReaderMode } from '../models/reader.model';

const DEFAULT_SETTINGS: ReaderSettings = {
  mode: 'page',
  zoom: 100,
};

const ZOOM_LEVELS = [50, 75, 100, 125, 150, 200];

@Injectable({ providedIn: 'root' })
export class ReaderSettingsService {
  private readonly STORAGE_KEY = 'mt-reader-settings';
  private readonly settingsSignal = signal<ReaderSettings>(this.load());

  readonly settings = this.settingsSignal.asReadonly();
  readonly zoomLevels = ZOOM_LEVELS;

  setMode(mode: ReaderMode): void {
    this.update({ mode });
  }

  setZoom(zoom: number): void {
    this.update({ zoom });
  }

  zoomIn(): void {
    const current = this.settingsSignal().zoom;
    const idx = ZOOM_LEVELS.indexOf(current);
    if (idx < ZOOM_LEVELS.length - 1) {
      this.setZoom(ZOOM_LEVELS[idx + 1]);
    }
  }

  zoomOut(): void {
    const current = this.settingsSignal().zoom;
    const idx = ZOOM_LEVELS.indexOf(current);
    if (idx > 0) {
      this.setZoom(ZOOM_LEVELS[idx - 1]);
    }
  }

  private update(partial: Partial<ReaderSettings>): void {
    const updated = { ...this.settingsSignal(), ...partial };
    this.settingsSignal.set(updated);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
  }

  private load(): ReaderSettings {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    } catch { /* ignore */ }
    return DEFAULT_SETTINGS;
  }
}
