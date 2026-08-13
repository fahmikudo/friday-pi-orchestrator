import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";

import {
  commandTouchesPiWork,
  isInsidePiWork,
  normalizeToolPath,
  stateQueueTarget,
} from "../extensions/runtime-v200.js";

test("pi-work path guard handles exact and nested paths", () => {
  const root = resolve("/tmp/project");
  assert.equal(isInsidePiWork(root, resolve(root, ".pi-work")), true);
  assert.equal(isInsidePiWork(root, resolve(root, ".pi-work/work/W-001/manifest.json")), true);
  assert.equal(isInsidePiWork(root, resolve(root, "src/main.go")), false);
  assert.equal(isInsidePiWork(root, resolve(root, ".pi-work-old/file")), false);
});

test("tool path normalization strips Pi @ prefix", () => {
  assert.equal(normalizeToolPath("@.pi-work/project.json"), ".pi-work/project.json");
  assert.equal(normalizeToolPath("src/main.go"), "src/main.go");
});

test("bash mutation detector recognizes pi-work references", () => {
  assert.equal(commandTouchesPiWork("rm -rf .pi-work/runtime"), true);
  assert.equal(commandTouchesPiWork("cat .pi-work/project.json"), true);
  assert.equal(commandTouchesPiWork("echo hello"), false);
});

test("state queue target is stable", () => {
  const root = resolve("/tmp/project");
  assert.equal(
    stateQueueTarget(root),
    resolve(root, ".pi-work/runtime/orchestrator-state.lock"),
  );
});
