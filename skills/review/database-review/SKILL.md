---
name: database-review
description: "Reviews schema, migrations, constraints, indexes, queries, transaction safety, existing-data impact, and operational locking risk."
---

# database-review

## Purpose

Catch integrity and deployment risks before production.

## Use When

- migration
- new table
- constraint/index
- query
- transaction

## Do Not Use When

- no DB change

## Required Inputs

- schema/migration diff
- DB version
- deployment sequence
- query plan if relevant

## Operating Rules

- Review existing data.
- Check rollback/forward-fix.
- Check constraints/races.
- Check locks/backfill/index cost.
- Destructive DDL needs explicit approval.

## Workflow

1. Review DDL/data migration.
2. Review ownership/constraints.
3. Review compatibility.
4. Review locks/backfill.
5. Review index/query plan.
6. Review transaction.

## Required Evidence

- migration evidence
- integrity finding
- compatibility/lock assessment
- plan if relevant

## Quality Gates

- [ ] No unexplained destructive op.
- [ ] Existing data valid.
- [ ] Constraints match invariants.
- [ ] Operational risk bounded.

## Output Contract

- Verdict
- Schema findings
- Migration risk
- Integrity
- Performance

Do not claim completion without the required evidence.

## References

- PostgreSQL docs: https://www.postgresql.org/docs/
