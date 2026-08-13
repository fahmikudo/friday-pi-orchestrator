---
name: test-quality-review
description: "Reviews whether tests meaningfully prove changed behavior and risks instead of merely increasing coverage."
---

# test-quality-review

## Purpose

Prevent false confidence from brittle, mock-heavy, or irrelevant tests.

## Use When

- new tests
- critical feature
- bug regression
- large refactor

## Do Not Use When

- no behavioral change

## Required Inputs

- acceptance
- changed behavior
- tests
- risk matrix

## Operating Rules

- Passing test proves only what it exercises.
- Prefer behavior assertions.
- Review missing negatives/boundaries.
- Flag tests mocking target boundary.

## Workflow

1. Map tests to requirements/risks.
2. Inspect assertions.
3. Inspect mocks/fixtures.
4. Check negative/boundary.
5. Check determinism.
6. Run focused suite if needed.

## Required Evidence

- requirement-test mapping
- weak/missing findings
- results

## Quality Gates

- [ ] Material criteria have evidence.
- [ ] Regression test protects old bug when feasible.
- [ ] Critical boundary not mocked away.

## Output Contract

- Verdict
- Coverage
- Weak tests
- Missing cases
- Evidence

Do not claim completion without the required evidence.

## References

- Testing Library principles: https://testing-library.com/docs/guiding-principles
- Google Testing Blog: https://testing.googleblog.com/
