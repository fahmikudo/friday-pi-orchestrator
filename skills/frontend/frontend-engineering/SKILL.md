---
name: frontend-engineering
description: "Routes frontend implementation to the correct framework and cross-cutting frontend skills. Use as a high-level frontend entry skill when the task spans component/state/forms/testing concerns."
---

# frontend-engineering

## Purpose

Provide a concise frontend engineering checklist and force selection of exactly one framework-specific skill.

## Use When

- general frontend feature
- frontend architecture discussion
- unknown frontend task before stack-specific routing

## Do Not Use When

- backend-only work
- when a more specific frontend skill alone is sufficient

## Required Inputs

- framework/version
- design system
- routing/state/query/form/test stack
- acceptance criteria

## Operating Rules

- Load exactly one framework skill: React, Vue, or Angular.
- Then load only relevant common frontend skills.
- Inspect actual project conventions before applying generic advice.
- Keep server/form/UI/URL state ownership explicit.

## Workflow

1. Identify framework/version.
2. Select framework skill.
3. Classify state.
4. Select component/forms/server-state/testing/accessibility skills as needed.
5. Implement and verify with project commands.

## Required Evidence

- selected framework skill
- selected common skills and rationale
- typecheck/lint/test results

## Quality Gates

- [ ] Exactly one framework path chosen.
- [ ] No unnecessary skill overload.
- [ ] Project conventions respected.
- [ ] Behavior evidence exists.

## Output Contract

- Framework
- Loaded skills
- State/data/form approach
- Verification

Do not claim completion without the required evidence.

## References

- Pi Skills: https://pi.dev/docs/latest/skills
