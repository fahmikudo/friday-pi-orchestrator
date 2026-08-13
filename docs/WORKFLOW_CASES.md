# Friday Workflow Behavior — Positive, Negative, and Edge Cases

This document is a behavioral specification for the orchestrator mental model.

## Positive cases

### P01 — Normal LARGE work

Expected:

```text
TRIAGE -> DISCOVER -> PARTY -> DESIGN -> APPROVE
                                      human /approve
                                              ↓
DECOMPOSE -> IMPLEMENT -> REVIEW PASS -> VERIFY PASS -> COMPLETE
```

Evidence must exist before every gated transition.

### P02 — Human approves a good design

`/approve` is accepted only when current durable stage is APPROVE.

### P03 — PASS_WITH_WARNINGS is valid verification

Allowed only when material acceptance/risk requirements have evidence and remaining warnings are bounded/non-blocking.

### P04 — Direct work without PRD

`/work <request>` remains first-class and does not require sprint/backlog planning.

### P05 — Backlog dependency unlock

Completing linked prerequisite work marks its backlog item DONE and recalculates dependents to READY.

## Negative cases

### N01 — Model tries to bypass APPROVE

`complete_stage` at APPROVE is rejected. Product write/edit is blocked outside IMPLEMENT.

### N02 — Human rejects design

```text
APPROVE -> /reject reason -> DESIGN -> revised design -> APPROVE
```

Previous design is preserved in artifact history when the replacement is saved.

### N03 — Missing artifact/evidence

A model cannot advance by saying it finished. `complete_stage` rejects missing/stale evidence.

### N04 — REVIEW FAIL

Friday records the failed review and returns to IMPLEMENT. It must not proceed to VERIFY.

### N05 — VERIFY FAIL

Work becomes BLOCKED at VERIFY. It must not proceed to COMPLETE.

### N06 — Start blocked backlog item

`/start` rejects an item whose dependencies are not satisfied.

### N07 — Direct `.pi-work` mutation

Write/edit/mutating shell access is blocked. State changes must use the orchestrator.

### N08 — Product mutation during REVIEW/VERIFY/DESIGN

Blocked. Use `/rework` or lifecycle continuation to reach IMPLEMENT.

### N09 — Critical risk disguised as PASS_WITH_WARNINGS

If a mandatory high-risk verification path is missing, QA should save FAIL rather than downgrade the gap to a warning.

## Edge cases

### E01 — Laptop/Pi process stops mid-DESIGN

A new session runs `/work-resume W-...`; Friday reconstructs bounded context from `.pi-work` and continues DESIGN.

### E02 — Conversation is replaced with `/new`

Workflow state is unchanged because conversation history is not authoritative.

### E03 — PARTY completed but user invokes `/work-resume` rather than `/design`

Correct behavior. Friday reads `manifest.currentStage == DESIGN` and continues DESIGN.

### E04 — Multiple design rejections

All rejection events remain in journal. Each revised design archives its predecessor.

### E05 — Verification FAIL then environment fixed

```text
/work-verify
```

reopens VERIFY without pretending implementation changed.

### E06 — Verification finds code defect

```text
/rework <reason>
```

returns to IMPLEMENT and invalidates review/verification evidence.

### E07 — Requirement changes mid-implementation

```text
/change-request <new requirement>
```

rewinds to DESIGN/PLAN as appropriate, archives old tasks, resets downstream evidence, and requires the lifecycle again.

### E08 — User cancels active work

`/cancel-work` preserves history and marks linked backlog state CANCELLED.

### E09 — Generic skill conflicts with project decision

Confirmed user/project decision and approved design win. Skills are methods, not architecture authority.

### E10 — Technology-version mismatch

Repository version/config evidence wins over generic skill examples. The agent should inspect actual versions before selecting version-specific APIs.

### E11 — Provider/model unavailable

Durable state remains unchanged. Model identity is not workflow identity. The user can change model/profile and resume the same work.

### E12 — QA subagent malfunctions

The failure must be disclosed. A parent fallback may perform read-only verification, but reduced independence should appear as a bounded warning when appropriate.

### E13 — Post-review code change

Any legitimate code correction must re-enter IMPLEMENT. Prior review/verification cannot be reused as current evidence.

### E14 — Old COMPLETE work with stale backlog projection

`/backlog-reconcile` repairs the projection from durable work manifests.

## Regression priorities

P0 automated behaviors:

1. normal lifecycle;
2. approval cannot be bypassed;
3. reject → redesign → approve;
4. artifact history survives repeated rejection;
5. REVIEW FAIL → IMPLEMENT;
6. VERIFY FAIL → BLOCKED;
7. VERIFY reopen → PASS_WITH_WARNINGS → COMPLETE;
8. restart/resume preserves state;
9. backlog completion unlocks dependencies;
10. direct `.pi-work` mutation guard;
11. evidence-free completion rejected;
12. mid-work change request rewinds lifecycle;
13. cancellation preserves audit state;
14. risk-aware security triage escalates;
15. deterministic skill routing uses repository profile.
