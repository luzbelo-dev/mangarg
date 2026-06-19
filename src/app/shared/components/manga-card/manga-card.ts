import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ScoreBadgeComponent } from '../score-badge/score-badge';
import { TruncatePipe } from '../../pipes/truncate.pipe';
import { JikanManga } from '../../../core/models/manga.model';

@Component({
  selector: 'mt-manga-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ScoreBadgeComponent, TruncatePipe],
  templateUrl: './manga-card.html',
  styleUrl: './manga-card.scss',
})
export class MangaCardComponent {
  manga = input.required<JikanManga>();
  isFavorite = input(false);

  favoriteToggled = output<JikanManga>();
  cardClicked = output<number>();

  displayTitle = computed(() => this.manga().title_english ?? this.manga().title);
  coverUrl = computed(() => this.manga().images.jpg.image_url);
  displayGenres = computed(() => this.manga().genres.slice(0, 3));

  onCardClick(): void {
    this.cardClicked.emit(this.manga().mal_id);
  }

  onFavoriteClick(event: Event): void {
    event.stopPropagation();
    this.favoriteToggled.emit(this.manga());
  }
}
