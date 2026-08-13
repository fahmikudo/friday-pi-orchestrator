# Friday Pi Orchestrator v2.0.0 — Release Audit

Release target: **2.0.0**  
Behavioral ancestor: **Pi Engineering Orchestrator v1.0.8**  
Durable workspace: **`.pi-work` preserved**

## Release scope

v2.0.0 was audited as a major workflow/runtime release, not a branding-only change.

Validated areas:

- state-machine backward compatibility;
- human approval enforcement;
- evidence gates;
- reject/revision history;
- REVIEW and VERIFY recovery semantics;
- mid-work change control;
- cancellation/backlog synchronization;
- risk-aware triage;
- deterministic skill routing;
- model-profile routing guidance;
- product and `.pi-work` mutation guards;
- persistent transcript command output;
- old backlog reconciliation behavior;
- helper-module version isolation;
- installer upgrade behavior;
- duplicate global-skill handling;
- bundled skill YAML;
- example agent YAML;
- TypeScript compile compatibility.

## Automated tests

Command:

```bash
node --test tests/*.test.mjs
```

Result:

```text
62 tests
62 passed
0 failed
```

Coverage includes legacy regression tests plus v2 workflows:

- BUGFIX/SMALL/MEDIUM/LARGE classification basics;
- high-consequence security escalation;
- normal durable work creation;
- approval bypass rejection;
- rejection and design artifact history;
- missing evidence blocks completion;
- REVIEW FAIL → IMPLEMENT;
- VERIFY FAIL → BLOCKED;
- VERIFY reopen → PASS_WITH_WARNINGS → COMPLETE;
- explicit `/rework` evidence invalidation;
- mid-work `/change-request` → redesign and task invalidation;
- `/cancel-work` backlog projection;
- backlog dependency locking/unlocking;
- backlog reconciliation idempotency;
- old source-less work completion reconciliation;
- `/work-resume` mutation-queue deadlock regression;
- no extension `/resume` shadowing;
- persistent command transcript output;
- deterministic skill/model-profile routing;
- auto-continuation stop at APPROVE/COMPLETE;
- static product mutation policy checks.

## JavaScript syntax

Validated:

```text
extensions/core-v200.js
extensions/store-v200.js
extensions/backlog-v200.js
extensions/format-v200.js
extensions/backlog-format-v200.js
extensions/runtime-v200.js
```

Result: PASS.

## TypeScript

Command:

```bash
npx tsc -p tsconfig.release.json --noEmit
```

Result: PASS.

## Skill pack

Bundled skills:

```text
62
```

Validated with real YAML parsing plus skill contract checks:

```text
PASS: 62 skills validated with YAML parsing
```

Category counts:

```text
architecture: 7
backend: 9
database: 6
delivery: 3
devops: 5
frontend: 11
methods: 4
product: 4
quality: 4
review: 5
security: 4
```

## Agent templates

Example role agents:

```text
7
```

YAML frontmatter parse: PASS.

Templates deliberately do not lock a `model`, allowing subagent model override/routing to remain independent from logical agent identity.

## Shell scripts

Syntax checked:

```text
install.sh
uninstall.sh
scripts/install-agent-templates.sh
```

Result: PASS.

## Installer dry run

Installer was run with an isolated fake `HOME`, fake `PI_CODING_AGENT_DIR`, and stub `pi` executable.

Validated:

- Friday copied to the new stable local package target;
- old project state was not involved;
- `pi install` integration path executed;
- a pre-existing global `tdd` skill was detected;
- settings were rewritten with a Friday package skill exclusion for only the duplicate packaged skill;
- the global skill file remained untouched.

Result: PASS.

## Static release isolation

Verified:

- runtime imports use only `-v200.js` local helper paths;
- all helper modules declare `MODULE_VERSION = "2.0.0"`;
- Friday does not register Pi's built-in `/resume`;
- runtime/package files contain no stale v1 helper imports;
- old local package target is referenced only for migration/archive behavior;
- `.pi-work` remains the durable workspace name.

## Known intentional limitations

### Model profiles are guidance, not forced parent-model switching

Friday resolves a model profile and injects the configured mapping into stage context. It does not forcibly switch the parent Pi model in v2.0.0.

A compatible subagent runner can use the mapped model as a delegation override when the agent definition does not lock a model.

### Writer isolation

Friday's workflow instructs implementation writers to run sequentially in the same workspace and product mutations are stage-gated. v2.0.0 does not create automatic git-worktree isolation for multiple writers. Use a dedicated worktree/isolation extension when truly parallel writers are required.

### Pi/provider credentials

Friday does not configure, inspect, or modify provider authentication. Provider availability is intentionally outside workflow state.

## Release verdict

```text
PASS
```

Friday Pi Orchestrator v2.0.0 is ready as the major baseline for the renamed GitHub project, with backward-compatible `.pi-work` execution state and the new v2 workflow controls documented above.
