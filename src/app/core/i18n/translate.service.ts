import { Injectable, signal, computed } from '@angular/core';
import { translations, type Lang, type Translations } from './translations';

@Injectable({ providedIn: 'root' })
export class TranslateService {
  private readonly STORAGE_KEY = 'mt-lang';
  private readonly langSignal = signal<Lang>(this.loadLang());

  readonly lang = this.langSignal.asReadonly();
  readonly t = computed<Translations>(() => translations[this.langSignal()]);

  setLang(lang: Lang): void {
    this.langSignal.set(lang);
    localStorage.setItem(this.STORAGE_KEY, lang);
    document.documentElement.lang = lang;
  }

  private loadLang(): Lang {
    const stored = localStorage.getItem(this.STORAGE_KEY) as Lang | null;
    if (stored && stored in translations) return stored;
    return 'es';
  }
}
