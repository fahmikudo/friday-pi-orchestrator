# Migration — Pi Engineering Orchestrator v1.0.8 to Friday Pi Orchestrator v2.0.1

Friday v2.0.0 is a major product/runtime release, but it intentionally preserves the existing `.pi-work` state format.

## What changes

Product/package identity:

```text
Pi Engineering Orchestrator
→ Friday Pi Orchestrator
```

Repository/package name:

```text
friday-pi-orchestrator
```

Runtime helper modules move from `-v108.js` to clean paths (version suffix removed).

## What does NOT change

Do not rename or delete:

```text
.pi-work/
```

Existing data remains valid:

- project.json;
- work IDs;
- manifests;
- journals;
- tasks;
- artifacts;
- memory;
- backlogs;
- backlog-to-work links;
- failed verification history.

Friday lazily adds missing v2 project defaults such as workflow policy, model profiles, and repository profile.

## Upgrade procedure

1. Fully quit all Pi processes.
2. Extract Friday v2.0.0.
3. Run:

```bash
./install.sh
```

4. Start a fresh Pi process in the existing project.
5. Run:

```text
/orchestrator-doctor
/status
```

6. For backlog projects:

```text
/backlog-reconcile
/backlog
```

7. Resume existing work:

```text
/work-resume W-...
```

## Old package target

The installer detects the previous local package target:

```text
~/.pi/agent/local-packages/pi-engineering-orchestrator
```

It removes the old package registration and archives the old package directory before installing Friday under:

```text
~/.pi/agent/local-packages/friday-pi-orchestrator
```

This operation does not touch any repository `.pi-work` directory.

## Advanced skills

Friday bundles the advanced skill pack.

If duplicate global skills already exist, the installer leaves those global files intact and filters only the duplicate Friday package copies from Pi package loading.

## New lifecycle behavior to know

### Safe auto-continuation

Default ON. Friday may continue safe stages automatically and stop at APPROVE or a failure.

Disable if desired:

```text
/orchestrator-settings auto-continue off
```

### REVIEW FAIL

Now returns to IMPLEMENT for correction.

### VERIFY FAIL

Remains BLOCKED at VERIFY.

Use:

```text
/work-verify
```

when code does not need to change, or:

```text
/rework <reason>
```

when implementation must change.

### Mid-work requirement change

Use:

```text
/change-request <changed requirement>
```

rather than silently expanding implementation scope.

### Cancellation

Use:

```text
/cancel-work <reason>
```

instead of deleting state.

## Rollback

The installer archives the old package directory when one exists.

If you need to return to v1.0.8:

1. fully quit Pi;
2. remove Friday's package registration;
3. restore/reinstall the archived v1.0.8 package;
4. restart Pi.

The shared `.pi-work` data remains the durable source of truth.

Artifacts created with v2 history/change-control fields are additive JSON fields. A very old runtime may ignore them, but running old code after v2 changes is not recommended as an operational strategy.
