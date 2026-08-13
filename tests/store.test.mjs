
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  approve,
  completeStage,
  createWork,
  ensureWorkspace,
  loadManifest,
  saveArtifact,
  setTasks,
  updateTask,
} from "../extensions/store.js";

test("small work persists and gates review/verify", async () => {
  const root = await mkdtemp(join(tmpdir(), "pi-orch-"));
  try {
    await ensureWorkspace(root);
    const work = await createWork(root, "add invoice export endpoint");
    assert.equal(work.type, "SMALL");
    assert.equal(work.currentStage, "PLAN");

    await saveArtifact(root, work.id, "plan", "# Plan\nDo it safely.");
    let current = await completeStage(root, work.id);
    assert.equal(current.currentStage, "IMPLEMENT");

    current = await completeStage(root, work.id);
    assert.equal(current.currentStage, "REVIEW");

    await assert.rejects(() => completeStage(root, work.id), /required review artifact is missing/);
    await saveArtifact(root, work.id, "review", "# Review\nPASS", "PASS");
    current = await completeStage(root, work.id);
    assert.equal(current.currentStage, "VERIFY");

    await saveArtifact(root, work.id, "verification", "# Verify\nPASS", "PASS");
    current = await completeStage(root, work.id);
    assert.equal(current.currentStage, "COMPLETE");
    assert.equal(current.status, "COMPLETE");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("large work cannot bypass human approval", async () => {
  const root = await mkdtemp(join(tmpdir(), "pi-orch-"));
  try {
    await ensureWorkspace(root);
    const work = await createWork(root, "implement new module for patient registration end-to-end");
    assert.equal(work.type, "LARGE");

    await saveArtifact(root, work.id, "discovery", "# Discovery");
    let current = await completeStage(root, work.id);
    assert.equal(current.currentStage, "PARTY");

    await saveArtifact(root, work.id, "party", "# Party");
    current = await completeStage(root, work.id);
    assert.equal(current.currentStage, "DESIGN");

    await saveArtifact(root, work.id, "design", "# Design");
    current = await completeStage(root, work.id);
    assert.equal(current.currentStage, "APPROVE");

    await assert.rejects(() => completeStage(root, work.id), /human gate/);

    current = await approve(root, work.id);
    assert.equal(current.currentStage, "DECOMPOSE");

    await setTasks(root, work.id, [
      { id: "BE-001", owner: "backend", description: "Implement backend", dependsOn: [] },
    ]);
    current = await completeStage(root, work.id);
    assert.equal(current.currentStage, "IMPLEMENT");

    await assert.rejects(() => completeStage(root, work.id), /not DONE/);
    await updateTask(root, work.id, "BE-001", "DONE", "implemented");
    current = await completeStage(root, work.id);
    assert.equal(current.currentStage, "REVIEW");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});


test("project memory can be updated before first work item", async () => {
  const root = await mkdtemp(join(tmpdir(), "pi-orch-"));
  try {
    await ensureWorkspace(root);
    const { updateProjectMemory } = await import("../extensions/store.js");
    const target = await updateProjectMemory(
      root,
      "architecture",
      "# Architecture\n\nModular monolith.\n",
    );
    assert.ok(target.endsWith("architecture.md"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
