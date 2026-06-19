export interface DownloadedChapter {
  chapterId: string;
  mal_id: number;
  mangaDexId: string;
  chapterNumber: string | null;
  chapterTitle: string | null;
  totalPages: number;
  downloadedAt: string;
  sizeBytes: number;
}

export interface DownloadedPage {
  id: string;
  chapterId: string;
  pageIndex: number;
  blob: Blob;
  mimeType: string;
}
