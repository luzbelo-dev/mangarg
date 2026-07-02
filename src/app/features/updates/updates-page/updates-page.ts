import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '../../../core/i18n/translate.service';
import { UpdatesService } from '../../../core/services/updates.service';
import { UpdateEntry } from '../../../core/models/update.model';

@Component({
  selector: 'mt-updates-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="updates">
      <div class="updates__header">
        <h1 class="updates__title">{{ t().updates.title }}</h1>
        <div class="updates__actions">
          @if (feed().length > 0) {
            <button class="updates__mark-all-btn" (click)="markAllRead()">
              {{ t().updates.markAllRead }}
            </button>
          }
          <button class="updates__refresh-btn" [disabled]="checking()" (click)="refresh()">
            @if (checking()) {
              <span class="updates__spinner"></span>
            } @else {
              {{ t().updates.refresh }}
            }
          </button>
        </div>
      </div>

      @if (feed().length > 0) {
        <div class="updates__list">
          @for (entry of feed(); track entry.id) {
            <button class="updates__item" [class.unread]="!entry.read" (click)="openChapter(entry)">
              <div class="updates__cover">
                @if (entry.coverUrl) {
                  <img [src]="entry.coverUrl" [alt]="entry.mangaTitle" loading="lazy" />
                } @else {
                  <div class="updates__cover-placeholder">{{ entry.mangaTitle.charAt(0) }}</div>
                }
              </div>
              <div class="updates__info">
                <span class="updates__manga-title">{{ entry.mangaTitle }}</span>
                <span class="updates__chapter-line">
                  {{ lang() === 'es' ? 'Cap.' : 'Ch.' }} {{ entry.chapterNumber }}
                  @if (entry.chapterTitle) { — {{ entry.chapterTitle }} }
                </span>
                <span class="updates__time">{{ timeAgo(entry.discoveredAt) }}</span>
              </div>
              @if (!entry.read) {
                <span class="updates__dot"></span>
              }
            </button>
          }
        </div>
      } @else {
        <div class="updates__empty">
          <p>{{ t().updates.empty }}</p>
          <button class="updates__refresh-btn" [disabled]="checking()" (click)="refresh()">
            {{ t().updates.refresh }}
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .updates {
      padding: 24px 0 40px;

      &__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 16px;
        flex-wrap: wrap;
      }

      &__title {
        font-size: 2rem;
        font-weight: 700;
      }

      &__actions {
        display: flex;
        gap: 8px;
      }

      &__mark-all-btn, &__refresh-btn {
        padding: 8px 14px;
        min-height: 36px;
        border-radius: 6px;
        border: 1px solid var(--border-color);
        background: var(--bg-card);
        color: var(--text-primary);
        font-size: 0.8rem;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;

        &:hover { border-color: var(--accent); }
        &:disabled { opacity: 0.6; cursor: default; }
      }

      &__spinner {
        width: 14px;
        height: 14px;
        border: 2px solid var(--border-color);
        border-top-color: var(--accent);
        border-radius: 50%;
        animation: updates-spin 0.8s linear infinite;
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
        position: relative;

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

      &__dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--accent);
        flex-shrink: 0;
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

    @keyframes updates-spin {
      to { transform: rotate(360deg); }
    }
  `,
})
export class UpdatesPageComponent implements OnInit {
  protected readonly i18n = inject(TranslateService);
  private readonly updatesService = inject(UpdatesService);
  private readonly router = inject(Router);

  t = this.i18n.t;
  lang = this.i18n.lang;

  feed = this.updatesService.getFeed();
  checking = this.updatesService.isChecking;

  async ngOnInit(): Promise<void> {
    await this.updatesService.init();
  }

  async refresh(): Promise<void> {
    await this.updatesService.checkForUpdates();
  }

  async markAllRead(): Promise<void> {
    await this.updatesService.markAllRead();
  }

  async openChapter(entry: UpdateEntry): Promise<void> {
    await this.updatesService.markRead(entry.id);
    this.router.navigate(
      ['/source', entry.sourceId, 'reader', entry.chapterId],
      { queryParams: { manga: entry.mangaSlug, ch: entry.chapterNumber } }
    );
  }

  timeAgo(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diffMs / 60000);
    const es = this.lang() === 'es';
    if (minutes < 1) return es ? 'ahora' : 'just now';
    if (minutes < 60) return es ? `hace ${minutes}m` : `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return es ? `hace ${hours}h` : `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return es ? `hace ${days}d` : `${days}d ago`;
  }
}
