---
name: safe-database-migration
description: "Plans and implements backward-safe database migrations including expand/migrate/contract, locking risk, backfills, rollback, and idempotent seed behavior."
---

# safe-database-migration

## Purpose

Make DB evolution safe across existing data and deployment order.

## Use When

- add/drop/rename column
- constraint/index
- backfill
- table split/merge
- seed/reference data

## Do Not Use When

- throwaway DB with no lifecycle discipline

## Required Inputs

- DB engine/version
- migration tool
- existing data volume if known
- deployment sequence

## Operating Rules

- Prefer additive before destructive.
- Large backfills chunkable/resumable.
- Assess lock/table rewrite.
- Seeds idempotent when rerunnable.
- Rollback considers data loss.

## Workflow

1. Classify change.
2. Design expand/migrate/contract.
3. Assess locks/rewrite/backfill.
4. Implement migration.
5. Define rollback/forward-fix.
6. Test with existing data shape.

## Required Evidence

- migration
- compatibility sequence
- lock/backfill assessment
- migration test
- rollback/forward-fix

## Quality Gates

- [ ] Old/new app coexist when required.
- [ ] Existing data valid.
- [ ] Migration repeatable per tool.
- [ ] Destructive steps gated.

## Output Contract

- Classification
- Sequence
- Data/backfill
- Lock risk
- Rollback
- Tests

Do not claim completion without the required evidence.

## References

- PostgreSQL ALTER TABLE: https://www.postgresql.org/docs/current/sql-altertable.html
- Evolutionary DB design: https://martinfowler.com/articles/evodb.html
