---
name: vue-frontend
description: "Implements Vue features using the project's Vue version, reactive state discipline, components/composables, props/emits, router/store, and tests."
---

# vue-frontend

## Purpose

Keep Vue reactivity explicit and components cohesive.

## Use When

- Vue component/page
- composable
- Vue Router
- Pinia if used
- Vue forms

## Do Not Use When

- React/Angular

## Required Inputs

- Vue version
- API convention
- router/store/form stack
- test tooling

## Operating Rules

- Inspect project version.
- Avoid losing reactivity through unsafe destructuring.
- Global store only for genuinely shared state.
- Prefer computed over duplicated synchronized state.

## Workflow

1. Inspect conventions.
2. Classify state.
3. Design component/composable boundaries.
4. Implement props/emits/reactivity.
5. Integrate router/store/server state.
6. Add tests.
7. Run typecheck/lint/tests.

## Required Evidence

- component/composable map
- state ownership
- reactivity review
- tests/typecheck

## Quality Gates

- [ ] No lost reactivity.
- [ ] No unnecessary global state.
- [ ] Props/emits explicit.
- [ ] Behavior tests pass.

## Output Contract

- Components/composables
- State
- Reactivity
- Store/router
- Tests

Do not claim completion without the required evidence.

## References

- Vue guide: https://vuejs.org/guide/
- Vue style guide: https://vuejs.org/style-guide/
- Pinia: https://pinia.vuejs.org/
