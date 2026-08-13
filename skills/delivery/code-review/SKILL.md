---
name: code-review
description: "Performs independent code review focused on correctness, maintainability, compatibility, tests, and project conventions. Add specialized review skills by risk/domain."
---

# code-review

## Purpose

Provide actionable review findings with severity and evidence.

## Use When

- non-trivial code change
- pre-merge review
- orchestrator REVIEW

## Do Not Use When

- generated-only artifact where code quality irrelevant

## Required Inputs

- approved requirement/design
- diff
- project conventions
- test results

## Operating Rules

- Review behavior first, style second.
- Tests passing is not sufficient.
- Findings need evidence.
- Separate blockers from preferences.
- Avoid rewriting for taste.

## Workflow

1. Understand behavior.
2. Inspect diff/contracts.
3. Check correctness/edges.
4. Check architecture/conventions.
5. Check tests.
6. Check compatibility/security/data risks.
7. Classify findings.

## Required Evidence

- severity
- file/line evidence
- test gaps
- verdict

## Quality Gates

- [ ] No unresolved correctness blocker.
- [ ] Tests match behavior.
- [ ] Material design deviations addressed.
- [ ] Verdict evidence-based.

## Output Contract

- Verdict
- MUST_FIX
- SHOULD_FIX
- NICE_TO_HAVE
- Evidence
- Test gaps

Do not claim completion without the required evidence.

## References

- Google Engineering Practices — Code Review: https://google.github.io/eng-practices/review/
