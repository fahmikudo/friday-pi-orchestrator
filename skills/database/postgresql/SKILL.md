---
name: postgresql
description: "Applies PostgreSQL-specific types, constraints, indexing, transactions, JSONB, UUIDs, and operational behavior. Use when PostgreSQL is the target DB."
---

# postgresql

## Purpose

Use PostgreSQL capabilities intentionally and compatibly with the actual server version.

## Use When

- PostgreSQL schema/query/migration
- indexes
- transactions
- JSONB
- UUIDs

## Do Not Use When

- other DB engines

## Required Inputs

- server version
- extensions
- migration tool
- schema conventions

## Operating Rules

- Verify feature availability against server version.
- Prefer native types/constraints.
- Use JSONB only for genuinely semi-structured data.
- Consider operational implications of index/DDL choices.

## Workflow

1. Confirm server version.
2. Select types/features.
3. Design constraints/indexes.
4. Review transaction behavior.
5. Check migration compatibility.
6. Run DB tests.

## Required Evidence

- version assumption
- feature rationale
- migration/query evidence

## Quality Gates

- [ ] No unsupported feature.
- [ ] Type/index fits access.
- [ ] Migration implications known.

## Output Contract

- Version
- Features
- Schema/index rationale
- Migration/testing

Do not claim completion without the required evidence.

## References

- PostgreSQL docs: https://www.postgresql.org/docs/
