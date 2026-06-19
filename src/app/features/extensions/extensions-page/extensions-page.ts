import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TranslateService } from '../../../core/i18n/translate.service';
import { EXTENSIONS, MangaExtension } from '../../../core/constants/extensions';

@Component({
  selector: 'mt-extensions-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './extensions-page.html',
  styleUrl: './extensions-page.scss',
})
export class ExtensionsPageComponent {
  protected readonly i18n = inject(TranslateService);
  t = this.i18n.t;
  lang = this.i18n.lang;

  activeFilter = signal<'all' | 'reader' | 'source' | 'tracker'>('all');

  get filteredExtensions(): MangaExtension[] {
    const filter = this.activeFilter();
    if (filter === 'all') return EXTENSIONS;
    return EXTENSIONS.filter(e => e.category === filter);
  }

  setFilter(filter: 'all' | 'reader' | 'source' | 'tracker'): void {
    this.activeFilter.set(filter);
  }

  getDescription(ext: MangaExtension): string {
    return this.lang() === 'es' ? ext.description : ext.descriptionEn;
  }

  getCategoryLabel(category: string): string {
    const labels: Record<string, Record<string, string>> = {
      reader: { es: 'Lector', en: 'Reader' },
      source: { es: 'Fuente', en: 'Source' },
      tracker: { es: 'Tracker', en: 'Tracker' },
    };
    return labels[category]?.[this.lang()] ?? category;
  }
}
