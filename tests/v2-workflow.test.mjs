import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { resolveModelProfile, resolveSkills, shouldAutoContinue, triage } from "../extensions/core-v200.js";
import {
  approve,
  cancelWork,
  changeRequest,
  completeStage,
  createWork,
  ensureWorkspace,
  failStage,
  loadManifest,
  loadProject,
  loadTasks,
  reject,
  reopenVerification,
  requestRework,
  saveArtifact,
  setTasks,
  updateRepositoryProfile,
  updateTask,
} from "../extensions/store-v200.js";
import { linkBacklogWork, loadBacklog, saveBacklog } from "../extensions/backlog-v200.js";

async function tempRoot() {
  const root = await mkdtemp(join(tmpdir(), "friday-v2-"));
  await ensureWorkspace(root);
  return root;
}

async function advanceLargeToApprove(root, work) {
  await saveArtifact(root, work.id, "discovery", "# Discovery\n");
  await completeStage(root, work.id);
  await saveArtifact(root, work.id, "party", "# Party\n");
  await completeStage(root, work.id);
  await saveArtifact(root, work.id, "design", "# Design v1\n");
  return completeStage(root, work.id);
}

test("high-consequence security change is not triaged as SMALL/BUGFIX", () => {
  const result = triage("fix authorization facility access on patient endpoint");
  assert.ok(["MEDIUM", "LARGE"].includes(result.type));
  assert.ok(result.risks.includes("security"));
});

test("skill resolver combines stage, risk and repository technology", () => {
  const manifest = {
    type: "LARGE",
    currentStage: "IMPLEMENT",
    domains: ["backend", "database", "security"],
    risks: ["security", "data_change"],
  };
  const skills = resolveSkills(manifest, {
    languages: ["Go", "TypeScript"],
    frameworks: ["NestJS"],
    databases: ["PostgreSQL"],
  });
  for (const expected of ["tdd", "go-backend", "typescript-backend", "nestjs-backend", "safe-database-migration", "authorization-design", "postgresql"]) {
    assert.ok(skills.includes(expected), `missing ${expected}`);
  }
  assert.equal(resolveModelProfile({ ...manifest, currentStage: "DESIGN" }), "high-reasoning");
});

test("safe-stage auto continuation stops at approval and terminal state", () => {
  const project = { workflowPolicy: { autoContinueSafeStages: true } };
  assert.equal(shouldAutoContinue({ status: "IN_PROGRESS", currentStage: "DESIGN" }, project), true);
  assert.equal(shouldAutoContinue({ status: "WAITING_APPROVAL", currentStage: "APPROVE" }, project), false);
  assert.equal(shouldAutoContinue({ status: "COMPLETE", currentStage: "COMPLETE" }, project), false);
});

