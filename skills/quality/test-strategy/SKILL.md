---
name: test-strategy
description: "Creates a risk-aligned test strategy across unit, integration, contract, and E2E levels. Use during design/decomposition and verification planning."
---

# test-strategy

## Purpose

Spend test effort where failure matters while keeping feedback fast.

## Use When

- new feature
- cross-layer change
- migration
- integration
- critical workflow

## Do Not Use When

- trivial non-behavioral change

## Required Inputs

- acceptance criteria
- architecture boundaries
- risks
- test infrastructure

## Operating Rules

- Use lowest level proving behavior.
- Boundary behavior needs boundary tests.
- E2E for high-value paths only.
- Map material acceptance criteria to evidence.

## Workflow

1. List behaviors/risks.
2. Assign test levels.
3. Define fixtures/environment.
4. Define negative/boundary/concurrency cases.
5. Define regression commands.
6. Define verification evidence.

## Required Evidence

- test matrix
- acceptance mapping
- commands/environments
- known gaps

## Quality Gates

- [ ] Critical behaviors covered.
- [ ] Security/compatibility/data risks have negative cases.
- [ ] No criterion verified without evidence.

## Output Contract

- Test matrix
- Risk coverage
- Acceptance mapping
- Commands
- Gaps

Do not claim completion without the required evidence.

## References

- Google Testing Blog: https://testing.googleblog.com/
- Martin Fowler — Test Pyramid guidance.
