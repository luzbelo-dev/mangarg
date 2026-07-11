const MIN_ZOOM = 50;
const MAX_ZOOM = 300;

export interface LongstripZoomHost {
  container(): HTMLElement | null;
  strip(): HTMLElement | null;
  /** Zoom de ancho persistido (%). */
  zoom(): number;
  setZoom(zoom: number): void;
}

/**
 * Pinch del longstrip: durante el gesto se escala el strip entero con un
 * transform (GPU, barato); al soltar se persiste como zoom de ancho y se
 * compensa el scroll para que el punto pellizcado no se mueva.
 */
export class LongstripPinchZoom {
  private pinch: {
    d0: number; zoom0: number; fx: number; fy: number;
    sl0: number; st0: number; factor: number;
  } | null = null;

  constructor(private readonly host: LongstripZoomHost) {}

  onTouchStart(event: TouchEvent): void {
    if (event.touches.length !== 2) return;
    event.preventDefault();
    const container = this.host.container();
    const strip = this.host.strip();
    if (!container || !strip) return;
    const rect = container.getBoundingClientRect();
    const a = event.touches[0];
    const b = event.touches[1];
    const fx = (a.clientX + b.clientX) / 2 - rect.left;
    const fy = (a.clientY + b.clientY) / 2 - rect.top;
    this.pinch = {
      d0: Math.max(1, Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)),
      zoom0: this.host.zoom(),
      fx,
      fy,
      sl0: container.scrollLeft,
      st0: container.scrollTop,
      factor: 1,
    };
    // el origen del transform es el punto pellizcado, en coordenadas del contenido
    strip.style.transformOrigin = `${this.pinch.sl0 + fx}px ${this.pinch.st0 + fy}px`;
    strip.style.willChange = 'transform';
  }

  onTouchMove(event: TouchEvent): void {
    if (!this.pinch || event.touches.length < 2) return;
    event.preventDefault();
    const strip = this.host.strip();
    if (!strip) return;
    const a = event.touches[0];
    const b = event.touches[1];
    const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const p = this.pinch;
    // limita el factor para que el zoom final quede dentro de [50, 300]
    const factor = Math.min(MAX_ZOOM / p.zoom0, Math.max(MIN_ZOOM / p.zoom0, d / p.d0));
    p.factor = factor;
    strip.style.transform = `scale(${factor})`;
  }

  onTouchEnd(event: TouchEvent): void {
    if (!this.pinch) return;
    if (event.touches.length > 0) return; // esperar a que suelte todos los dedos
    const p = this.pinch;
    this.pinch = null;
    this.clearTransform();
    const newZoom = Math.round(p.zoom0 * p.factor);
    if (newZoom === p.zoom0) return;
    this.host.setZoom(newZoom);
    // tras el re-layout con el ancho nuevo, recolocar el scroll para que el
    // punto pellizcado quede en el mismo lugar de la pantalla
    const ratio = newZoom / p.zoom0;
    requestAnimationFrame(() => {
      const container = this.host.container();
      if (!container) return;
      container.scrollTop = (p.st0 + p.fy) * ratio - p.fy;
      container.scrollLeft = (p.sl0 + p.fx) * ratio - p.fx;
    });
  }

  onTouchCancel(): void {
    if (!this.pinch) return;
    this.pinch = null;
    this.clearTransform();
  }

  private clearTransform(): void {
    const strip = this.host.strip();
    if (!strip) return;
    strip.style.transform = '';
    strip.style.transformOrigin = '';
    strip.style.willChange = '';
  }
}
