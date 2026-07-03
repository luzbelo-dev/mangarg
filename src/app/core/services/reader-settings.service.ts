import { Injectable, signal } from '@angular/core';
import { ReaderSettings, ReaderMode } from '../models/reader.model';

const DEFAULT_SETTINGS: ReaderSettings = {
  mode: 'page',
  zoom: 100,
};

// El zoom del longstrip es continuo (el pinch guarda cualquier valor); estos
// niveles son solo los pasos de los botones +/-.
const ZOOM_LEVELS = [50, 75, 100, 125, 150, 200, 250, 300];
const MIN_ZOOM = 50;
const MAX_ZOOM = 300;

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
    this.update({ zoom: clampZoom(zoom) });
  }

  // Busca el nivel vecino en vez de indexOf: el zoom guardado puede ser
  // cualquier valor intermedio (pinch continuo o versiones viejas) y con
  // indexOf los botones quedaban muertos o saltaban a 50.
  zoomIn(): void {
    const current = this.settingsSignal().zoom;
    const next = ZOOM_LEVELS.find(l => l > current);
    if (next !== undefined) this.setZoom(next);
  }

  zoomOut(): void {
    const current = this.settingsSignal().zoom;
    const lower = ZOOM_LEVELS.filter(l => l < current);
    if (lower.length > 0) this.setZoom(lower[lower.length - 1]);
  }

  private update(partial: Partial<ReaderSettings>): void {
    const updated = { ...this.settingsSignal(), ...partial };
    this.settingsSignal.set(updated);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
  }

  private load(): ReaderSettings {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
        parsed.zoom = clampZoom(parsed.zoom);
        return parsed;
      }
    } catch { /* ignore */ }
    return DEFAULT_SETTINGS;
  }
}

function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return 100;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(zoom)));
}
