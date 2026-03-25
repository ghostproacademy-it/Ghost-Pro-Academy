import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { APP_ROUTES } from './core/constants/routes.constants';

export const routes: Routes = [
  {
    path: APP_ROUTES.dashboard.root,
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent,
      ),
  },
  {
    path: APP_ROUTES.auth.root,
    loadChildren: () =>
      import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: APP_ROUTES.dashboard.path,
  },
  {
    path: '**',
    redirectTo: APP_ROUTES.auth.login.path,
  },
];
