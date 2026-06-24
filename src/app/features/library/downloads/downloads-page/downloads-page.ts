import { ChangeDetectionStrategy, Component, inject, signal, OnInit, computed } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '../../../../core/i18n/translate.service';
import { SourceDownloadService, SourceDownloadedChapter } from '../../../../core/services/source-download.service';

@Component({
  selector: 'mt-downloads-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="downloads">
      <h1 class="downloads__title">{{ t().library.downloads }}</h1>

      @if (groupedDownloads().length > 0) {
        <div class="downloads__storage">
          <span class="downloads__storage-label">{{ t().library.storageUsed }}:</span>
          <span class="downloads__storage-value">{{ totalSize() }}</span>
        </div>

        @for (group of groupedDownloads(); track group.mangaId) {
          <div class="downloads__group">
            <div class="downloads__group-header">
              <h2 class="downloads__group-title" (click)="navigateToManga(group.chapters[0])">
                {{ group.mangaTitle }}
              </h2>
              <button class="downloads__delete-all-btn" (click)="deleteAllForManga(group.chapters[0])">
                {{ t().library.deleteAllDownloads }}
              </button>
            </div>

            @for (ch of group.chapters; track ch.id) {
              <div class="downloads__chapter">
                <div class="downloads__chapter-info" (click)="navigateToReader(ch)">
                  <span class="downloads__chapter-number">
                    {{ lang() === 'es' ? 'Cap.' : 'Ch.' }} {{ ch.chapterNumber }}
                  </span>
                  @if (ch.chapterTitle) {
                    <span class="downloads__chapter-title">{{ ch.chapterTitle }}</span>
                  }
                  <span class="downloads__chapter-meta">
                    {{ ch.totalPages }} {{ lang() === 'es' ? 'paginas' : 'pages' }}
                    · {{ formatBytes(ch.sizeBytes) }}
                  </span>
                </div>
                <button class="downloads__chapter-delete" (click)="deleteChapter(ch.id)">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              </div>
            }
          </div>
        }
      } @else {
        <p class="downloads__empty">{{ lang() === 'es' ? 'No hay capitulos descargados' : 'No downloaded chapters' }}</p>
      }
    </div>
  `,
  styles: `
    .downloads {
      padding: 24px 0;

      &__title {
        font-size: 2rem;
        font-weight: 700;
        margin-bottom: 16px;
      }

      &__storage {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        border-radius: 8px;
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        margin-bottom: 24px;
        font-size: 0.85rem;
      }

      &__storage-label {
        color: var(--text-muted);
      }

      &__storage-value {
        font-weight: 600;
        color: var(--text-primary);
      }

      &__group {
        margin-bottom: 24px;
      }

      &__group-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 0;
        border-bottom: 1px solid var(--border-color);
        margin-bottom: 8px;
      }

      &__group-title {
        font-size: 1rem;
        font-weight: 700;
        cursor: pointer;
        color: var(--text-primary);
        &:hover { color: var(--accent); }
      }

      &__delete-all-btn {
        padding: 8px 12px;
        min-height: 36px;
        border-radius: 6px;
        border: 1px solid #e74c3c;
        background: transparent;
        color: #e74c3c;
        font-size: 0.75rem;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
        &:hover { background: rgba(231, 76, 60, 0.1); }
        &:active { background: rgba(231, 76, 60, 0.2); }
      }

      &__chapter {
        display: flex;
        align-items: center;
        padding: 12px 8px;
        border-bottom: 1px solid var(--border-color);
        gap: 12px;
      }

      &__chapter-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
        cursor: pointer;
        min-width: 0;
        &:hover .downloads__chapter-number { color: var(--accent); }
      }

      &__chapter-number {
        font-size: 0.88rem;
        font-weight: 600;
        transition: color 0.15s;
      }

      &__chapter-title {
        font-size: 0.78rem;
        color: var(--text-secondary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      &__chapter-meta {
        font-size: 0.72rem;
        color: var(--text-muted);
      }

      &__chapter-delete {
        width: 44px;
        height: 44px;
        min-width: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: none;
        background: none;
        color: var(--text-muted);
        cursor: pointer;
        border-radius: 8px;
        transition: all 0.2s ease;
        &:hover { color: #e74c3c; background: rgba(231, 76, 60, 0.1); }
        &:active { color: #e74c3c; background: rgba(231, 76, 60, 0.2); }
      }

      &__empty {
        color: var(--text-muted);
        margin-top: 24px;
        text-align: center;
        padding: 40px 20px;
      }
    }
  `,
})
export class DownloadsPageComponent implements OnInit {
  protected readonly i18n = inject(TranslateService);
  private readonly sourceDownload = inject(SourceDownloadService);
  private readonly router = inject(Router);

  t = this.i18n.t;
  lang = this.i18n.lang;

  deleteTrigger = signal(0);

  groupedDownloads = computed(() => {
    this.deleteTrigger();
    const chapters = this.sourceDownload.downloadedChapters();
    const groups = new Map<string, { mangaId: string; mangaTitle: string; chapters: SourceDownloadedChapter[] }>();

    for (const ch of chapters) {
      const existing = groups.get(ch.mangaId);
      if (existing) {
        existing.chapters.push(ch);
      } else {
        groups.set(ch.mangaId, {
          mangaId: ch.mangaId,
          mangaTitle: ch.mangaTitle,
          chapters: [ch],
        });
      }
    }

    // Sort chapters within each group
    for (const group of groups.values()) {
      group.chapters.sort((a, b) => {
        const numA = parseFloat(a.chapterNumber) || 0;
        const numB = parseFloat(b.chapterNumber) || 0;
        return numA - numB;
      });
    }

    return [...groups.values()];
  });

  totalSize = computed(() => {
    this.deleteTrigger();
    const chapters = this.sourceDownload.downloadedChapters();
    const total = chapters.reduce((sum, c) => sum + c.sizeBytes, 0);
    return this.sourceDownload.formatBytes(total);
  });

  async ngOnInit(): Promise<void> {
    await this.sourceDownload.init();
  }

  formatBytes(bytes: number): string {
    return this.sourceDownload.formatBytes(bytes);
  }

  async deleteChapter(chapterId: string): Promise<void> {
    await this.sourceDownload.deleteChapter(chapterId);
    this.deleteTrigger.update(v => v + 1);
  }

  async deleteAllForManga(ch: SourceDownloadedChapter): Promise<void> {
    await this.sourceDownload.deleteAllForManga(ch.sourceId, ch.mangaSlug);
    this.deleteTrigger.update(v => v + 1);
  }

  navigateToManga(ch: SourceDownloadedChapter): void {
    this.router.navigate(['/source', ch.sourceId, 'manga', ch.mangaSlug]);
  }

  navigateToReader(ch: SourceDownloadedChapter): void {
    this.router.navigate(
      ['/source', ch.sourceId, 'reader', ch.id],
      { queryParams: { manga: ch.mangaSlug, ch: ch.chapterNumber } }
    );
  }
}
