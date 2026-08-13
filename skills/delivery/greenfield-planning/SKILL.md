---
name: greenfield-planning
description: "Plans a new service/module/project from requirements through architecture, interfaces, persistence, security, testing, operations, and milestones."
---

# greenfield-planning

## Purpose

Produce a minimal evolvable foundation without speculative enterprise complexity.

## Use When

- new service
- new project
- new isolated module without legacy constraints

## Do Not Use When

- brownfield change

## Required Inputs

- requirements
- scale/constraints
- team/deployment context
- fixed technologies

## Operating Rules

- Choose simplest architecture satisfying requirements.
- Delay optional infra.
- Define boundaries/contracts before framework detail.
- Testing/operations part of design.

## Workflow

1. Clarify scope.
2. Choose architecture.
3. Define modules.
4. Define APIs/data.
5. Define security.
6. Define tests.
7. Define deployment/observability.
8. Decompose milestones.

## Required Evidence

- architecture decision
- module/data/API
- test strategy
- ops plan
- risks

## Quality Gates

- [ ] Current requirements satisfied.
- [ ] No unjustified distributed complexity.
- [ ] Security/ownership explicit.
- [ ] Incremental delivery possible.

## Output Contract

- Architecture
- Modules
- Data
- APIs
- Security
- Testing
- Operations
- Milestones

Do not claim completion without the required evidence.

## References

- C4 Model: https://c4model.com/
- KISS/YAGNI principles.
