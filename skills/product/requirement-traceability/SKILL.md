---
name: requirement-traceability
description: "Maintains traceability from source requirement to backlog item, work item, task, implementation, and verification evidence."
---

# requirement-traceability

## Purpose

Make completion claims auditable and measurable.

## Use When

- PRD-driven sprint
- compliance
- large delivery
- sprint closure

## Do Not Use When

- tiny ad-hoc task

## Required Inputs

- requirement IDs
- backlog
- work/tasks
- verification artifacts

## Operating Rules

- Traceability links evidence; do not duplicate entire docs.
- Code existence alone is not verification.
- Record deviations/deferred scope.

## Workflow

1. Normalize IDs.
2. Map to backlog.
3. Map executed work/tasks.
4. Link verification.
5. Identify uncovered/deferred.
6. Produce closure matrix.

## Required Evidence

- traceability matrix
- verification links
- uncovered/deferred

## Quality Gates

- [ ] Completed requirement has evidence.
- [ ] Uncovered visible.
- [ ] Deferred not counted complete.

## Output Contract

- Requirement matrix
- Coverage
- Verification
- Gaps/deferred

Do not claim completion without the required evidence.

## References

- ISO/IEC/IEEE 29148 traceability concepts.
