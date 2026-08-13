---
name: architecture-review
description: "Reviews code/design for module boundaries, ownership, dependency direction, domain placement, and unnecessary complexity. Use for architecture-impacting work."
---

# architecture-review

## Purpose

Catch structural regressions independently from implementer intent.

## Use When

- new module
- cross-module change
- domain logic
- large refactor
- new architecture pattern

## Do Not Use When

- tiny local bug

## Required Inputs

- approved design
- changed files
- module map
- project memory

## Operating Rules

- Review against approved design/project architecture.
- Flag violations with evidence.
- Separate MUST_FIX from preferences.

## Workflow

1. Compare to design.
2. Check ownership/data access.
3. Check dependency direction.
4. Check layer placement.
5. Check over-abstraction.
6. Classify findings.

## Required Evidence

- file/line evidence
- boundary findings
- design deviations

## Quality Gates

- [ ] No unresolved boundary violation.
- [ ] No hidden cross-module data access.
- [ ] Material deviation approved/fixed.

## Output Contract

- Verdict
- MUST_FIX
- SHOULD_FIX
- Evidence
- Deviations

Do not claim completion without the required evidence.

## References

- Simon Brown — Software Architecture for Developers.
- Eric Evans — Domain-Driven Design.
