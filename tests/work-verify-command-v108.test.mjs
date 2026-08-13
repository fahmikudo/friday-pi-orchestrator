import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const indexUrl = new URL("../extensions/index.ts", import.meta.url);

test("work-verify is orchestrator-aware and requires durable persistence", async () => {
  const text = await readFile(indexUrl, "utf8");
  assert.match(text, /registerCommand\("work-verify"/);
  assert.match(text, /reopenVerification\(/);
  assert.match(text, /kind=verification/);
  assert.match(text, /PASS_WITH_WARNINGS/);
  assert.match(text, /action=complete_stage/);
  assert.match(text, /action=fail_stage/);
  assert.match(text, /Do not stop after printing a verdict to chat/);
});
