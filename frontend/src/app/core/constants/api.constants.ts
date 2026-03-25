import { environment } from '../../../environments/environment';

export const API_URL = environment.apiUrl;

export const AUTH_ENDPOINTS = {
  login: `${API_URL}/auth/login`,
  register: `${API_URL}/auth/register`,
  logout: `${API_URL}/auth/logout`,
  refresh: `${API_URL}/auth/refresh`,
  me: `${API_URL}/auth/me`,
} as const;
