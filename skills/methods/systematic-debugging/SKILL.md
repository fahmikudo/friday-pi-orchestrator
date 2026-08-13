---
name: systematic-debugging
description: "Uses evidence-driven debugging for defects, failing tests, regressions, production symptoms, race conditions, and unexplained behavior."
---

# systematic-debugging

## Purpose

Prevent speculative fixes by requiring reproduction, hypotheses, isolation, root cause, and regression evidence.

## Use When

- bug reports
- failing tests
- unexpected API behavior
- production incidents
- intermittent/concurrency defects

## Do Not Use When

- greenfield feature planning
- known mechanical changes without investigation

## Required Inputs

- observed symptom
- expected behavior
- reproduction/telemetry
- recent relevant changes

## Operating Rules

- Do not edit before establishing a plausible hypothesis.
- Separate facts from assumptions.
- Prefer discriminating experiments.
- A fix should include regression protection when feasible.

## Workflow

1. Restate symptom.
2. Reproduce or document why not reproducible.
3. Collect smallest relevant evidence.
4. Rank hypotheses.
5. Test the top hypothesis.
6. Isolate root cause.
7. Implement smallest correct fix.
8. Add regression coverage.
9. Re-run original reproduction.

## Required Evidence

- reproduction evidence
- hypotheses
- root-cause evidence
- regression test
- original symptom verification

## Quality Gates

- [ ] Root cause explains symptom.
- [ ] Fix addresses cause.
- [ ] Regression protection exists when feasible.
- [ ] No unrelated behavior changed.

## Output Contract

- Observed facts
- Root cause
- Rejected hypotheses if material
- Fix
- Regression evidence

Do not claim completion without the required evidence.

## References

- David Agans — Debugging.
- Google SRE Books: https://sre.google/books/
