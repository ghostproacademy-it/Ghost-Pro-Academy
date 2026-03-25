# ADR-005: Frontend Architecture — Angular Team Structure + NgRx SignalStore

**Status:** Accepted
**Date:** 2026-03-25

---

## Context

Ghost Pro Academy's frontend needs a structural pattern and state management strategy that scales with the application's domain (exercises, progress tracking, scoring) while staying idiomatic to Angular 17+.

We needed to decide:
1. **How to organize the Angular project** — folder structure and layering conventions
2. **How to manage state** — which library and what scope (global vs feature)

---

## Decision 1: Angular Team Recommended Structure

We adopt the folder structure and conventions recommended by the Angular team for Angular 17+ applications.

**Key principles:**
- **Standalone components** — no NgModules, each component declares its own dependencies
- **Lazy-loaded feature routes** — each feature is loaded on demand via the router
- **`core/`** for singletons (services, guards, interceptors, global store) — loaded once at app startup
- **`shared/`** for reusable UI components, pipes, and directives used across features
- **`features/`** for domain-specific pages and feature stores — one folder per domain

```
src/app/
├── core/
│   ├── auth/
│   │   ├── auth.service.ts          ← HTTP calls (login, logout, refresh)
│   │   └── auth.guard.ts            ← protects routes requiring authentication
│   ├── store/
│   │   └── app.store.ts             ← global SignalStore (current user, isAuthenticated)
│   └── interceptors/
│       └── auth.interceptor.ts      ← adds withCredentials, handles 401 → refresh flow
├── shared/
│   ├── components/                  ← reusable UI components (buttons, inputs, cards)
│   └── pipes/                       ← reusable pipes
├── features/
│   ├── auth/
│   │   ├── login/
│   │   │   ├── login.component.ts
│   │   │   ├── login.component.html
│   │   │   └── login.component.scss
│   │   └── register/
│   │       ├── register.component.ts
│   │       ├── register.component.html
│   │       └── register.component.scss
│   ├── exercises/                   ← future
│   │   ├── exercises.store.ts       ← feature SignalStore
│   │   ├── exercise-list/
│   │   └── exercise-detail/
│   └── progress/                    ← future
│       ├── progress.store.ts        ← feature SignalStore
│       └── progress-dashboard/
└── app.routes.ts                    ← root routes with lazy loading
```

**Alternatives considered:**

| Alternative | Why rejected |
|---|---|
| Classic NgModule-based structure | Deprecated direction. Angular team is moving away from NgModules. Standalone components are the present and future. |
| Clean Architecture (mirroring backend) | Adds application/domain/infrastructure layers inside each feature. The frontend doesn't have the same infrastructure abstraction concerns as the backend — HTTP services are thin wrappers. The added boilerplate outweighs the benefit. |

---

## Decision 2: NgRx SignalStore for State Management

We use **NgRx SignalStore** as the state management library.

**Why state management at all:**
Components should not own shared state. As the app grows, multiple components need to read the same data (current user, exercise list, progress scores). Without a store, state lives in services and gets duplicated or goes out of sync.

**Why NgRx SignalStore over alternatives:**

| Library | Why rejected / chosen |
|---|---|
| NgRx Store (classic) | High boilerplate — actions, reducers, selectors, effects for every feature. Overkill for this domain. |
| NGXS | Smaller community, class-based decorator pattern doesn't align with Angular's functional direction. |
| Plain Angular Signals | No structure for side effects, no DevTools, no standard pattern for async operations. Fine for local component state, not for app-wide state. |
| **NgRx SignalStore** ✅ | From the NgRx team (trusted, maintained). Built on Angular signals — the clear direction Angular is heading. Low boilerplate (`withState`, `withMethods`, `withComputed`). DevTools support. |

---

## Global Store vs Feature Stores

State is split into two scopes:

**Global store (`core/store/app.store.ts`)**
- App-wide state that lives for the entire session
- Owns: authenticated user (`IUser | null`), `isAuthenticated` flag
- Loaded at app startup, never unloaded
- Used by: guards, interceptors, any component that needs to know who is logged in

**Feature stores (`features/<feature>/<feature>.store.ts`)**
- State scoped to a specific domain feature
- Loaded when the feature route is activated, can be unloaded when leaving
- Owns: feature-specific data (exercises list, filters, progress scores)
- Can inject and read from the global store
- The global store does NOT know about feature stores

**Dependency direction:**
```
Feature Store → reads from → Global Store
Global Store  → does NOT depend on → Feature Stores
```

---

## Interceptor Strategy

The `AuthInterceptor` in `core/interceptors/` handles two concerns:

1. **`withCredentials: true`** — added to every outgoing request so the browser sends HttpOnly cookies cross-origin (required by ADR-003)
2. **401 handling** — when a request fails with 401, the interceptor calls `POST /auth/refresh` to get a new access token, then retries the original request. If refresh also fails, the user is logged out and redirected to login.

This keeps the token refresh logic centralized — no feature service needs to handle it.

---

## Consequences

- All components are standalone — no NgModule declarations
- Feature routes are lazy-loaded via `loadComponent()` or `loadChildren()` in `app.routes.ts`
- `IUser` from `@ghost-pro-academy/shared` is the type used in `AppStore` — single source of truth for the user shape (see ADR-001)
- The global store is the single source of truth for authentication state — components never call `AuthService` directly for user info, they read from `AppStore`
- Feature stores are provided at the route level (`providers: [ExercisesStore]`) to scope their lifetime to the route
- NgRx SignalStore DevTools should be enabled in development for debugging
