# ADR-003: Authentication — JWT in HttpOnly Cookie

**Status:** Accepted
**Date:** 2026-03-19

---

## Context

Ghost Pro Academy requires authentication to identify players, protect routes, and associate exercise attempts and progress with a specific user.

We needed to decide:
1. **What token format** to use (JWT vs opaque session token)
2. **Where to store the token** on the client (localStorage, sessionStorage, HttpOnly cookie)
3. **How to protect against** the attack vectors introduced by each storage strategy

---

## Decisions & Tradeoffs

### 1. Token format: JWT over server-side sessions

**Decision:** JSON Web Token (JWT)

**Why:**
A JWT is a self-contained, signed token. The server can verify a request's identity by validating the signature — no database lookup required per request.

**Alternatives considered:**

| Alternative | Why rejected |
|---|---|
| Server-side sessions (stored in DB or Redis) | Requires a session store (Redis or DB table). Every request hits the session store to validate. Adds infrastructure dependency and latency. Acceptable for stateful monoliths but adds operational overhead we don't need yet. |
| Opaque tokens (random string, looked up in DB) | Same problem as server-side sessions — requires a DB lookup on every request. |

**Tradeoff accepted:** JWTs cannot be invalidated before expiry without a blocklist (which reintroduces a DB/Redis lookup). Mitigation: short expiry (15 minutes) for the access token + refresh token rotation. A compromised access token has a limited validity window.

---

### 2. Token storage: HttpOnly Cookie over localStorage

**Decision:** HttpOnly cookie

**Why:**
The token must be stored somewhere on the client between requests. The two primary options are `localStorage` and `HttpOnly` cookies.

**localStorage:**
- Accessible via `document.cookie` — wait, accessible via `window.localStorage` / JavaScript directly
- Any XSS (Cross-Site Scripting) attack that injects JavaScript into the page can read the token and exfiltrate it
- An attacker who steals the token can impersonate the user from any machine, at any time, until the token expires
- **This is unacceptable for an authentication token**

**HttpOnly cookie:**
- The `HttpOnly` flag instructs the browser to **never expose the cookie to JavaScript**
- `document.cookie` cannot read it
- XSS attacks cannot steal it
- The browser sends it automatically with every matching request

**Full cookie configuration:**

```
HttpOnly   → not accessible to JavaScript (XSS mitigation)
Secure     → only sent over HTTPS (man-in-the-middle mitigation)
SameSite=Strict → only sent when request originates from the same site (CSRF mitigation)
Path=/     → sent with all API requests
```

**Alternatives considered:**

| Alternative | Why rejected |
|---|---|
| localStorage | Vulnerable to XSS token theft. Industry consensus has moved away from this. |
| sessionStorage | Same XSS vulnerability as localStorage. Token lost on tab close — poor UX. |
| In-memory (JS variable) | Not accessible to XSS. But lost on page refresh — requires a silent refresh mechanism that adds complexity, and still requires a HttpOnly cookie to hold the refresh token. Net result: same cookie dependency, more complexity. |

**Tradeoff accepted:** HttpOnly cookies are vulnerable to CSRF (Cross-Site Request Forgery) — an attacker can trick a user's browser into sending the cookie to the API from a malicious site. Fully mitigated by `SameSite=Strict` on modern browsers (all browsers released since 2020). If legacy browser support becomes a requirement, a CSRF token (double-submit cookie pattern) can be layered on top.

---

### 3. Access token + Refresh token

**Decision:** Two-token strategy

**Why:**
A single long-lived JWT (e.g., valid 7 days) means a compromised token is valid for days. A single short-lived JWT (e.g., 15 minutes) means the user is logged out every 15 minutes.

The solution is two tokens:

| Token | Expiry | Storage | Purpose |
|---|---|---|---|
| Access token | 15 minutes | HttpOnly cookie | Sent with every API request to authenticate the user |
| Refresh token | 7 days | HttpOnly cookie (separate) | Used only to obtain a new access token when it expires |

**Flow:**
```
1. User logs in → server sets both cookies
2. User makes API requests → access token is validated (no DB lookup)
3. Access token expires → frontend calls POST /auth/refresh with refresh token cookie
4. Server validates refresh token (DB lookup) → issues new access token
5. User logs out → server clears both cookies + invalidates refresh token in DB
```

