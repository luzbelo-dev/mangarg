import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SourceLibraryService, SourceLibraryEntry } from '../../../core/services/source-library.service';
import { TranslateService } from '../../../core/i18n/translate.service';
import { LibraryViewMode } from '../../../core/models/tracking.model';

@Component({
  selector: 'mt-library-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './library-page.html',
  styleUrl: './library-page.scss',
})
export class LibraryPageComponent implements OnInit {
  private readonly sourceLibrary = inject(SourceLibraryService);
  private readonly router = inject(Router);
  protected readonly i18n = inject(TranslateService);

  t = this.i18n.t;
  lang = this.i18n.lang;

  viewMode = signal<LibraryViewMode>('grid');

  sourceEntries = computed(() => this.sourceLibrary.allEntries());

  ngOnInit(): void {
    this.sourceLibrary.init();
  }

  onSourceCardClick(entry: SourceLibraryEntry): void {
    this.router.navigate(['/source', entry.sourceId, 'manga', entry.slug]);
  }

  async onRemoveSource(entry: SourceLibraryEntry): Promise<void> {
    await this.sourceLibrary.remove(entry.sourceId, entry.slug);
  }

  goToExtensions(): void {
    this.router.navigate(['/extensions']);
  }

  toggleView(): void {
    this.viewMode.update(v => v === 'grid' ? 'list' : 'grid');
  }
}
