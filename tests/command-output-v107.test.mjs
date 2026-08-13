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

test("status renders durable transcript output", async () => {
  const text = await readFile(indexUrl, "utf8");
  const handlerStart = text.indexOf("const workStatusHandler");
  const statusStart = text.indexOf('pi.registerCommand("status"');
  assert.ok(handlerStart >= 0 && statusStart > handlerStart);
  const part = text.slice(handlerStart, statusStart);
  assert.match(part, /appendCommandOutput\(pi,\s*"Work Status"/);
  assert.doesNotMatch(part, /ctx\.ui\.notify\(formatStatus/);
  assert.match(text, /registerCommand\("work-status"/);
});

test("tasks and work-list render durable transcript output", async () => {
  const text = await readFile(indexUrl, "utf8");
  const wl = section(text, 'pi.registerCommand("work-list"', 'pi.registerCommand("tasks"');
  const tasks = section(text, 'pi.registerCommand("tasks"', 'pi.registerCommand("work-resume"');
  assert.match(wl, /appendCommandOutput\(pi,\s*"Work Items"/);
  assert.match(tasks, /appendCommandOutput\(pi,\s*"Work Tasks"/);
});

test("backlog and backlog-list render durable transcript output", async () => {
  const text = await readFile(indexUrl, "utf8");
  assert.match(text, /appendCommandOutput\(pi,\s*"Sprint Backlogs"/);
  assert.match(text, /appendCommandOutput\(pi,\s*"Sprint Backlog"/);
  assert.match(text, /appendCommandOutput\(\s*pi,\s*"Backlog Reconciliation"/);
});

test("doctor and memory render durable transcript output", async () => {
  const text = await readFile(indexUrl, "utf8");
  assert.match(text, /appendCommandOutput\(pi,\s*"Orchestrator Doctor"/);
  assert.match(text, /appendCommandOutput\(pi,\s*"Project Memory"/);
});

test("orchestrator registers custom entry renderer", async () => {
  const text = await readFile(indexUrl, "utf8");
  assert.match(text, /registerEntryRenderer\("engineering-orchestrator-output"/);
  assert.match(text, /appendEntry\("engineering-orchestrator-output"/);
});
