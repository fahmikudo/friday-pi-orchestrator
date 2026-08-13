---
name: acceptance-criteria
description: "Writes measurable acceptance criteria using observable outcomes, negative paths, permissions, boundaries, and state transitions."
---

# acceptance-criteria

## Purpose

Give implementation and QA a shared definition of done.

## Use When

- new feature
- bug fix
- PRD decomposition
- API/UI workflow

## Do Not Use When

- pure internal refactor preserving behavior

## Required Inputs

- requirement
- actor
- business outcome
- edge cases

## Operating Rules

- Describe outcome, not implementation.
- Include permissions/errors when material.
- Criteria independently verifiable.
- Avoid vague adjectives without metrics.

## Workflow

1. Identify primary outcome.
2. Write happy path.
3. Write negative/permission cases.
4. Write boundaries/state transitions.
5. Link requirement IDs.

## Required Evidence

- criteria list
- negative cases
- traceability

## Quality Gates

- [ ] Each criterion pass/fail observable.
- [ ] No unnecessary implementation prescription.
- [ ] Critical edge/security cases represented.

## Output Contract

- Acceptance criteria
- Negative cases
- Traceability

Do not claim completion without the required evidence.

## References

- Gherkin reference: https://cucumber.io/docs/gherkin/reference/
