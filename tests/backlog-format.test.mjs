import test from "node:test";
import assert from "node:assert/strict";

import {
  formatBacklog,
  formatBacklogList,
} from "../extensions/backlog-format.js";

const backlog = {
  id: "sprint-2",
  title: "Sprint 2",
  status: "IN_PROGRESS",
  sourceDocuments: ["docs/sprints/sprint-2-prd.md"],
  workItems: [
    {
      id: "S2-01",
      title: "Foundation",
      status: "DONE",
      dependsOn: [],
      recommendedOrder: 1,
      workId: "W-001",
    },
    {
      id: "S2-02",
      title: "Specialties",
      status: "READY",
      dependsOn: ["S2-01"],
      recommendedOrder: 2,
    },
  ],
};

test("backlog formatter is exported and callable", () => {
  assert.equal(typeof formatBacklog, "function");
  const output = formatBacklog(backlog);
  assert.match(output, /sprint-2 — Sprint 2/);
  assert.match(output, /S2-01 \[DONE\]/);
  assert.match(output, /S2-02 \[READY\]/);
});

test("backlog-list formatter is exported and callable", () => {
  assert.equal(typeof formatBacklogList, "function");
  const output = formatBacklogList([
    { id: "sprint-2", status: "IN_PROGRESS", title: "Sprint 2" },
  ]);
  assert.match(output, /sprint-2/);
  assert.match(output, /Sprint 2/);
});

test("empty backlog list is safe", () => {
  assert.equal(formatBacklogList([]), "No backlogs.");
});
