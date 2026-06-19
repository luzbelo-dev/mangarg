import { ChangeDetectionStrategy, Component, inject, input, signal, DestroyRef, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MangaDexService } from '../../../core/services/mangadex.service';
import { ReadingHistoryService } from '../../../core/services/reading-history.service';
import { TranslateService } from '../../../core/i18n/translate.service';
import { MangaDexChapter } from '../../../core/models/mangadex.model';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner';

@Component({
  selector: 'mt-chapter-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LoadingSpinnerComponent],
  templateUrl: './chapter-list.html',
  styleUrl: './chapter-list.scss',
})
export class ChapterListComponent implements OnInit {
  private readonly mangaDexService = inject(MangaDexService);
  private readonly historyService = inject(ReadingHistoryService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly i18n = inject(TranslateService);

  mangaDexId = input.required<string>();
  malId = input.required<number>();

  t = this.i18n.t;
  chapters = signal<MangaDexChapter[]>([]);
  loading = signal(true);
  loadingMore = signal(false);

  ngOnInit(): void {
    this.historyService.loadHistory().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();

    this.mangaDexService.getChapterFeedStreaming(this.mangaDexId()).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(({ chapters, done }) => {
      this.chapters.set(chapters);
      this.loading.set(false);
      this.loadingMore.set(!done);
    });
  }

  isRead(chapterId: string): boolean {
    return this.historyService.isChapterRead(chapterId);
  }

  openChapter(chapter: MangaDexChapter): void {
    this.router.navigate(['/reader', chapter.id], {
      queryParams: {
        malId: this.malId(),
        mangaDexId: this.mangaDexId(),
      },
    });
  }

  getGroupName(chapter: MangaDexChapter): string {
    const group = chapter.relationships?.find(r => r.type === 'scanlation_group');
    return (group?.attributes?.['name'] as string) ?? '—';
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString();
  }

  resumeReading(): void {
    const lastRead = this.historyService.getLastReadChapter(this.malId());
    if (lastRead) {
      this.router.navigate(['/reader', lastRead.chapterId], {
        queryParams: {
          malId: this.malId(),
          mangaDexId: this.mangaDexId(),
        },
      });
    } else if (this.chapters().length > 0) {
      this.openChapter(this.chapters()[0]);
    }
  }
}
