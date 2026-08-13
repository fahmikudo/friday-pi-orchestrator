import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  completeStage,
  createWork,
  ensureWorkspace,
  failStage,
  loadManifest,
  reopenVerification,
  saveArtifact,
} from "../extensions/store.js";

test("failed VERIFY can be reopened, re-verified, and completed with PASS_WITH_WARNINGS", async () => {
  const root = await mkdtemp(join(tmpdir(), "pi-orch-"));
  try {
    await ensureWorkspace(root);
    const work = await createWork(root, "fix invoice export bug");
    let current = work;
    while (current.currentStage !== "REVIEW") {
      current = await completeStage(root, work.id);
    }
    await saveArtifact(root, work.id, "review", "# Review\nPASS", "PASS");
    current = await completeStage(root, work.id);
    assert.equal(current.currentStage, "VERIFY");

    await saveArtifact(root, work.id, "verification", "# Verification\nFAIL", "FAIL");
    current = await failStage(root, work.id, "initial verification failed");
    assert.equal(current.status, "BLOCKED");
    assert.equal(current.stages.VERIFY.status, "FAILED");
    assert.equal(current.verificationVerdict, "FAIL");

    current = await reopenVerification(root, work.id, "fix applied; re-run verification");
    assert.equal(current.status, "IN_PROGRESS");
    assert.equal(current.stages.VERIFY.status, "IN_PROGRESS");
    assert.equal(current.verificationVerdict, "FAIL");

    await saveArtifact(root, work.id, "verification", "# Verification\nPASS WITH WARNINGS", "PASS_WITH_WARNINGS");
    current = await loadManifest(root, work.id);
    assert.equal(current.verificationVerdict, "PASS_WITH_WARNINGS");

    current = await completeStage(root, work.id);
    assert.equal(current.currentStage, "COMPLETE");
    assert.equal(current.status, "COMPLETE");

    const journal = await readFile(join(root, ".pi-work", "work", work.id, "journal.jsonl"), "utf8");
    assert.match(journal, /"event":"stage_failed"/);
    assert.match(journal, /"event":"verification_reopened"/);
    assert.match(journal, /"previousVerdict":"FAIL"/);
    assert.match(journal, /"verdict":"PASS_WITH_WARNINGS"/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("reopenVerification rejects non-VERIFY stages", async () => {
  const root = await mkdtemp(join(tmpdir(), "pi-orch-"));
  try {
    await ensureWorkspace(root);
    const work = await createWork(root, "add customer export endpoint");
    await assert.rejects(() => reopenVerification(root, work.id), /not VERIFY/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
