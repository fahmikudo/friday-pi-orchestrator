---
name: typescript-backend
description: "Applies strict TypeScript modeling to server code using narrow types, unknown-safe boundaries, discriminated unions, runtime validation, and DTO/domain separation."
---

# typescript-backend

## Purpose

Use the type system to make invalid states harder to represent without excessive type complexity.

## Use When

- Node/TypeScript backend
- DTO validation
- domain unions/state machines
- library APIs

## Do Not Use When

- plain JS
- frontend-only TypeScript

## Required Inputs

- tsconfig
- runtime validation library
- type conventions
- contracts

## Operating Rules

- Respect project strictness.
- Treat external data as unknown until validated.
- Prefer discriminated unions for finite states.
- Avoid assertions that only silence compiler.
- Runtime validation remains required at trust boundaries.

## Workflow

1. Inspect tsconfig.
2. Model trust boundaries.
3. Define runtime validation/static types.
4. Implement domain/application types.
5. Remove unsafe casts/any.
6. Run typecheck/tests.

## Required Evidence

- typecheck result
- validation boundary
- unsafe-cast review
- public type compatibility

## Quality Gates

- [ ] Typecheck passes.
- [ ] No unjustified any/assertion.
- [ ] External input runtime-validated.
- [ ] State model avoids obvious invalid combos.

## Output Contract

- Types
- Validation boundary
- Unsafe exceptions
- Typecheck/tests

Do not claim completion without the required evidence.

## References

- TypeScript Handbook: https://www.typescriptlang.org/docs/handbook/
- TSConfig Reference: https://www.typescriptlang.org/tsconfig/
