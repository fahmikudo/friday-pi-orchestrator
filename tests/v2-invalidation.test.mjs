import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  changeRequest,
  completeStage,
  createWork,
  ensureWorkspace,
  markDirty,
  saveArtifact,
} from "../extensions/store-v200.js";

async function tempRoot() {
  const root = await mkdtemp(join(tmpdir(), "friday-v2-invalidate-"));
  await ensureWorkspace(root);
  return root;
}

async function smallToVerify(root) {
  const work = await createWork(root, "add invoice export endpoint");
  await saveArtifact(root, work.id, "plan", "# Plan\n");
  await completeStage(root, work.id); // PLAN -> IMPLEMENT
  await markDirty(root, work.id, "backend", "internal/invoice/export.go");
  await completeStage(root, work.id); // IMPLEMENT -> REVIEW
  await saveArtifact(root, work.id, "review", "# Review\nPASS\n", "PASS");
  await completeStage(root, work.id); // REVIEW -> VERIFY
  return work;
}

test("change after review invalidates review/verification and rewinds to REVIEW", async () => {
  const root = await tempRoot();
  try {
    const work = await smallToVerify(root);
    const changed = await markDirty(root, work.id, "backend", "internal/invoice/export.go");
    assert.equal(changed.currentStage, "REVIEW");
    assert.equal(changed.reviewVerdict, "PENDING");
    assert.equal(changed.verificationVerdict, "PENDING");
    assert.ok(changed.staleArtifacts.includes("review"));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("post-terminal dirty observation does not reopen completed work", async () => {
  const root = await tempRoot();
  try {
    const work = await smallToVerify(root);
    await saveArtifact(root, work.id, "verification", "# Verify\nPASS\n", "PASS");
    const completed = await completeStage(root, work.id);
    assert.equal(completed.status, "COMPLETE");
    const observed = await markDirty(root, work.id, "backend", "unrelated.go");
    assert.equal(observed.status, "COMPLETE");
    assert.equal(observed.currentStage, "COMPLETE");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("requirement change after completion requires a new work item", async () => {
  const root = await tempRoot();
  try {
    const work = await smallToVerify(root);
    await saveArtifact(root, work.id, "verification", "# Verify\nPASS\n", "PASS");
    await completeStage(root, work.id);
    await assert.rejects(() => changeRequest(root, work.id, "Add another field"), /Cannot change terminal work/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
