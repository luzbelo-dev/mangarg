import { HttpInterceptorFn } from '@angular/common/http';
import { timer, switchMap } from 'rxjs';

let lastJikanRequest = 0;
const MIN_INTERVAL = 350;

export const rateLimitInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.includes('api.jikan.moe')) {
    return next(req);
  }

  const now = Date.now();
  const elapsed = now - lastJikanRequest;

  if (elapsed >= MIN_INTERVAL) {
    lastJikanRequest = now;
    return next(req);
  }

  const delay = MIN_INTERVAL - elapsed;
  lastJikanRequest = now + delay;
  return timer(delay).pipe(switchMap(() => next(req)));
};
