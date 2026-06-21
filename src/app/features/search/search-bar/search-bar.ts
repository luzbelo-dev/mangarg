import { ChangeDetectionStrategy, Component, inject, output, signal, DestroyRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, filter, switchMap, tap, catchError, of } from 'rxjs';
import { JikanService } from '../../../core/services/jikan.service';
import { JikanManga } from '../../../core/models/manga.model';
import { SearchStateService } from '../../../core/services/search-state.service';
import { TranslateService } from '../../../core/i18n/translate.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner';

@Component({
  selector: 'mt-search-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, LoadingSpinnerComponent],
  templateUrl: './search-bar.html',
  styleUrl: './search-bar.scss',
})
export class SearchBarComponent implements OnInit {
  private readonly jikanService = inject(JikanService);
  private readonly searchState = inject(SearchStateService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly i18n = inject(TranslateService);

  searchControl = new FormControl('', { nonNullable: true });
  loading = signal(false);
  error = signal<string | null>(null);
  t = this.i18n.t;

  searchResults = output<JikanManga[]>();
  queryChanged = output<string>();
  searchStarted = output<void>();

  ngOnInit(): void {
    if (this.searchState.query) {
      this.searchControl.setValue(this.searchState.query, { emitEvent: false });
    }

    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(query => {
        if (query.length < 3) {
          this.searchResults.emit([]);
          this.queryChanged.emit('');
          this.searchState.save('', []);
          this.loading.set(false);
        }
      }),
      filter(query => query.length >= 3),
      tap(query => {
        this.loading.set(true);
        this.error.set(null);
        this.searchStarted.emit();
        this.queryChanged.emit(query);
      }),
      switchMap(query =>
        this.jikanService.searchManga(query).pipe(
          catchError(() => {
            this.error.set(this.t().search.error);
            return of({ data: [] as JikanManga[], pagination: null });
          })
        )
      ),
      tap(() => this.loading.set(false)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(response => {
      this.searchResults.emit(response.data);
      this.searchState.save(this.searchControl.value, response.data);
    });
  }

  clearSearch(): void {
    this.searchControl.setValue('');
    this.searchResults.emit([]);
    this.queryChanged.emit('');
    this.searchState.clear();
    this.error.set(null);
  }
}
