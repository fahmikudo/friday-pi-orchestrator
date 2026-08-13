# Migration — Friday Pi Orchestrator v2.0.1 to v2.0.2

v2.0.2 is backward-compatible with existing `.pi-work` repositories. No destructive migration is required.

## Upgrade

Fully quit running Pi processes, then install the new release:

```bash
unzip friday-pi-orchestrator-v2.0.2.zip
cd friday-pi-orchestrator-v2.0.2
./install.sh
```

Restart Pi inside the project and verify:

```text
/orchestrator-doctor
/status
/change-requests
```

Do **not** delete or rename `.pi-work`.

## Stable runtime filenames

Starting in v2.0.2, Friday no longer creates version-suffixed helper names such as `store-v202.js` or `runtime-v202.js`. The package uses stable names:

```text
extensions/core.js
extensions/store.js
extensions/backlog.js
extensions/backlog-format.js
extensions/format.js
extensions/runtime.js
```

Versioning remains in `package.json`, `MODULE_VERSION`, changelog, and release artifacts.

## Existing change-request artifacts

Older work may already contain:

```text
.pi-work/work/W-.../artifacts/change-request-001.md
```

v2.0.2 discovers these files lazily when `/change-requests` or `/promote-cr` is used and creates structured CR metadata in the manifest. Do not edit the artifact manually.

For the common case where an older CR was marked out-of-scope on a completed work:

```text
/change-requests W-20260813-002
/promote-cr W-20260813-002 CR-001
```

Friday creates a new linked work item and resolves the origin CR as:

```text
status: COMPLETE
resolution: PROMOTED_TO_WORK
resultWorkId: W-...
```

## In-scope changes

Use:

```text
/change-request <changed requirement>
```

Task-specific correction:

```text
/change-request --task T-005 --impact IMPLEMENTATION <change>
```

The affected lifecycle stage is reopened and prior downstream evidence is invalidated. Open in-scope CRs are resolved as `IMPLEMENTED` only after successful VERIFY.

## Out-of-scope changes

Record without reopening the origin work:

```text
/change-request --out-of-scope <follow-up requirement>
```

Promote later:

```text
/promote-cr CR-001
```

## Compatibility

Existing work IDs, manifests, journals, tasks, artifacts, memory, backlogs, backlog links, review history, and verification history remain valid. New CR fields are additive.
