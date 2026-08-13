---
name: transaction-boundary-design
description: "Defines transaction boundaries, consistency, locking, concurrency, retries, and side-effect behavior. Use for multi-write or critical state transitions."
---

# transaction-boundary-design

## Purpose

Align atomicity with business invariants and avoid long/distributed transactions.

## Use When

- multi-table writes
- financial/inventory transition
- concurrent state change
- cross-module workflow

## Do Not Use When

- single independent read
- pure computation

## Required Inputs

- invariants
- writes
- concurrency expectations
- module ownership

## Operating Rules

- Transaction protects a consistency boundary.
- Keep transactions short.
- Avoid external network calls inside DB transactions.
- Use locking/versioning only when justified.
- Cross-module atomicity needs an explicit pattern.

## Workflow

1. List writes/invariants.
2. Identify atomic set.
3. Define isolation/locking.
4. Move external side effects outside or use outbox.
5. Define retry.
6. Define partial-failure handling.

## Required Evidence

- transaction scope
- isolation/locking rationale
- concurrency scenario
- retry/failure path

## Quality Gates

- [ ] All protected invariants are atomic.
- [ ] Transaction excludes unnecessary work.
- [ ] Deadlock/retry considered.
- [ ] External effects cannot silently half-complete.

## Output Contract

- Consistency boundary
- Transaction scope
- Concurrency control
- External effects
- Failure handling

Do not claim completion without the required evidence.

## References

- PostgreSQL transactions: https://www.postgresql.org/docs/current/tutorial-transactions.html
- Martin Kleppmann — Designing Data-Intensive Applications.
