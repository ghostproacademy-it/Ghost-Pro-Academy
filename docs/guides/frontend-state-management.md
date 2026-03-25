# Frontend State Management — NgRx SignalStore

This guide explains the state management approach used in Ghost Pro Academy and why we chose it over the classic NgRx Store. Read this before working on any feature that involves shared state.

---

## Why state management at all?

Components should not own shared state. As the app grows, multiple components need to read the same data — who is logged in, what exercises are loaded, what the current score is. Without a store:

- State lives in services and gets duplicated
- Components go out of sync
- No clear source of truth
- Hard to debug — state can change from anywhere

A store gives you **one place** where state lives, **one way** to change it, and **visibility** into every change.

---

## Two approaches: Classic NgRx Store vs NgRx SignalStore

### Classic NgRx Store

The classic NgRx Store follows the **Redux pattern** — a strict unidirectional data flow popularized by React/Redux. For a simple "store the logged-in user" feature, you need:

**Actions** — events that describe what happened:
```typescript
// auth.actions.ts
export const loginSuccess = createAction(
  '[Auth] Login Success',
  props<{ user: IUser }>()
);
export const logout = createAction('[Auth] Logout');
```

**Reducer** — a pure function that produces new state from an action:
```typescript
// auth.reducer.ts
export const authReducer = createReducer(
  { user: null },
  on(loginSuccess, (state, { user }) => ({ ...state, user })),
  on(logout, (state) => ({ ...state, user: null })),
);
```

**Selectors** — how to read state:
```typescript
// auth.selectors.ts
export const selectUser = createSelector(
  selectAuthState,
  (state) => state.user
);
export const selectIsAuthenticated = createSelector(
  selectUser,
  (user) => user !== null
);
```

**Effects** — for async operations like HTTP calls:
```typescript
// auth.effects.ts
login$ = createEffect(() =>
  this.actions$.pipe(
    ofType(AuthActions.login),
    switchMap(({ dto }) =>
      this.authService.login(dto).pipe(
        map((user) => AuthActions.loginSuccess({ user })),
        catchError((err) => of(AuthActions.loginFailure({ error: err })))
      )
    )
  )
);
```

**In the component** — dispatch actions and select state as Observables:
```typescript
this.store.dispatch(loginSuccess({ user }));
this.user$ = this.store.select(selectUser); // Observable<IUser | null>
```

**That's 4-5 files and ~100 lines for one piece of state.**

The Redux pattern is explicit and fully traceable — every state change goes through a named action. This is powerful for large teams where you need a full audit trail of every state change. But for most features, it's a lot of ceremony.

---

### NgRx SignalStore

NgRx SignalStore is the modern alternative from the same NgRx team. It drops the Redux ceremony and replaces Observables with **Angular Signals**.

Same "store the logged-in user" feature, one file:

```typescript
// app.store.ts
export const AppStore = signalStore(
  { providedIn: 'root' },
  withState({
    user: null as IUser | null,
    isLoading: false,
  }),
  withComputed((store) => ({
    isAuthenticated: computed(() => store.user() !== null),
    isAdmin: computed(() => store.user()?.role === UserRole.ADMIN),
  })),
  withMethods((store) => ({
    setUser(user: IUser)           { patchState(store, { user }) },
    clearUser()                    { patchState(store, { user: null }) },
    setLoading(isLoading: boolean) { patchState(store, { isLoading }) },
  })),
);
```

In the component — no Observables, no `async` pipe, no subscriptions:
```typescript
private store = inject(AppStore);

user = this.store.user;                       // Signal<IUser | null>
isAuthenticated = this.store.isAuthenticated; // Signal<boolean>
```

Angular re-renders automatically when a signal changes. No manual subscription management.

---

## Key concepts

### `withState`
Defines the shape and initial values of the store. Every property becomes a **Signal** automatically.

```typescript
withState({ user: null as IUser | null })
// creates: store.user() → Signal<IUser | null>
```

### `withComputed`
Derived state that recomputes automatically when its dependencies change. Like a spreadsheet formula.

```typescript
withComputed((store) => ({
  isAuthenticated: computed(() => store.user() !== null),
}))
// store.isAuthenticated() → true if user !== null
// recalculates automatically whenever store.user() changes
```

### `withMethods`
The **only** way to mutate state. `patchState` does a partial update — you only provide the fields you want to change.

```typescript
withMethods((store) => ({
  setUser(user: IUser) { patchState(store, { user }) },
}))
// store.setUser(user) → updates user, leaves isLoading untouched
```

### Signals vs Observables

| | Observable | Signal |
|---|---|---|
| How to read | `subscribe()` or `async` pipe | Call it: `store.user()` |
| Unsubscribe needed | Yes | No |
| Lazy vs eager | Lazy | Eager |
| Template syntax | `{{ user$ \| async }}` | `{{ user() }}` |
| When it updates | On emission | When value changes |

Signals are simpler for UI state. Observables are still useful for streams (HTTP responses, WebSocket events) — but for state that a component reads and reacts to, signals are less error-prone.

---

## Store structure in this project

### Global store (`core/store/app.store.ts`)
- Singleton — `{ providedIn: 'root' }`
- Owns: authenticated user, `isAuthenticated`, `isAdmin`
- Lives for the entire app session
- Used by: guards, interceptors, navbar, any component that needs to know who is logged in

### Feature stores (`features/<feature>/<feature>.store.ts`)
- Scoped to the feature route — provided at the route level
- Loaded when the feature activates, can be unloaded when leaving
- Owns: feature-specific data (exercises list, progress scores)
- Can inject and read from `AppStore`
- `AppStore` does NOT depend on feature stores

```
AppStore (global, root)
    ↑ injected by
ExercisesStore (feature, route-scoped)
ProgressStore  (feature, route-scoped)
```

---

## Rules

1. **Components never own shared state** — if two components need the same data, it belongs in a store
2. **State is only mutated through `withMethods`** — never call `patchState` from a component
3. **HTTP calls belong in services** — stores call services, not the other way around
4. **Feature stores read from `AppStore`, never the reverse** — dependencies only go downward
