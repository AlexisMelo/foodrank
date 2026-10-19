import { HttpErrorResponse } from '@angular/common/http';
import { OperatorFunction, catchError, of, throwError } from 'rxjs';

/**
 * Turns an API error with `status` into `value` (e.g. a 404 into `undefined`); any other error is rethrown.
 */
export function recoverOnStatus<T, R>(status: number, value: R): OperatorFunction<T, T | R> {
  return catchError((error: unknown) =>
    error instanceof HttpErrorResponse && error.status === status
      ? of(value)
      : throwError(() => error),
  );
}
