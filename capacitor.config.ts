import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mimangadinamita.app',
  appName: 'Mi Manga Dinamita',
  webDir: 'dist/manga-tracker/browser',
  server: {
    androidScheme: 'https',
    allowNavigation: ['*'],
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
