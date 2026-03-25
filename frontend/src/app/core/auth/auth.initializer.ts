import { inject } from '@angular/core';
import { catchError, EMPTY } from 'rxjs';
import { AppStore } from '../store/app.store';
import { AuthService } from './auth.service';

export function authInitializer(): Promise<void> {
  const authService = inject(AuthService);
  const appStore = inject(AppStore);

  return authService
    .me()
    .pipe(catchError(() => EMPTY))
    .forEach((user) => appStore.setUser(user));
}
