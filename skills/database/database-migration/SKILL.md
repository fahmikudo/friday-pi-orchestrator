---
name: database-migration
description: "Routes database migration work through schema design, safe migration sequencing, integrity, PostgreSQL-specific behavior, and verification. Use as a high-level migration entry skill."
---

# database-migration

## Purpose

Keep backward compatibility and existing data safety central to migration work.

## Use When

- any non-trivial DB migration
- legacy database-migration skill compatibility
- schema/backfill/deployment change

## Do Not Use When

- query-only optimization with no migration
- non-database work

## Required Inputs

- DB engine/version
- migration tool
- schema change
- deployment order
- existing data

## Operating Rules

- Load `safe-database-migration` for migration mechanics.
- Load `relational-schema-design` for schema semantics.
- Load `data-integrity` for constraints/races.
- Load `postgresql` when applicable.
- Do not perform destructive migration without explicit approval.

## Workflow

1. Classify schema/data change.
2. Load detailed migration/schema skills.
3. Design expand/migrate/contract.
4. Assess existing data and locks.
5. Implement migration.
6. Test upgrade path.
7. Document rollback/forward-fix.

## Required Evidence

- migration sequence
- migration test
- existing-data assessment
- lock risk
- rollback/forward-fix

## Quality Gates

- [ ] Migration preserves required compatibility.
- [ ] Data remains valid.
- [ ] Destructive steps gated.
- [ ] Evidence exists.

## Output Contract

- Change
- Detailed skills loaded
- Sequence
- Risks
- Tests
- Rollback

Do not claim completion without the required evidence.

## References

- Evolutionary Database Design: https://martinfowler.com/articles/evodb.html
