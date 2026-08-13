---
name: frontend-testing
description: "Tests user-visible frontend behavior at component, integration, and E2E levels while avoiding private implementation-detail assertions."
---

# frontend-testing

## Purpose

Protect user-observable behavior with maintainable tests.

## Use When

- component behavior
- form flow
- query/mutation UI
- navigation
- UI regression

## Do Not Use When

- pure styling where no meaningful behavior test exists

## Required Inputs

- acceptance criteria
- test stack
- component/page boundaries
- network mocking approach

## Operating Rules

- Prefer accessible role/text queries.
- Mock network boundaries rather than component internals.
- Use E2E for critical journeys, not every branch.
- Snapshot-only confidence is insufficient.

## Workflow

1. List behaviors.
2. Choose test level.
3. Write failing regression where applicable.
4. Exercise success/failure/loading/empty/permission states.
5. Run focused/regression suite.

## Required Evidence

- behavior-to-test mapping
- commands/results
- negative states
- E2E where justified

## Quality Gates

- [ ] Tests fail on behavior regression.
- [ ] No private hook/state dependence.
- [ ] Critical error/permission states covered.
- [ ] Suite deterministic.

## Output Contract

- Behaviors
- Test levels
- Cases
- Results
- Gaps

Do not claim completion without the required evidence.

## References

- Testing Library principles: https://testing-library.com/docs/guiding-principles
