---
name: frontend-component-design
description: "Designs frontend component boundaries, composition, state placement, loading/error/empty states, and reusable interfaces. Use for React, Vue, or Angular feature/component work."
---

# frontend-component-design

## Purpose

Keep UI components cohesive and prevent server/form/UI/application state from becoming one undifferentiated layer.

## Use When

- new page/feature
- component decomposition
- shared UI extraction
- large component refactor

## Do Not Use When

- backend-only work

## Required Inputs

- user flow
- design system
- framework conventions
- data/state dependencies

## Operating Rules

- Decompose by responsibility/reuse, not arbitrary line count.
- Keep server state out of ad-hoc global stores when query tooling owns it.
- Prefer composition over mega-components.
- Accessibility semantics are part of design.

## Workflow

1. Map page/feature hierarchy.
2. Classify state ownership.
3. Define component APIs.
4. Define loading/error/empty states.
5. Define accessibility behavior.
6. Add behavioral tests.

## Required Evidence

- component tree
- state ownership
- component API
- UX states
- test coverage

## Quality Gates

- [ ] No duplicate sources of truth.
- [ ] Props/events ownership clear.
- [ ] Reusable components not over-coupled.
- [ ] Key user states handled.

## Output Contract

- Component tree
- State ownership
- Interfaces
- UX states
- Tests

Do not claim completion without the required evidence.

## References

- Atomic Design vocabulary: https://atomicdesign.bradfrost.com/
