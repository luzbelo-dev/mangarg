export type Lang = 'es' | 'en';

export const translations = {
  es: {
    nav: {
      home: 'Inicio',
      search: 'Buscar',
      explore: 'Explorar',
      library: 'Biblioteca',
      extensions: 'Extensiones',

      download: 'Descargar',
      more: 'Mas',
      close: 'Cerrar',
      filterBy: 'Filtrar por',
      sfw: 'SFW',
      all: 'Todo',
      nsfw: '+18',
      lightMode: 'Cambiar a modo claro',
      darkMode: 'Cambiar a modo oscuro',
    },
    extensions: {
      title: 'Extensiones',
      subtitle: 'Apps y fuentes para leer manga en cualquier dispositivo',
      all: 'Todos',
      readers: 'Lectores',
      sources: 'Fuentes',
      trackers: 'Trackers',
      installed: 'Instaladas',
      available: 'Disponibles',
      install: 'Instalar',
      uninstall: 'Desinstalar',
      installedBadge: 'Instalado',
      version: 'v',
      searchPlaceholder: 'Buscar extensiones...',
      allLangs: 'Todos',
      confirmInstall: 'Seguro de instalar esta extension?',
      confirmCancel: 'Cancelar',
      confirmLink: 'Si queres conocer mas sobre esta extension, podes verlo desde aca',
    },
    download: {
      tagline: 'Lector de manga gratuito. Sin anuncios. Open source.',
      alreadyInstalled: 'Ya tenés la app instalada',
      windowsDesc: 'Descargá el .exe portable. Sin instalación, abrí y listo.',
      downloadExe: 'Descargar para Windows',
      downloadApk: 'Descargar APK',
      androidDesc: 'Descargá el APK e instalá como cualquier app.',
      iosDesc: 'Instalá la app desde Safari.',
      iosStep1: 'Abrí esta página en Safari',
      iosStep2: 'Tocá el botón de compartir (cuadrado con flecha)',
      iosStep3: 'Seleccioná "Agregar a pantalla de inicio"',
      linuxDesc: 'Cloná el repo y corré local. Conexión directa a MangaDex = velocidad máxima.',
      viewSource: 'Ver en GitHub',
      whyDownload: 'Por qué descargar la app?',
      featureFast: 'Ultra rápido',
      featureFastDesc: 'Conexión directa a MangaDex sin proxy. Capítulos al instante.',
      featureOffline: 'Funciona offline',
      featureOfflineDesc: 'Descargá capítulos y leé sin internet.',
      featureNoProxy: 'Sin intermediarios',
      featureNoProxyDesc: 'Tu app, tus datos. Open source, sin tracking, sin anuncios.',
    },
    landing: {
      inDevelopment: 'Proyecto en desarrollo — Futuro lector de manga open source multiplataforma',
      subtitle: 'Tu lector de manga gratuito, open source, sin anuncios. Buscá, leé y organizá tu manga favorito.',
      startReading: 'Empezar a leer',
      download: 'Descargar app',
      howTitle: 'Cómo funciona',
      step1Title: 'Buscá tu manga',
      step1Desc: 'Escribí el nombre y encontrá cualquier manga entre miles de títulos.',
      step2Title: 'Leé los capítulos',
      step2Desc: 'Lector integrado con modo página y scroll vertical. Calidad original o ahorro de datos.',
      step3Title: 'Armá tu biblioteca',
      step3Desc: 'Organizá por categorías: leyendo, planificado, completado, en espera, dropeado.',
      step4Title: 'Descargá offline',
      step4Desc: 'Guardá capítulos en tu dispositivo y leé sin internet.',
      featuresTitle: 'Features',
      feat1: 'Búsqueda',
      feat1Desc: 'Buscá manga por nombre entre miles de títulos.',
      feat2: 'Lector',
      feat2Desc: 'Modo página o scroll. Zoom, fullscreen, atajos de teclado.',
      feat3: 'Biblioteca',
      feat3Desc: '5 categorías. Seguí tu progreso de lectura.',
      feat4: 'Offline',
      feat4Desc: 'Descargá capítulos y leé sin conexión.',
      feat5: 'Explorar',
      feat5Desc: 'Navegá por 25 géneros, filtrá y ordená.',
      feat6: 'Dark mode',
      feat6Desc: 'Modo oscuro y claro. Español e inglés.',
      downloadTitle: 'Descargá la app',
      downloadDesc: 'Descargá Mi Manga Dinamita en tu dispositivo. Funciona más rápido que la web.',
      downloadExe: 'Descargar .exe',
      downloadApk: 'Descargar APK',
      windowsHow1: 'Descargás el .exe portable (91 MB), no necesita instalación',
      windowsHow2: 'Abrilo y listo. Va directo a MangaDex sin proxy = ultra rápido',
      windowsHow3: 'Podés ponerlo en el escritorio o donde quieras',
      androidHow1: 'Descargás el .apk e instalás como cualquier app',
      androidHow2: 'Puede pedir "permitir orígenes desconocidos" en ajustes',
      iosInstructions: 'Safari > Compartir > Agregar a inicio',
      cloneRepo: 'Clonar repo + npm start',
      extensionsTitle: 'Extensiones recomendadas',
      extensionsDesc: 'Apps y fuentes para complementar tu experiencia de manga.',
      seeAllExtensions: 'Ver todas las extensiones',
    },
    rankings: {
      topScored: 'Mejor Puntuados',
      mostPopular: 'Más Populares',
    },
    explore: {
      title: 'Explorar',
      subtitle: 'Descubrí manga por género',
      popular: 'Popular',
      topRated: 'Top',
      genres: 'Géneros',
      orderBy: 'Ordenar por',
      byScore: 'Puntuación',
      byPopularity: 'Popularidad',
      byTitle: 'Título',
      clearFilters: 'Limpiar filtros',
      results: 'resultados',
      noResults: 'No se encontraron manga con esos filtros',
      selectGenres: 'Seleccioná géneros para explorar',
    },
    search: {
      title: 'Buscar Manga',
      subtitle: 'Encontrá tu próximo manga favorito',
      placeholder: 'Buscar manga... (mínimo 3 caracteres)',
      noResults: 'No se encontraron resultados',
      noResultsHint: 'Probá con otro nombre o en japonés',
      welcome: 'Escribí el nombre de un manga para empezar',
      error: 'Error en la búsqueda. Intentá de nuevo.',
      clear: 'Limpiar búsqueda',
    },
    detail: {
      back: 'Volver',
      backToSearch: 'Volver a buscar',
      addToLibrary: 'Agregar a biblioteca',
      removeFromLibrary: 'Quitar de biblioteca',
      addFavorite: 'Agregar a favoritos',
      removeFavorite: 'Quitar de favoritos',
      readOnMangaDex: 'Leer en MangaDex',
      searchOnMangaDex: 'Buscar en MangaDex',
      viewOnMAL: 'Ver en MyAnimeList',
      startReading: 'Empezar a leer',
      resumeReading: 'Continuar leyendo',
      chapters: 'capítulos',
      volumes: 'volúmenes',
      ranking: 'Ranking',
      popularity: 'Popularidad',
      members: 'Miembros',
      synopsis: 'Sinopsis',
      genres: 'Géneros',
      themes: 'Temas',
      authors: 'Autores',
      publication: 'Publicación',
      externalLinks: 'Links externos',
      loadError: 'No se pudo cargar el manga.',
    },
    library: {
      title: 'Mi Biblioteca',
      all: 'Todos',
      reading: 'Leyendo',
      planToRead: 'Planificado',
      completed: 'Completado',
      onHold: 'En espera',
      dropped: 'Dropeado',
      sortLastRead: 'Último leído',
      sortTitle: 'Título',
      sortUnread: 'No leídos',
      sortDateAdded: 'Fecha agregado',
      viewGrid: 'Grilla',
      viewList: 'Lista',
      empty: 'Tu biblioteca está vacía',
      addManga: 'Buscar manga para agregar',
      changeCategory: 'Cambiar categoría',
      remove: 'Quitar',
      unreadChapters: 'no leídos',
      downloads: 'Descargas',
      storageUsed: 'Almacenamiento usado',
      deleteDownload: 'Eliminar descarga',
      deleteAllDownloads: 'Eliminar todas las descargas',
      downloadChapter: 'Descargar capítulo',
      downloading: 'Descargando...',
      downloaded: 'Descargado',
    },
    reader: {
      page: 'Página',
      of: 'de',
      nextPage: 'Siguiente página',
      prevPage: 'Página anterior',
      nextChapter: 'Siguiente capítulo',
      prevChapter: 'Capítulo anterior',
      fullscreen: 'Pantalla completa',
      exitFullscreen: 'Salir de pantalla completa',
      settings: 'Configuración',
      mode: 'Modo',
      pageMode: 'Página',
      longStrip: 'Scroll vertical',
      quality: 'Calidad',
      fullQuality: 'Original',
      dataSaver: 'Ahorro de datos',
      fitMode: 'Ajuste',
      fitWidth: 'Ancho',
      fitHeight: 'Alto',
      original: 'Original',
      zoom: 'Zoom',
      zoomIn: 'Acercar',
      zoomOut: 'Alejar',
      close: 'Cerrar',
      loadError: 'Error al cargar la imagen',
      imageError: 'No se pudo cargar esta imagen',
      retry: 'Reintentar',
      noPages: 'No hay páginas disponibles',
    },
    chapters: {
      title: 'Capítulos',
      resume: 'Continuar leyendo',
      startReading: 'Empezar a leer',
      chapter: 'Cap.',
      group: 'Grupo',
      date: 'Fecha',
      markRead: 'Marcar como leído',
      markUnread: 'Marcar como no leído',
      read: 'Leído',
      noChapters: 'No hay capítulos disponibles',
      download: 'Descargar',
    },
    history: {
      title: 'Historial',
      resume: 'Continuar',
      clear: 'Limpiar historial',
      empty: 'No leíste nada todavía',
      lastRead: 'Último leído',
    },
  },
  en: {
    nav: {
      home: 'Home',
      search: 'Search',
      explore: 'Explore',
      library: 'Library',
      extensions: 'Extensions',

      download: 'Download',
      more: 'More',
      close: 'Close',
      filterBy: 'Filter by',
      sfw: 'SFW',
      all: 'All',
      nsfw: '+18',
      lightMode: 'Switch to light mode',
      darkMode: 'Switch to dark mode',
    },
    extensions: {
      title: 'Extensions',
      subtitle: 'Apps and sources to read manga on any device',
      all: 'All',
      readers: 'Readers',
      sources: 'Sources',
      trackers: 'Trackers',
      installed: 'Installed',
      available: 'Available',
      install: 'Install',
      uninstall: 'Uninstall',
      installedBadge: 'Installed',
      version: 'v',
      searchPlaceholder: 'Search extensions...',
      allLangs: 'All',
      confirmInstall: 'Are you sure you want to install this extension?',
      confirmCancel: 'Cancel',
      confirmLink: 'If you want to learn more about this extension, you can check it out here',
    },
    download: {
      tagline: 'Free manga reader. No ads. Open source.',
      alreadyInstalled: 'App is already installed',
      windowsDesc: 'Download the portable .exe. No installation needed.',
      downloadExe: 'Download for Windows',
      downloadApk: 'Download APK',
      androidDesc: 'Download the APK and install like any app.',
      iosDesc: 'Install the app from Safari.',
      iosStep1: 'Open this page in Safari',
      iosStep2: 'Tap the share button (square with arrow)',
      iosStep3: 'Select "Add to Home Screen"',
      linuxDesc: 'Clone the repo and run locally. Direct MangaDex connection = max speed.',
      viewSource: 'View on GitHub',
      whyDownload: 'Why download the app?',
      featureFast: 'Ultra fast',
      featureFastDesc: 'Direct MangaDex connection without proxy. Instant chapters.',
      featureOffline: 'Works offline',
      featureOfflineDesc: 'Download chapters and read without internet.',
      featureNoProxy: 'No middleman',
      featureNoProxyDesc: 'Your app, your data. Open source, no tracking, no ads.',
    },
    landing: {
      inDevelopment: 'Project in development — Future open source cross-platform manga reader',
      subtitle: 'Your free, open source manga reader. No ads. Search, read and organize your favorite manga.',
      startReading: 'Start reading',
      download: 'Download app',
      howTitle: 'How it works',
      step1Title: 'Search your manga',
      step1Desc: 'Type a name and find any manga among thousands of titles.',
      step2Title: 'Read chapters',
      step2Desc: 'Built-in reader with page mode and vertical scroll. Full quality or data saver.',
      step3Title: 'Build your library',
      step3Desc: 'Organize by category: reading, plan to read, completed, on hold, dropped.',
      step4Title: 'Download offline',
      step4Desc: 'Save chapters to your device and read without internet.',
      featuresTitle: 'Features',
      feat1: 'Search',
      feat1Desc: 'Search manga by name among thousands of titles.',
      feat2: 'Reader',
      feat2Desc: 'Page or scroll mode. Zoom, fullscreen, keyboard shortcuts.',
      feat3: 'Library',
      feat3Desc: '5 categories. Track your reading progress.',
      feat4: 'Offline',
      feat4Desc: 'Download chapters and read without connection.',
      feat5: 'Explore',
      feat5Desc: 'Browse 25 genres, filter and sort.',
      feat6: 'Dark mode',
      feat6Desc: 'Dark and light mode. English and Spanish.',
      downloadTitle: 'Download the app',
      downloadDesc: 'Download Mi Manga Dinamita to your device. Faster than the web.',
      downloadExe: 'Download .exe',
      downloadApk: 'Download APK',
      windowsHow1: 'Download the portable .exe (91 MB), no installation needed',
      windowsHow2: 'Open it and go. Direct MangaDex connection = ultra fast',
      windowsHow3: 'Put it on your desktop or wherever you want',
      androidHow1: 'Download the .apk and install like any app',
      androidHow2: 'May ask to "allow unknown sources" in settings',
      iosInstructions: 'Safari > Share > Add to Home Screen',
      cloneRepo: 'Clone repo + npm start',
      extensionsTitle: 'Recommended extensions',
      extensionsDesc: 'Apps and sources to complement your manga experience.',
      seeAllExtensions: 'See all extensions',
    },
    rankings: {
      topScored: 'Top Scored',
      mostPopular: 'Most Popular',
    },
    explore: {
      title: 'Explore',
      subtitle: 'Discover manga by genre',
      popular: 'Popular',
      topRated: 'Top',
      genres: 'Genres',
      orderBy: 'Order by',
      byScore: 'Score',
      byPopularity: 'Popularity',
      byTitle: 'Title',
      clearFilters: 'Clear filters',
      results: 'results',
      noResults: 'No manga found with those filters',
      selectGenres: 'Select genres to explore',
    },
    search: {
      title: 'Search Manga',
      subtitle: 'Find your next favorite manga',
      placeholder: 'Search manga... (min 3 characters)',
      noResults: 'No results found',
      noResultsHint: 'Try a different name or in Japanese',
      welcome: 'Type a manga name to get started',
      error: 'Search failed. Please try again.',
      clear: 'Clear search',
    },
    detail: {
      back: 'Back',
      backToSearch: 'Back to search',
      addToLibrary: 'Add to library',
      removeFromLibrary: 'Remove from library',
      addFavorite: 'Add to favorites',
      removeFavorite: 'Remove from favorites',
      readOnMangaDex: 'Read on MangaDex',
      searchOnMangaDex: 'Search on MangaDex',
      viewOnMAL: 'View on MyAnimeList',
      startReading: 'Start reading',
      resumeReading: 'Resume reading',
      chapters: 'chapters',
      volumes: 'volumes',
      ranking: 'Ranking',
      popularity: 'Popularity',
      members: 'Members',
      synopsis: 'Synopsis',
      genres: 'Genres',
      themes: 'Themes',
      authors: 'Authors',
      publication: 'Publication',
      externalLinks: 'External links',
      loadError: 'Could not load manga.',
    },
    library: {
      title: 'My Library',
      all: 'All',
      reading: 'Reading',
      planToRead: 'Plan to Read',
      completed: 'Completed',
      onHold: 'On Hold',
      dropped: 'Dropped',
      sortLastRead: 'Last read',
      sortTitle: 'Title',
      sortUnread: 'Unread',
      sortDateAdded: 'Date added',
      viewGrid: 'Grid',
      viewList: 'List',
      empty: 'Your library is empty',
      addManga: 'Search manga to add',
      changeCategory: 'Change category',
      remove: 'Remove',
      unreadChapters: 'unread',
      downloads: 'Downloads',
      storageUsed: 'Storage used',
      deleteDownload: 'Delete download',
      deleteAllDownloads: 'Delete all downloads',
      downloadChapter: 'Download chapter',
      downloading: 'Downloading...',
      downloaded: 'Downloaded',
    },
    reader: {
      page: 'Page',
      of: 'of',
      nextPage: 'Next page',
      prevPage: 'Previous page',
      nextChapter: 'Next chapter',
      prevChapter: 'Previous chapter',
      fullscreen: 'Fullscreen',
      exitFullscreen: 'Exit fullscreen',
      settings: 'Settings',
      mode: 'Mode',
      pageMode: 'Page',
      longStrip: 'Long strip',
      quality: 'Quality',
      fullQuality: 'Full quality',
      dataSaver: 'Data saver',
      fitMode: 'Fit',
      fitWidth: 'Width',
      fitHeight: 'Height',
      original: 'Original',
      zoom: 'Zoom',
      zoomIn: 'Zoom in',
      zoomOut: 'Zoom out',
      close: 'Close',
      loadError: 'Failed to load image',
      imageError: 'Could not load this image',
      retry: 'Retry',
      noPages: 'No pages available',
    },
    chapters: {
      title: 'Chapters',
      resume: 'Resume reading',
      startReading: 'Start reading',
      chapter: 'Ch.',
      group: 'Group',
      date: 'Date',
      markRead: 'Mark as read',
      markUnread: 'Mark as unread',
      read: 'Read',
      noChapters: 'No chapters available',
      download: 'Download',
    },
    history: {
      title: 'History',
      resume: 'Resume',
      clear: 'Clear history',
      empty: "You haven't read anything yet",
      lastRead: 'Last read',
    },
  },
};

