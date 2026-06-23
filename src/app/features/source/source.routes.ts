import { Routes } from '@angular/router';

export const SOURCE_ROUTES: Routes = [
  {
    path: ':sourceId',
    loadComponent: () =>
      import('./source-browse/source-browse').then(m => m.SourceBrowseComponent),
  },
  {
    path: ':sourceId/manga/:slug',
    loadComponent: () =>
      import('./source-manga/source-manga').then(m => m.SourceMangaComponent),
  },
  {
    path: ':sourceId/reader/:chapterId',
    loadComponent: () =>
      import('./source-reader/source-reader').then(m => m.SourceReaderComponent),
  },
];
