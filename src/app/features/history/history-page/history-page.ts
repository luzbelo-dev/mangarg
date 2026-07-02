import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslateService } from '../../../core/i18n/translate.service';
import { ReadingHistoryService } from '../../../core/services/reading-history.service';
import { ReadingHistory } from '../../../core/models/tracking.model';

const HISTORY_LIMIT = 100;

@Component({
  selector: 'mt-history-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="history">
      <div class="history__header">
        <h1 class="history__title">{{ t().history.title }}</h1>
        @if (entries().length > 0) {
          <button class="history__clear-btn" (click)="clear()">{{ t().history.clear }}</button>
        }
      </div>

      @if (entries().length > 0) {
        <div class="history__list">
          @for (entry of entries(); track entry.chapterId) {
            <button class="history__item" (click)="resume(entry)">
              <div class="history__cover">
                @if (entry.coverUrl) {
                  <img [src]="entry.coverUrl" [alt]="entry.mangaTitle" loading="lazy" />
                } @else {
                  <div class="history__cover-placeholder">{{ entry.mangaTitle.charAt(0) }}</div>
                }
              </div>
              <div class="history__info">
                <span class="history__manga-title">{{ entry.mangaTitle }}</span>
                <span class="history__chapter-line">
                  {{ lang() === 'es' ? 'Cap.' : 'Ch.' }} {{ entry.chapterNumber }}
                  @if (!entry.completed) {
                    · {{ lang() === 'es' ? 'pag.' : 'p.' }} {{ entry.lastPage + 1 }}/{{ entry.totalPages }}
                  }
                </span>
                <span class="history__time">{{ t().history.lastRead }}: {{ formatDate(entry.readAt) }}</span>
              </div>
            </button>
          }
        </div>
      } @else {
        <div class="history__empty">
          <p>{{ t().history.empty }}</p>
        </div>
      }
    </div>
  `,
  styles: `
    .history {
      padding: 24px 0 40px;

      &__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 16px;
      }

      &__title {
        font-size: 2rem;
        font-weight: 700;
      }

      &__clear-btn {
        padding: 8px 14px;
        min-height: 36px;
        border-radius: 6px;
        border: 1px solid var(--border-color);
        background: var(--bg-card);
        color: var(--text-secondary);
        font-size: 0.8rem;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;

        &:hover { border-color: #e74c3c; color: #e74c3c; }
      }

      &__list {
        display: flex;
        flex-direction: column;
      }

      &__item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 8px;
        border: none;
        border-bottom: 1px solid var(--border-color);
        background: none;
        text-align: left;
        cursor: pointer;
        font-family: inherit;
        color: var(--text-primary);

        &:hover, &:active { background: var(--accent-light); }
      }

      &__cover {
        width: 44px;
        height: 60px;
        flex-shrink: 0;
        border-radius: 6px;
        overflow: hidden;
        background: var(--bg-input);

        img { width: 100%; height: 100%; object-fit: cover; display: block; }
      }

      &__cover-placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        color: var(--text-muted);
      }

      &__info {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      &__manga-title {
        font-size: 0.9rem;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      &__chapter-line {
        font-size: 0.8rem;
        color: var(--text-secondary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      &__time {
        font-size: 0.72rem;
        color: var(--text-muted);
      }

      &__empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
        padding: 60px 20px;
        color: var(--text-muted);
        text-align: center;
      }
    }
  `,
})
export class HistoryPageComponent implements OnInit {
  protected readonly i18n = inject(TranslateService);
  private readonly readingHistory = inject(ReadingHistoryService);
  private readonly router = inject(Router);

  t = this.i18n.t;
  lang = this.i18n.lang;

  entries = toSignal(this.readingHistory.getRecentHistory(HISTORY_LIMIT), { initialValue: [] as ReadingHistory[] });

  ngOnInit(): void {
    this.readingHistory.loadHistory().subscribe();
  }

  resume(entry: ReadingHistory): void {
    this.router.navigate(
      ['/source', entry.sourceId, 'reader', entry.chapterId],
      {
        queryParams: {
          manga: entry.mangaSlug,
          ch: entry.chapterNumber,
          title: entry.mangaTitle,
          cover: entry.coverUrl,
          resume: entry.completed ? undefined : entry.lastPage,
        },
      }
    );
  }

  async clear(): Promise<void> {
    await new Promise<void>(resolve => this.readingHistory.clearHistory().subscribe(() => resolve()));
  }

  formatDate(iso: string): string {
    const date = new Date(iso);
    return date.toLocaleDateString(this.lang() === 'es' ? 'es-ES' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
