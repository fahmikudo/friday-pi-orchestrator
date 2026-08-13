---
name: kubernetes
description: "Designs Kubernetes workloads, services, probes, resources, config/secrets, disruption, rollout, networking, and observability."
---

# kubernetes

## Purpose

Align Kubernetes deployment with application lifecycle/failure modes.

## Use When

- Deployment/StatefulSet
- Service/Ingress
- ConfigMap/Secret
- probes/resources
- autoscaling
- rollout

## Do Not Use When

- non-Kubernetes deployment

## Required Inputs

- cluster constraints
- app ports/health
- resource profile
- storage/network

## Operating Rules

- Readiness differs from liveness.
- Resource policy explicit.
- Secrets not ConfigMap.
- Termination grace matches shutdown.
- Persistent state needs storage/backup strategy.

## Workflow

1. Choose workload.
2. Define pod config.
3. Define probes.
4. Define resources.
5. Define networking.
6. Define config/secrets.
7. Define rollout/disruption.
8. Validate manifests.

## Required Evidence

- manifest validation
- probe semantics
- resources
- termination
- rollout

## Quality Gates

- [ ] No premature traffic.
- [ ] Liveness avoids dependency restart loops.
- [ ] Termination grace adequate.
- [ ] Secrets appropriate.

## Output Contract

- Workload
- Probes
- Resources
- Networking
- Config/secrets
- Rollout

Do not claim completion without the required evidence.

## References

- Kubernetes docs: https://kubernetes.io/docs/
