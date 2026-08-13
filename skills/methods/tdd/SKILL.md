---
name: tdd
description: "Applies test-driven development to behavior changes and bug fixes. Use when adding or changing observable behavior where executable tests are practical."
---

# tdd

## Purpose

Make behavior changes measurable through RED → GREEN → REFACTOR using the cheapest test level that proves the behavior.

## Use When

- new domain behavior
- bug fixes with regression risk
- application orchestration
- API behavior changes
- refactoring that needs a safety net

## Do Not Use When

- pure documentation
- generated code
- mechanical formatting
- changes with no meaningful executable behavior

## Required Inputs

- requirement or defect
- acceptance criteria
- affected module
- available test commands/framework

## Operating Rules

- Test behavior, not private implementation details.
- A failing test must fail for the expected reason.
- Prefer unit tests for pure logic and integration tests for real boundaries.
- Do not mock away the behavior being proven.
- Keep tests deterministic.

## Workflow

1. State the behavior and failure mode.
2. Choose unit/component/integration/contract/E2E level.
3. Write the smallest failing test.
4. Run it and confirm expected RED.
5. Implement the minimum change.
6. Run until GREEN.
7. Refactor while staying GREEN.
8. Run relevant regression tests.

## Required Evidence

- test file/name
- RED command/result
- GREEN command/result
- negative/boundary cases
- regression result

## Quality Gates

- [ ] The test fails on regression.
- [ ] Tests avoid irrelevant implementation coupling.
- [ ] Material negative/boundary behavior is covered.
- [ ] Relevant regression suite passes.

## Output Contract

- Behavior protected
- Test level and rationale
- RED evidence
- GREEN evidence
- Regression evidence

Do not claim completion without the required evidence.

## References

- Kent Beck — Test Driven Development: By Example.
- Martin Fowler — Test Pyramid: https://martinfowler.com/articles/practical-test-pyramid.html
- Google Testing Blog: https://testing.googleblog.com/
