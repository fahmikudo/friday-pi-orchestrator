---
name: threat-modeling
description: "Performs lightweight threat modeling using assets, trust boundaries, actors, abuse cases, and mitigations. Use for auth, sensitive data, uploads, integrations, admin, and cross-tenant capabilities."
---

# threat-modeling

## Purpose

Identify likely security failures early without heavyweight ceremony.

## Use When

- authentication/authorization
- sensitive data
- file upload
- webhook/public API
- admin
- cross-tenant access

## Do Not Use When

- non-sensitive cosmetic changes

## Required Inputs

- assets
- actors
- trust boundaries
- entry points
- security requirements

## Operating Rules

- Focus on concrete abuse cases.
- Include cross-tenant/privilege escalation.
- Separate prevention/detection/recovery.
- Mitigation needs a concrete enforcement point.

## Workflow

1. List assets/actors.
2. Describe trust boundaries.
3. Identify abuse cases.
4. Rank material threats.
5. Map controls.
6. Define security tests.

## Required Evidence

- threat list
- trust boundaries
- control mapping
- security tests

## Quality Gates

- [ ] High-impact threats mitigated.
- [ ] Object/scope access considered.
- [ ] Sensitive logging/exposure considered.
- [ ] Controls verifiable.

## Output Contract

- Assets
- Trust boundaries
- Threats
- Controls
- Verification

Do not claim completion without the required evidence.

## References

- OWASP ASVS: https://owasp.org/www-project-application-security-verification-standard/
- OWASP API Security Top 10: https://owasp.org/API-Security/
- OWASP Cheat Sheet Series: https://cheatsheetseries.owasp.org/
