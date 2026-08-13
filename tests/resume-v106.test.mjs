import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const indexUrl = new URL("../extensions/index.ts", import.meta.url);

function section(text, startToken, endToken) {
  const start = text.indexOf(startToken);
  const end = text.indexOf(endToken, start);
  assert.ok(start >= 0 && end > start);
  return text.slice(start, end);
}

test("work-resume takes the state mutation queue exactly once", async () => {
  const text = await readFile(indexUrl, "utf8");
  const handler = section(
    text,
    'pi.registerCommand("work-resume"',
    'pi.registerCommand("work-verify"',
  );
  const count = (handler.match(/withStateMutation\(/g) ?? []).length;
  assert.equal(count, 1, "work-resume must not re-enter the same mutation queue");
});

test("command continuations do not wait indefinitely for idle", async () => {
  const text = await readFile(indexUrl, "utf8");
  assert.doesNotMatch(text, /waitForIdle\(\)/);
  assert.match(text, /ctx\.isIdle\(\)/);
  assert.match(text, /deliverAs:\s*"followUp"/);
});

test("work-resume uses idle-aware dispatch helper", async () => {
  const text = await readFile(indexUrl, "utf8");
  const handler = section(
    text,
    'pi.registerCommand("work-resume"',
    'pi.registerCommand("work-verify"',
  );
  assert.match(handler, /dispatchUserMessage\(/);
  assert.match(handler, /buildContextPacket\(root, id\)/);
});

test("Pi built-in resume remains unshadowed", async () => {
  const text = await readFile(indexUrl, "utf8");
  assert.doesNotMatch(text, /registerCommand\("resume"/);
  assert.match(text, /registerCommand\("work-resume"/);
});
