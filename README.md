# Friday Pi Orchestrator v2.0.1

> **Build with structure. Finish with confidence. Feel like Friday.**

Friday Pi Orchestrator is a durable, evidence-driven engineering workflow layer for [Pi](https://pi.dev/). It turns a coding-agent session into a governed engineering lifecycle with explicit state, human approval, review, verification, project memory, backlog linkage, and deterministic skill routing.

The name **Friday** reflects the product philosophy: reduce engineering chaos, keep work under control, and help teams reach a trustworthy definition of done with the calm confidence of finishing a good Friday.

## Why Friday exists

A capable model can write code, but model intelligence is not the same thing as workflow authority.

Friday separates responsibilities:

```text
AGENTS       = WHO performs work
SKILLS       = HOW work should be performed
ORCHESTRATOR = WHEN / ORDER / STATE / GATES
MEMORY       = durable project-specific facts
MODEL        = interchangeable reasoning/execution engine
```

The core rule is:

```text
Conversation != workflow state
Agent        != process authority
Skill        != state machine
.pi-work     = durable execution truth
```

This lets you restart Pi, switch models, reject a design, recover from failed verification, or resume days later without reconstructing the project from chat history.

---

## v2.0.1 patch

- Fixes duplicate skill warnings when the same advanced engineering skills already exist under `~/.pi/agent/skills`.
- The installer now prunes only the **installed Friday manifest** before `pi install`, so global skills stay authoritative and untouched.
- No `.pi-work` migration is required.

## Highlights in v2.0.0

Friday v2.0.0 is the major evolution of Pi Engineering Orchestrator v1.0.8.

- New product identity: **Friday Pi Orchestrator**.
- Existing `.pi-work` state remains compatible; no destructive migration is required.
- Generic `/work-resume` is the normal continuation command.
- Safe stages can auto-continue and stop at human approval.
- Human `/reject <reason>` creates an iterative design revision loop.
- Artifact revision history preserves earlier designs/reviews/verifications.
- REVIEW failure returns to IMPLEMENT for correction.
- VERIFY failure stays blocked and can recover with `/work-verify` or `/rework`.
- `/change-request` handles requirement changes during active work.
- `/cancel-work` preserves cancellation audit history and backlog projection.
- Product file mutation is blocked outside IMPLEMENT.
- Stage completion requires persisted evidence, not model claims.
- Risk-aware triage escalates security/compatibility/destructive-schema work.
- 62 advanced engineering skills are bundled.
- Skills are resolved from stage + repository profile + domain + risk.
- Model profiles are independent from agent identity.
- Direct PRD/backlog workflow and ad-hoc `/work` workflow both remain first-class.

---

## Requirements

- Pi installed and available as `pi`.
- Node.js compatible with your Pi installation; package metadata requires Node `>=22.19.0`.
- Optional but recommended: `@gotgenes/pi-subagents` for specialized role delegation.

Install the optional subagent package separately:

```bash
pi install npm:@gotgenes/pi-subagents
```

Friday does **not** manage provider credentials. OpenAI, Google, Anthropic, local models, or other providers remain Pi concerns. Friday only records model-profile routing guidance.

---

## Install from a release archive

```bash
unzip friday-pi-orchestrator-v2.0.1.zip
cd friday-pi-orchestrator-v2.0.1
./install.sh
```

Then **fully quit and restart Pi**.

Inside a project:

```text
/orchestrator-doctor
```

For an existing v1.0.8 project:

```text
/status
/backlog-reconcile     # only if the project uses a backlog
/work-resume           # resume the existing active work
```

Do **not** delete `.pi-work`.

### Install from GitHub later

Once the repository is published, Pi can install a package directly from a Git URL. See Pi's package documentation for supported source forms.

---

## Existing advanced-skill installations

Friday bundles its own 62 engineering skills.

If you previously installed the standalone `pi-advanced-engineering-skills` pack globally under `~/.pi/agent/skills`, the installer detects duplicate skill names **before registering the Friday package**. It rewrites only the installed Friday package manifest so Pi sees the existing global copy as authoritative and registers only Friday skills that are missing globally. Your existing global skills are never deleted or moved.

This avoids duplicate-skill warnings while allowing Friday to provide any skills you do not already have.

---

## Optional subagent templates

Friday does not overwrite your existing agent definitions.

Example definitions are included in:

```text
examples/agents/
```

Install only missing templates:

```bash
./scripts/install-agent-templates.sh
```

Replace existing agent files only when explicitly desired:

```bash
./scripts/install-agent-templates.sh --replace
```

Templates intentionally leave `model` unspecified so model selection can remain independent from agent identity.

---

# Quick Start

## 1. Initialize a repository once

```text
/init-workspace
```

Friday creates or reuses:

```text
.pi-work/
├── project.json
├── memory/
│   ├── architecture.md
│   ├── conventions.md
│   ├── domain-map.md
│   ├── database.md
│   ├── testing.md
│   └── decisions/
├── work/
├── backlogs/
└── runtime/
```

`runtime/` is ephemeral. Work, backlog, artifact, and memory state are durable.

During initialization Friday asks the agent to inspect the repository and persist a repository profile such as languages, frameworks, databases, infrastructure, package managers, and test commands. This profile feeds deterministic skill routing.

---

## 2. Start direct work

No PRD or backlog is required:

```text
/work Fix duplicate webhook processing when the provider retries the same event
```

Friday triages the work and creates a durable ID such as:

```text
W-20260812-001
```

Then continue normally with:

```text
/work-resume
```

With auto-continuation enabled, Friday may progress safe stages automatically until it reaches a human gate or failure.

---

## 3. Review a design

For MEDIUM/LARGE work, Friday stops at:

```text
Stage: APPROVE
Status: WAITING_APPROVAL
```

Approve:

```text
/approve
```

Reject with durable feedback:

```text
/reject Keep specialties inside clinical foundation. Do not couple them to scheduling or doctor credentialing.
```

Friday returns to DESIGN, records the reason, marks the prior design stale, and preserves it when the revised design is saved.

You can reject repeatedly:

```text
DESIGN v1 -> REJECT
DESIGN v2 -> REJECT
DESIGN v3 -> APPROVE
```

---

## 4. Resume from durable state

`/work-resume` is the canonical continuation primitive:

```text
/work-resume
```

or:

```text
/work-resume W-20260812-001
```

If PARTY already completed and durable state says DESIGN, `/work-resume` continues DESIGN. You do not need to remember a stage-specific `/design` command.

This is intentional:

```text
user says continue
       ↓
/work-resume
       ↓
read durable manifest
       ↓
continue authoritative current stage
```

Pi's built-in `/resume` remains reserved for Pi session selection.

---

# Workflow Types

## BUGFIX

```text
TRIAGE -> IMPLEMENT -> REVIEW -> VERIFY -> COMPLETE
```

Used for focused, low-consequence defects.

Security/compatibility/destructive-data bugs may be escalated instead of taking the short route.

## SMALL

```text
TRIAGE -> PLAN -> IMPLEMENT -> REVIEW -> VERIFY -> COMPLETE
```

## MEDIUM

```text
TRIAGE -> DISCOVER -> DESIGN -> APPROVE -> DECOMPOSE -> IMPLEMENT -> REVIEW -> VERIFY -> COMPLETE
```

## LARGE

```text
TRIAGE -> DISCOVER -> PARTY -> DESIGN -> APPROVE -> DECOMPOSE -> IMPLEMENT -> REVIEW -> VERIFY -> COMPLETE
```

Work classification considers more than lines of code: affected domains, risk, compatibility, security, schema impact, and blast radius matter.

---

# Safe-stage auto continuation

Default:

```text
autoContinueSafeStages = true
```

A normal LARGE work item can behave like:

```text
/work <request>
   ↓
TRIAGE
   ↓
DISCOVER
   ↓
PARTY
   ↓
DESIGN
   ↓
APPROVE   <-- stop for human
```

After `/approve`, safe stages may continue again while their evidence gates are satisfied.

Disable this if you prefer manual continuation after every stage:

```text
/orchestrator-settings auto-continue off
```

Re-enable:

```text
/orchestrator-settings auto-continue on
```

Even with auto-continuation enabled, the deterministic state machine still stops at APPROVE, BLOCKED states, or missing evidence.

---

# Evidence gates

Friday does not treat an assistant statement such as "tests pass" as durable proof.

Stage completion requires persisted artifacts:

| Stage | Required durable evidence |
|---|---|
| DISCOVER | `discovery.md` |
| PARTY | `party.md` |
| PLAN | `plan.md` |
| DESIGN | `design.md` |
| DECOMPOSE | at least one persisted task |
| IMPLEMENT | all persisted tasks DONE, when tasks exist |
| REVIEW | `review.md` + verdict `PASS` |
| VERIFY | `verification.md` + `PASS` or `PASS_WITH_WARNINGS` |

The platform rejects evidence-free transitions.

---

# Review and verification recovery

## REVIEW fails

Reviewer finds a blocking defect:

```text
IMPLEMENT
   ↓
REVIEW FAIL
   ↓
IMPLEMENT
   ↓
fix
   ↓
REVIEW again
```

The failed review remains in artifact history when a new review is saved.

## VERIFY fails

Verification failure is intentionally different:

```text
VERIFY
  ↓
FAIL
  ↓
BLOCKED
```

If implementation does **not** need to change:

```text
/work-verify
```

Friday reopens VERIFY, preserves previous FAIL history, runs verification again, and expects the result to be persisted through the orchestrator.

If implementation **does** need to change:

```text
/rework QA found an implementation defect in cross-facility authorization
```

That returns the work to IMPLEMENT and invalidates previous review/verification evidence.

---

# Requirement changes during active work

Do not silently expand an approved design during implementation.

Use:

```text
/change-request Add specialty category hierarchy and parent-child validation
```

Friday records a durable change-request artifact and rewinds appropriately:

```text
MEDIUM/LARGE -> DESIGN
SMALL        -> PLAN
BUGFIX       -> IMPLEMENT
```

For replanning/redesign, existing tasks are archived before the active task list is cleared.

A new approval is required when the route contains APPROVE.

---

# Cancel work without deleting history

```text
/cancel-work Requirement removed from Sprint 2
```

Friday sets the work status to `CANCELLED`, records the reason, preserves journal/artifacts, and marks a linked backlog item cancelled.

Cancellation is an audit event, not a delete operation.

---

# PRD / Sprint Backlog Workflow

Friday supports a planning layer on top of the same work lifecycle.

```text
PRD + technical docs
        ↓
/plan-sprint
        ↓
backlog
        ↓
/start S2-01
        ↓
normal durable work lifecycle
        ↓
COMPLETE
        ↓
backlog item DONE
```

Example:

```text
/plan-sprint docs/sprints/sprint-2-prd.md and docs/technical/sprint-2-implementation.md
/backlog
/start S2-01
```

Backlog item states:

```text
READY
BLOCKED
IN_PROGRESS
DONE
CANCELLED
```

Dependencies are deterministic. A blocked item cannot start until its prerequisites are satisfied.

When linked work reaches COMPLETE, Friday updates the backlog item to DONE and recalculates dependents.

Repair an old projection if necessary:

```text
/backlog-reconcile
```

Close a fully executed sprint:

```text
/close-sprint
```

---

# Skill routing

Friday v2 bundles 62 advanced skills and selects a minimal useful set from:

```text
current stage
+ work domains
+ risk profile
+ repository profile
```

Examples:

### Go backend API

```text
tdd
go-backend
api-contract-design
backend-error-handling
```

### Spring Boot domain feature

```text
tdd
java-backend
spring-boot-backend
domain-driven-design
module-boundary-design
```

### NestJS + PostgreSQL + security

```text
tdd
node-backend
typescript-backend
nestjs-backend
relational-schema-design
safe-database-migration
authorization-design
secure-api
postgresql
```

### Frontend

Framework-specific skills include:

```text
react-frontend
vue-frontend
angular-frontend
```

Common skills include state ownership, server state, forms, accessibility, testing, and performance.

Inspect current routing:

```text
/skill-routing
```

Skill routing is methodology guidance. Confirmed project conventions and approved design take precedence over generic skill advice.

---

# Model profiles

Friday deliberately separates model profiles from agent names.

Default profiles:

```text
product-analysis
high-reasoning
implementation
independent-review
verification
```

All default to `inherit`.

Configure guidance per project:

```text
/orchestrator-settings model high-reasoning anthropic/claude-opus-...
/orchestrator-settings model implementation openai/...
/orchestrator-settings model independent-review google/...
```

Inspect:

```text
/orchestrator-settings
/skill-routing
```

Important: v2.0.0 records and injects these mappings as routing guidance. It does **not** forcibly switch the Pi parent model. When a compatible subagent runner allows a model override, the coordinator can use the mapped value for that delegation. This keeps provider/model choice independent from workflow state and prevents provider availability from corrupting durable work.

A useful pattern is:

```text
DESIGN         -> high-reasoning
IMPLEMENT      -> implementation
REVIEW         -> independent-review
VERIFY         -> verification
```

Prefer an independent model/provider for review or QA when practical.

---

# Mutation safety

Friday protects two boundaries.

## Durable state

The agent cannot directly write/edit `.pi-work` or mutate it through shell commands.

State changes must go through Friday's orchestrator APIs/commands so mutations are serialized and journaled.

## Product code

While an active work item exists, product mutation is allowed only during IMPLEMENT.

Examples:

```text
DESIGN  + Edit(source) -> BLOCK
APPROVE + Write(source) -> BLOCK
REVIEW  + mutating bash -> BLOCK
VERIFY  + Edit(source) -> BLOCK
```

Read-only inspection/tests remain possible where appropriate.

This makes the approval gate a platform rule rather than a polite prompt.

---

# Durable state layout

```text
project/
├── docs/                         # full product/technical source docs
└── .pi-work/
    ├── project.json
    ├── memory/
    │   ├── architecture.md
    │   ├── conventions.md
    │   ├── domain-map.md
    │   ├── database.md
    │   ├── testing.md
    │   ├── index.json
    │   └── decisions/
    ├── work/
    │   └── W-YYYYMMDD-001/
    │       ├── manifest.json
    │       ├── requirement.md
    │       ├── tasks.json
    │       ├── journal.jsonl
    │       └── artifacts/
    │           ├── discovery.md
    │           ├── party.md
    │           ├── plan.md
    │           ├── design.md
    │           ├── review.md
    │           ├── verification.md
    │           └── history/
    ├── backlogs/
    └── runtime/
```

Source-of-truth boundary:

```text
docs/             = full source documentation
.pi-work/backlogs = delivery planning state
.pi-work/work     = execution state/evidence
.pi-work/memory   = compressed durable project knowledge
conversation      = temporary working context
```

---

# Command Reference

## Workspace and diagnostics

```text
/init-workspace
/orchestrator-doctor
/orchestrator-settings
/skill-routing
```

## Work

```text
/work <request>
/status [work-id]
/work-status [work-id]
/work-list
/tasks
/work-context
/work-resume [work-id]
```

## Human gates and change control

```text
/approve [work-id]
/reject <reason>
/rework <reason>
/change-request <changed requirement>
/cancel-work <reason>
```

## Verification

```text
/work-verify [work-id]
```

Use `/work-verify`, not a generic QA prompt, when you need durable VERIFY recovery.

## Memory

```text
/memory
/remember <confirmed durable decision>
```

## Sprint backlog

```text
/plan-sprint <documents/specification>
/backlog-list
/backlog [id]
/start <item-id | backlog-id:item-id>
/backlog-update <item-id> <READY|BLOCKED|CANCELLED> [notes]
/backlog-export <destination.md>
/backlog-reconcile [backlog-id]
/close-sprint [backlog-id]
```

---

# Typical End-to-End Example

```text
/init-workspace

/work Add patient specialty foundation with tenant-safe APIs
```

Friday may progress:

```text
TRIAGE
DISCOVER
PARTY
DESIGN
APPROVE
```

You inspect:

```text
/status
/work-context
```

If design is wrong:

```text
/reject specialties belong to clinical foundation; remove scheduling scope
```

Friday revises and returns to APPROVE.

Then:

```text
/approve
```

Safe continuation proceeds through DECOMPOSE and IMPLEMENT.

If REVIEW fails, Friday returns to IMPLEMENT automatically.

If VERIFY fails due to environment only:

```text
/work-verify
```

If QA found a code defect:

```text
/rework fix the cross-facility authorization defect found by QA
```

Once verification records PASS/PASS_WITH_WARNINGS:

```text
COMPLETE
```

---

# Testing the package

```bash
npm test
python3 scripts/validate_skills.py
npm run check
```

Release validation also includes TypeScript compilation, shell syntax checks, and installer dry-run tests.

See:

- `USER_GUIDE.md` — practical usage cookbook.
- `ARCHITECTURE.md` — architecture and invariants.
- `docs/WORKFLOW_CASES.md` — positive, negative, and edge-case behavior.
- `MIGRATION.md` — upgrade from Pi Engineering Orchestrator v1.0.8.
- `RELEASE_AUDIT.md` — release verification record.

---

# Security

Pi packages execute with the local user's permissions. Review source before installing any third-party Pi package.

Friday:

- does not read or modify Pi provider credentials or `auth.json`;
- does not deploy, push, merge, or run destructive database actions by itself;
- preserves `.pi-work` on uninstall;
- blocks direct model mutation of Friday state;
- blocks product mutations outside IMPLEMENT while active work is governed.

See `SECURITY.md` for details.

---

# Philosophy

Friday is not intended to make every engineering task heavyweight.

A typo should not trigger DDD, threat modeling, and three model families.

A security-sensitive one-line change may legitimately require deeper review than a 300-line low-risk feature.

The goal is:

```text
the smallest workflow
+ the smallest relevant skill set
+ enough independent evidence
= trustworthy completion
```

**Build with structure. Finish with confidence. Feel like Friday.**
