---
name: module-boundary-design
description: "Designs strict module ownership and cross-module communication. Use for modular monoliths, new modules, tables, contracts, gateways, or cross-domain calls."
---

# module-boundary-design

## Purpose

Prevent accidental coupling by making ownership and allowed dependencies explicit.

## Use When

- new module
- cross-module use case
- shared-data temptation
- table ownership
- gateway/port design

## Do Not Use When

- single-module local refactor

## Required Inputs

- module map
- table/model ownership
- use case
- existing public contracts

## Operating Rules

- A module owns its domain model and persistence.
- Do not directly read/write another module's tables unless explicitly approved.
- Cross-module calls use published contracts/ports/facades.
- Avoid shared mutable domain models.
- Prefer stable IDs/value DTOs across boundaries.

## Workflow

1. Identify owner for each concept.
2. List owned data.
3. List exposed contracts.
4. List consumed contracts.
5. Choose sync/event/read-model interaction.
6. Define forbidden dependencies.
7. Check transaction/failure boundaries.

## Required Evidence

- ownership matrix
- dependency direction
- contracts
- forbidden dependencies
- failure behavior

## Quality Gates

- [ ] Every changed table has one owner.
- [ ] No hidden cross-module repository/table access.
- [ ] Cross-module contract is explicit/testable.
- [ ] Dependency direction matches architecture.

## Output Contract

- Owning module
- Owned data
- Exposed contracts
- Consumed contracts
- Forbidden dependencies
- Interaction rationale

Do not claim completion without the required evidence.

## References

- Sam Newman — Building Microservices.
- Simon Brown — Software Architecture for Developers.
- Eric Evans — Domain-Driven Design.
