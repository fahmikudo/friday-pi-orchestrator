---
name: brownfield-analysis
description: "Analyzes an existing repository before planning changes: architecture, modules, conventions, ownership, tests, build, and relevant code paths."
---

# brownfield-analysis

## Purpose

Ground planning in the real repository rather than assumptions.

## Use When

- existing codebase feature
- large refactor
- integration
- architecture change
- unfamiliar module

## Do Not Use When

- true greenfield repo

## Required Inputs

- request/PRD
- repository
- project memory

## Operating Rules

- Read narrowly from entry points outward.
- Prefer code/config/test evidence.
- Record doc-vs-code conflicts.
- Do not modify product code during discovery.

## Workflow

1. Locate entry points.
2. Map call/data flow.
3. Identify ownership/boundaries.
4. Inspect tests/build.
5. Identify conventions.
6. Identify mismatches/risks.
7. Persist concise discovery.

## Required Evidence

- files inspected
- current flow
- ownership
- test/build commands
- mismatches

## Quality Gates

- [ ] Facts vs inference clear.
- [ ] No product code changed.
- [ ] Enough evidence for safe design.

## Output Contract

- Architecture
- Flow
- Ownership
- Conventions
- Risks
- Evidence

Do not claim completion without the required evidence.

## References

- Pi Skills: https://pi.dev/docs/latest/skills
