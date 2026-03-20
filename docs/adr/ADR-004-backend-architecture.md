# ADR-004: Backend Architecture — Clean Architecture

**Status:** Accepted
**Date:** 2026-03-20

---

## Context

Ghost Pro Academy's backend needs a structural pattern that can accommodate real business logic — scoring per category, progress tracking, level suggestions — without becoming unmaintainable as the codebase grows.

We needed to decide how to organize the backend beyond the default NestJS convention of controller → service → repository.

Three canonical backend architecture models were considered.

---

## Options Considered

### Option 1: Layered Architecture

The default NestJS pattern. Code is split by technical role:

```
Controller → Service → Repository
```

**How it works:**
- Controllers handle HTTP (routing, parsing, status codes)
- Services contain all business logic
- Repositories handle data access (TypeORM)

**Tradeoffs:**

| | |
|---|---|
| ✅ Low ceremony | Minimal boilerplate, NestJS tutorials all use this pattern |
| ✅ Fast to start | Works well for simple CRUD operations |
| ❌ Services bloat | All logic goes into services — no structural guidance on how to split it. A `ProgressService` handling scoring, level suggestions, and category aggregation becomes a god class |
| ❌ Anemic domain | Business rules live in services as procedures, not in domain objects that enforce their own invariants |
| ❌ Hard to test | Services depend directly on TypeORM repositories — mocking requires framework-level setup |
| ❌ Tight coupling | Business logic depends on TypeORM — swapping the ORM or testing without a database is expensive |

**Verdict:** Appropriate for pure CRUD apps. Ghost Pro Academy has real business logic that will make this pattern painful by the third module.

---

### Option 2: Domain-Driven Design (DDD)

The full domain modeling approach. Code is split by domain concepts:

```
Controller → Application Service → Domain Model (Aggregates, Value Objects, Domain Events)
                                        ↓
                                   Repository (interface)
                                        ↓
                                   Infrastructure (TypeORM implementation)
```

**How it works:**
- **Aggregates** are clusters of domain objects with a root that enforces consistency invariants
- **Value Objects** are immutable, self-validating types (`Email`, `Password`, `Score`)
- **Domain Events** represent things that happened (`UserRegistered`, `ExerciseCompleted`)
- **Bounded Contexts** map to NestJS modules, each with its own ubiquitous language
- **Repository interfaces** defined in the domain, implemented in infrastructure

**Tradeoffs:**

| | |
|---|---|
| ✅ Highest expressiveness | The code maps directly to the business domain — domain experts can read it |
| ✅ Enforces invariants | Aggregates prevent invalid domain state by design |
| ✅ Fully decoupled | Domain layer has zero infrastructure dependencies |
| ✅ Scales to complexity | The right tool when business rules are deep and intertwined |
| ❌ High ceremony | Aggregates, value objects, domain events, factories, bounded contexts — significant boilerplate for every feature |
| ❌ Slow to start | Requires deep domain understanding upfront to draw aggregate and context boundaries correctly |
| ❌ Wrong boundaries are painful | A misplaced aggregate boundary is expensive to fix later |
| ❌ Overkill for this domain | Ghost Pro Academy has business logic, but not the depth that justifies full DDD — no complex consistency boundaries, no eventual consistency requirements, no multiple teams working on isolated contexts |

**Verdict:** The right tool for enterprise domains with deep, complex business rules. Premature for Ghost Pro Academy at this stage.

---

### Option 3: Clean Architecture ✅ Chosen

A middle ground that enforces dependency direction without the full DDD vocabulary:

```
Controller → Use Case → Domain Service / Entity
                ↓
        Repository Interface (defined in domain)
                ↓
        Repository Implementation (TypeORM, in infrastructure)
```

