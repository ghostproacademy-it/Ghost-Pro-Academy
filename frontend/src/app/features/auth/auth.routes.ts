import { Routes } from '@angular/router';
import { APP_ROUTES } from '../../core/constants/routes.constants';

export const AUTH_ROUTES: Routes = [
  {
    path: APP_ROUTES.auth.login.root,
    loadComponent: () =>
      import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: APP_ROUTES.auth.register.root,
    loadComponent: () =>
      import('./pages/register/register.component').then(
        (m) => m.RegisterComponent,
      ),
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: APP_ROUTES.auth.login.root,
  },
];
