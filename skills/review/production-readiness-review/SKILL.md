---
name: production-readiness-review
description: "Reviews operational readiness: configuration, timeouts, retries, health, observability, rollout, rollback, migrations, resource behavior, and failure handling."
---

# production-readiness-review

## Purpose

Catch operational failure modes functional tests miss.

## Use When

- new service/integration
- worker
- migration
- critical feature
- infra change

## Do Not Use When

- pure local library

## Required Inputs

- deployment model
- changed components
- observability stack
- rollback capability

## Operating Rules

- Invisible failure is not production-ready.
- Retries/timeouts bounded.
- Config explicit.
- Rollback includes data/migration.

## Workflow

1. Review startup/shutdown.
2. Review config/secrets.
3. Review timeouts/retries.
4. Review health/readiness.
5. Review logs/metrics/traces.
6. Review rollout/migration.
7. Review rollback.

## Required Evidence

- operational checklist
- observability evidence
- rollout/rollback
- warnings

## Quality Gates

- [ ] Critical failures observable.
- [ ] No unbounded retry.
- [ ] Rollback/forward-fix plausible.
- [ ] Defaults safe.

## Output Contract

- Verdict
- Operational risks
- Observability
- Rollout
- Rollback

Do not claim completion without the required evidence.

## References

- OpenTelemetry docs: https://opentelemetry.io/docs/
- Google SRE Books: https://sre.google/books/
