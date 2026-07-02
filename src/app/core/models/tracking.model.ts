export type ThemeMode = 'dark' | 'light';

export type LibraryViewMode = 'grid' | 'list';

export interface ReadingHistory {
  chapterId: string;
  sourceId: string;
  mangaSlug: string;
  mangaTitle: string;
  coverUrl?: string;
  chapterNumber: string | null;
  chapterTitle: string | null;
  lastPage: number;
  totalPages: number;
  readAt: string;
  completed: boolean;
}
