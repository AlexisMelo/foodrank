import { HttpInterceptorFn } from '@angular/common/http';
import { InjectionToken, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * Origin of the API, prefixed to `/api` urls. Empty when the API is served on the same origin (dev proxy).
 */
export const API_URL = new InjectionToken<string>('API_URL', {
  providedIn: 'root',
  factory: () => environment.apiUrl,
});

/**
 * Sends the `/api` requests to the API: prefixes its origin and sends the session cookie with them.
 * Other requests go out unchanged.
 */
export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api/')) return next(req);

  return next(req.clone({ url: `${inject(API_URL)}${req.url}`, withCredentials: true }));
};
