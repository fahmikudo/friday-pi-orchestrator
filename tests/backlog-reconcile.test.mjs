import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  linkBacklogWork,
  loadBacklog,
  reconcileBacklogWorkStates,
  saveBacklog,
} from "../extensions/backlog-v200.js";

import {
  completeStage,
  createWork,
  ensureWorkspace,
  saveArtifact,
} from "../extensions/store-v200.js";

const sample = {
  id: "sprint-2",
  title: "Sprint 2",
  workItems: [
    { id: "S2-01", title: "Contracts", dependsOn: [], recommendedOrder: 1 },
    { id: "S2-02", title: "Foundation DB", dependsOn: ["S2-01"], recommendedOrder: 2 },
  ],
};

async function withProject(fn) {
  const root = await mkdtemp(join(tmpdir(), "pi-orch-reconcile-"));
  try {
    await ensureWorkspace(root);
    await saveBacklog(root, sample);
    await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function finishSmall(root, workId) {
  await saveArtifact(root, workId, "plan", "# Plan\n");
  await completeStage(root, workId); // PLAN -> IMPLEMENT
  await completeStage(root, workId); // IMPLEMENT -> REVIEW
  await saveArtifact(root, workId, "review", "# Review\n", "PASS");
  await completeStage(root, workId); // REVIEW -> VERIFY
  await saveArtifact(root, workId, "verification", "# Verify\n", "PASS");
  await completeStage(root, workId); // VERIFY -> COMPLETE
}

test("completion fallback syncs linked backlog even when manifest.source is missing", async () => {
  await withProject(async (root) => {
    const work = await createWork(root, "add foundation endpoint"); // deliberately no source metadata
    await linkBacklogWork(root, "sprint-2", "S2-01", work.id);

    await finishSmall(root, work.id);

    const backlog = await loadBacklog(root, "sprint-2");
    assert.equal(backlog.workItems.find((i) => i.id === "S2-01").status, "DONE");
    assert.equal(backlog.workItems.find((i) => i.id === "S2-02").status, "READY");
  });
});

test("reconcile repairs already-complete linked work missed by an older runtime", async () => {
  await withProject(async (root) => {
    const work = await createWork(root, "add foundation endpoint");
    await linkBacklogWork(root, "sprint-2", "S2-01", work.id);

    // Simulate completion before v1.0.4 without triggering the new fallback:
    const manifestPath = join(root, ".pi-work", "work", work.id, "manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    manifest.status = "COMPLETE";
    manifest.currentStage = "COMPLETE";
    manifest.stages.COMPLETE = { status: "DONE", updatedAt: new Date().toISOString() };
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

    let before = await loadBacklog(root, "sprint-2");
    assert.equal(before.workItems.find((i) => i.id === "S2-01").status, "IN_PROGRESS");

    const result = await reconcileBacklogWorkStates(root, "sprint-2");
    assert.equal(result.changed, true);

    const after = await loadBacklog(root, "sprint-2");
    assert.equal(after.workItems.find((i) => i.id === "S2-01").status, "DONE");
    assert.equal(after.workItems.find((i) => i.id === "S2-02").status, "READY");
  });
});


test("reconciliation is idempotent after repair", async () => {
  await withProject(async (root) => {
    const work = await createWork(root, "add foundation endpoint");
    await linkBacklogWork(root, "sprint-2", "S2-01", work.id);

    const manifestPath = join(root, ".pi-work", "work", work.id, "manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    manifest.status = "COMPLETE";
    manifest.currentStage = "COMPLETE";
    manifest.stages.COMPLETE = { status: "DONE", updatedAt: new Date().toISOString() };
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

    const first = await reconcileBacklogWorkStates(root, "sprint-2");
    assert.equal(first.changed, true);

    const second = await reconcileBacklogWorkStates(root, "sprint-2");
    assert.equal(second.changed, false);
    assert.deepEqual(second.reconciled, []);
  });
});
