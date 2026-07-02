/**
 * Deteccion de plataforma nativa (APK / Capacitor).
 *
 * Reemplaza dos chequeos fragiles que estaban duplicados por la app:
 *  - `hostname.includes('netlify.app')` en el guard de rutas (rompia en
 *    localhost y con dominio propio).
 *  - `typeof window.Capacitor !== 'undefined'` copiado en 3 servicios.
 *
 * Usa `Capacitor.isNativePlatform()` cuando esta disponible (Capacitor 3+),
 * que devuelve false en el build web aunque el objeto Capacitor exista.
 */
export function isCapacitor(): boolean {
  const cap = (window as any)?.Capacitor;
  if (!cap) return false;
  if (typeof cap.isNativePlatform === 'function') return cap.isNativePlatform();
  return true;
}
