---
name: security-review
description: "Reviews changed code for authentication, authorization, validation, sensitive data exposure, injection, secrets, and abuse paths. Use for security-risk changes."
---

# security-review

## Purpose

Provide independent negative-path scrutiny.

## Use When

- auth/authz
- public API
- sensitive data
- admin
- uploads
- webhooks
- cross-tenant

## Do Not Use When

- non-security-impacting docs

## Required Inputs

- threat model
- changed files
- auth model
- security tests

## Operating Rules

- Assume hostile input.
- Check object-level authz.
- Inspect logs/errors.
- Look for bypass paths.
- Findings need concrete scenario.

## Workflow

1. Review trust boundaries.
2. Review authn/authz.
3. Review validation/injection.
4. Review sensitive data/logging.
5. Review secrets.
6. Review abuse controls.
7. Check negative tests.

## Required Evidence

- risk scenario
- file/line evidence
- test status
- severity

## Quality Gates

- [ ] No high finding remains.
- [ ] Cross-scope negatives pass.
- [ ] Secrets/data not exposed.

## Output Contract

- Verdict
- Findings
- Evidence
- Required tests

Do not claim completion without the required evidence.

## References

- OWASP ASVS: https://owasp.org/www-project-application-security-verification-standard/
- OWASP API Security Top 10: https://owasp.org/API-Security/
- OWASP Cheat Sheet Series: https://cheatsheetseries.owasp.org/
