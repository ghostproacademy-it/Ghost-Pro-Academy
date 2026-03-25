import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ILoginRequest, ILoginResponse, IRegisterRequest } from '@ghost-pro-academy/shared';
import { Observable } from 'rxjs';
import { AUTH_ENDPOINTS } from '../constants/api.constants';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  register(data: IRegisterRequest): Observable<ILoginResponse['user']> {
    return this.http.post<ILoginResponse['user']>(AUTH_ENDPOINTS.register, data);
  }

  login(data: ILoginRequest): Observable<ILoginResponse['user']> {
    return this.http.post<ILoginResponse['user']>(AUTH_ENDPOINTS.login, data);
  }

  logout(): Observable<void> {
    return this.http.post<void>(AUTH_ENDPOINTS.logout, {});
  }

  me(): Observable<ILoginResponse['user']> {
    return this.http.get<ILoginResponse['user']>(AUTH_ENDPOINTS.me);
  }

  refresh(): Observable<void> {
    return this.http.post<void>(AUTH_ENDPOINTS.refresh, {});
  }
}
