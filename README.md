# Mangarg

Lector de manga gratuito en español. Busca, lee, descarga y organiza tu manga favorito desde multiples fuentes.

## Funciones

- 29+ extensiones verificadas en español
- Lectura en modo scroll vertical o pagina horizontal
- Zoom con botones y pinch-to-zoom
- Descarga de capitulos para lectura offline
- Guardar imagenes en galeria
- Navegacion entre capitulos desde la barra inferior
- Biblioteca con favoritos y tracking de lectura
- Busqueda universal en todas las fuentes
- Tema oscuro negro + rojo
- PWA + APK para Android

## Stack

- Angular 22 standalone (signals, OnPush, lazy loading)
- Capacitor 8 (APK Android)
- SCSS
- IndexedDB para descargas offline
- Service Worker para cache

## Requisitos

- Node.js >= 22.22.3 (o 24). Angular 22 lo exige; con versiones menores el `npm install` / build falla.

## Desarrollo

```bash
npm install
ng serve
```

## Build APK

```bash
ng build --configuration=production
npx cap sync android
cd android && ./gradlew assembleDebug
```

## Disclaimer

Mangarg es solo un lector: no aloja ni distribuye contenido. Todo el manga se
obtiene de fuentes de terceros a traves de extensiones configurables. El usuario
es responsable de las fuentes que instala y del uso que hace del contenido.

## Deuda tecnica conocida

Pendientes priorizados para futuras iteraciones:

- **Sandbox de extensiones**: los adapters se ejecutan con `new Function` en el
  hilo principal. Migrar a un Web Worker / iframe sandboxed para aislar
  DOM/localStorage/IndexedDB del codigo de terceros. Ya hay validacion de forma
  del objeto y verificacion de `checksum` (SHA-256) opcional por manifest.
- **Dialogo de confirmacion** al instalar adapters de repos no oficiales.
- **Tests**: no hay tests todavia. Prioridad: `IndexedDbService`,
  `AdapterRuntimeService`, el interceptor de rate-limit y `resolveGitHubUrl`.
- **ESLint**: falta linter (`ng add @angular-eslint/schematics`) + paso de lint en CI.
- **APK firmado**: el workflow genera `assembleDebug`. Para distribucion real,
  crear un keystore, guardarlo en GitHub Secrets y compilar `assembleRelease`.
- **`StorageService`** tipado que centralice los accesos dispersos a `localStorage`.

## Licencia

[MIT](LICENSE) — © 2026 Mangarg.
