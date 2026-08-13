---
name: e2e-testing
description: "Designs focused end-to-end tests for critical user journeys spanning frontend/backend, routing, authentication, and persisted outcomes."
---

# e2e-testing

## Purpose

Use a small number of high-value E2E tests to prove integrated journeys.

## Use When

- login
- critical CRUD journey
- billing
- permission-sensitive workflow
- release smoke

## Do Not Use When

- every validation branch
- pure domain logic

## Required Inputs

- journey
- environment
- test data strategy
- UI/API stack

## Operating Rules

- Deterministic/isolated tests.
- Use stable user-facing selectors.
- Control data explicitly.
- Keep suite critical and small.
- Separate environment flakes.

## Workflow

1. Define journey/outcome.
2. Prepare isolated data.
3. Automate happy path.
4. Add high-impact failure/permission path.
5. Capture diagnostics.
6. Check flakiness if needed.

## Required Evidence

- journey coverage
- environment
- results
- flake notes

## Quality Gates

- [ ] Business state reached.
- [ ] No incidental DOM dependency.
- [ ] Data isolation reliable.

## Output Contract

- Journeys
- Environment
- Data
- Results
- Flake risks

Do not claim completion without the required evidence.

## References

- Playwright: https://playwright.dev/docs/intro
- Cypress: https://docs.cypress.io/
