---
name: refactoring
description: "Refactors existing code while preserving observable behavior. Use for structural cleanup, decomposition, naming, duplication removal, and dependency simplification."
---

# refactoring

## Purpose

Improve internal design without silently changing business behavior.

## Use When

- duplication
- oversized units
- dependency tangles
- preparatory refactoring
- code smells

## Do Not Use When

- intentional behavior change unless separated
- large rewrite without safety net

## Required Inputs

- existing behavior/tests
- target smell
- affected public contracts

## Operating Rules

- Establish behavior protection first.
- Prefer small reversible transformations.
- Do not mix unrelated feature changes.
- Keep public contracts stable unless approved.

## Workflow

1. Identify smell and target structure.
2. Confirm tests or add characterization tests.
3. Apply one small transformation.
4. Run focused tests.
5. Repeat.
6. Run regression.
7. Document retained debt.

## Required Evidence

- tests before
- incremental transformation evidence
- tests after
- public contract comparison

## Quality Gates

- [ ] Behavior preserved.
- [ ] Complexity/coupling reduced.
- [ ] No unnecessary abstraction.
- [ ] Tests remain readable.

## Output Contract

- Before problem
- Steps
- After structure
- Behavior evidence

Do not claim completion without the required evidence.

## References

- Martin Fowler — Refactoring: Improving the Design of Existing Code.
