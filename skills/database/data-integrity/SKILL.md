---
name: data-integrity
description: "Reviews uniqueness, foreign keys, checks, transactional invariants, soft deletion, and race-safe database enforcement. Use for critical business data."
---

# data-integrity

## Purpose

Ensure integrity survives concurrency and application bugs.

## Use When

- business uniqueness
- financial/inventory state
- status transitions
- multi-table invariant
- soft-delete reuse

## Do Not Use When

- read-only analytics

## Required Inputs

- business invariants
- schema
- concurrency scenarios
- delete lifecycle

## Operating Rules

- App validation alone cannot enforce race-sensitive uniqueness.
- Use DB constraints for durable rules.
- Soft delete changes uniqueness semantics.
- Cross-row invariants need transaction/locking strategy.

## Workflow

1. List invariants.
2. Map app vs DB enforcement.
3. Design constraints.
4. Evaluate soft-delete.
5. Evaluate races.
6. Add constraint/concurrency tests.

## Required Evidence

- invariant matrix
- constraints
- concurrency scenario
- tests

## Quality Gates

- [ ] Critical invariant durable.
- [ ] Concurrent writes cannot trivially violate.
- [ ] Delete/restore defined.
- [ ] Constraint errors map cleanly.

## Output Contract

- Invariants
- DB enforcement
- App enforcement
- Concurrency
- Tests

Do not claim completion without the required evidence.

## References

- PostgreSQL docs: https://www.postgresql.org/docs/
