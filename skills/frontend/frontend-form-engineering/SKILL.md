---
name: frontend-form-engineering
description: "Designs robust forms with schema validation, authoritative server validation mapping, dirty/submitting states, accessibility, and error recovery."
---

# frontend-form-engineering

## Purpose

Make form behavior predictable across client and server validation.

## Use When

- create/edit form
- multi-step form
- dynamic fields
- server validation errors

## Do Not Use When

- simple non-form action

## Required Inputs

- field schema
- API DTO
- validation rules
- form library

## Operating Rules

- Server validation authoritative.
- Client validation improves feedback.
- Field vs form errors distinct.
- Prevent accidental double-submit.
- Dirty/reset semantics intentional.

## Workflow

1. Define form model.
2. Define client schema.
3. Map to API DTO.
4. Map server errors.
5. Define submit/success/reset.
6. Define labels/errors accessibility.
7. Test success/failure.

## Required Evidence

- schema
- DTO mapping
- server error mapping
- double-submit prevention
- tests

## Quality Gates

- [ ] Cross-field rules covered.
- [ ] Server errors scoped correctly.
- [ ] No duplicate submit.
- [ ] Keyboard/screen-reader usable.

## Output Contract

- Form model
- Validation
- DTO mapping
- Server errors
- State transitions
- Tests

Do not claim completion without the required evidence.

## References

- WAI forms: https://www.w3.org/WAI/tutorials/forms/
