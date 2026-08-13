---
name: secure-api
description: "Reviews and implements API security including validation, authorization, writable-field control, error exposure, sensitive logging, CSRF/CORS where relevant, and abuse controls."
---

# secure-api

## Purpose

Make externally reachable APIs secure by construction.

## Use When

- public/private API
- admin API
- webhook
- upload
- sensitive API

## Do Not Use When

- pure internal computation

## Required Inputs

- API contract
- auth model
- data sensitivity
- client/deployment model

## Operating Rules

- Validate trust-boundary input.
- Authorize object/action.
- Allowlist writable fields.
- Avoid sensitive errors/logs.
- Consider request-size/rate abuse.
- CORS is not authorization.

## Workflow

1. Map trust boundary.
2. Validate input.
3. Enforce authn/authz.
4. Review binding/mass assignment.
5. Review errors/logs.
6. Review browser CSRF/CORS.
7. Review abuse controls.
8. Add negative tests.

## Required Evidence

- validation
- authz tests
- binding review
- redaction
- abuse controls

## Quality Gates

- [ ] Untrusted input rejected.
- [ ] Cross-user/tenant denied.
- [ ] No over-returned sensitive data.
- [ ] Errors do not disclose internals.

## Output Contract

- Trust boundary
- Validation
- Auth
- Exposure
- Abuse
- Tests

Do not claim completion without the required evidence.

## References

- OWASP ASVS: https://owasp.org/www-project-application-security-verification-standard/
- OWASP API Security Top 10: https://owasp.org/API-Security/
- OWASP Cheat Sheet Series: https://cheatsheetseries.owasp.org/
