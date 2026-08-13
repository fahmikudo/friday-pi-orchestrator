import test from "node:test";
import assert from "node:assert/strict";
import { cp, mkdtemp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const packageRoot = new URL("../", import.meta.url);

async function copyPackage() {
  const root = await mkdtemp(join(tmpdir(), "friday-skill-filter-"));
  const target = join(root, "pkg");
  await cp(packageRoot, target, { recursive: true });
  return { root, target };
}

async function addGlobalSkill(piDir, category, name) {
  const dir = join(piDir, "skills", category, name);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "SKILL.md"), `---\nname: ${name}\ndescription: global ${name}\n---\n# ${name}\n`);
}

function runConfigurator(target, piDir) {
  return spawnSync(process.execPath, [join(target, "scripts", "configure-packaged-skills.mjs"), target], {
    env: { ...process.env, PI_CODING_AGENT_DIR: piDir },
    encoding: "utf8",
  });
}

test("manifest excludes packaged skills whose names already exist globally", async () => {
  const { root, target } = await copyPackage();
  const piDir = join(root, "pi");
  await addGlobalSkill(piDir, "methods", "tdd");
  await addGlobalSkill(piDir, "backend", "go-backend");

  const result = runConfigurator(target, piDir);
  assert.equal(result.status, 0, result.stderr);

  const pkg = JSON.parse(await readFile(join(target, "package.json"), "utf8"));
  assert.ok(Array.isArray(pkg.pi.skills));
  assert.ok(!pkg.pi.skills.some((p) => p.endsWith("/methods/tdd")));
  assert.ok(!pkg.pi.skills.some((p) => p.endsWith("/backend/go-backend")));
  assert.ok(pkg.pi.skills.some((p) => p.endsWith("/architecture/domain-driven-design")));
});

test("manifest registers no packaged skills when all names already exist globally", async () => {
  const { root, target } = await copyPackage();
  const piDir = join(root, "pi");
  async function walk(dir) {
    const out = [];
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) out.push(...await walk(path));
      else if (entry.isFile() && entry.name === "SKILL.md") out.push(path);
    }
    return out;
  }
  for (const file of await walk(join(target, "skills"))) {
    const text = await readFile(file, "utf8");
    const name = text.match(/^name:\s*["']?([^"'\n]+)["']?\s*$/m)?.[1]?.trim();
    const parts = file.split("/");
    const category = parts[parts.length - 3];
    if (name) await addGlobalSkill(piDir, category, name);
  }

  const result = runConfigurator(target, piDir);
  assert.equal(result.status, 0, result.stderr);

  const pkg = JSON.parse(await readFile(join(target, "package.json"), "utf8"));
  assert.deepEqual(pkg.pi.skills, []);
});
