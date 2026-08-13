---
name: risk-based-testing
description: "Prioritizes verification from business criticality, changed domains, failure impact, likelihood, and known risk flags. Use by QA/reviewer."
---

# risk-based-testing

## Purpose

Make verification depth proportional and explain mandatory evidence.

## Use When

- security
- migration
- billing/payment
- authorization
- compatibility
- large refactor

## Do Not Use When

- harmless docs

## Required Inputs

- changed domains
- risk flags
- criticality
- dirty files
- failure history

## Operating Rules

- Risk combines impact and likelihood.
- HIGH risk needs direct evidence.
- Warnings describe bounded residual impact.
- Do not over-test unrelated modules.

## Workflow

1. Identify failure modes.
2. Rank impact/likelihood.
3. Map high risks to tests.
4. Run focused high-risk checks.
5. Run appropriate regression.
6. Record residual risk.

## Required Evidence

- risk matrix
- risk-to-test mapping
- results
- residual warnings

## Quality Gates

- [ ] Every HIGH risk has evidence or blocker.
- [ ] PASS_WITH_WARNINGS bounded.
- [ ] Unrelated test noise separated.

## Output Contract

- Risk ranking
- Verification
- Results
- Residual risk

Do not claim completion without the required evidence.

## References

- Google SRE Books: https://sre.google/books/
