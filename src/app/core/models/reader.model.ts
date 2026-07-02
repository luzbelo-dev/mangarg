export type ReaderMode = 'page' | 'page-rtl' | 'page-vertical' | 'longstrip';

export interface ReaderSettings {
  mode: ReaderMode;
  zoom: number;
}
