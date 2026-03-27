import { computed, inject, Injector } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { ILoginRequest, IUser, UserRole } from '@ghost-pro-academy/shared';
import { catchError, EMPTY, pipe, switchMap, tap } from 'rxjs';
import { AuthService } from '../auth/auth.service';

type AppState = {
  user: IUser | null;
  isLoading: boolean;
  authError: string | null;
};

const initialState: AppState = {
  user: null,
  isLoading: false,
  authError: null,
};

export const AppStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    isAuthenticated: computed(() => store.user() !== null),
    isAdmin: computed(() => store.user()?.role === UserRole.ADMIN),
  })),
  withMethods((store) => {
    const authService = inject(AuthService);
    const injector = inject(Injector);

    const login = rxMethod<ILoginRequest>(
      pipe(
        tap(() => patchState(store, { isLoading: true, authError: null })),
        switchMap((credentials) =>
          authService.login(credentials).pipe(
            tap((user) => patchState(store, { user, isLoading: false })),
            catchError(() => {
              patchState(store, { authError: 'Invalid credentials', isLoading: false });
              return EMPTY;
            }),
          ),
        ),
      ),
      { injector },
    );

    return {
      setUser(user: IUser): void {
        patchState(store, { user });
      },

      clearUser(): void {
        patchState(store, { user: null });
      },

      setLoading(isLoading: boolean): void {
        patchState(store, { isLoading });
      },

      clearAuthError(): void {
        patchState(store, { authError: null });
      },

      login,
    };
  }),
);
