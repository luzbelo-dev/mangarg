import { ChangeDetectionStrategy, Component, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { from } from 'rxjs';
import { AdapterLoaderService } from '../../../core/services/adapter-loader.service';
import { TranslateService } from '../../../core/i18n/translate.service';
import { MangaAdapterInstance, MangaDetail } from '../../../core/models/adapter.model';
import { SourceChapter } from '../../../core/models/source.model';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner';

@Component({
  selector: 'mt-source-manga',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LoadingSpinnerComponent],
  templateUrl: './source-manga.html',
  styleUrl: './source-manga.scss',
})
export class SourceMangaComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly adapterLoader = inject(AdapterLoaderService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly i18n = inject(TranslateService);

  t = this.i18n.t;
  lang = this.i18n.lang;

  adapter = signal<MangaAdapterInstance | null>(null);
  manga = signal<MangaDetail | null>(null);
  chapters = signal<SourceChapter[]>([]);
  loading = signal(true);
  loadingChapters = signal(true);
  error = signal<string | null>(null);
  descriptionExpanded = signal(false);

  private sourceId = '';
  private slug = '';

  ngOnInit(): void {
    this.route.params
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        this.sourceId = params['sourceId'];
        this.slug = params['slug'];

        const instance = this.adapterLoader.getAdapter(this.sourceId);
        this.adapter.set(instance);

        if (instance) {
          this.loadMangaDetail(instance);
          this.loadChapters(instance);
        } else {
          this.loading.set(false);
          this.loadingChapters.set(false);
          this.error.set(
            this.lang() === 'es'
              ? 'Extensión no encontrada o no instalada'
              : 'Extension not found or not installed'
          );
        }
      });
  }

  private loadMangaDetail(instance: MangaAdapterInstance): void {
    if (!instance.getMangaDetail) {
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    from(instance.getMangaDetail(this.slug))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (detail) => {
          this.manga.set(detail);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Failed to load manga detail:', err);
          this.error.set(
            this.lang() === 'es'
              ? 'Error al cargar los detalles del manga'
              : 'Failed to load manga details'
          );
          this.loading.set(false);
        },
      });
  }

  private loadChapters(instance: MangaAdapterInstance): void {
    this.loadingChapters.set(true);

    from(instance.getChapters(this.slug))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (chapters) => {
          const sorted = [...chapters].sort((a, b) => {
            const numA = parseFloat(a.chapterNumber) || 0;
            const numB = parseFloat(b.chapterNumber) || 0;
            return numA - numB;
          });
          this.chapters.set(sorted);
          this.loadingChapters.set(false);
        },
        error: (err) => {
          console.error('Failed to load chapters:', err);
          this.loadingChapters.set(false);
        },
      });
  }

  toggleDescription(): void {
    this.descriptionExpanded.update(v => !v);
  }

  onChapterClick(chapter: SourceChapter): void {
    this.router.navigate(
      ['/source', this.sourceId, 'reader', chapter.id],
      {
        queryParams: {
          manga: this.slug,
          ch: chapter.chapterNumber,
        },
      }
    );
  }

  onCoverError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(this.lang() === 'es' ? 'es-ES' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }

  get sourceName(): string {
    return this.adapter()?.name ?? '';
  }

  get isDescriptionLong(): boolean {
    const desc = this.manga()?.description;
    return !!desc && desc.length > 300;
  }

  get truncatedDescription(): string {
    const desc = this.manga()?.description;
    if (!desc) return '';
    if (this.descriptionExpanded() || desc.length <= 300) return desc;
    return desc.substring(0, 300) + '...';
  }

  get statusLabel(): string {
    const status = this.manga()?.status;
    if (!status) return '';

    const lower = status.toLowerCase();
    if (lower === 'ongoing' || lower === 'publishing') {
      return this.lang() === 'es' ? 'En curso' : 'Ongoing';
    }
    if (lower === 'completed' || lower === 'finished') {
      return this.lang() === 'es' ? 'Completado' : 'Completed';
    }
    if (lower === 'hiatus') {
      return this.lang() === 'es' ? 'En pausa' : 'Hiatus';
    }
    if (lower === 'cancelled' || lower === 'canceled') {
      return this.lang() === 'es' ? 'Cancelado' : 'Cancelled';
    }
    return status;
  }

  get statusClass(): string {
    const status = this.manga()?.status?.toLowerCase() ?? '';
    if (status === 'ongoing' || status === 'publishing') return 'ongoing';
    if (status === 'completed' || status === 'finished') return 'completed';
    if (status === 'hiatus') return 'hiatus';
    if (status === 'cancelled' || status === 'canceled') return 'cancelled';
    return '';
  }

  goBack(): void {
    this.router.navigate(['/source', this.sourceId]);
  }
}
