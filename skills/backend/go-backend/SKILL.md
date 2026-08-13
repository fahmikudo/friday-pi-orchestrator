---
name: go-backend
description: "Implements idiomatic Go backend code with explicit boundaries, context propagation, errors, testing, and concurrency discipline. Use for Go services and modules."
---

# go-backend

## Purpose

Keep Go code simple, explicit, testable, and aligned with repository architecture.

## Use When

- Go domain/application/repository/API
- Go refactor
- Go concurrency
- Go tests

## Do Not Use When

- non-Go implementation

## Required Inputs

- go.mod/toolchain
- project layering
- lint/test commands
- contracts

## Operating Rules

- Inspect conventions first.
- Pass context through I/O boundaries.
- Prefer small interfaces owned by consumers.
- Wrap errors with context while preserving identity.
- Avoid unowned goroutines.
- Use standard library first unless project conventions differ.

## Workflow

1. Inspect package/module layout.
2. Identify ownership/layer.
3. Implement behavior.
4. Apply TDD when feasible.
5. Run formatting.
6. Run focused tests.
7. Run lint/vet/test configured by project.

## Required Evidence

- changed packages
- test result
- lint/vet result if configured
- context/error/concurrency review

## Quality Gates

- [ ] Formatting clean.
- [ ] Tests pass.
- [ ] No unnecessary abstraction.
- [ ] Context/errors correct.
- [ ] Concurrency owned/bounded.

## Output Contract

- Packages changed
- Architecture fit
- Tests
- Tooling checks
- Residual risks

Do not claim completion without the required evidence.

## References

- Go docs: https://go.dev/doc/
- Effective Go: https://go.dev/doc/effective_go
- Go Memory Model: https://go.dev/ref/mem
- testing package: https://pkg.go.dev/testing
