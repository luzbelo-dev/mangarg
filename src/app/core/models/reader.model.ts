export type ReaderMode = 'page' | 'longstrip';
export type ImageQuality = 'full' | 'dataSaver';
export type FitMode = 'width' | 'height' | 'original';

export interface ReaderSettings {
  mode: ReaderMode;
  quality: ImageQuality;
  fitMode: FitMode;
  zoom: number;
}

export interface ChapterImages {
  baseUrl: string;
  hash: string;
  filenameFull: string[];
  filenameSaver: string[];
  expiresAt: number;
}
