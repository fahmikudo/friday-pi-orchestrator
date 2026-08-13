---
name: requirement-analysis
description: "Analyzes requirements into actors, goals, behavior, constraints, edge cases, dependencies, ambiguities, scope, and measurable outcomes."
---

# requirement-analysis

## Purpose

Turn ambiguous prose into testable engineering requirements without inventing product decisions.

## Use When

- PRD intake
- feature request
- ambiguous requirement
- cross-team dependency

## Do Not Use When

- well-scoped mechanical task

## Required Inputs

- source requirement
- actors/stakeholders
- existing constraints

## Operating Rules

- Separate stated fact from inference.
- Mark ambiguity.
- Understand behavior before architecture.
- Make out-of-scope explicit.

## Workflow

1. Extract objective.
2. Identify actors.
3. List functional requirements.
4. List constraints/NFRs.
5. Identify ambiguities/edges.
6. Identify dependencies.
7. Draft acceptance criteria.

## Required Evidence

- requirement map
- ambiguities
- scope/out-of-scope
- dependencies
- acceptance draft

## Quality Gates

- [ ] Important behavior not hidden.
- [ ] Assumptions labeled.
- [ ] Requirements verifiable.
- [ ] Out-of-scope explicit.

## Output Contract

- Objective
- Actors
- Requirements
- Constraints
- Ambiguities
- Dependencies
- Acceptance

Do not claim completion without the required evidence.

## References

- ISO/IEC/IEEE 29148 requirements concepts.
