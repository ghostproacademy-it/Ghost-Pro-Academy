import {
  HttpErrorResponse,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, lastValueFrom, switchMap, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { AUTH_ENDPOINTS } from '../constants/api.constants';
import { APP_ROUTES } from '../constants/routes.constants';
import { AppStore } from '../store/app.store';

let refreshPromise: Promise<void> | null = null;

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
) => {
  const authService = inject(AuthService);
  const appStore = inject(AppStore);
  const router = inject(Router);

  const reqWithCredentials = req.clone({ withCredentials: true });

  return next(reqWithCredentials).pipe(
    catchError((error: unknown) => {
      const isUnauthorized = error instanceof HttpErrorResponse && error.status === 401;
      const isRefreshUrl = req.url === AUTH_ENDPOINTS.refresh;
      const isLoginUrl = req.url === AUTH_ENDPOINTS.login;

      if (isUnauthorized && !isRefreshUrl && !isLoginUrl) {
        if (!refreshPromise) {
          refreshPromise = lastValueFrom(authService.refresh()).finally(() => {
              refreshPromise = null;
            });
        }

        return from(refreshPromise as Promise<void>).pipe(
          switchMap(() => next(reqWithCredentials)),
          catchError((refreshError: unknown) => {
            appStore.clearUser();
            void router.navigate([APP_ROUTES.auth.login.path]);
            return throwError(() => refreshError);
          }),
        );
      }

      return throwError(() => error);
    }),
  );
};