export interface Translations {
  nav: {
    home: string;
    search: string;
    explore: string;
    library: string;
    extensions: string;
    download: string;
    more: string;
    close: string;
    filterBy: string;
    sfw: string;
    all: string;
    nsfw: string;
    lightMode: string;
    darkMode: string;
  };
  extensions: {
    title: string;
    subtitle: string;
    all: string;
    readers: string;
    sources: string;
    trackers: string;
    installed: string;
    available: string;
    install: string;
    uninstall: string;
    installedBadge: string;
    version: string;
    searchPlaceholder: string;
    allLangs: string;
    confirmInstall: string;
    confirmCancel: string;
    confirmLink: string;
  };
  landing: {
    inDevelopment: string;
    subtitle: string;
    startReading: string;
    download: string;
    howTitle: string;
    step1Title: string;
    step1Desc: string;
    step2Title: string;
    step2Desc: string;
    step3Title: string;
    step3Desc: string;
    step4Title: string;
    step4Desc: string;
    featuresTitle: string;
    feat1: string;
    feat1Desc: string;
    feat2: string;
    feat2Desc: string;
    feat3: string;
    feat3Desc: string;
    feat4: string;
    feat4Desc: string;
    feat5: string;
    feat5Desc: string;
    feat6: string;
    feat6Desc: string;
    downloadTitle: string;
    downloadDesc: string;
    downloadExe: string;
    downloadApk: string;
    windowsHow1: string;
    windowsHow2: string;
    windowsHow3: string;
    androidHow1: string;
    androidHow2: string;
    iosInstructions: string;
    cloneRepo: string;
    extensionsTitle: string;
    extensionsDesc: string;
    seeAllExtensions: string;
  };
  download: {
    tagline: string;
    alreadyInstalled: string;
    windowsDesc: string;
    downloadExe: string;
    downloadApk: string;
    androidDesc: string;
    iosDesc: string;
    iosStep1: string;
    iosStep2: string;
    iosStep3: string;
    linuxDesc: string;
    viewSource: string;
    whyDownload: string;
    featureFast: string;
    featureFastDesc: string;
    featureOffline: string;
    featureOfflineDesc: string;
    featureNoProxy: string;
    featureNoProxyDesc: string;
  };
  rankings: {
    topScored: string;
    mostPopular: string;
  };
  explore: {
    title: string;
    subtitle: string;
    popular: string;
    topRated: string;
    genres: string;
    orderBy: string;
    byScore: string;
    byPopularity: string;
    byTitle: string;
    clearFilters: string;
    results: string;
    noResults: string;
    selectGenres: string;
  };
  search: {
    title: string;
    subtitle: string;
    placeholder: string;
    noResults: string;
    noResultsHint: string;
    welcome: string;
    error: string;
    clear: string;
  };
  detail: {
    back: string;
    backToSearch: string;
    addToLibrary: string;
    removeFromLibrary: string;
    addFavorite: string;
    removeFavorite: string;
    readOnMangaDex: string;
    searchOnMangaDex: string;
    viewOnMAL: string;
    startReading: string;
    resumeReading: string;
    chapters: string;
    volumes: string;
    ranking: string;
    popularity: string;
    members: string;
    synopsis: string;
    genres: string;
    themes: string;
    authors: string;
    publication: string;
    externalLinks: string;
    loadError: string;
  };
  library: {
    title: string;
    all: string;
    reading: string;
    planToRead: string;
    completed: string;
    onHold: string;
    dropped: string;
    sortLastRead: string;
    sortTitle: string;
    sortUnread: string;
    sortDateAdded: string;
    viewGrid: string;
    viewList: string;
    empty: string;
    addManga: string;
    changeCategory: string;
    remove: string;
    unreadChapters: string;
    downloads: string;
    storageUsed: string;
    deleteDownload: string;
    deleteAllDownloads: string;
    downloadChapter: string;
    downloading: string;
    downloaded: string;
  };
  reader: {
    page: string;
    of: string;
    nextPage: string;
    prevPage: string;
    nextChapter: string;
    prevChapter: string;
    fullscreen: string;
    exitFullscreen: string;
    settings: string;
    mode: string;
    pageMode: string;
    longStrip: string;
    quality: string;
    fullQuality: string;
    dataSaver: string;
    fitMode: string;
    fitWidth: string;
    fitHeight: string;
    original: string;
    zoom: string;
    zoomIn: string;
    zoomOut: string;
    close: string;
    loadError: string;
    imageError: string;
    retry: string;
    noPages: string;
  };
  chapters: {
    title: string;
    resume: string;
    startReading: string;
    chapter: string;
    group: string;
    date: string;
    markRead: string;
    markUnread: string;
    read: string;
    noChapters: string;
    download: string;
  };
  history: {
    title: string;
    resume: string;
    clear: string;
    empty: string;
    lastRead: string;
  };
}
