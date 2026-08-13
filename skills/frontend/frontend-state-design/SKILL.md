---
name: frontend-state-design
description: "Classifies and places UI, server, form, URL, and application state. Use when state ownership is unclear or global state is proposed."
---

# frontend-state-design

## Purpose

Use the narrowest correct owner and lifetime for each state category.

## Use When

- complex forms
- filters/search
- multi-step UI
- shared state
- global store proposal

## Do Not Use When

- simple obvious local UI state

## Required Inputs

- interaction flows
- routing
- server model
- existing state libraries

## Operating Rules

- Classify state before selecting library.
- URL state belongs in URL when navigation/share relevant.
- Server state belongs in query/cache tooling.
- Form state belongs with form.
- Global state needs real cross-tree/lifetime justification.

## Workflow

1. Inventory states.
2. Classify category.
3. Choose owner/lifetime.
4. Define synchronization only when needed.
5. Remove duplicated derived state.
6. Test navigation/reload where relevant.

## Required Evidence

- state classification
- ownership/lifetime
- sync points
- reload behavior

## Quality Gates

- [ ] No unnecessary global state.
- [ ] No duplicate authority.
- [ ] Reload/navigation intentional.
- [ ] Derived values remain derived.

## Output Contract

- State inventory
- Classification
- Owner
- Lifetime
- Synchronization

Do not claim completion without the required evidence.

## References

- React state structure: https://react.dev/learn/choosing-the-state-structure
- Vue state: https://vuejs.org/guide/scaling-up/state-management.html
- Angular docs: https://angular.dev/
