---
name: modular-monolith
description: "Designs and reviews modular monoliths with strict internal boundaries. Use when one deployable should preserve domain modularity."
---

# modular-monolith

## Purpose

Get modularity benefits without premature distributed-system operational cost.

## Use When

- new modular monolith
- module decomposition
- dependency cleanup
- future extraction seams

## Do Not Use When

- tiny apps where modules add no value
- fully distributed system unless reviewing a monolith component

## Required Inputs

- deployment model
- domain/module map
- dependency graph
- data ownership

## Operating Rules

- Deployment unity does not justify coupling.
- Prefer explicit module APIs.
- Keep module dependencies visible.
- Avoid distributed patterns solely for fashion.

## Workflow

1. Define modules around ownership.
2. Define allowed dependencies.
3. Define public surfaces.
4. Define data ownership.
5. Define cross-module transaction policy.
6. Define extraction seams only when useful.

## Required Evidence

- module map
- dependency graph
- public surfaces
- data ownership
- transaction policy

## Quality Gates

- [ ] No unexplained cycles.
- [ ] Module internals are not consumed externally.
- [ ] Tables/models have clear owners.
- [ ] System remains operable as one deployable.

## Output Contract

- Modules
- Dependencies
- Public surfaces
- Data ownership
- Transaction policy

Do not claim completion without the required evidence.

## References

- C4 Model: https://c4model.com/
- Sam Newman — Monolith to Microservices.
