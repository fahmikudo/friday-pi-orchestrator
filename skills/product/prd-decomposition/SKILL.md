---
name: prd-decomposition
description: "Decomposes PRD/sprint scope into independently deliverable work items with dependencies, acceptance coverage, and recommended order."
---

# prd-decomposition

## Purpose

Create backlog units that can move through engineering lifecycle independently.

## Use When

- Sprint PRD
- large epic
- multi-module delivery
- incremental rollout

## Do Not Use When

- single small request

## Required Inputs

- PRD
- technical constraints
- architecture/module map
- milestone

## Operating Rules

- One clear outcome per item.
- Do not split only by technical layer if end-to-end slice possible.
- Dependencies reflect real prerequisites.
- Foundation work must have rationale.

## Workflow

1. Extract requirements.
2. Group independent outcomes.
3. Identify necessary foundations.
4. Map dependencies.
5. Map source requirements.
6. Order by risk/enablement.
7. Check item size.

## Required Evidence

- backlog list
- dependency DAG
- requirement mapping
- order

## Quality Gates

- [ ] No cycles.
- [ ] Every in-scope requirement mapped.
- [ ] Items completable/foundational intentionally.
- [ ] Dependency reasons explicit.

## Output Contract

- Backlog
- Dependencies
- Requirement mapping
- Order
- Risks

Do not claim completion without the required evidence.

## References

- Jeff Patton — User Story Mapping.
- INVEST as heuristic.
