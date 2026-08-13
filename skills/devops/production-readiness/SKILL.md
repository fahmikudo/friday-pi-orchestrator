---
name: production-readiness
description: "Prepares services for production with health, shutdown, config, secrets, resources, timeouts, retries, observability, migration, rollout, and rollback."
---

# production-readiness

## Purpose

Ensure deployability and failure behavior are designed.

## Use When

- new service
- worker
- critical integration
- deployment change
- release candidate

## Do Not Use When

- pure docs

## Required Inputs

- runtime/deployment
- dependencies
- config/secrets
- migration
- observability

## Operating Rules

- Fail fast on bad mandatory config.
- Graceful shutdown stops accepting work.
- Resources/timeouts explicit.
- Secrets never committed/logged.
- Readiness reflects ability to serve.

## Workflow

1. Define startup/config validation.
2. Define health/readiness.
3. Define shutdown.
4. Define resources/timeouts/retries.
5. Define secrets.
6. Define telemetry.
7. Define rollout/migration/rollback.

## Required Evidence

- health/shutdown evidence
- config
- timeouts/retries
- telemetry
- rollout/rollback

## Quality Gates

- [ ] Safe start/stop.
- [ ] Dependency failures bounded/visible.
- [ ] Secrets safe.
- [ ] Rollback exists.

## Output Contract

- Startup
- Health
- Shutdown
- Config/secrets
- Resources
- Telemetry
- Rollout

Do not claim completion without the required evidence.

## References

- OpenTelemetry docs: https://opentelemetry.io/docs/
- Google SRE Books: https://sre.google/books/
