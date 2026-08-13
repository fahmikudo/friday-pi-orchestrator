---
name: domain-driven-design
description: "Applies pragmatic DDD to ownership, invariants, aggregates, entities, value objects, domain services, and application/domain responsibilities. Use for business-rich backend design."
---

# domain-driven-design

## Purpose

Place business rules in stable domain boundaries without forcing tactical DDD where it adds no value.

## Use When

- business-rich feature
- domain model change
- module ownership
- invariant-heavy workflow
- ambiguous domain/application responsibility

## Do Not Use When

- simple CRUD with little domain behavior
- projects explicitly avoiding domain models

## Required Inputs

- business requirement
- module/domain map
- entities/tables/contracts
- cross-module dependencies

## Operating Rules

- Start from business language and invariants.
- Aggregate means consistency boundary, not table.
- Application services orchestrate; domain enforces rules.
- Do not create repositories/value objects mechanically.
- Respect bounded contexts and ownership.

## Workflow

1. Extract ubiquitous language.
2. Identify owning domain.
3. List invariants.
4. Define aggregate boundaries only where consistency requires.
5. Assign entity/value-object/service responsibilities.
6. Define cross-module contracts.
7. Validate transaction boundaries.

## Required Evidence

- ownership decision
- invariants
- aggregate/consistency boundary
- cross-module contract
- transaction boundary

## Quality Gates

- [ ] Business invariants have a clear owner.
- [ ] No aggregate spans unrelated modules.
- [ ] Persistence shape does not dictate domain shape by default.
- [ ] Cross-module dependency is explicit.

## Output Contract

- Domain owner
- Terms
- Invariants
- Aggregate/transaction boundary
- Cross-module contracts
- Rejected alternatives

Do not claim completion without the required evidence.

## References

- Eric Evans — Domain-Driven Design.
- Vaughn Vernon — Implementing Domain-Driven Design.
- Martin Fowler — Domain Model: https://martinfowler.com/eaaCatalog/domainModel.html
