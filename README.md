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

- Angular 19 standalone
- Capacitor 8 (APK Android)
- SCSS
- IndexedDB para descargas offline
- Service Worker para cache

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

## Licencia

Proyecto personal de uso libre.
