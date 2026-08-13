---
name: nestjs-backend
description: "Implements NestJS modules, controllers, providers, guards, pipes, interceptors, adapters, and tests with strict module boundaries."
---

# nestjs-backend

## Purpose

Use Nest DI/module system without turning decorators into hidden business architecture.

## Use When

- Nest modules
- controllers/providers
- guards/auth
- pipes/validation
- interceptors
- Nest tests

## Do Not Use When

- framework-neutral TypeScript
- non-Nest Node

## Required Inputs

- Nest version
- module graph
- validation/auth/persistence
- test conventions

## Operating Rules

- Controllers thin.
- Modules reflect ownership, not global grab bags.
- Avoid circular dependencies; redesign before forwardRef.
- Guards enforce access boundaries, not domain invariants.
- Validate external input.

## Workflow

1. Inspect module graph.
2. Assign owning module.
3. Define controller/provider roles.
4. Define DTO validation/error mapping.
5. Define persistence/transaction.
6. Use guards/interceptors only for cross-cutting.
7. Add tests.
8. Run typecheck/lint/tests.

## Required Evidence

- module dependency changes
- DTO validation
- guard/auth behavior
- tests
- cycle review

## Quality Gates

- [ ] No accidental global coupling.
- [ ] No avoidable cycles.
- [ ] Validation explicit.
- [ ] Authorization consistent.
- [ ] Typecheck/tests pass.

## Output Contract

- Module ownership
- Providers/controllers
- Validation
- Auth
- Persistence
- Tests

Do not claim completion without the required evidence.

## References

- NestJS docs: https://docs.nestjs.com/
- NestJS testing: https://docs.nestjs.com/fundamentals/testing
- TypeScript Handbook: https://www.typescriptlang.org/docs/handbook/
- TSConfig Reference: https://www.typescriptlang.org/tsconfig/
