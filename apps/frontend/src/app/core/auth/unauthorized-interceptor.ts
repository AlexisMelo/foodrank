import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs';
import { AuthStore, SESSION_CHECK } from './auth-store';

/**
 * Logs out when the API rejects the session (401), and leaves the current page if it is private. The error is
 * still passed on to the caller. The session check is left out (see SESSION_CHECK).
 */
export const unauthorizedInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.context.get(SESSION_CHECK)) return next(req);

  const auth = inject(AuthStore);
  return next(req).pipe(
    tap({
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 401) void auth.sessionRejected();
      },
    }),
  );
};
