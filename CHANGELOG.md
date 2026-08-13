# Changelog

## 2.0.0 — Friday

Major release and product rename from Pi Engineering Orchestrator v1.0.8.

### Added

- Friday Pi Orchestrator branding and package metadata.
- Bundled 62 advanced engineering skills.
- Deterministic skill resolution from stage + repository profile + domains + risks.
- Repository technology profile in project state.
- Model profiles independent from agent identity.
- `/skill-routing`.
- `/orchestrator-settings` with auto-continuation and model-profile configuration.
- `/work-status` alias while keeping `/status`.
- Safe-stage auto continuation with durable-state re-read before each continuation.
- Stage evidence gates for discovery, party, plan, design, decomposition, review, and verification.
- Artifact revision/history archival.
- `/rework` implementation correction workflow.
- `/change-request` with durable requirement-change artifacts, rewind semantics, task archival, and downstream invalidation.
- `/cancel-work` with audit history and backlog cancellation sync.
- Product mutation guard outside IMPLEMENT.
- Risk-aware triage escalation for security, compatibility, and destructive-schema signals.
- Richer status display for stale evidence, change requests, routing, dirty domains, and failures.
- Example role-agent templates for `@gotgenes/pi-subagents`.
- GitHub-ready documentation, security policy, and workflow case matrix.

### Changed

- `/work-resume` is explicitly the canonical generic lifecycle continuation primitive.
- REVIEW failure records the failed review then returns work to IMPLEMENT.
- VERIFY failure remains BLOCKED until `/work-verify` or `/rework`.
- Rejected designs/plans are marked stale and archived on revision instead of being overwritten without history.
- Existing workspace initialization lazily adds v2 policy/model/repository defaults without deleting old state.
- Runtime helper modules use unique `-v200.js` paths.

### Preserved from 1.0.8

- Durable `.pi-work` source of truth.
- Human APPROVE gate for MEDIUM/LARGE work.
- `/reject` revision workflow.
- `/work-verify` FAIL → reopen → PASS/PASS_WITH_WARNINGS recovery.
- Backlog reconciliation and work-completion projection.
- Serialized state mutations.
- Direct `.pi-work` write guard.
- Pi built-in `/resume` remains unshadowed.
- Persistent transcript output for status/read-only commands.

### Compatibility

No destructive `.pi-work` migration is required.
