import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  ensureBacklogStore,
  getActiveBacklogId,
  linkBacklogWork,
  loadBacklog,
  resolveStartableItem,
  saveBacklog,
  saveBacklogClosure,
} from "../extensions/backlog-v200.js";

import {
  completeStage,
  createWork,
  ensureWorkspace,
  saveArtifact,
} from "../extensions/store-v200.js";

async function withProject(fn) {
  const root = await mkdtemp(join(tmpdir(), "pi-orch-backlog-"));
  try {
    await ensureWorkspace(root);
    return await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const sample = {
  id: "sprint-2",
  title: "Sprint 2",
  objective: "Deliver sprint scope",
  sourceDocuments: ["docs/sprints/sprint-2-prd.md"],
  workItems: [
    {
      id: "S2-01",
      title: "Foundation",
      objective: "Build foundation",
      domains: ["backend", "database"],
      dependsOn: [],
      acceptanceCriteria: ["Foundation exists"],
      recommendedOrder: 1,
    },
    {
      id: "S2-02",
      title: "Specialties",
      objective: "Build specialties",
      domains: ["backend", "database"],
      dependsOn: ["S2-01"],
      acceptanceCriteria: ["Specialties available"],
      recommendedOrder: 2,
    },
  ],
};

test("workspace without PRD still supports direct /work primitive", async () => {
  await withProject(async (root) => {
    await ensureBacklogStore(root);
    assert.equal(await getActiveBacklogId(root), undefined);
    const work = await createWork(root, "fix login endpoint returning 500");
    assert.equal(work.source, undefined);
    assert.equal(work.type, "BUGFIX");
    assert.equal(work.currentStage, "IMPLEMENT");
  });
});

test("saving backlog derives READY and BLOCKED from dependencies", async () => {
  await withProject(async (root) => {
    const backlog = await saveBacklog(root, sample);
    assert.equal(backlog.status, "PLANNED");
    assert.equal(backlog.workItems.find((i) => i.id === "S2-01").status, "READY");
    assert.equal(backlog.workItems.find((i) => i.id === "S2-02").status, "BLOCKED");
    assert.equal(await getActiveBacklogId(root), "sprint-2");
  });
});

test("backlog item links to normal work and completion unlocks dependency", async () => {
  await withProject(async (root) => {
    await saveBacklog(root, sample);
    const { backlog, item } = await resolveStartableItem(root, "S2-01");
    assert.equal(item.status, "READY");

    const work = await createWork(root, "add foundation endpoint", {
      title: `${item.id} ${item.title}`,
      source: {
        type: "backlog",
        backlogId: backlog.id,
        itemId: item.id,
        sourceDocuments: backlog.sourceDocuments,
      },
    });
    await linkBacklogWork(root, backlog.id, item.id, work.id);

    let afterLink = await loadBacklog(root, "sprint-2");
    assert.equal(afterLink.workItems.find((i) => i.id === "S2-01").status, "IN_PROGRESS");
    assert.equal(afterLink.workItems.find((i) => i.id === "S2-01").workId, work.id);

    // SMALL: PLAN -> IMPLEMENT -> REVIEW -> VERIFY -> COMPLETE
    await saveArtifact(root, work.id, "plan", "# Plan\n");
    let current = await completeStage(root, work.id);
    assert.equal(current.currentStage, "IMPLEMENT");
    current = await completeStage(root, work.id);
    assert.equal(current.currentStage, "REVIEW");
    await saveArtifact(root, work.id, "review", "# Review\nPASS\n", "PASS");
    current = await completeStage(root, work.id);
    assert.equal(current.currentStage, "VERIFY");
    await saveArtifact(root, work.id, "verification", "# Verify\nPASS\n", "PASS");
    current = await completeStage(root, work.id);
    assert.equal(current.currentStage, "COMPLETE");

    const finished = await loadBacklog(root, "sprint-2");
    assert.equal(finished.workItems.find((i) => i.id === "S2-01").status, "DONE");
    assert.equal(finished.workItems.find((i) => i.id === "S2-02").status, "READY");
  });
});

test("cannot start blocked backlog item", async () => {
  await withProject(async (root) => {
    await saveBacklog(root, sample);
    await assert.rejects(() => resolveStartableItem(root, "S2-02"), /BLOCKED/);
  });
});

test("closure requires all non-cancelled work items complete", async () => {
  await withProject(async (root) => {
    await saveBacklog(root, sample);
    await assert.rejects(
      () => saveBacklogClosure(root, "sprint-2", "# Closure\n", "PASS"),
      /not DONE\/CANCELLED/,
    );
  });
});

test("dependency cycles are rejected", async () => {
  await withProject(async (root) => {
    await assert.rejects(() => saveBacklog(root, {
      id: "bad",
      title: "Bad",
      workItems: [
        { id: "A", title: "A", dependsOn: ["B"] },
        { id: "B", title: "B", dependsOn: ["A"] },
      ],
    }), /cycle/);
  });
});

test("re-planning preserves linked completed lifecycle state", async () => {
  await withProject(async (root) => {
    let backlog = await saveBacklog(root, sample);
    const first = backlog.workItems.find((i) => i.id === "S2-01");
    const work = await createWork(root, "add foundation endpoint", {
      source: { type: "backlog", backlogId: backlog.id, itemId: first.id },
    });
    await linkBacklogWork(root, backlog.id, first.id, work.id);

    // Simulate already completed linked item through backlog lifecycle sync path.
    await saveArtifact(root, work.id, "plan", "# Plan\n");
    await completeStage(root, work.id);
    await completeStage(root, work.id);
    await saveArtifact(root, work.id, "review", "# Review\n", "PASS");
    await completeStage(root, work.id);
    await saveArtifact(root, work.id, "verification", "# Verify\n", "PASS");
    await completeStage(root, work.id);

    backlog = await saveBacklog(root, {
      ...sample,
      objective: "Updated sprint objective",
      workItems: sample.workItems.map((i) => ({ ...i, status: "PLANNED", workId: null })),
    });

    const preserved = backlog.workItems.find((i) => i.id === "S2-01");
    assert.equal(preserved.status, "DONE");
    assert.equal(preserved.workId, work.id);
  });
});

test("old workspace upgrades by adding optional backlog store without changing old project state", async () => {
  const { mkdir, writeFile, readFile } = await import("node:fs/promises");
  const root = await mkdtemp(join(tmpdir(), "pi-orch-old-"));
  try {
    await mkdir(join(root, ".pi-work", "memory", "decisions"), { recursive: true });
    await mkdir(join(root, ".pi-work", "work"), { recursive: true });
    await writeFile(join(root, ".pi-work", "project.json"), JSON.stringify({
      schemaVersion: 1,
      name: "old-project",
      root,
      activeWorkId: "W-OLD-001",
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
    }, null, 2));
    await writeFile(join(root, ".pi-work", "memory", "index.json"), JSON.stringify({ schemaVersion: 1, entries: [] }));

    await ensureWorkspace(root);
    const project = JSON.parse(await readFile(join(root, ".pi-work", "project.json"), "utf8"));
    assert.equal(project.activeWorkId, "W-OLD-001");
    const index = JSON.parse(await readFile(join(root, ".pi-work", "backlogs", "index.json"), "utf8"));
    assert.equal(index.activeBacklogId, null);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("manual block persists until explicitly released", async () => {
  const { updateBacklogItem } = await import("../extensions/backlog-v200.js");
  await withProject(async (root) => {
    await saveBacklog(root, sample);
    let backlog = await updateBacklogItem(root, "S2-01", "BLOCKED", "waiting for decision");
    assert.equal(backlog.workItems.find((i) => i.id === "S2-01").status, "BLOCKED");
    assert.match(backlog.workItems.find((i) => i.id === "S2-01").blockReason, /decision/);
    backlog = await updateBacklogItem(root, "S2-01", "READY", "decision resolved");
    assert.equal(backlog.workItems.find((i) => i.id === "S2-01").status, "READY");
  });
});
