# Ghost Pro Academy

A pool billiard training application for tracking player progress across exercise categories.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | NestJS (TypeScript) |
| Frontend | Angular (TypeScript) |
| Database | PostgreSQL 16 (Docker) |
| ORM | TypeORM |

## Prerequisites

Make sure you have the following installed on your machine:

- [Node.js](https://nodejs.org/) v20+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd Ghost-Pro-Academy
```

### 2. Install dependencies

Always run installs from the **root** of the project, never from inside a workspace folder.

```bash
npm install
```

> **Why:** This project uses npm workspaces. Running `npm install` from the root ensures packages are hoisted correctly to the root `node_modules/`. Running it from inside `backend/` or `frontend/` causes hoisting conflicts.

### 3. Set up environment variables

Copy the example env files and fill in your values:

```bash
# Root (Docker credentials)
cp .env.example .env

# Backend
cp backend/.env.example backend/.env
```

The default values in `.env.example` work out of the box for local development — no changes needed unless you want custom credentials.

### 4. Start the database

```bash
docker compose up -d
```

This starts a PostgreSQL 16 container. To verify it's running:

```bash
docker ps
```

### 5. Start the backend

```bash
npm run start:backend
```

The API will be available at `http://localhost:3000`.

### 6. Start the frontend

```bash
npm run start:frontend
```

The app will be available at `http://localhost:4200`.

---

## Installing dependencies

Always use the workspace flag when adding packages:

```bash
# Add a dependency to the backend
npm install <package> --workspace=backend

# Add a dev dependency to the backend
npm install <package> --workspace=backend --save-dev

# Add a dependency to the frontend
npm install <package> --workspace=frontend

# Add a shared dependency (available to all workspaces)
npm install <package>
```

Never run `npm install` from inside `backend/` or `frontend/` directly.

---

## Project Structure

```
Ghost-Pro-Academy/
├── backend/          # NestJS API
├── frontend/         # Angular app
├── shared/
│   └── types/        # Shared TypeScript interfaces (used by both backend and frontend)
├── docs/
│   └── adr/          # Architecture Decision Records — read before touching the code
├── docker-compose.yml
├── .env.example
└── package.json      # npm workspaces root
```

## Architecture decisions

Before contributing, read the ADRs in [`docs/adr/`](docs/adr/). They explain every major technical decision and the tradeoffs behind them.

| ADR | Decision |
|---|---|
| [ADR-001](docs/adr/ADR-001-tech-stack.md) | Tech stack (NestJS, Angular, monolith, monorepo) |
| [ADR-002](docs/adr/ADR-002-database.md) | Database (PostgreSQL over MongoDB) |
| [ADR-003](docs/adr/ADR-003-authentication.md) | Authentication (JWT, HttpOnly cookies, bcrypt) |
| [ADR-004](docs/adr/ADR-004-backend-architecture.md) | Backend architecture (Clean Architecture) |
| [ADR-005](docs/adr/ADR-005-frontend-architecture.md) | Frontend architecture (Angular team structure + NgRx SignalStore) |

---

## Stopping the database

```bash
docker compose down
```

To also delete the stored data (full reset):

```bash
docker compose down -v
```
