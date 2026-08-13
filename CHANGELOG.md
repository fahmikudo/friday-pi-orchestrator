# Changelog

## 2.0.2 — First-Class Change Request lifecycle

- Added structured CR lifecycle with scope, impact, task linkage, status, resolution, and promoted-work traceability.
- Added `/change-requests`, `/promote-cr`, and `/resolve-cr`.
- Added `--task`, `--impact`, and `--out-of-scope` handling to `/change-request`.
- Open in-scope CRs resolve automatically as `IMPLEMENTED` after successful VERIFY.
- Out-of-scope/legacy CRs can be promoted to a linked work item without reopening the origin work.
- Legacy `artifacts/change-request-*.md` files are normalized lazily.
- Guard `/work <existing-work-id>` and direct `createWork()` against accidental duplicate work creation.
- Replaced version-suffixed runtime/test helper filenames with stable semantic names.
- `.pi-work` remains backward-compatible.

## 2.0.1 — Skill conflict installer fix

- Fix duplicate skill warnings when the standalone global advanced-skill pack is already installed.
- Installer now rewrites the installed Friday package manifest **before `pi install`** so package skill discovery exposes only skills not already available globally.
- Existing global skills are never deleted or moved.
- Package-bundled skill files remain on disk for distribution, but duplicate copies are not registered with Pi.
- Added regression coverage for full and partial global-skill overlap.

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
