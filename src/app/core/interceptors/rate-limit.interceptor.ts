import { HttpInterceptorFn } from '@angular/common/http';
import { timer, switchMap } from 'rxjs';

// Intervalo minimo entre requests para cada dominio con rate limit conocido.
// (Sin reglas por ahora — se agregan por dominio cuando una fuente de
// extension lo necesite.)
const DOMAIN_INTERVALS: { match: string; interval: number }[] = [];

// Proxima marca de tiempo permitida por dominio. Al encolar acumulamos el
// intervalo sobre el ultimo turno reservado (no sobre "ahora"), asi varios
// requests simultaneos se serializan en vez de programarse todos con el
// mismo delay.
const nextAllowed = new Map<string, number>();

function ruleFor(url: string): { key: string; interval: number } | null {
  for (const rule of DOMAIN_INTERVALS) {
    if (url.includes(rule.match)) return { key: rule.match, interval: rule.interval };
  }
  return null;
}

export const rateLimitInterceptor: HttpInterceptorFn = (req, next) => {
  const rule = ruleFor(req.url);
  if (!rule) return next(req);

  const now = Date.now();
  const scheduled = Math.max(now, nextAllowed.get(rule.key) ?? 0);
  nextAllowed.set(rule.key, scheduled + rule.interval);

  const delay = scheduled - now;
  return delay <= 0 ? next(req) : timer(delay).pipe(switchMap(() => next(req)));
};
