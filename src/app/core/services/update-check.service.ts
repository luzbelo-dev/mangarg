import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { APP_VERSION } from '../constants/app-version';
import { isCapacitor } from '../utils/platform';

interface RemoteVersion {
  version: string;
  apk: string;
}

const VERSION_URL = 'https://mimangadinamita.netlify.app/version.json';
const DISMISSED_KEY = 'mt-update-dismissed';

// true si `remote` es una version semver mayor que `local`.
function isNewer(remote: string, local: string): boolean {
  const r = remote.split('.').map(Number);
  const l = local.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((r[i] || 0) > (l[i] || 0)) return true;
    if ((r[i] || 0) < (l[i] || 0)) return false;
  }
  return false;
}

/**
 * Chequeo de actualizaciones para la APK (estilo Mihon): al arrancar consulta
 * el version.json del sitio (que Netlify regenera en cada deploy) y, si hay
 * una version mas nueva que la compilada, expone `available` para que el
 * shell muestre el banner. Todo es silencioso ante fallos: sin internet o
 * con el sitio caido simplemente no se ofrece nada.
 *
 * Solo aplica a la APK: la web/PWA se actualiza sola via service worker.
 */
@Injectable({ providedIn: 'root' })
export class UpdateCheckService {
  private readonly http = inject(HttpClient);

  readonly available = signal<RemoteVersion | null>(null);

  async check(): Promise<void> {
    if (!isCapacitor()) return;
    try {
      const info = await firstValueFrom(
        this.http.get<RemoteVersion>(VERSION_URL, { params: { t: Date.now() } }),
      );
      if (!info?.version || !isNewer(info.version, APP_VERSION)) return;
      // "Mas tarde" silencia SOLO esa version; la siguiente vuelve a avisar.
      if (localStorage.getItem(DISMISSED_KEY) === info.version) return;
      this.available.set(info);
    } catch {
      // sin red / sitio caido: no molestar
    }
  }

  openDownload(): void {
    const url = this.available()?.apk;
    if (!url) return;
    // En Capacitor, una URL externa se abre en el navegador del sistema;
    // Android descarga el APK y, con la firma estable, instala encima.
    window.open(url, '_blank');
  }

  dismiss(): void {
    const v = this.available()?.version;
    if (v) localStorage.setItem(DISMISSED_KEY, v);
    this.available.set(null);
  }
}
