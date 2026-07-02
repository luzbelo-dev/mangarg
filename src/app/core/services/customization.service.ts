import { Injectable, signal, computed } from '@angular/core';

export interface AccentPreset {
  name: string;
  color: string;
}

export interface FontPreset {
  name: string;
  value: string;
}

export const ACCENT_PRESETS: AccentPreset[] = [
  { name: 'Rojo', color: '#e63946' },
  { name: 'Azul', color: '#3b82f6' },
  { name: 'Verde', color: '#22c55e' },
  { name: 'Violeta', color: '#8b5cf6' },
  { name: 'Naranja', color: '#f97316' },
  { name: 'Rosa', color: '#ec4899' },
  { name: 'Cyan', color: '#06b6d4' },
  { name: 'Amarillo', color: '#eab308' },
];

export const FONT_PRESETS: FontPreset[] = [
  { name: 'Inter', value: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" },
  { name: 'System', value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
  { name: 'Serif', value: "Georgia, 'Times New Roman', serif" },
  { name: 'Mono', value: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace" },
];

interface CustomizationState {
  accentColor: string;
  fontFamily: string;
}

@Injectable({ providedIn: 'root' })
export class CustomizationService {
  private readonly STORAGE_KEY = 'mt-customization';
  private readonly state = signal<CustomizationState>(this.load());

  readonly accentColor = computed(() => this.state().accentColor);
  readonly fontFamily = computed(() => this.state().fontFamily);

  constructor() {
    this.apply(this.state());
  }

  setAccentColor(color: string): void {
    this.state.update(s => ({ ...s, accentColor: color }));
    this.apply(this.state());
    this.save();
  }

  setFontFamily(font: string): void {
    this.state.update(s => ({ ...s, fontFamily: font }));
    this.apply(this.state());
    this.save();
  }

  reset(): void {
    this.state.set({ accentColor: '#e63946', fontFamily: FONT_PRESETS[0].value });
    this.apply(this.state());
    this.save();
  }

  private apply(s: CustomizationState): void {
    const root = document.documentElement;
    root.style.setProperty('--accent', s.accentColor);
    root.style.setProperty('--accent-hover', this.adjustBrightness(s.accentColor, 15));
    root.style.setProperty('--accent-light', this.toRgba(s.accentColor, 0.08));
    root.style.setProperty('--favorite', s.accentColor);
    root.style.setProperty('--spark-color', s.accentColor);
    root.style.setProperty('--gradient-accent', `linear-gradient(135deg, ${s.accentColor}, ${this.adjustBrightness(s.accentColor, 30)})`);
    root.style.setProperty('--glow-accent', `0 0 20px ${this.toRgba(s.accentColor, 0.15)}`);
    document.body.style.fontFamily = s.fontFamily;
  }

  private save(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state()));
  }

  private load(): CustomizationState {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          accentColor: parsed.accentColor || '#e63946',
          fontFamily: parsed.fontFamily || FONT_PRESETS[0].value,
        };
      }
    } catch { /* ignore */ }
    return { accentColor: '#e63946', fontFamily: FONT_PRESETS[0].value };
  }

  private toRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private adjustBrightness(hex: string, percent: number): string {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    r = Math.min(255, Math.round(r + (255 - r) * (percent / 100)));
    g = Math.min(255, Math.round(g + (255 - g) * (percent / 100)));
    b = Math.min(255, Math.round(b + (255 - b) * (percent / 100)));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
}
