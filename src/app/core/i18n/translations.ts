export type Lang = 'es' | 'en';

export const translations = {
  es: {
    nav: {
      home: 'Inicio',
      library: 'Biblioteca',
      extensions: 'Extensiones',
      updates: 'Novedades',
      history: 'Historial',
      browse: 'Explorar',
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
    update: {
      available: 'Nueva version disponible',
      action: 'Actualizar',
      later: 'Mas tarde',
    },
    extensions: {
      title: 'Extensiones',
      subtitle: 'Apps y fuentes para leer manga en cualquier dispositivo',
      all: 'Todos',
      readers: 'Lectores',
      sources: 'Fuentes',
      trackers: 'Trackers',
      installed: 'Instaladas',
      available: 'Buscar extensiones',
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
      tagline: 'Lector de manga completo',
      description: 'Descubrí y leé manga, manhwa y cómics en tu Android — gratis, open source y sin anuncios.',
      download: 'Descargar',
      openWebapp: 'Abrir webapp',
      featExtensionsTitle: 'Extensiones',
      featExtensionsDesc: 'Instalá solo las fuentes que uses. Más de 29 fuentes en español y repos de la comunidad.',
      featOfflineTitle: 'Sin conexión',
      featOfflineDesc: 'Descargá capítulos en tu dispositivo y leé donde quieras, sin internet.',
      featTrackingTitle: 'Seguimiento',
      featTrackingDesc: 'Biblioteca de favoritos, novedades de tus mangas e historial de lectura.',
      downloadTitle: 'Descargá Mangarg',
      androidDesc: 'La app completa. Se actualiza sola.',
      windowsDesc: 'Portable, sin instalación.',
      otherPlatforms: 'iPhone, iPad y Linux: usá la webapp desde el navegador.',
    },
    rankings: {
      topScored: 'Mejor Puntuados',
      mostPopular: 'Más Populares',
    },
    detail: {
      addToLibrary: 'Agregar a biblioteca',
      removeFromLibrary: 'Quitar de biblioteca',
    },
    library: {
      title: 'Mi Biblioteca',
      downloads: 'Descargas',
      storageUsed: 'Almacenamiento usado',
      deleteAllDownloads: 'Eliminar todas las descargas',
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
    updates: {
      title: 'Actualizaciones',
      refresh: 'Buscar nuevos',
      markAllRead: 'Marcar todo leído',
      empty: 'No hay actualizaciones todavía',
    },
    customize: {
      title: 'Personalizacion',
      accentColor: 'Color de acento',
      font: 'Tipografia',
      reset: 'Restablecer',
    },
  },
  en: {
    nav: {
      home: 'Home',
      library: 'Library',
      extensions: 'Extensions',
      updates: 'Updates',
      history: 'History',
      browse: 'Browse',
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
    update: {
      available: 'New version available',
      action: 'Update',
      later: 'Later',
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
      tagline: 'Full-featured manga reader',
      description: 'Discover and read manga, manhwa and comics on your Android — free, open source and ad-free.',
      download: 'Download',
      openWebapp: 'Open webapp',
      featExtensionsTitle: 'Extensions',
      featExtensionsDesc: 'Install only the sources you use. 29+ Spanish sources and community repos.',
      featOfflineTitle: 'Offline',
      featOfflineDesc: 'Download chapters to your device and read anywhere, no internet needed.',
      featTrackingTitle: 'Tracking',
      featTrackingDesc: 'Favorites library, updates for your manga and reading history.',
      downloadTitle: 'Download Mangarg',
      androidDesc: 'The full app. Updates itself.',
      windowsDesc: 'Portable, no install.',
      otherPlatforms: 'iPhone, iPad and Linux: use the webapp from your browser.',
    },
    rankings: {
      topScored: 'Top Scored',
      mostPopular: 'Most Popular',
    },
    detail: {
      addToLibrary: 'Add to library',
      removeFromLibrary: 'Remove from library',
    },
    library: {
      title: 'My Library',
      downloads: 'Downloads',
      storageUsed: 'Storage used',
      deleteAllDownloads: 'Delete all downloads',
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
    updates: {
      title: 'Updates',
      refresh: 'Check for updates',
      markAllRead: 'Mark all read',
      empty: 'No updates yet',
    },
    customize: {
      title: 'Customization',
      accentColor: 'Accent color',
      font: 'Font',
      reset: 'Reset',
    },
  },
};

export interface Translations {
  nav: {
    home: string;
    library: string;
    extensions: string;
    updates: string;
    history: string;
    browse: string;
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
  update: {
    available: string;
    action: string;
    later: string;
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
    tagline: string;
    description: string;
    download: string;
    openWebapp: string;
    featExtensionsTitle: string;
    featExtensionsDesc: string;
    featOfflineTitle: string;
    featOfflineDesc: string;
    featTrackingTitle: string;
    featTrackingDesc: string;
    downloadTitle: string;
    androidDesc: string;
    windowsDesc: string;
    otherPlatforms: string;
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
  detail: {
    addToLibrary: string;
    removeFromLibrary: string;
  };
  library: {
    title: string;
    downloads: string;
    storageUsed: string;
    deleteAllDownloads: string;
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
  updates: {
    title: string;
    refresh: string;
    markAllRead: string;
    empty: string;
  };
  customize: {
    title: string;
    accentColor: string;
    font: string;
    reset: string;
  };
}
