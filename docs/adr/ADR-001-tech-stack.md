# ADR-001: Tech Stack — NestJS + Angular + Shared Library + Monolith + Monorepo

**Status:** Accepted
**Date:** 2026-03-19

---

## Context

Ghost Pro Academy is a pool billiard training application where players browse exercises, track their progress, and receive suggestions based on their level per category.

We needed to define the foundational tech stack before writing any code. The decisions here affect developer experience, scalability, hiring, and long-term maintainability.

---

## Decisions & Tradeoffs

### Backend: NestJS over Express / Fastify / other

**Decision:** NestJS

**Why:**
NestJS is an opinionated framework built on top of Express (or Fastify) that enforces a modular, layered architecture (controllers, services, modules). It brings structure that Express does not impose, which is critical as the codebase grows.

**Alternatives considered:**

| Alternative | Why rejected |
|---|---|
| Plain Express | No structure enforced. Works fine for small projects but becomes a maintenance burden as the team or codebase grows. Every team reinvents their own conventions. |
| Fastify | Great performance, but less mature ecosystem for enterprise features (auth, guards, interceptors). NestJS can run on Fastify as a drop-in if performance becomes a concern. |
| Hapi | Declining community and adoption. Not worth the hiring risk. |

**Tradeoff accepted:** NestJS has a steeper learning curve than Express due to decorators and dependency injection. This is a worthwhile tradeoff for the structure and scalability it provides.

---

### Frontend: Angular over React / Vue

**Decision:** Angular

**Why:**
Angular is a full framework (routing, forms, HTTP client, DI, state management conventions) whereas React is a library that requires assembling a stack. For a structured training application with clear domain entities and forms, Angular's opinionated structure reduces decision fatigue and keeps the codebase consistent across contributors.

**Alternatives considered:**

| Alternative | Why rejected |
|---|---|
| React | Great ecosystem, but requires choosing and assembling: router (React Router / TanStack), state (Redux / Zustand / Jotai), forms (React Hook Form), HTTP client, etc. Each choice is a new ADR and a new onboarding burden. |
| Vue | Good DX, but smaller enterprise adoption and ecosystem compared to Angular for structured applications. |
| Next.js / Nuxt | SSR frameworks add complexity. This app does not require SEO-critical server-side rendering. A SPA is sufficient. |

**Tradeoff accepted:** Angular is more verbose and has a steeper initial learning curve than React. The payoff is consistency, built-in tooling, and strong TypeScript support.

---

### Architecture: Monolith over Microservices

**Decision:** Monolith (modular)

**Why:**
The application has a well-defined, contained domain: users, exercises, progress. There is no current need for independent deployability, team isolation, or polyglot persistence — the primary drivers for microservices.

Starting with microservices at this stage would introduce:
- Network latency between services
- Distributed tracing complexity
- Multiple deployment pipelines
- Over-engineering for a problem that doesn't exist yet

A **modular monolith** (NestJS modules with clear boundaries: `AuthModule`, `UsersModule`, `ExercisesModule`, `ProgressModule`) gives us the separation of concerns of microservices without the operational overhead. If a specific module needs to be extracted into a service in 5 years, the boundaries are already defined.

**Alternatives considered:**

| Alternative | Why rejected |
|---|---|
| Microservices from day one | Premature complexity. The team and domain are not large enough to justify it. Classic distributed systems failure modes (network partitions, eventual consistency) would slow down development significantly. |
| Serverless functions | Good for event-driven workloads, not ideal for a request/response API with relational data and complex business logic. Cold starts and stateless constraints would complicate auth and session handling. |

**Tradeoff accepted:** A monolith is harder to scale horizontally at the service level. Mitigation: UUID v7 primary keys, date-partitioned progress table, and read replicas via PostgreSQL are sufficient scaling levers for the foreseeable future. See ADR-002.

---

### Code Organization: Monorepo over Polyrepo

**Decision:** Monorepo with npm workspaces

**Why:**
The project has two applications (backend and frontend) that share TypeScript types. A monorepo allows:
- A single `git clone` to get the full project
- Shared types between frontend and backend with no publishing step (no npm registry required)
- Atomic commits across frontend and backend (e.g., adding a new API endpoint and its Angular service in one commit)
- Unified tooling (linting, formatting, testing scripts at the root)

**Alternatives considered:**

| Alternative | Why rejected |
|---|---|
| Polyrepo (separate repos) | Shared types would require publishing a package to npm or a private registry on every change. Cross-cutting changes require coordinated PRs across repos. Onboarding requires cloning multiple repos. |
| Nx | Nx is the natural monorepo tool for Angular + NestJS and provides build caching, dependency graph visualization, and code generators. Rejected because it adds significant tooling complexity and opinionated project structure for a project of this size. Can be introduced later if the number of apps/libraries grows. |
| Turborepo | Similar to Nx but more build-system focused. Same conclusion: overkill for two apps. |

**Tradeoff accepted:** npm workspaces lack the advanced build caching and dependency graph features of Nx/Turborepo. At the current scale, this is not a bottleneck. Revisit if the project adds more than 3–4 apps or shared libraries.

---

### Shared Library: `shared/types/`

**Decision:** A dedicated `shared/` workspace package containing TypeScript interfaces shared between backend and frontend.

**Why:**
Without a shared types layer, the same interfaces (e.g., `Exercise`, `UserCategoryScore`, `ExerciseAttempt`) would need to be defined twice — once in NestJS DTOs and once in Angular models. This leads to drift, where the frontend and backend disagree on a field name or type silently.

A shared types package ensures a **single source of truth** for the data contract between frontend and backend.

**Scope:** Types only. No business logic, no utilities. Keeping the shared package thin prevents it from becoming a dumping ground.

**Tradeoff accepted:** Both apps are now coupled to the shared package. A breaking type change requires updating both simultaneously. This is intentional — it makes breaking changes visible at compile time rather than at runtime.

---

## Consequences

- New modules in the backend follow the NestJS module pattern: one folder per domain (`auth/`, `users/`, `exercises/`, `progress/`)
- New Angular features follow the Angular standalone component pattern
- Any new data type shared between frontend and backend must be defined in `shared/types/` first
- The monolith boundary must be respected: no direct DB calls from outside a module's service layer
- Revisit Nx adoption if the project exceeds 3 apps or 5 shared libraries
