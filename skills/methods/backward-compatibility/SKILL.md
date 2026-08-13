---
name: backward-compatibility
description: "Analyzes compatibility across APIs, schemas, events, configuration, stored data, and rolling deployments. Use when changing consumed contracts."
---

# backward-compatibility

## Purpose

Make breaking-change risk explicit and prefer additive migration paths.

## Use When

- API/DTO changes
- database schema changes
- event payload changes
- config changes
- frontend/backend contract changes

## Do Not Use When

- private implementation with no persisted/wire contract

## Required Inputs

- current contract
- proposed contract
- known consumers
- deployment sequence

## Operating Rules

- Classify wire/data/source compatibility separately when relevant.
- Prefer additive → migrate → remove.
- Consider old clients and old data.
- State rollback constraints.

## Workflow

1. Identify consumers.
2. Diff old/new contract.
3. Classify breaking/additive.
4. Design transition.
5. Define observability/rollback.
6. Verify old/new interoperability where needed.

## Required Evidence

- contract diff
- consumer inventory
- migration sequence
- compatibility evidence
- rollback plan

## Quality Gates

- [ ] No known consumer silently breaks.
- [ ] Expected deployment order is supported.
- [ ] Stored data remains valid/readable or is migrated.

## Output Contract

- Compatibility surface
- Breaking changes
- Transition plan
- Evidence
- Rollback

Do not claim completion without the required evidence.

## References

- Martin Fowler — Parallel Change: https://martinfowler.com/bliki/ParallelChange.html
