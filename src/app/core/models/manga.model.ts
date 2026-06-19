export interface JikanResponse<T> {
  data: T;
}

export interface JikanPaginatedResponse<T> {
  data: T[];
  pagination: JikanPagination;
}

export interface JikanPagination {
  last_visible_page: number;
  has_next_page: boolean;
  current_page: number;
  items: {
    count: number;
    total: number;
    per_page: number;
  };
}

export interface JikanManga {
  mal_id: number;
  url: string;
  images: JikanImages;
  titles: JikanTitle[];
  title: string;
  title_english: string | null;
  title_japanese: string | null;
  type: string | null;
  chapters: number | null;
  volumes: number | null;
  status: string;
  publishing: boolean;
  published: JikanPublished;
  score: number | null;
  scored_by: number | null;
  rank: number | null;
  popularity: number | null;
  members: number;
  favorites: number;
  synopsis: string | null;
  background: string | null;
  authors: JikanMalEntity[];
  serializations: JikanMalEntity[];
  genres: JikanMalEntity[];
  explicit_genres: JikanMalEntity[];
  themes: JikanMalEntity[];
  demographics: JikanMalEntity[];
  relations?: JikanRelation[];
  external?: JikanExternal[];
}

export interface JikanImages {
  jpg: JikanImageSet;
  webp: JikanImageSet;
}

export interface JikanImageSet {
  image_url: string;
  small_image_url: string;
  large_image_url: string;
}

export interface JikanTitle {
  type: string;
  title: string;
}

export interface JikanPublished {
  from: string | null;
  to: string | null;
  prop: {
    from: { day: number | null; month: number | null; year: number | null };
    to: { day: number | null; month: number | null; year: number | null };
  };
  string: string;
}

export interface JikanMalEntity {
  mal_id: number;
  type: string;
  name: string;
  url: string;
}

export interface JikanRelation {
  relation: string;
  entry: JikanMalEntity[];
}

export interface JikanExternal {
  name: string;
  url: string;
}
