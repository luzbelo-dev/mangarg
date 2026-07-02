import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mangarg.app',
  appName: 'Mangarg',
  webDir: 'dist/manga-tracker/browser',
  // Habilita pinch-zoom nativo del WebView (por defecto Capacitor lo bloquea
  // aunque el viewport y touch-action lo permitan). Clave para el reader.
  zoomEnabled: true,
  server: {
    androidScheme: 'https',
    // Sin allowNavigation:['*']: la app es una SPA y no debe navegar el WebView
    // a origenes externos. Las requests a APIs/imagenes van por CapacitorHttp
    // (habilitado abajo), que las intercepta de forma nativa sin importar esto.
  },
  android: {
    // Necesario: varias fuentes de manga sirven imagenes por HTTP (cleartext).
    allowMixedContent: true,
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
