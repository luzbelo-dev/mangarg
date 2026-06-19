export interface MangaExtension {
  name: string;
  description: string;
  descriptionEn: string;
  platforms: string[];
  url: string;
  category: 'reader' | 'source' | 'tracker';
  features: string[];
}

export const EXTENSIONS: MangaExtension[] = [
  {
    name: 'Mihon (Tachiyomi)',
    description: 'El sucesor de Tachiyomi. Lector de manga con cientos de extensiones de fuentes.',
    descriptionEn: 'Tachiyomi successor. Manga reader with hundreds of source extensions.',
    platforms: ['Android'],
    url: 'https://mihon.app',
    category: 'reader',
    features: ['Extensiones', 'Offline', 'Tracking', 'Backup'],
  },
  {
    name: 'TachiyomiSY',
    description: 'Fork de Tachiyomi con funciones extra: lectura mejorada, recomendaciones.',
    descriptionEn: 'Tachiyomi fork with extra features: enhanced reading, recommendations.',
    platforms: ['Android'],
    url: 'https://mihon.app/forks/TachiyomiSY/',
    category: 'reader',
    features: ['Extensiones', 'Recomendaciones', 'Merge de fuentes'],
  },
  {
    name: 'Paperback',
    description: 'Lector de manga para iOS con soporte de extensiones y tracking.',
    descriptionEn: 'Manga reader for iOS with extension support and tracking.',
    platforms: ['iOS'],
    url: 'https://paperback.moe',
    category: 'reader',
    features: ['Extensiones', 'Tracking', 'iCloud sync'],
  },
  {
    name: 'Kotatsu',
    description: 'Lector de manga open source para Android. Interfaz Material Design.',
    descriptionEn: 'Open source manga reader for Android. Material Design interface.',
    platforms: ['Android'],
    url: 'https://kotatsu.app',
    category: 'reader',
    features: ['Open source', 'Material Design', 'Offline'],
  },
  {
    name: 'Suwayomi',
    description: 'Servidor de manga para PC. Usa extensiones de Tachiyomi desde el navegador.',
    descriptionEn: 'Manga server for PC. Uses Tachiyomi extensions from the browser.',
    platforms: ['Windows', 'Mac', 'Linux'],
    url: 'https://github.com/Suwayomi/Suwayomi-Server',
    category: 'reader',
    features: ['PC', 'Extensiones Tachiyomi', 'Web UI'],
  },
  {
    name: 'MangaDex',
    description: 'La fuente de manga más grande. Múltiples idiomas, comunidad activa.',
    descriptionEn: 'The largest manga source. Multiple languages, active community.',
    platforms: ['Web'],
    url: 'https://mangadex.org',
    category: 'source',
    features: ['Gratis', 'Multi-idioma', 'Sin anuncios'],
  },
  {
    name: 'Manga Plus',
    description: 'Servicio oficial de Shueisha. Capítulos simultáneos con Japón.',
    descriptionEn: 'Official Shueisha service. Simultaneous chapters with Japan.',
    platforms: ['Web', 'Android', 'iOS'],
    url: 'https://mangaplus.shueisha.co.jp',
    category: 'source',
    features: ['Oficial', 'Simulcast', 'Gratis'],
  },
  {
    name: 'ComicK',
    description: 'Agregador de manga rápido. Sin anuncios, interfaz limpia.',
    descriptionEn: 'Fast manga aggregator. No ads, clean interface.',
    platforms: ['Web'],
    url: 'https://comick.io',
    category: 'source',
    features: ['Sin anuncios', 'Rápido', 'Multi-idioma'],
  },
  {
    name: 'MyAnimeList',
    description: 'La base de datos más grande de anime y manga. Tracking y reviews.',
    descriptionEn: 'The largest anime and manga database. Tracking and reviews.',
    platforms: ['Web', 'Android', 'iOS'],
    url: 'https://myanimelist.net',
    category: 'tracker',
    features: ['Base de datos', 'Reviews', 'Rankings'],
  },
  {
    name: 'AniList',
    description: 'Tracker moderno de anime y manga. API GraphQL, estadísticas.',
    descriptionEn: 'Modern anime and manga tracker. GraphQL API, statistics.',
    platforms: ['Web', 'Android', 'iOS'],
    url: 'https://anilist.co',
    category: 'tracker',
    features: ['Moderno', 'Estadísticas', 'Social'],
  },
];
