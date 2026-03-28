export const APP_ROUTES = {
  auth: {
    root: 'auth',
    path: '/auth',
    login: {
      root: 'login',
      path: '/auth/login',
    },
    register: {
      root: 'register',
      path: '/auth/register',
    },
  },
  dashboard: {
    root: 'dashboard',
    path: '/dashboard',
  },
  exercises: {
    root: 'exercises',
    path: '/exercises',
    viewer: {
      path: '/exercises/viewer',
    },
  },
} as const;
