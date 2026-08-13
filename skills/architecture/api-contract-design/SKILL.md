---
name: api-contract-design
description: "Designs HTTP API contracts including resources, methods, validation, pagination, errors, idempotency, authorization, and compatibility."
---

# api-contract-design

## Purpose

Make wire contracts explicit, consistent, and evolvable.

## Use When

- new HTTP endpoint
- DTO change
- pagination/filter/sort
- error contract
- frontend/backend alignment

## Do Not Use When

- internal functions with no transport contract

## Required Inputs

- use case
- existing API conventions
- consumer needs
- authorization context

## Operating Rules

- Use HTTP semantics intentionally.
- Do not leak persistence models accidentally.
- Stable validation/domain error mappings are required.
- Pagination/filter/sort contracts must be consistent.
- Consider idempotency for retryable mutations.

## Workflow

1. Define resource/action semantics.
2. Choose method/path/status.
3. Define request validation.
4. Define response DTO.
5. Define error contract.
6. Define pagination/filter/sort.
7. Define authz requirement.
8. Assess compatibility/idempotency.

## Required Evidence

- endpoint contract
- example success/error payload
- status mapping
- compatibility note
- authorization requirement

## Quality Gates

- [ ] Method/status semantics are sound.
- [ ] Error shape matches standard.
- [ ] DTO is persistence-independent.
- [ ] Authorization/validation explicit.
- [ ] Breaking changes identified.

## Output Contract

- Endpoint table
- DTOs
- Validation
- Errors
- Authorization
- Compatibility
- Idempotency

Do not claim completion without the required evidence.

## References

- RFC 9110 — HTTP Semantics: https://www.rfc-editor.org/rfc/rfc9110
- RFC 9457 — Problem Details: https://www.rfc-editor.org/rfc/rfc9457
- Google API Design Guide: https://cloud.google.com/apis/design
