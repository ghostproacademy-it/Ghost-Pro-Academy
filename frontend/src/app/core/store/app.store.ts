import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { IUser, UserRole } from '@ghost-pro-academy/shared';

type AppState = {
  user: IUser | null;
  isLoading: boolean;
};

const initialState: AppState = {
  user: null,
  isLoading: false,
};

export const AppStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    isAuthenticated: computed(() => store.user() !== null),
    isAdmin: computed(() => store.user()?.role === UserRole.ADMIN),
  })),
  withMethods((store) => ({
    setUser(user: IUser): void {
      patchState(store, { user });
    },
    clearUser(): void {
      patchState(store, { user: null });
    },
    setLoading(isLoading: boolean): void {
      patchState(store, { isLoading });
    },
  })),
);
