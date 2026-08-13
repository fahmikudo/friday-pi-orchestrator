---
name: node-backend
description: "Implements reliable Node.js backend code with async/error discipline, event-loop awareness, timeouts/cancellation, graceful shutdown, and testable boundaries."
---

# node-backend

## Purpose

Keep asynchronous backend behavior explicit and operationally safe.

## Use When

- Node service logic
- HTTP/background worker
- stream
- external integration
- process lifecycle

## Do Not Use When

- browser-only JavaScript
- Nest-specific design when nestjs-backend applies

## Required Inputs

- Node version/package manager
- module system
- test/lint commands
- deployment model

## Operating Rules

- Never ignore rejected promises.
- Bound external I/O when needed.
- CPU-bound work can block event loop.
- Use cancellation where ecosystem supports it.
- Handle shutdown/in-flight work intentionally.

## Workflow

1. Inspect runtime/module config.
2. Identify async boundaries.
3. Implement errors/timeouts.
4. Define shutdown.
5. Add tests.
6. Run typecheck if TS, lint, tests.

## Required Evidence

- runtime version
- async failure handling
- timeout/cancellation
- shutdown
- test/lint

## Quality Gates

- [ ] No floating/unhandled async work.
- [ ] External calls bounded when required.
- [ ] Shutdown defined.
- [ ] Tests/lint/typecheck pass.

## Output Contract

- Runtime assumptions
- Async boundaries
- Failure handling
- Shutdown
- Tests

Do not claim completion without the required evidence.

## References

- Node.js API docs: https://nodejs.org/docs/latest/api/
- Node.js diagnostics: https://nodejs.org/en/learn/diagnostics
