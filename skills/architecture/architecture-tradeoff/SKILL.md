---
name: architecture-tradeoff
description: "Evaluates architecture alternatives using constraints, costs, operational burden, failure modes, compatibility, and reversibility. Use for consequential design decisions."
---

# architecture-tradeoff

## Purpose

Replace fashionable choices with evidence-based tradeoffs.

## Use When

- database/broker/cache choice
- sync vs async
- new service/module
- consistency tradeoff
- large architecture change

## Do Not Use When

- routine implementation detail

## Required Inputs

- decision
- constraints
- scale/reliability needs
- team/operations constraints

## Operating Rules

- Always include a credible simpler option.
- Operational complexity is a cost.
- State revisit triggers.
- Prefer reversible decisions under uncertainty.

## Workflow

1. Frame decision/constraints.
2. List 2-4 options.
3. Compare benefits/costs/failure modes.
4. Assess operations and migration.
5. Select option.
6. Define revisit trigger.

## Required Evidence

- options matrix
- selected option
- rejected alternatives
- failure modes
- revisit trigger

## Quality Gates

- [ ] Choice addresses current constraints.
- [ ] Simpler option was considered.
- [ ] Costs/failure modes explicit.
- [ ] Migration/reversibility understood.

## Output Contract

- Decision
- Constraints
- Options
- Tradeoff table
- Recommendation
- Revisit trigger

Do not claim completion without the required evidence.

## References

- ADR guidance: https://adr.github.io/
- Martin Fowler Architecture: https://martinfowler.com/architecture/
