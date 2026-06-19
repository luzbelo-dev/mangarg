export interface FavoriteManga {
  mal_id: number;
  title: string;
  title_english: string | null;
  image_url: string;
  score: number | null;
  status: string;
  chapters: number | null;
  genres: string[];
  addedAt: string;
}

export interface ChapterProgress {
  mal_id: number;
  currentChapter: number;
  totalChapters: number | null;
  lastUpdated: string;
  mangaDexId: string | null;
}

export type ThemeMode = 'dark' | 'light';

export type LibraryCategory = 'reading' | 'plan_to_read' | 'completed' | 'on_hold' | 'dropped';
export type LibrarySortBy = 'last_read' | 'title' | 'unread_count' | 'date_added';
export type LibraryViewMode = 'grid' | 'list';

export interface LibraryManga {
  mal_id: number;
  mangaDexId: string | null;
  title: string;
  title_english: string | null;
  image_url: string;
  score: number | null;
  status: string;
  chapters: number | null;
  genres: string[];
  addedAt: string;
  category: LibraryCategory;
  lastReadAt: string | null;
  totalChaptersFetched: number;
}

export interface ReadingHistory {
  chapterId: string;
  mal_id: number;
  mangaDexId: string;
  chapterNumber: string | null;
  chapterTitle: string | null;
  lastPage: number;
  totalPages: number;
  readAt: string;
  completed: boolean;
}
