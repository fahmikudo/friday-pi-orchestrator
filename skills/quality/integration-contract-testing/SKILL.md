---
name: integration-contract-testing
description: "Designs integration and contract tests for databases, module boundaries, HTTP APIs, external adapters, and events. Use where mocks cannot prove compatibility."
---

# integration-contract-testing

## Purpose

Prove boundary behavior using realistic dependencies and stable contracts.

## Use When

- DB repository
- HTTP API
- external client
- event producer/consumer
- cross-module contract

## Do Not Use When

- pure domain function

## Required Inputs

- boundary contract
- real dependency/fake options
- test environment

## Operating Rules

- Use real isolated dependency where practical.
- Contract tests fail on incompatible wire/schema changes.
- Do not mock target boundary behavior.
- Keep third-party tests deterministic.

## Workflow

1. Define contract.
2. Choose real/fake dependency.
3. Create isolated fixtures.
4. Test success/failure/compatibility.
5. Verify cleanup/idempotency.
6. Ensure CI compatibility.

## Required Evidence

- boundary
- dependency/environment
- cases
- results

## Quality Gates

- [ ] Actual adapter behavior proven.
- [ ] Fixtures repeatable.
- [ ] Failures diagnosable.
- [ ] CI reliable.

## Output Contract

- Boundary
- Environment
- Cases
- Results
- Limitations

Do not claim completion without the required evidence.

## References

- Testcontainers: https://testcontainers.com/
- Pact: https://docs.pact.io/
