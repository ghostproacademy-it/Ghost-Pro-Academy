# ADR-002: Database — PostgreSQL over MongoDB

**Status:** Accepted
**Date:** 2026-03-19

---

## Context

Ghost Pro Academy requires persistent storage for:
- Users and authentication
- Exercises (with canvas data: ball positions, trajectories, zones)
- Exercise attempts (one record per player interaction — high write volume over time)
- Materialized category scores per user (for fast home page recommendations)

The two primary candidates evaluated were **PostgreSQL** (relational) and **MongoDB** (document). The exercise canvas data (semi-structured JSON) was the main argument in favor of MongoDB.

---

## Decision: PostgreSQL

---

## Why PostgreSQL

### 1. The data model is relational by nature

The core relationships are:

```
User → many ExerciseAttempts → each linked to one Exercise
User → many UserCategoryScores → one per category
Exercise → many ExerciseAttempts
```

These are well-defined, stable relations with referential integrity requirements. PostgreSQL handles this natively with foreign keys, joins, and transactions. MongoDB can model relations via references, but joins must be done in application code or via `$lookup` aggregation — adding complexity with no benefit.

### 2. JSONB covers the canvas data use case

Exercise canvas data (ball positions, cue ball trajectory, zones) is semi-structured and may vary between exercise types. This was the primary argument for MongoDB.

PostgreSQL's **JSONB** column type stores and indexes JSON natively. It supports:
- Full JSON storage without a fixed schema
- GIN indexes for querying inside JSON documents
- Partial indexes on specific JSON fields if needed

This eliminates MongoDB's advantage for this use case while keeping everything in one database.

**Example canvas document stored in JSONB:**
```json
{
  "cueBall": { "x": 0.5, "y": 0.3 },
  "targetBall": { "x": 0.2, "y": 0.7 },
  "trajectory": [{ "x": 0.5, "y": 0.3 }, { "x": 0.2, "y": 0.7 }],
  "targetZone": { "cx": 0.8, "cy": 0.8, "radius": 0.05 }
}
```

### 3. ACID transactions

Recording a player's exercise attempt may eventually involve multiple writes: inserting an `ExerciseAttempt` row and updating `UserCategoryScore`. These two operations must succeed or fail together.

PostgreSQL provides full ACID transactions. MongoDB added multi-document transactions in v4.0, but they come with significant performance overhead and are rarely used in practice in MongoDB applications.

### 4. Progress table scalability: native partitioning

The `ExerciseAttempt` table is the highest-growth table in the system. PostgreSQL supports **declarative table partitioning by date range** natively. This keeps query performance predictable as the table grows to millions of rows, without requiring a migration later.

MongoDB's equivalent scaling strategy is sharding, which requires a dedicated config server, mongos router, and shard key design — a much heavier operational footprint.

### 5. ORM consistency

The chosen ORM is TypeORM (see ADR-001). TypeORM's PostgreSQL support is first-class and battle-tested. TypeORM's MongoDB support is a secondary target and notably weaker — missing several features and with known edge cases. Using MongoDB with TypeORM would mean accepting a degraded ORM experience or switching to Mongoose, which introduces a second ORM paradigm into the stack.

---

## Why MongoDB was considered

| MongoDB advantage | Conclusion |
|---|---|
| Native document storage for canvas data | Covered by PostgreSQL JSONB |
| Flexible schema evolution | JSONB schema is already flexible. PostgreSQL migrations handle structured fields. |
| Horizontal scaling (sharding) | Not needed at current scale. PostgreSQL read replicas + partitioning are sufficient. Revisit in 3–5 years. |

---

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| MongoDB | See above. Primary advantage (document storage) is covered by JSONB. Relational features would be lost at a real cost. |
| SQLite | Zero-setup, good for local development. Not suitable for production: no horizontal read scaling, limited concurrency, no native partitioning. |
| MySQL / MariaDB | Solid relational database, but PostgreSQL has superior JSONB support, better partitioning, and stronger TypeORM integration. No compelling reason to choose MySQL over PostgreSQL for this stack. |
| CockroachDB | Distributed SQL, PostgreSQL-compatible. Adds operational complexity with no benefit at this scale. |

---

## Consequences

- All structured data (users, exercises, attempts, scores) lives in PostgreSQL
- Exercise canvas data is stored as a `JSONB` column — no separate document store needed
- The `ExerciseAttempt` table is partitioned by month from day one
- If the canvas format evolves (new field types, new exercise variants), no migration is required — JSONB absorbs schema changes transparently
- If horizontal write scaling becomes necessary beyond what a single PostgreSQL primary can handle, evaluate **Citus** (PostgreSQL extension for distributed tables) before considering a database migration
- Connection pooling via **PgBouncer** should be introduced before going to production to prevent connection exhaustion under load
