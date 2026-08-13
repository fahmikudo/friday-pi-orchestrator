# Friday Pi Orchestrator v2.0.0 — Architecture

## 1. Purpose

Friday is a deterministic workflow/state layer around Pi's model/tool harness.

It deliberately avoids becoming a second coding runtime or a separate CLI control plane.

```text
Pi
├── model/provider runtime
├── tools
├── sessions/context
├── extensions
├── skills
└── optional subagents

Friday extension
├── workflow state machine
├── durable state store
├── approval gates
├── artifact/evidence gates
├── backlog projection
├── skill resolution
├── model-profile routing guidance
├── mutation policy
└── recovery/change-control semantics
```

## 2. Core principle

**Thin agents. Fat platform.**

Agents may reason, inspect, implement, review, or verify. They do not own process truth.

The platform owns:

- current work stage;
- allowed transitions;
- human approval;
- evidence requirements;
- work/backlog linkage;
- durable history;
- mutation boundaries;
- recovery semantics.

## 3. Durable truth

```text
docs/             full product/technical source documents
.pi-work/backlogs delivery planning state
.pi-work/work     execution state, artifacts, tasks, journal
.pi-work/memory   curated compressed project knowledge
conversation      temporary working context
```

Friday continues to use `.pi-work` for compatibility with v1.0.8.

## 4. State model

Routes:

```text
BUGFIX: TRIAGE -> IMPLEMENT -> REVIEW -> VERIFY -> COMPLETE
SMALL:  TRIAGE -> PLAN -> IMPLEMENT -> REVIEW -> VERIFY -> COMPLETE
MEDIUM: TRIAGE -> DISCOVER -> DESIGN -> APPROVE -> DECOMPOSE -> IMPLEMENT -> REVIEW -> VERIFY -> COMPLETE
LARGE:  TRIAGE -> DISCOVER -> PARTY -> DESIGN -> APPROVE -> DECOMPOSE -> IMPLEMENT -> REVIEW -> VERIFY -> COMPLETE
```

Work statuses include:

```text
IN_PROGRESS
WAITING_APPROVAL
BLOCKED
COMPLETE
CANCELLED
```

## 5. Human approval

`APPROVE` is not completed through generic `complete_stage`.

Only the human-facing approval path may cross the gate:

```text
DESIGN -> APPROVE -> /approve -> DECOMPOSE
```

Rejection:

```text
APPROVE
  ↓ /reject reason
DESIGN or PLAN
  ↓ revised artifact
APPROVE
```

The rejected artifact is marked stale. When a new artifact is saved, the previous copy is archived under `artifacts/history/`.

## 6. Evidence gates

`completeStage()` checks stage-specific evidence before allowing progression.

It does not trust assistant prose.

Required evidence:

- discovery artifact for DISCOVER;
- party artifact for PARTY;
- plan artifact for PLAN;
- design artifact for DESIGN;
- persisted tasks for DECOMPOSE;
- completed tasks for IMPLEMENT when tasks exist;
- review artifact + PASS for REVIEW;
- verification artifact + PASS/PASS_WITH_WARNINGS for VERIFY.

A stale artifact cannot satisfy a gate.

## 7. Failure/recovery semantics

### REVIEW FAIL

Review failure normally means implementation correction is required:

```text
REVIEW FAIL -> IMPLEMENT
```

The failed review remains historical evidence.

### VERIFY FAIL

Verification failure blocks completion:

```text
VERIFY FAIL -> BLOCKED at VERIFY
```

If no code change is needed:

```text
/work-verify -> reopen VERIFY
```

If code change is needed:

```text
/rework -> IMPLEMENT
```

Previous review/verification evidence becomes stale.

## 8. Change control

`/change-request` is for requirement changes after work has already started.

Rewind target:

```text
MEDIUM/LARGE -> DESIGN
SMALL        -> PLAN
BUGFIX       -> IMPLEMENT
```

Downstream stages are reset. Prior tasks are archived when replanning/redesign is required. Approval returns to PENDING.

## 9. Cancellation

`/cancel-work` is a terminal audited state, not deletion.

Linked backlog items are projected to CANCELLED.

## 10. Auto continuation

A successful stage transition may queue a follow-up message when:

- work status is IN_PROGRESS;
- `autoContinueSafeStages` is enabled;
- next stage is not APPROVE or COMPLETE.

Every follow-up first re-reads durable state through `get_state`; it must not rely on the previous chat message's stage.

## 11. Skill resolution

Inputs:

```text
Stage
+ Repository Profile
+ Work Domains
+ Risk Profile
```

Output: a minimal ordered skill set.

Examples:

- DESIGN + backend/database/security -> module boundaries, API/schema design, auth/security skills.
- IMPLEMENT + Go -> TDD + Go backend + relevant cross-cutting skills.
- REVIEW + database/security -> independent review + DB/security/test review.
- VERIFY -> risk-based testing + integration/security evidence where relevant.

Skills provide methodology. They do not bypass project-specific decisions.

## 12. Model profiles

Model routing is intentionally separated from agent identity.

Profiles:

```text
product-analysis
high-reasoning
implementation
independent-review
verification
```

`resolveModelProfile()` chooses a profile from stage/work/risk. Project config maps profile to a model identifier or `inherit`.

v2 injects this mapping as guidance. It does not make the model itself a workflow dependency.

## 13. Repository profile

`project.json` stores observed repository characteristics:

```json
{
  "repositoryProfile": {
    "languages": [],
    "frameworks": [],
    "databases": [],
    "infrastructure": [],
    "packageManagers": [],
    "testCommands": []
  }
}
```

This profile is used for deterministic skill selection.

## 14. Mutation policy

### `.pi-work`

Direct model writes/edits and mutating bash targeting `.pi-work` are blocked.

Friday state mutations pass through a serialized mutation queue.

### Product files

While non-terminal governed work is active, source/config/product mutation is allowed only at IMPLEMENT.

This converts lifecycle discipline from a prompt convention into a tool boundary.

## 15. Dirty state

Successful writes/edits and mutating shell operations mark affected domains dirty.

Review and verification capture evidence for dirty domains. Later implementation changes invalidate downstream evidence where applicable.

Terminal work is not silently reopened by a later unrelated change; the event is journaled instead.

## 16. Backlog projection

Backlog and work remain separate stores connected by explicit IDs.

```text
backlog item READY
    ↓ /start
work manifest IN_PROGRESS
    ↓ COMPLETE
backlog item DONE
    ↓
dependency recalculation
```

Reconciliation repairs projection mismatches from earlier runtimes.

## 17. Context builder

`buildContextPacket()` reconstructs bounded context from:

- requirement;
- relevant project memory;
- current/previous stage artifacts;
- tasks;
- review/verification;
- change requests;
- repository profile.

The goal is resumption from durable evidence rather than conversation replay.

## 18. Optional subagents

Friday integrates with `@gotgenes/pi-subagents` when available but does not require it for state management.

Recommended logical agents remain small and stable:

```text
product-manager
software-architect
backend-engineer
frontend-engineer
devops-engineer
code-reviewer
qa-engineer
```

Technology knowledge belongs in skills rather than proliferating technology-specific agent identities.

Implementation writers should be sequential in the same workspace. Reviewer/QA are intended to be independent and read-only.

## 19. Safety invariants

Friday must never require:

- deleting `.pi-work` during upgrade;
- model-specific durable state;
- chat replay to recover work;
- human approval represented only as assistant text;
- direct file editing to repair workflow state.

Workflow state must remain usable even if a provider/model is changed or temporarily unavailable.
