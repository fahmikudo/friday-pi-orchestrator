---
name: authentication-design
description: "Designs login, credentials, session/token lifecycle, refresh, logout, revocation, reset, MFA/OIDC boundaries, and secure transport/storage."
---

# authentication-design

## Purpose

Make identity establishment and session lifecycle explicit and secure.

## Use When

- login/register
- JWT/session
- refresh token
- OIDC
- logout/revocation
- password reset

## Do Not Use When

- authorization-only changes after identity established

## Required Inputs

- identity model
- session needs
- client types
- auth stack

## Operating Rules

- Authentication does not decide resource permissions.
- Refresh/revocation explicit.
- Tokens/credentials never logged.
- Browser transport considers XSS/CSRF.
- Avoid unnecessary account enumeration.

## Workflow

1. Define actors/clients.
2. Define credential/session lifecycle.
3. Define storage/transport.
4. Define refresh/logout/revocation.
5. Define error behavior.
6. Define audit/security events.
7. Add negative tests.

## Required Evidence

- sequence
- storage/transport
- revocation
- negative tests
- log redaction

## Quality Gates

- [ ] Logout/revocation real.
- [ ] Secrets not logged.
- [ ] Replay/session fixation considered.
- [ ] Errors limit account leakage.

## Output Contract

- Flow
- Lifecycle
- Storage/transport
- Revocation
- Controls
- Tests

Do not claim completion without the required evidence.

## References

- OWASP ASVS: https://owasp.org/www-project-application-security-verification-standard/
- OWASP API Security Top 10: https://owasp.org/API-Security/
- OWASP Cheat Sheet Series: https://cheatsheetseries.owasp.org/
