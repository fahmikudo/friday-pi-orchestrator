---
name: accessibility
description: "Applies semantic HTML, keyboard access, focus management, labels, status/error announcement, and accessible interaction patterns."
---

# accessibility

## Purpose

Treat accessibility as functional behavior, not final polish.

## Use When

- forms
- dialogs
- menus
- navigation
- custom controls
- data tables

## Do Not Use When

- backend-only work

## Required Inputs

- component behavior
- design-system primitives
- target standard if specified

## Operating Rules

- Prefer native semantics.
- Keyboard behavior matches interaction.
- Focus transitions intentional.
- Color is not sole carrier.
- Errors have programmatic association.

## Workflow

1. Identify semantics.
2. Use native/accessible primitives.
3. Define keyboard.
4. Define focus.
5. Define labels/descriptions/errors.
6. Run automated checks if available.
7. Do keyboard inspection.

## Required Evidence

- semantic roles
- keyboard path
- focus behavior
- a11y tool output if available

## Quality Gates

- [ ] Controls keyboard reachable.
- [ ] Accessible names exist.
- [ ] Focus not lost/trapped.
- [ ] Essential status not color-only.

## Output Contract

- Semantics
- Keyboard
- Focus
- Labels/errors
- Evidence

Do not claim completion without the required evidence.

## References

- WCAG: https://www.w3.org/WAI/standards-guidelines/wcag/
- ARIA APG: https://www.w3.org/WAI/ARIA/apg/
