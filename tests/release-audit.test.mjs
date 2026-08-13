import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("../", import.meta.url);
const extensionDir = new URL("../extensions/", import.meta.url);

test("index only imports versioned v200 local helper modules", async () => {
  const index = await readFile(new URL("../extensions/index.ts", import.meta.url), "utf8");
  const localImports = [...index.matchAll(/from\s+"(\.\/[^"]+)"/g)].map((m) => m[1]);
  assert.ok(localImports.length >= 5);
  for (const specifier of localImports) {
    assert.match(specifier, /-v200\.js$/);
  }
});

test("extension does not register built-in /resume command", async () => {
  const index = await readFile(new URL("../extensions/index.ts", import.meta.url), "utf8");
  assert.doesNotMatch(index, /registerCommand\("resume"/);
  assert.match(index, /registerCommand\("work-resume"/);
});

test("release uses Pi mutation queue and Google-compatible StringEnum", async () => {
  const index = await readFile(new URL("../extensions/index.ts", import.meta.url), "utf8");
  assert.match(index, /withFileMutationQueue/);
  assert.match(index, /StringEnum/);
  assert.match(index, /withStateMutation/);
});

test("release guards direct agent mutation of .pi-work", async () => {
  const index = await readFile(new URL("../extensions/index.ts", import.meta.url), "utf8");
  assert.match(index, /pi\.on\("tool_call"/);
  assert.match(index, /Direct write\/edit to \.pi-work is blocked/);
});

test("all runtime helper modules declare matching release version", async () => {
  const files = (await readdir(extensionDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith("-v200.js"))
    .map((entry) => entry.name);

  assert.ok(files.length >= 6);

  for (const file of files) {
    const text = await readFile(new URL(`../extensions/${file}`, import.meta.url), "utf8");
    assert.match(text, /MODULE_VERSION = "2\.0\.0"/);
  }
});
