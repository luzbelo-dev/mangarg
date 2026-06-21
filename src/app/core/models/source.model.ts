export interface MangaSource {
  id: string;
  name: string;
  lang: string;
  version: string;
  icon: string;
  iconColor: string;
  baseUrl: string;
  description: string;
  descriptionEs: string;
  features: string[];
  nsfw: boolean;
}

export interface SourceManga {
  sourceId: string;
  slug: string;
  title: string;
  coverUrl: string;
  description?: string;
  status?: string;
  genres?: string[];
  score?: number;
  contentRating?: string;
}

export interface SourceChapter {
  id: string;
  sourceId: string;
  mangaSlug: string;
  chapterNumber: string;
  title?: string;
  language: string;
  groupName?: string;
  publishDate?: string;
}

export interface SourcePage {
  url: string;
  index: number;
}
