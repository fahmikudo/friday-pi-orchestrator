import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  changeRequest,
  completeStage,
  createWork,
  ensureWorkspace,
  listChangeRequests,
  loadManifest,
  loadTasks,
  promoteChangeRequest,
  resolveChangeRequest,
  saveArtifact,
  saveManifest,
  setTasks,
  updateTask,
} from "../extensions/store.js";

async function tempRoot() {
  const root = await mkdtemp(join(tmpdir(), "friday-cr-"));
  await ensureWorkspace(root);
  return root;
}

async function smallAtImplement(root) {
  const work = await createWork(root, "add invoice export endpoint");
  assert.ok(work.route.includes("IMPLEMENT"));
  if (work.currentStage === "PLAN") {
    await saveArtifact(root, work.id, "plan", "# Plan\n\nImplement the endpoint safely.");
    await completeStage(root, work.id);
  }
  return loadManifest(root, work.id);
}

test("task-scoped in-scope CR reopens the task and returns work to IMPLEMENT", async () => {
  const root = await tempRoot();
  try {
    const work = await smallAtImplement(root);
    await setTasks(root, work.id, [{ id: "T-001", owner: "backend", description: "Implement endpoint", status: "DONE" }]);

    const updated = await changeRequest(root, work.id, "Handle an additional validation edge case", {
      originTaskId: "T-001",
      impact: "IMPLEMENTATION",
      scopeClassification: "IN_SCOPE",
    });

    assert.equal(updated.currentStage, "IMPLEMENT");
    assert.equal(updated.changeRequests.length, 1);
    assert.equal(updated.changeRequests[0].status, "IN_PROGRESS");
    assert.equal(updated.changeRequests[0].scopeClassification, "IN_SCOPE");
    assert.equal(updated.changeRequests[0].originTaskId, "T-001");
    const tasks = await loadTasks(root, work.id);
    assert.equal(tasks.tasks[0].status, "IN_PROGRESS");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("successful VERIFY automatically resolves open in-scope CR as IMPLEMENTED", async () => {
  const root = await tempRoot();
  try {
    const work = await smallAtImplement(root);
    await setTasks(root, work.id, [{ id: "T-001", owner: "backend", description: "Implement endpoint", status: "DONE" }]);
    await changeRequest(root, work.id, "Handle an additional validation edge case", {
      originTaskId: "T-001",
      impact: "IMPLEMENTATION",
      scopeClassification: "IN_SCOPE",
    });
    await updateTask(root, work.id, "T-001", "DONE", "CR implemented");
    await completeStage(root, work.id);
    await saveArtifact(root, work.id, "review", "# Review\n\nPASS", "PASS");
    await completeStage(root, work.id);
    await saveArtifact(root, work.id, "verification", "# Verification\n\nPASS WITH WARNINGS", "PASS_WITH_WARNINGS");
    const completed = await completeStage(root, work.id);

    assert.equal(completed.status, "COMPLETE");
    assert.equal(completed.changeRequests[0].status, "COMPLETE");
    assert.equal(completed.changeRequests[0].resolution, "IMPLEMENTED");
    assert.ok(completed.changeRequests[0].completedAt);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("out-of-scope CR can be recorded on completed work without reopening it", async () => {
  const root = await tempRoot();
  try {
    const work = await smallAtImplement(root);
    await setTasks(root, work.id, [{ id: "T-001", owner: "backend", description: "Implement endpoint", status: "DONE" }]);
    await completeStage(root, work.id);
    await saveArtifact(root, work.id, "review", "# Review\n\nPASS", "PASS");
    await completeStage(root, work.id);
    await saveArtifact(root, work.id, "verification", "# Verification\n\nPASS", "PASS");
    const completed = await completeStage(root, work.id);
    assert.equal(completed.status, "COMPLETE");

    const sameWork = await changeRequest(root, work.id, "Root / redirects to /login", { scopeClassification: "OUT_OF_SCOPE" });
    assert.equal(sameWork.status, "COMPLETE");
    assert.equal(sameWork.currentStage, "COMPLETE");
    assert.equal(sameWork.changeRequests[0].status, "OPEN");
    assert.equal(sameWork.changeRequests[0].scopeClassification, "OUT_OF_SCOPE");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("legacy recorded CR is discovered and promoted into a linked new work item", async () => {
  const root = await tempRoot();
  try {
    const origin = await createWork(root, "fix scoped role administration");
    origin.status = "COMPLETE";
    origin.currentStage = "COMPLETE";
    origin.stages.COMPLETE = { status: "DONE", updatedAt: new Date().toISOString() };
    origin.changeRequests = [];
    await saveManifest(root, origin);
    await writeFile(
      join(root, ".pi-work", "work", origin.id, "artifacts", "change-request-001.md"),
      "# Change Request 1\n\nRoot / redirects to /login\n\nNote: Out of scope for completed work; should be handled as a separate work item.\n",
      "utf8",
    );

    const discovered = await listChangeRequests(root, origin.id);
    assert.equal(discovered.length, 1);
    assert.equal(discovered[0].id, "CR-001");
    assert.equal(discovered[0].scopeClassification, "OUT_OF_SCOPE");
    assert.equal(discovered[0].status, "OPEN");

    const promoted = await promoteChangeRequest(root, origin.id, "CR-001");
    assert.notEqual(promoted.work.id, origin.id);
    assert.equal(promoted.work.source.type, "change_request");
    assert.equal(promoted.work.source.originWorkId, origin.id);
    assert.equal(promoted.work.source.changeRequestId, "CR-001");

    const refreshedOrigin = await loadManifest(root, origin.id);
    const cr = refreshedOrigin.changeRequests[0];
    assert.equal(refreshedOrigin.status, "COMPLETE");
    assert.equal(cr.status, "COMPLETE");
    assert.equal(cr.resolution, "PROMOTED_TO_WORK");
    assert.equal(cr.resultWorkId, promoted.work.id);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("manual non-implementation CR resolution closes the CR without creating work", async () => {
  const root = await tempRoot();
  try {
    const work = await createWork(root, "fix scoped role administration");
    const updated = await changeRequest(root, work.id, "Follow-up UI tweak", { scopeClassification: "OUT_OF_SCOPE" });
    const crId = updated.changeRequests[0].id;
    const resolved = await resolveChangeRequest(root, work.id, crId, "DUPLICATE", "Already tracked elsewhere");
    assert.equal(resolved.changeRequest.status, "COMPLETE");
    assert.equal(resolved.changeRequest.resolution, "DUPLICATE");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("/work primitive cannot accidentally recreate an existing work ID as a new request", async () => {
  const root = await tempRoot();
  try {
    const work = await createWork(root, "implement scoped role administration");
    await assert.rejects(() => createWork(root, work.id), /already exists.*work-resume/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
