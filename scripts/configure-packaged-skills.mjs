#!/usr/bin/env node
import { readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const defaultRoot = resolve(here, "..");
const packageRoot = resolve(process.argv[2] || defaultRoot);
const piDir = process.env.PI_CODING_AGENT_DIR || join(process.env.HOME || "", ".pi", "agent");
const globalSkills = join(piDir, "skills");
const packageJsonPath = join(packageRoot, "package.json");

async function walk(dir) {
  if (!existsSync(dir)) return [];
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) result.push(...await walk(path));
    else if (entry.isFile() && entry.name === "SKILL.md") result.push(path);
  }
  return result;
}

function skillName(text) {
  const match = text.match(/^name:\s*["']?([^"'\n]+)["']?\s*$/m);
  return match?.[1]?.trim();
}

const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
const packaged = [];
for (const file of await walk(join(packageRoot, "skills"))) {
  const name = skillName(await readFile(file, "utf8"));
  if (!name) continue;
  packaged.push({ name, file, dir: dirname(file) });
}

const globalNames = new Set();
for (const file of await walk(globalSkills)) {
  const name = skillName(await readFile(file, "utf8"));
  if (name) globalNames.add(name);
}

const selected = packaged.filter((skill) => !globalNames.has(skill.name));
const duplicates = packaged.filter((skill) => globalNames.has(skill.name));

packageJson.pi ??= {};
packageJson.pi.skills = selected
  .map(({ dir }) => `./${relative(packageRoot, dir).split(sep).join("/")}`)
  .sort();

await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");

console.log(`Friday packaged skills: ${packaged.length}`);
console.log(`Using existing global skills: ${duplicates.length}`);
console.log(`Registering Friday packaged skills: ${selected.length}`);
if (duplicates.length) {
  console.log("Global copies remain authoritative for these duplicate names; no global files were modified.");
}
