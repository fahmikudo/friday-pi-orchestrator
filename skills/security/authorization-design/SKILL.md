---
name: authorization-design
description: "Designs resource authorization using subject, action, resource, scope, context, policy source of truth, and enforcement. Use for RBAC/ABAC and multi-tenant scope."
---

# authorization-design

## Purpose

Prevent privilege escalation and cross-scope leakage.

## Use When

- RBAC
- tenant/facility access
- object-level access
- role assignments
- admin
- cross-tenant resources

## Do Not Use When

- authentication-only work

## Required Inputs

- subjects/roles
- resources/actions
- scope hierarchy
- membership/context
- policy source

## Operating Rules

- Authentication, membership, and authorization are separate.
- Default deny.
- Enforce server-side.
- Object access not secured only by list filtering.
- Scope resolution deterministic/auditable.

## Workflow

1. Define subject/resource/action.
2. Define scope/context.
3. Define policy source.
4. Define evaluation/precedence.
5. Define enforcement points.
6. Add allow/deny/cross-scope tests.

## Required Evidence

- permission matrix
- scope model
- evaluation rules
- enforcement points
- negative tests

## Quality Gates

- [ ] Direct-object unauthorized access denied.
- [ ] Scope escalation tested.
- [ ] Single policy truth.
- [ ] UI not security boundary.

## Output Contract

- Subjects
- Resources/actions
- Scopes
- Evaluation
- Enforcement
- Tests

Do not claim completion without the required evidence.

## References

- OWASP ASVS: https://owasp.org/www-project-application-security-verification-standard/
- OWASP API Security Top 10: https://owasp.org/API-Security/
- OWASP Cheat Sheet Series: https://cheatsheetseries.owasp.org/
