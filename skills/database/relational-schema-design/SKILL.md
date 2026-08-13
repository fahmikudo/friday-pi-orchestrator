---
name: relational-schema-design
description: "Designs relational schemas with ownership, cardinality, constraints, lifecycle, tenancy, audit, and evolution. Use before creating or materially changing tables."
---

# relational-schema-design

## Purpose

Encode durable integrity without making the schema unnecessarily generic.

## Use When

- new table
- relationship change
- master data
- multi-tenant schema
- audit/lifecycle

## Do Not Use When

- non-relational-only storage

## Required Inputs

- domain ownership
- query/use cases
- data lifecycle
- scope/tenancy
- DB conventions

## Operating Rules

- Start from invariants/access patterns.
- Use constraints for durable integrity.
- Nullability is semantic.
- Avoid generic EAV/JSON when structure is known.
- Define deletion/ownership.

## Workflow

1. Define entity/owner.
2. Define keys.
3. Define attributes/nullability.
4. Define relationships.
5. Define unique/check/FK.
6. Define scope/tenancy.
7. Define lifecycle/audit.

## Required Evidence

- schema
- constraint rationale
- ownership
- cardinality
- lifecycle

## Quality Gates

- [ ] Every column has semantics.
- [ ] Integrity enforced.
- [ ] Ownership/tenancy explicit.
- [ ] No speculative generic model.

## Output Contract

- Tables
- Columns
- Constraints
- Relationships
- Ownership/tenancy
- Lifecycle

Do not claim completion without the required evidence.

## References

- PostgreSQL DDL: https://www.postgresql.org/docs/current/ddl.html