**Refresh token rotation:** every time a refresh token is used, it is invalidated and a new one is issued. If an old refresh token is presented (replay attack), all refresh tokens for that user are revoked — forcing a full re-login.

**Tradeoff accepted:** Refresh tokens must be stored in the database to support invalidation (logout, rotation). This is a single DB lookup only at refresh time (every 15 minutes), not on every request — acceptable overhead.

---

### 4. Password hashing: bcrypt over argon2

**Decision:** bcrypt

**Why:**
bcrypt is battle-tested (introduced 1999), has broad library support across all languages, and is the industry standard for password hashing. It incorporates a salt natively and has a configurable cost factor to tune against hardware improvements.

**argon2** is the winner of the Password Hashing Competition (2015) and is theoretically more resistant to GPU and side-channel attacks. It is the better choice from a pure security standpoint.

**Why bcrypt was chosen over argon2:**
- bcrypt has decades of production validation and audits
- argon2 library maturity in the Node.js ecosystem is slightly behind bcrypt
- The security difference is negligible for a web application where the primary attack vector is a database breach — both are computationally expensive enough to make brute force impractical
- The team is more familiar with bcrypt

**Tradeoff accepted:** argon2 is the more modern choice. This decision should be revisited if the security posture of the application increases (e.g., storing sensitive health or financial data).

**bcrypt cost factor:** 12 (a good balance between security and server response time as of 2026).

---

### 5. Authorization: Role-based (RBAC) with a simple enum

**Decision:** `role` field on the `User` entity (`user` | `admin`)

**Why:**
The application has two classes of users: players and administrators (who manage exercises). A simple role enum on the user record is sufficient. NestJS `Guards` and a `@Roles()` decorator enforce this at the route level.

**Alternatives considered:**

| Alternative | Why rejected |
|---|---|
| Full RBAC (roles + permissions tables) | Over-engineering. The permission model is simple and stable. A DB-driven permission system adds complexity without benefit at this stage. |
| ABAC (attribute-based access control) | For fine-grained policies (e.g., "user can only edit their own attempts"). Enforce this in the service layer with ownership checks, not a full ABAC framework. |

**Tradeoff accepted:** Adding new roles in the future requires a code change (enum update + migration). Acceptable given the simplicity of the current permission model.

---

## Consequences

- The Angular HTTP client must use `withCredentials: true` on all API requests for cookies to be sent cross-origin
- CORS must be configured on the NestJS backend to allow the Angular origin with `credentials: true`
- The backend exposes three auth endpoints: `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`
- Refresh tokens are stored in the database with a `revokedAt` field to support invalidation
- All protected routes use a `JwtAuthGuard` (NestJS guard) that validates the access token from the cookie
- Role-protected routes additionally use a `RolesGuard` with a `@Roles('admin')` decorator
- The `Secure` cookie flag requires HTTPS — local development uses HTTP with the flag disabled via environment variable

## NestJS Implementation

Following the Clean Architecture pattern established in ADR-004, auth is implemented as follows:

**Token extraction and validation (Infrastructure)**
- Passport.js with `passport-jwt` handles token verification
- A `JwtStrategy` (Passport strategy) is registered in the infrastructure layer — it extracts the token from `req.cookies.access_token`, verifies the signature against `JWT_SECRET`, then calls `UsersService.findById()` with the decoded `sub` to load and attach the user to `req.user`

**Route protection (Presentation)**
- `JwtAuthGuard` wraps the Passport JWT strategy — applied via `@UseGuards(JwtAuthGuard)` on any protected route
- `RolesGuard` reads the `@Roles()` decorator on the route handler and checks `req.user.role` — always used together with `JwtAuthGuard`

**Business logic (Application)**
- Each auth operation is a dedicated Use Case class (see ADR-004):
  - `RegisterUseCase` — validates email uniqueness, hashes password (bcrypt, cost 12), creates user
  - `LoginUseCase` — verifies credentials, signs JWT, sets HttpOnly cookie on the response
  - `LogoutUseCase` — clears the cookie

**Request lifecycle for a protected route**
```
Incoming request
    → JwtAuthGuard triggers JwtStrategy
    → token extracted from cookie → signature verified → payload decoded
    → UsersService.findById(payload.sub) → user loaded from DB
    → user attached to req.user
    → (optional) RolesGuard checks req.user.role against @Roles()
    → controller handler runs
```
