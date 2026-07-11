import { signal } from '@angular/core';

export const DOUBLE_TAP_MS = 280;
export const DOUBLE_TAP_SCALE = 2.5;
const MAX_SCALE = 4;

export interface PagedZoomHost {
  viewport(): HTMLElement | null;
  /** Capa .reader__zoom de la pagina actual (en orden DOM). */
  currentLayer(): HTMLElement | null;
  /** Tap simple con zoom activo; el doble tap (que resetea) es interno. */
  onTapWhileZoomed(): void;
}

/**
 * Zoom del modo pagina (estilo Mihon): un CSS transform sobre la capa
 * .reader__zoom de la pagina actual. Pellizco escala (1x-4x), un dedo panea
 * cuando hay zoom, doble tap alterna 1x/2.5x, ctrl+rueda zoomea en desktop.
 * Mientras hay zoom el viewport queda congelado (clase --zoomed: overflow
 * hidden + snap off) y las paginas no cambian solas.
 */
export class PagedZoomEngine {
  readonly isZoomed = signal(false);
  readonly zoomDisplay = signal(100);

  private scale = 1;
  private tx = 0;
  private ty = 0;

  private pinchState: { d0: number; s0: number; midX0: number; midY0: number; tx0: number; ty0: number } | null = null;
  private panState: { x: number; y: number; tx0: number; ty0: number } | null = null;
  private lastTapTime = 0;
  private touchStartX = 0;
  private touchStartY = 0;
  private touchStartTime = 0;

  constructor(private readonly host: PagedZoomHost) {}

  get currentScale(): number {
    return this.scale;
  }

  reset(animate: boolean): void {
    this.scale = 1;
    this.tx = 0;
    this.ty = 0;
    this.pinchState = null;
    this.panState = null;
    this.apply(animate);
    this.isZoomed.set(false);
  }

  zoomTo(scale: number, clientX?: number, clientY?: number): void {
    const vp = this.host.viewport();
    if (!vp) return;
    const rect = vp.getBoundingClientRect();
    const s0 = this.scale;
    const s1 = Math.min(MAX_SCALE, Math.max(1, scale));
    // coordenadas relativas al centro del viewport (transform-origin: center)
    const mx = clientX !== undefined ? clientX - rect.left - rect.width / 2 : 0;
    const my = clientY !== undefined ? clientY - rect.top - rect.height / 2 : 0;
    this.tx = mx - (mx - this.tx) * (s1 / s0);
    this.ty = my - (my - this.ty) * (s1 / s0);
    this.scale = s1;
    this.clampPan();
    this.isZoomed.set(s1 > 1);
    this.apply(true);
  }

  stepIn(): void {
    this.zoomTo(Math.min(MAX_SCALE, this.scale * 1.5));
  }

  stepOut(): void {
    const s = this.scale / 1.5;
    if (s <= 1.05) {
      this.reset(true);
    } else {
      this.zoomTo(s);
    }
  }

