export interface UpdateEntry {
  id: string; // sourceId::mangaSlug::chapterId
  sourceId: string;
  mangaSlug: string;
  mangaTitle: string;
  coverUrl: string;
  chapterId: string;
  chapterNumber: string;
  chapterTitle?: string;
  discoveredAt: string;
  read: boolean;
}