test("workspace upgrade preserves old project fields while adding v2 defaults", async () => {
  const root = await tempRoot();
  try {
    const project = await loadProject(root);
    assert.equal(project.workflowPolicy.autoContinueSafeStages, true);
    assert.equal(project.modelProfiles.implementation, "inherit");
    assert.deepEqual(project.repositoryProfile.languages, []);
    await updateRepositoryProfile(root, { languages: ["Go"], frameworks: ["Echo"] });
    const updated = await loadProject(root);
    assert.deepEqual(updated.repositoryProfile.languages, ["Go"]);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("human rejection preserves old design as artifact history after revision", async () => {
  const root = await tempRoot();
  try {
    const work = await createWork(root, "implement new module for patient registration end-to-end");
    let current = await advanceLargeToApprove(root, work);
    assert.equal(current.currentStage, "APPROVE");
    current = await reject(root, work.id, "Keep specialties in clinical foundation");
    assert.equal(current.currentStage, "DESIGN");
    assert.ok(current.staleArtifacts.includes("design"));
    await saveArtifact(root, work.id, "design", "# Design v2\n");
    current = await loadManifest(root, work.id);
    assert.equal(current.artifactHistory.design.length, 1);
    assert.ok(current.artifactHistory.design[0].path.includes("design-r001.md"));
    assert.ok(!current.staleArtifacts.includes("design"));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("REVIEW failure automatically returns work to IMPLEMENT for correction", async () => {
  const root = await tempRoot();
  try {
    const work = await createWork(root, "add invoice export endpoint");
    await saveArtifact(root, work.id, "plan", "# Plan\n");
    await completeStage(root, work.id);
    await completeStage(root, work.id);
    await saveArtifact(root, work.id, "review", "# Review\nCritical defect\n", "FAIL");
    const failed = await failStage(root, work.id, "Authorization bypass");
    assert.equal(failed.currentStage, "IMPLEMENT");
    assert.equal(failed.status, "IN_PROGRESS");
    assert.equal(failed.reviewVerdict, "FAIL");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("VERIFY failure remains blocked until explicit reverify or rework", async () => {
  const root = await tempRoot();
  try {
    const work = await createWork(root, "add invoice export endpoint");
    await saveArtifact(root, work.id, "plan", "# Plan\n");
    await completeStage(root, work.id);
    await completeStage(root, work.id);
    await saveArtifact(root, work.id, "review", "# Review\nPASS\n", "PASS");
    await completeStage(root, work.id);
    await saveArtifact(root, work.id, "verification", "# Verify\nFAIL\n", "FAIL");
    const failed = await failStage(root, work.id, "Integration assertion failed");
    assert.equal(failed.status, "BLOCKED");
    assert.equal(failed.currentStage, "VERIFY");
    const reopened = await reopenVerification(root, work.id, "retry environment");
    assert.equal(reopened.status, "IN_PROGRESS");
    assert.equal(reopened.currentStage, "VERIFY");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("explicit rework from VERIFY resets review and verification evidence", async () => {
  const root = await tempRoot();
  try {
    const work = await createWork(root, "add invoice export endpoint");
    await saveArtifact(root, work.id, "plan", "# Plan\n");
    await completeStage(root, work.id);
    await completeStage(root, work.id);
    await saveArtifact(root, work.id, "review", "# Review\nPASS\n", "PASS");
    await completeStage(root, work.id);
    const current = await requestRework(root, work.id, "QA found implementation defect");
    assert.equal(current.currentStage, "IMPLEMENT");
    assert.equal(current.reviewVerdict, "PENDING");
    assert.equal(current.verificationVerdict, "PENDING");
    assert.ok(current.staleArtifacts.includes("review"));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("mid-work requirement change returns LARGE work to DESIGN and invalidates tasks", async () => {
  const root = await tempRoot();
  try {
    const work = await createWork(root, "implement new module for patient registration end-to-end");
    await advanceLargeToApprove(root, work);
    await approve(root, work.id);
    await setTasks(root, work.id, [{ id: "T-1", owner: "backend", description: "Old design task" }]);
    await completeStage(root, work.id);
    const changed = await changeRequest(root, work.id, "Add specialty category hierarchy");
    assert.equal(changed.currentStage, "DESIGN");
    assert.equal(changed.approval.status, "PENDING");
    assert.equal(changed.changeRequests.length, 1);
    assert.equal((await loadTasks(root, work.id)).tasks.length, 0);
    assert.ok(changed.staleArtifacts.includes("design"));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("cancelled linked work cancels backlog item and preserves work audit state", async () => {
  const root = await tempRoot();
  try {
    await saveBacklog(root, {
      id: "sprint-x", title: "Sprint X", workItems: [{ id: "S-1", title: "One", dependsOn: [] }],
    });
    const work = await createWork(root, "add invoice export endpoint", { source: { type: "backlog", backlogId: "sprint-x", itemId: "S-1" } });
    await linkBacklogWork(root, "sprint-x", "S-1", work.id);
    const cancelled = await cancelWork(root, work.id, "Scope removed");
    assert.equal(cancelled.status, "CANCELLED");
    const backlog = await loadBacklog(root, "sprint-x");
    assert.equal(backlog.workItems[0].status, "CANCELLED");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("required stage artifact prevents evidence-free completion", async () => {
  const root = await tempRoot();
  try {
    const work = await createWork(root, "implement new module for patient registration end-to-end");
    await assert.rejects(() => completeStage(root, work.id), /required discovery artifact is missing/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
