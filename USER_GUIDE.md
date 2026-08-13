# Friday Pi Orchestrator v2.0.2 — User Guide

This guide focuses on day-to-day use. For internals, see `ARCHITECTURE.md`.

## The only mental model you need

```text
/work        = start durable engineering work
/work-resume = continue whatever durable stage is current
/approve     = human says the design may proceed
/reject      = human requests design/plan revision
/work-verify = durable re-verification
/rework      = code must change again
```

You should **not** need to remember `/party`, `/design`, `/implement`, or `/review` commands. Friday reads the durable manifest and continues the correct stage.

## First setup

After installing Friday and restarting Pi:

```text
/orchestrator-doctor
```

Inside each repository once:

```text
/init-workspace
```

Then check the inferred repository profile:

```text
/orchestrator-settings
```

If required, ask Pi to inspect the repository and update the profile through the orchestrator tool.

## Start ad-hoc work

```text
/work Fix duplicated webhook side effects when a retry arrives
```

Check state:

```text
/status
```

Continue:

```text
/work-resume
```

If Pi/laptop/session restarts later:

```text
/work-resume W-YYYYMMDD-001
```

No chat replay is required.

## MEDIUM/LARGE approval

Friday will stop at APPROVE.

Review `design.md` or use:

```text
/work-context
/status
```

Approve:

```text
/approve
```

Reject:

```text
/reject Do not introduce a new service. Keep this inside the existing modular monolith.
```

Friday returns to DESIGN/PLAN and preserves the previous artifact when the new version is saved.

## When implementation review fails

You usually do not need a special command.

A durable REVIEW FAIL returns the work to IMPLEMENT. Friday can auto-continue the correction loop.

If you are resuming later:

```text
/work-resume
```

## When verification fails

Read `/status` first.

### Failure was environmental / test needs rerun, code is unchanged

```text
/work-verify
```

### QA found a real implementation defect

```text
/rework Fix the failing authorization behavior described in verification.md
```

This invalidates prior review/verification evidence and returns to IMPLEMENT.

## When requirements change during implementation

Do not simply tell the writer to add the new scope.

Use:

```text
/change-request Add hierarchical specialty categories with parent validation
```

Friday saves the change, rewinds to DESIGN/PLAN as appropriate, invalidates downstream evidence, archives old tasks, and requires a new lifecycle pass.

## Cancel obsolete work

```text
/cancel-work Product decision changed; this item is no longer required
```

Nothing is deleted. Audit history remains available.

## PRD-driven sprint

```text
/plan-sprint docs/sprints/sprint-2-prd.md and docs/technical/sprint-2.md
/backlog
/start S2-01
```

Then use the normal lifecycle:

```text
/status
/work-resume
/approve
...
```

When work completes, the linked backlog item becomes DONE automatically.

## Skill routing

See what Friday thinks the current work needs:

```text
/skill-routing
```

Example:

```text
W-... @ IMPLEMENT
Model profile: implementation (inherit)
Skills: tdd, go-backend, backend-error-handling, safe-database-migration, postgresql
```

The skill list is not a replacement for repository conventions.

## Model profiles

See current settings:

```text
/orchestrator-settings
```

Set examples:

```text
/orchestrator-settings model high-reasoning anthropic/...
/orchestrator-settings model implementation openai/...
/orchestrator-settings model verification google/...
```

Friday v2 uses these as routing guidance. It does not force-switch the parent model.

## Auto continuation

Default ON:

```text
/work
→ safe stage
→ safe stage
→ ...
→ APPROVE
```

Turn off if you want to inspect every stage:

```text
/orchestrator-settings auto-continue off
```

Then use `/work-resume` for each continuation.

## Common mistakes

### Using Pi `/resume` for durable work

Wrong intent:

```text
/resume
```

That belongs to Pi session handling.

Use:

```text
/work-resume
```

### Using generic `/verify` and expecting Friday state to change

Use:

```text
/work-verify
```

for durable verification recovery.

### Editing `.pi-work` manually

Do not. Friday blocks agent writes and mutating shell commands targeting `.pi-work`.

### Changing code during REVIEW/VERIFY

Friday blocks product mutation outside IMPLEMENT. Use `/rework` first.

### Expanding scope during IMPLEMENT

Use `/change-request`, not an informal implementation instruction.

## Troubleshooting

### Work is BLOCKED at VERIFY with an old FAIL

```text
/work-verify
```

If code must change:

```text
/rework <reason>
```

### Work says COMPLETE but old backlog still IN_PROGRESS

```text
/backlog-reconcile
```

### New package installed but old behavior still appears

Fully quit every Pi process and restart. Friday uses stable semantic helper paths (`store.js`, `core.js`, `runtime.js`, etc.), but a fresh process remains the safest major-upgrade procedure.

### Skill conflict warning

Run the Friday installer again. It detects global duplicate skill names and configures packaged-skill exclusions without deleting your existing global skill files.

### Doctor

```text
/orchestrator-doctor
```

Use it first for runtime/module/state-reference problems.


## First-Class Change Requests (v2.0.2)

A CR is not automatically a new work item. First classify whether it belongs to the current work.

### In-scope requirement change

```text
/change-request Add unit scope support to role assignments
```

Friday persists the CR and rewinds to the appropriate planning/design/implementation stage.

### Task correction

```text
/change-request --task T-005 --impact IMPLEMENTATION Root / must redirect to /login
```

The task is reopened and downstream review/verification evidence becomes stale. After implementation, REVIEW and VERIFY run again. A successful VERIFY closes the CR as `COMPLETE / IMPLEMENTED`.

### Out-of-scope follow-up

```text
/change-request --out-of-scope Root / redirects to /login
```

The origin work is not reopened. Promote the CR:

```text
/promote-cr CR-001
```

For a CR belonging to a completed/non-active work:

```text
/promote-cr W-20260813-002 CR-001
```

Friday creates a new work item with source linkage back to the origin work and CR. The origin CR becomes `COMPLETE / PROMOTED_TO_WORK`.

### Inspect CRs

```text
/change-requests
/change-requests W-20260813-002
```

### Resolve without implementation

```text
/resolve-cr CR-002 DUPLICATE Already tracked elsewhere
/resolve-cr CR-003 DECLINED Not required by the product decision
/resolve-cr CR-004 SUPERSEDED Replaced by CR-005
/resolve-cr CR-005 CANCELLED Request withdrawn
```

`IMPLEMENTED` is evidence-driven and cannot be set manually.
