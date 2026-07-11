export type Lang = 'es' | 'en';

// `es` es el idioma base: define la estructura. `en` se tipa contra el (ver
// abajo), asi que agregar o quitar una clave aca obliga a actualizar ambos.
const es = {
  nav: {
    home: 'Inicio',
    library: 'Biblioteca',
    updates: 'Novedades',
    history: 'Historial',
    browse: 'Explorar',
    download: 'Descargar',
    more: 'Mas',
    close: 'Cerrar',
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
    installed: 'Instaladas',
    available: 'Buscar extensiones',
    install: 'Instalar',
    uninstall: 'Desinstalar',
    searchPlaceholder: 'Buscar extensiones...',
    allLangs: 'Todos',
  },
  landing: {
    tagline: 'Lector de manga completo',
    description:
      'Descubrí y leé manga, manhwa y cómics en tu Android — gratis, open source y sin anuncios.',
    download: 'Descargar',
    openWebapp: 'Abrir webapp',
    featExtensionsTitle: 'Extensiones',
    featExtensionsDesc:
      'Instalá solo las fuentes que uses. Más de 29 fuentes en español y repos de la comunidad.',
    featOfflineTitle: 'Sin conexión',
    featOfflineDesc: 'Descargá capítulos en tu dispositivo y leé donde quieras, sin internet.',
    featTrackingTitle: 'Seguimiento',
    featTrackingDesc: 'Biblioteca de favoritos, novedades de tus mangas e historial de lectura.',
    downloadTitle: 'Descargá Mangarg',
    androidDesc: 'La app completa. Se actualiza sola.',
    windowsDesc: 'Portable, sin instalación.',
    otherPlatforms: 'iPhone, iPad y Linux: usá la webapp desde el navegador.',
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
  history: {
    title: 'Historial',
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
};

export type Translations = typeof es;

const en: Translations = {
  nav: {
    home: 'Home',
    library: 'Library',
    updates: 'Updates',
    history: 'History',
    browse: 'Browse',
    download: 'Download',
    more: 'More',
    close: 'Close',
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
    installed: 'Installed',
    available: 'Available',
    install: 'Install',
    uninstall: 'Uninstall',
    searchPlaceholder: 'Search extensions...',
    allLangs: 'All',
  },
  landing: {
    tagline: 'Full-featured manga reader',
    description:
      'Discover and read manga, manhwa and comics on your Android — free, open source and ad-free.',
    download: 'Download',
    openWebapp: 'Open webapp',
    featExtensionsTitle: 'Extensions',
    featExtensionsDesc:
      'Install only the sources you use. 29+ Spanish sources and community repos.',
    featOfflineTitle: 'Offline',
    featOfflineDesc: 'Download chapters to your device and read anywhere, no internet needed.',
    featTrackingTitle: 'Tracking',
    featTrackingDesc: 'Favorites library, updates for your manga and reading history.',
    downloadTitle: 'Download Mangarg',
    androidDesc: 'The full app. Updates itself.',
    windowsDesc: 'Portable, no install.',
    otherPlatforms: 'iPhone, iPad and Linux: use the webapp from your browser.',
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
  history: {
    title: 'History',
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
};

export const translations: Record<Lang, Translations> = { es, en };
