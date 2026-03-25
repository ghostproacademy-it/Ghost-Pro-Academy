import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { APP_ROUTES } from '../constants/routes.constants';
import { AppStore } from '../store/app.store';

export const authGuard: CanActivateFn = () => {
  const appStore = inject(AppStore);
  const router = inject(Router);

  if (appStore.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree([APP_ROUTES.auth.login.path]);
};
