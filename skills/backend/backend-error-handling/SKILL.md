---
name: backend-error-handling
description: "Designs backend error taxonomy, wrapping, logging ownership, retryability, and transport mapping. Use for domain/application errors, repositories, handlers, and integrations."
---

# backend-error-handling

## Purpose

Make errors actionable and stable without leaking implementation details.

## Use When

- backend use case
- HTTP error mapping
- repository/integration failure
- retry logic

## Do Not Use When

- pure UI-only work

## Required Inputs

- project error conventions
- use case failure modes
- transport contract

## Operating Rules

- Separate expected business errors from infrastructure failures.
- Preserve cause internally.
- Map once at transport boundary.
- Avoid duplicate logging at every layer.
- Do not leak SQL/stack/secrets.

## Workflow

1. List expected failures.
2. Define error types/codes.
3. Define wrapping/cause preservation.
4. Define transport mapping.
5. Define logging owner/severity.
6. Define retryability.

## Required Evidence

- error taxonomy
- mapping table
- sanitized response example
- logging/retry rule

## Quality Gates

- [ ] Expected errors map deterministically.
- [ ] Unexpected errors remain diagnosable.
- [ ] No sensitive/internal leak.
- [ ] Duplicate logging avoided.

## Output Contract

- Errors
- Transport mapping
- Logging ownership
- Retryability
- Security

Do not claim completion without the required evidence.

## References

- RFC 9110 — HTTP Semantics: https://www.rfc-editor.org/rfc/rfc9110
- RFC 9457 — Problem Details: https://www.rfc-editor.org/rfc/rfc9457
- Google API Design Guide: https://cloud.google.com/apis/design
- OWASP ASVS: https://owasp.org/www-project-application-security-verification-standard/
