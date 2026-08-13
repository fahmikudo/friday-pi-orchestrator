---
name: react-frontend
description: "Implements React features using composition, hooks, predictable state, effects only for external synchronization, routing/forms/query integration, and behavioral tests."
---

# react-frontend

## Purpose

Write React aligned with actual repository version and conventions.

## Use When

- React component/page
- hooks
- router
- forms/query

## Do Not Use When

- Vue/Angular

## Required Inputs

- React version
- routing/state/query/form stack
- design system
- test stack

## Operating Rules

- Inspect version before newer APIs.
- Effects synchronize with external systems; avoid derivable-state effects.
- Prefer composition/explicit props.
- Use design system consistently.

## Workflow

1. Inspect architecture.
2. Classify state.
3. Design component tree.
4. Implement with minimal effects.
5. Integrate router/query/forms.
6. Add tests.
7. Run typecheck/lint/tests.

## Required Evidence

- component/state map
- new-effect rationale
- typecheck/lint/tests
- a11y states

## Quality Gates

- [ ] No unnecessary effect state.
- [ ] No duplicate state.
- [ ] Hooks rules respected.
- [ ] Tests cover behavior.

## Output Contract

- Components
- State
- Effects
- Data/forms
- Tests

Do not claim completion without the required evidence.

## References

- React docs: https://react.dev/
- Thinking in React: https://react.dev/learn/thinking-in-react
