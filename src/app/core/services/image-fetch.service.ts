import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { isCapacitor } from '../utils/platform';
import { needsProxy, proxyUrl } from './adapter-runtime.service';

// Muchos sitios de manga protegen sus imagenes contra hotlink: sin un header
// Referer del propio sitio, el CDN devuelve 403 y el <img> del reader falla.
// Un <img> no puede mandar Referer ajeno, asi que la imagen se baja como blob:
//  - APK: CapacitorHttp hace la request nativa y SI puede setear Referer
//    (el browser lo prohibe, la capa nativa no).
//  - Web: via source-proxy de Netlify, que agrega el Referer server-side.
@Injectable({ providedIn: 'root' })
export class ImageFetchService {
  private readonly http = inject(HttpClient);

  async fetchBlob(url: string, referer?: string): Promise<Blob> {
    let blob: Blob;
    if (isCapacitor()) {
      const headers = referer ? new HttpHeaders({ Referer: referer }) : undefined;
      blob = await firstValueFrom(this.http.get(url, { responseType: 'blob', headers }));
    } else {
      const target = needsProxy(url) ? proxyUrl(url, 'GET', referer) : url;
      blob = await firstValueFrom(this.http.get(target, { responseType: 'blob' }));
    }
    if (!blob || blob.size === 0) throw new Error('Empty image response');
    return blob;
  }

  async fetchBlobUrl(url: string, referer?: string): Promise<string> {
    const blob = await this.fetchBlob(url, referer);
    return URL.createObjectURL(blob);
  }
}
