import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mangarg.app',
  appName: 'Mangarg',
  webDir: 'dist/manga-tracker/browser',
  // NO habilitar: el zoom nativo del WebView agranda TODA la UI (header, tabs)
  // y rompe el scroll-snap del reader. El zoom del reader es propio (pinch +
  // doble tap con CSS transform en source-reader).
  zoomEnabled: false,
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
