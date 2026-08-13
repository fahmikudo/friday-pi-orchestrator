---
name: ci-cd
description: "Designs CI/CD pipelines with deterministic build/test gates, artifact promotion, environment separation, secrets, deployment safety, and rollback."
---

# ci-cd

## Purpose

Make delivery repeatable and auditable.

## Use When

- new pipeline
- build/test gates
- deployment automation
- release promotion

## Do Not Use When

- local-only script

## Required Inputs

- build/test commands
- artifact type
- environments
- platform
- secret store

## Operating Rules

- Build once/promote same artifact when practical.
- Fail fast deterministic checks.
- No secrets in logs.
- Externalize env config.
- Deployment has failure/rollback behavior.

## Workflow

1. Map stages.
2. Define cache/artifacts.
3. Define tests/security checks.
4. Publish artifact.
5. Define promotion.
6. Define deploy/rollback.
7. Define concurrency/branch policy.

## Required Evidence

- pipeline stages
- commands
- artifact identity
- secret handling
- rollback

## Quality Gates

- [ ] Pipeline reproduces supported build.
- [ ] Failed checks block promotion.
- [ ] Artifact traceable.
- [ ] Secrets protected.

## Output Contract

- Stages
- Artifacts
- Gates
- Secrets
- Deployment
- Rollback

Do not claim completion without the required evidence.

## References

- GitHub Actions: https://docs.github.com/actions
- GitLab CI/CD: https://docs.gitlab.com/ee/ci/
