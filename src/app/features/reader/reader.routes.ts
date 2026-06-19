import { Routes } from '@angular/router';

export const READER_ROUTES: Routes = [
  {
    path: ':chapterId',
    loadComponent: () =>
      import('./manga-reader/manga-reader').then(m => m.MangaReaderComponent),
  },
];
