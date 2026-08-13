---
name: angular-frontend
description: "Implements Angular features using the project's Angular version and established standalone/module, signals/RxJS, DI, forms, routing, and testing conventions."
---

# angular-frontend

## Purpose

Use Angular platform structure without unnecessary observable or DI complexity.

## Use When

- Angular component/route/service
- forms
- signals/RxJS
- DI
- guards/interceptors

## Do Not Use When

- React/Vue

## Required Inputs

- Angular version
- standalone/module architecture
- RxJS/state conventions
- forms/test stack

## Operating Rules

- Inspect version before newer APIs.
- Use signals vs RxJS based on semantics/project convention.
- Avoid nested subscriptions; compose streams.
- Keep services cohesive.
- Choose form approach intentionally.

## Workflow

1. Inspect architecture/version.
2. Classify state/streams.
3. Design component/service boundaries.
4. Implement routing/forms/data.
5. Handle lifecycle/subscriptions.
6. Add tests.
7. Run build/typecheck/lint/tests.

## Required Evidence

- component/service map
- signals/RxJS rationale
- subscription lifecycle
- test/build evidence

## Quality Gates

- [ ] No unmanaged subscriptions.
- [ ] DI ownership clear.
- [ ] Form/data errors handled.
- [ ] Build/tests pass.

## Output Contract

- Components/services
- State/streams
- Forms
- Routing/data
- Tests

Do not claim completion without the required evidence.

## References

- Angular docs: https://angular.dev/
- Angular testing: https://angular.dev/guide/testing
