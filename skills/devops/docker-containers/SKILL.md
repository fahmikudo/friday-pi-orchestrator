---
name: docker-containers
description: "Builds secure reproducible Docker images with multi-stage builds, minimal runtime deps, non-root execution, correct signals, and cache-aware layers."
---

# docker-containers

## Purpose

Produce small deterministic runtime images.

## Use When

- Dockerfile
- container runtime
- build optimization
- compose service

## Do Not Use When

- non-containerized project

## Required Inputs

- runtime/build needs
- base-image policy
- ports/health
- deployment platform

## Operating Rules

- Manage base image versions deliberately.
- Use multi-stage when useful.
- Never bake secrets.
- Prefer non-root.
- Keep build tooling out of runtime when unnecessary.

## Workflow

1. Inspect runtime needs.
2. Design build/runtime stages.
3. Optimize cache.
4. Set user/workdir/entrypoint.
5. Define health/signals.
6. Build/test/scan if available.

## Required Evidence

- image build
- runtime user
- contents rationale
- startup/shutdown

## Quality Gates

- [ ] Build reproducible.
- [ ] No secrets.
- [ ] Signals reach app.
- [ ] Runtime minimal.

## Output Contract

- Stages
- Runtime
- Security
- Health/signals
- Evidence

Do not claim completion without the required evidence.

## References

- Docker docs: https://docs.docker.com/
