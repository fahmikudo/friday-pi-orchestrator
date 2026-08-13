#!/usr/bin/env node
import { readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(here, "..");
const packageSource = resolve(process.argv[2] || packageRoot);
const piDir = process.env.PI_CODING_AGENT_DIR || join(process.env.HOME || "", ".pi", "agent");
const globalSkills = join(piDir, "skills");
const settingsPath = join(piDir, "settings.json");

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

const packagedByName = new Map();
for (const file of await walk(join(packageSource, "skills"))) {
  const name = skillName(await readFile(file, "utf8"));
  if (name) packagedByName.set(name, file);
}

const duplicateNames = new Set();
for (const file of await walk(globalSkills)) {
  const name = skillName(await readFile(file, "utf8"));
  if (name && packagedByName.has(name)) duplicateNames.add(name);
}

if (!duplicateNames.size) {
  console.log("No global skill-name conflicts detected.");
  process.exit(0);
}

console.log(`Detected ${duplicateNames.size} global skill name conflict(s).`);
for (const name of [...duplicateNames].sort()) console.log(`  - ${name}`);

if (!existsSync(settingsPath)) {
  console.warn(`WARNING: ${settingsPath} does not exist; cannot configure package skill exclusions.`);
  process.exit(0);
}

let settings;
try {
  settings = JSON.parse(await readFile(settingsPath, "utf8"));
} catch (error) {
  console.warn(`WARNING: Could not parse ${settingsPath} as JSON; leaving settings unchanged.`);
  console.warn("Use `pi config` to disable duplicate Friday packaged skills if Pi reports conflicts.");
  process.exit(0);
}

if (!Array.isArray(settings.packages)) {
  console.warn("WARNING: settings.packages is not an array; leaving settings unchanged.");
  process.exit(0);
}

const normalized = (value) => resolve(String(value));
let found = false;
settings.packages = settings.packages.map((entry) => {
  const source = typeof entry === "string" ? entry : entry?.source;
  if (!source || normalized(source) !== packageSource) return entry;
  found = true;
  const base = typeof entry === "object" && entry !== null ? { ...entry } : { source };
  const exclusions = [...duplicateNames].sort().map((name) => {
    const file = packagedByName.get(name);
    const rel = relative(packageSource, file).split(sep).join("/");
    return `!${rel}`;
  });
  base.skills = ["skills/**/SKILL.md", ...exclusions];
  return base;
});

if (!found) {
  console.warn(`WARNING: Friday package entry ${packageSource} was not found in ${settingsPath}.`);
  process.exit(0);
}

await writeFile(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
console.log("Configured Friday package filters so existing global skill copies remain authoritative.");
console.log("No global skill files were deleted or moved.");