  onTouchStart(event: TouchEvent): void {
    if (event.touches.length === 2) {
      // pinch: sin preventDefault el WebView arrancaria un scroll con estos dedos
      event.preventDefault();
      const a = event.touches[0];
      const b = event.touches[1];
      this.pinchState = {
        d0: Math.max(1, Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)),
        s0: this.scale,
        midX0: (a.clientX + b.clientX) / 2,
        midY0: (a.clientY + b.clientY) / 2,
        tx0: this.tx,
        ty0: this.ty,
      };
      this.panState = null;
      this.isZoomed.set(true); // congela el viewport (clase --zoomed) ya mismo
      return;
    }
    const touch = event.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.touchStartTime = Date.now();
    if (this.scale > 1) {
      event.preventDefault(); // zoomeado: un dedo panea, no scrollea
      this.panState = { x: touch.clientX, y: touch.clientY, tx0: this.tx, ty0: this.ty };
    }
  }

  onTouchMove(event: TouchEvent): void {
    if (this.pinchState && event.touches.length >= 2) {
      event.preventDefault();
      const vp = this.host.viewport();
      if (!vp) return;
      const a = event.touches[0];
      const b = event.touches[1];
      const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const p = this.pinchState;
      const s1 = Math.min(MAX_SCALE, Math.max(1, p.s0 * (d / p.d0)));
      const rect = vp.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const midX = (a.clientX + b.clientX) / 2;
      const midY = (a.clientY + b.clientY) / 2;
      // el punto de la imagen que estaba bajo el pellizco inicial sigue al
      // punto medio actual: escala + paneo en un solo gesto
      const ratio = s1 / p.s0;
      this.tx = (midX - cx) - ((p.midX0 - cx) - p.tx0) * ratio;
      this.ty = (midY - cy) - ((p.midY0 - cy) - p.ty0) * ratio;
      this.scale = s1;
      this.clampPan();
      this.apply();
      return;
    }
    if (this.panState && event.touches.length === 1) {
      event.preventDefault();
      const touch = event.touches[0];
      this.tx = this.panState.tx0 + (touch.clientX - this.panState.x);
      this.ty = this.panState.ty0 + (touch.clientY - this.panState.y);
      this.clampPan();
      this.apply();
    }
  }

  onTouchEnd(event: TouchEvent): void {
    if (this.pinchState) {
      if (event.touches.length >= 2) return;
      this.pinchState = null;
      if (event.touches.length === 1) {
        // quedo un dedo apoyado: sigue como paneo
        const touch = event.touches[0];
        this.panState = { x: touch.clientX, y: touch.clientY, tx0: this.tx, ty0: this.ty };
        return;
      }
      this.settle();
      return;
    }
    if (this.panState) {
      if (event.touches.length > 0) {
        const touch = event.touches[0];
        this.panState = { x: touch.clientX, y: touch.clientY, tx0: this.tx, ty0: this.ty };
        return;
      }
      this.panState = null;
      const touch = event.changedTouches[0];
      const dx = Math.abs(touch.clientX - this.touchStartX);
      const dy = Math.abs(touch.clientY - this.touchStartY);
      const elapsed = Date.now() - this.touchStartTime;
      if (elapsed < 300 && dx < 12 && dy < 12) {
        this.handleTap();
      }
      this.settle();
    }
  }

  onTouchCancel(): void {
    this.pinchState = null;
    this.panState = null;
    this.settle();
  }

  /** Devuelve true si consumio el evento (zoom o paneo); false si la rueda
   *  debe seguir manejando el cambio de pagina. */
  onWheel(event: WheelEvent): boolean {
    if (event.ctrlKey) {
      // ctrl+rueda: zoom de escritorio anclado al cursor
      event.preventDefault();
      const factor = event.deltaY < 0 ? 1.2 : 1 / 1.2;
      const s = this.scale * factor;
      if (s <= 1.02) {
        this.reset(true);
      } else {
        this.zoomTo(s, event.clientX, event.clientY);
      }
      return true;
    }
    if (this.scale > 1) {
      // zoomeado: la rueda panea la pagina
      event.preventDefault();
      this.tx -= event.deltaX;
      this.ty -= event.deltaY;
      this.clampPan();
      this.apply();
      return true;
    }
    return false;
  }

  private apply(animate = false): void {
    this.zoomDisplay.set(Math.round(this.scale * 100));
    const layer = this.host.currentLayer();
    if (!layer) return;
    layer.style.transition = animate ? 'transform 0.2s ease' : '';
    layer.style.transform =
      this.scale === 1 && this.tx === 0 && this.ty === 0
        ? ''
        : `translate(${this.tx}px, ${this.ty}px) scale(${this.scale})`;
  }

  private clampPan(): void {
    const vp = this.host.viewport();
    if (!vp) return;
    const maxTx = Math.max(0, (vp.clientWidth * (this.scale - 1)) / 2);
    const maxTy = Math.max(0, (vp.clientHeight * (this.scale - 1)) / 2);
    this.tx = Math.min(maxTx, Math.max(-maxTx, this.tx));
    this.ty = Math.min(maxTy, Math.max(-maxTy, this.ty));
  }

  // Si el gesto termino casi en 1x, vuelve a 1x exacto y descongela el viewport.
  private settle(): void {
    if (this.scale < 1.08) {
      this.reset(true);
    }
  }

  private handleTap(): void {
    const now = Date.now();
    if (now - this.lastTapTime < DOUBLE_TAP_MS) {
      this.lastTapTime = 0;
      this.reset(true);
      return;
    }
    this.lastTapTime = now;
    this.host.onTapWhileZoomed();
  }
}