**How it works:**
- **Use Cases** (one class per operation: `LoginUseCase`, `RegisterUserUseCase`, `RecordAttemptUseCase`) contain the business logic for a single operation. They are the entry point into the domain layer
- **Domain layer** contains entities and domain services — pure TypeScript, no framework dependencies, no TypeORM decorators
- **Repository interfaces** are defined in the domain layer (`IUsersRepository`). The domain depends on the abstraction, not the implementation
- **Infrastructure layer** contains TypeORM implementations of those interfaces, NestJS decorators, and all framework-specific code
- **Controllers** are thin — they parse the HTTP request and delegate to a Use Case

**Dependency rule:** dependencies point inward. Domain knows nothing about NestJS, TypeORM, or HTTP. Infrastructure knows about everything.

```
Infrastructure (NestJS, TypeORM)
    ↓ depends on
Application (Use Cases)
    ↓ depends on
Domain (Entities, Repository Interfaces)
    ↑ no outward dependencies
```

**Tradeoffs:**

| | |
|---|---|
| ✅ Explicit operations | Every business operation is a named class. "Where does this logic go?" always has one answer: write a Use Case |
| ✅ Testable by design | Use Cases depend on repository interfaces — inject a mock, no database required |
| ✅ Domain stays pure | Business logic has no NestJS or TypeORM coupling. It can be tested, moved, or reused without framework setup |
| ✅ Grows gracefully | If a module becomes complex enough to warrant DDD patterns (value objects, domain events), they can be added to that module without rearchitecting everything else |
| ✅ Clear onboarding | A new developer reads the Use Cases to understand what the system does — no need to trace through service methods |
| ❌ More files | Each operation is a class. More files than Layered, but each file has a single, clear responsibility |
| ❌ Slightly more setup | Repository interfaces require a mapping step between domain entities and TypeORM entities — small overhead, big payoff in testability |
| ❌ Unfamiliar to NestJS-only devs | Most NestJS tutorials use Layered. Developers new to Clean Architecture have a short learning curve |

**Verdict:** The right level of structure for Ghost Pro Academy. Handles real business logic cleanly, remains pragmatic, and leaves room to adopt DDD patterns selectively if a specific module earns it.

---

## Decision

**Clean Architecture**, applied pragmatically.

Full DDD vocabulary (aggregates, value objects, domain events) is not adopted globally — but can be introduced in specific modules if the business logic complexity justifies it.

---

## Folder Structure

Each NestJS module maps to a bounded slice of the application with four internal layers:

```
backend/src/
├── auth/
│   ├── application/
│   │   └── use-cases/          ← LoginUseCase, RegisterUserUseCase
│   ├── domain/
│   │   ├── entities/           ← pure domain entities (no TypeORM)
│   │   └── repositories/       ← IAuthRepository (interfaces)
│   ├── infrastructure/
│   │   ├── persistence/        ← TypeORM entities + repository implementations
│   │   └── strategies/         ← JwtStrategy (passport, framework-specific)
│   ├── presentation/
│   │   ├── controllers/        ← HTTP controllers (thin)
│   │   ├── dto/                ← request/response shapes
│   │   └── guards/             ← JwtAuthGuard, RolesGuard
│   └── auth.module.ts
├── users/
│   ├── application/use-cases/
│   ├── domain/
│   ├── infrastructure/
│   └── users.module.ts
├── exercises/                  ← future
├── progress/                   ← future
└── app.module.ts
```

---

## Consequences

- Every new business operation gets its own Use Case class — no adding logic to existing service methods
- Repository interfaces live in `domain/repositories/` — TypeORM implementations live in `infrastructure/persistence/`
- Controllers live in `presentation/` and stay thin — no business logic, only HTTP parsing and delegation
- Domain entities are plain TypeScript classes — TypeORM decorators live on separate persistence entities in `infrastructure/`
- NestJS modules remain the unit of encapsulation — other modules interact through exported services or use cases, never through direct repository access
- If a module's domain becomes complex enough, DDD patterns (value objects, domain events) can be introduced inside that module without affecting others
