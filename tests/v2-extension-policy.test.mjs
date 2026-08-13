import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const indexUrl = new URL("../extensions/index.ts", import.meta.url);

test("v2 auto-continues safe stages but still stops at APPROVE/COMPLETE", async () => {
  const text = await readFile(indexUrl, "utf8");
  assert.match(text, /shouldAutoContinue\(updated, routing\.project\)/);
  assert.match(text, /continuationKickoff\(updated\.id\)/);
});

test("v2 blocks product mutation outside IMPLEMENT", async () => {
  const text = await readFile(indexUrl, "utf8");
  assert.match(text, /activeManifest\.currentStage === "IMPLEMENT"/);
  assert.match(text, /Product write\/edit is blocked while/);
  assert.match(text, /Mutating shell commands are blocked while/);
});

test("v2 exposes recovery and change-control commands", async () => {
  const text = await readFile(indexUrl, "utf8");
  for (const command of ["rework", "change-request", "cancel-work", "skill-routing", "orchestrator-settings", "work-status"]) {
    assert.match(text, new RegExp(`registerCommand\\("${command}"`));
  }
});

test("v2 bundles deterministic skill and model routing", async () => {
  const text = await readFile(indexUrl, "utf8");
  assert.match(text, /resolveSkills/);
  assert.match(text, /resolveModelProfile/);
  assert.match(text, /Model profile:/);
});
