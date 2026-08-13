# Friday Pi Orchestrator v2.0.2 — Release Audit

Release target: **2.0.2**  
Behavioral baseline: **Friday Pi Orchestrator v2.0.1**  
Durable workspace: **`.pi-work` preserved**

## Release scope

v2.0.2 adds a first-class Change Request lifecycle and removes version suffixes from internal runtime filenames.

Validated behavior:

- existing v2 lifecycle and approval gates;
- REVIEW/VERIFY recovery semantics;
- durable artifact history and invalidation;
- first-class in-scope/out-of-scope CR classification;
- task-scoped CR reopening;
- successful VERIFY resolving in-scope CRs as `IMPLEMENTED`;
- out-of-scope CRs recorded without reopening terminal work;
- legacy `change-request-NNN.md` discovery;
- CR promotion into linked new work;
- non-implementation CR resolutions;
- guard against accidental `/work <existing-work-id>` duplicate creation;
- backlog reconciliation and dependency behavior;
- deterministic skill/model routing;
- direct `.pi-work` mutation guards;
- stable helper filenames.

## Automated tests

```text
70 tests
70 passed
0 failed
```

New CR regressions include:

1. task-scoped IN_SCOPE CR → task reopened + IMPLEMENT;
2. successful VERIFY → CR `COMPLETE / IMPLEMENTED`;
3. OUT_OF_SCOPE CR on COMPLETE work does not reopen origin;
4. legacy recorded CR → linked promoted work;
5. manual `DUPLICATE` resolution;
6. existing work ID cannot be passed to the new-work primitive.

## Stable runtime modules

```text
extensions/index.ts
extensions/core.js
extensions/store.js
extensions/backlog.js
extensions/backlog-format.js
extensions/format.js
extensions/runtime.js
```

Runtime helper filenames no longer include release suffixes. All JavaScript helper modules declare:

```text
MODULE_VERSION = "2.0.2"
```

## TypeScript

```bash
npx tsc -p tsconfig.release.json --noEmit
```

Result: **PASS**.

## JavaScript syntax

```bash
node --check extensions/core.js
node --check extensions/store.js
node --check extensions/backlog.js
node --check extensions/backlog-format.js
node --check extensions/format.js
node --check extensions/runtime.js
```

Result: **PASS**.

## Skill pack

Bundled advanced engineering skills remain compatible with the v2.0.1 installer conflict strategy. Skill YAML validation is run by the release/install checks when PyYAML is available.

## Durable-state compatibility

No destructive `.pi-work` migration is required.

Existing:

- project state;
- work IDs;
- task state;
- artifacts and history;
- journals;
- backlog links;
- memory;
- review/verification history

remain valid.

Legacy `artifacts/change-request-NNN.md` files are imported lazily into structured manifest metadata when CR commands inspect them.

## Release verdict

```text
PASS
```

Friday Pi Orchestrator v2.0.2 is ready as the Change Request lifecycle release with stable internal module filenames.
