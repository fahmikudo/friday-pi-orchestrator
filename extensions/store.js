export const MODULE_VERSION = "2.0.1";
import {
  access,
  appendFile,
  mkdir,
  readFile,
  readdir,
  rename,
  stat,
  writeFile,
} from "node:fs/promises";
import { basename, dirname, join, parse, resolve } from "node:path";
import { DEFAULT_MODEL_PROFILES, DEFAULT_WORKFLOW_POLICY, slugify, triage } from "./core.js";
import { ensureBacklogStore, syncBacklogWorkCancellation, syncBacklogWorkCompletion, syncBacklogWorkCompletionByWorkId } from "./backlog.js";

const WORKSPACE = ".pi-work";
const SCHEMA_VERSION = 1;

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function atomicJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(tmp, path);
}

async function readJson(path, fallback = undefined) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT" && fallback !== undefined) return fallback;
    throw error;
  }
}

export async function findWorkspaceRoot(cwd) {
  let current = resolve(cwd);
  while (true) {
    if (await exists(join(current, WORKSPACE))) return current;
    const parent = dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

export function paths(root) {
  const base = join(root, WORKSPACE);
  return {
    root,
    base,
    project: join(base, "project.json"),
    memory: join(base, "memory"),
    memoryIndex: join(base, "memory", "index.json"),
    decisions: join(base, "memory", "decisions"),
    work: join(base, "work"),
    runtime: join(base, "runtime"),
    context: join(base, "runtime", "context"),
    locks: join(base, "runtime", "locks"),
  };
}

export async function ensureWorkspace(cwd) {
  const root = resolve(cwd);
  const p = paths(root);
  await mkdir(p.memory, { recursive: true });
  await mkdir(p.decisions, { recursive: true });
  await mkdir(p.work, { recursive: true });
  await ensureBacklogStore(root);
  await mkdir(p.context, { recursive: true });
  await mkdir(p.locks, { recursive: true });

  if (!(await exists(p.project))) {
    await atomicJson(p.project, {
      schemaVersion: SCHEMA_VERSION,
      name: basename(root),
      root,
      activeWorkId: null,
      workflowPolicy: { ...DEFAULT_WORKFLOW_POLICY },
      modelProfiles: { ...DEFAULT_MODEL_PROFILES },
      repositoryProfile: {
        languages: [],
        frameworks: [],
        databases: [],
        infrastructure: [],
        packageManagers: [],
        testCommands: [],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } else {
    const project = await readJson(p.project);
    let changed = false;
    if (!project.workflowPolicy) {
      project.workflowPolicy = { ...DEFAULT_WORKFLOW_POLICY };
      changed = true;
    } else {
      for (const [key, value] of Object.entries(DEFAULT_WORKFLOW_POLICY)) {
        if (project.workflowPolicy[key] === undefined) {
          project.workflowPolicy[key] = value;
          changed = true;
        }
      }
    }
    if (!project.modelProfiles) {
      project.modelProfiles = { ...DEFAULT_MODEL_PROFILES };
      changed = true;
    } else {
      for (const [key, value] of Object.entries(DEFAULT_MODEL_PROFILES)) {
        if (project.modelProfiles[key] === undefined) {
          project.modelProfiles[key] = value;
          changed = true;
        }
      }
    }
    if (!project.repositoryProfile) {
      project.repositoryProfile = {
        languages: [], frameworks: [], databases: [], infrastructure: [], packageManagers: [], testCommands: [],
      };
      changed = true;
    }
    if (changed) await atomicJson(p.project, project);
  }
  if (!(await exists(p.memoryIndex))) {
    await atomicJson(p.memoryIndex, { schemaVersion: SCHEMA_VERSION, entries: [] });
  }

  const memoryTemplates = {
    "architecture.md": "# Project Architecture\n\n<!-- Curated durable architecture knowledge. -->\n",
    "conventions.md": "# Project Conventions\n\n<!-- Curated coding and repository conventions. -->\n",
    "domain-map.md": "# Domain Map\n\n<!-- Modules/domains and ownership. -->\n",
    "database.md": "# Database\n\n<!-- Database engine, schema ownership, migration conventions. -->\n",
    "testing.md": "# Testing & Verification\n\n<!-- Test strategy and repository verification commands. -->\n",
  };
  for (const [name, content] of Object.entries(memoryTemplates)) {
    const target = join(p.memory, name);
    if (!(await exists(target))) await writeFile(target, content, "utf8");
  }

  const ignore = join(p.base, ".gitignore");
  if (!(await exists(ignore))) {
    await writeFile(ignore, "runtime/\n", "utf8");
  }

  const readme = join(p.base, "README.md");
  if (!(await exists(readme))) {
    await writeFile(
      readme,
      "# .pi-work\n\nDurable engineering workflow state and curated project memory.\n\n`runtime/` is ephemeral and ignored. `memory/` and `work/` may be version-controlled if desired.\n",
      "utf8",
    );
  }
  return p;
}

export async function loadProject(root) {
  return readJson(paths(root).project);
}

export async function saveProject(root, project) {
  project.updatedAt = new Date().toISOString();
  await atomicJson(paths(root).project, project);
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((entry) => String(entry).trim()).filter(Boolean))];
}

export async function updateRepositoryProfile(root, profile = {}) {
  const project = await loadProject(root);
  project.repositoryProfile = {
    ...(project.repositoryProfile ?? {}),
    languages: normalizeStringArray(profile.languages ?? project.repositoryProfile?.languages),
    frameworks: normalizeStringArray(profile.frameworks ?? project.repositoryProfile?.frameworks),
    databases: normalizeStringArray(profile.databases ?? project.repositoryProfile?.databases),
    infrastructure: normalizeStringArray(profile.infrastructure ?? project.repositoryProfile?.infrastructure),
    packageManagers: normalizeStringArray(profile.packageManagers ?? project.repositoryProfile?.packageManagers),
    testCommands: normalizeStringArray(profile.testCommands ?? project.repositoryProfile?.testCommands),
  };
  await saveProject(root, project);
  return project.repositoryProfile;
}

export async function updateWorkflowPolicy(root, patch = {}) {
  const project = await loadProject(root);
  project.workflowPolicy = { ...DEFAULT_WORKFLOW_POLICY, ...(project.workflowPolicy ?? {}), ...patch };
  await saveProject(root, project);
  return project.workflowPolicy;
}

export async function updateModelProfile(root, profileName, model) {
  if (!Object.prototype.hasOwnProperty.call(DEFAULT_MODEL_PROFILES, profileName)) {
    throw new Error(`Unknown model profile: ${profileName}`);
  }
  const project = await loadProject(root);
  project.modelProfiles = { ...DEFAULT_MODEL_PROFILES, ...(project.modelProfiles ?? {}) };
  project.modelProfiles[profileName] = String(model || "inherit");
  await saveProject(root, project);
  return project.modelProfiles;
}

export async function getActiveManifest(root) {
  const project = await loadProject(root);
  if (!project?.activeWorkId) return undefined;
  return loadManifest(root, project.activeWorkId);
}

export async function listWorkIds(root) {
  const dir = paths(root).work;
  try {
    const names = await readdir(dir);
    return names.sort().reverse();
  } catch {
    return [];
  }
}

function workDir(root, id) {
  return join(paths(root).work, id);
}

export async function loadManifest(root, id) {
  return readJson(join(workDir(root, id), "manifest.json"));
}

export async function saveManifest(root, manifest) {
  manifest.updatedAt = new Date().toISOString();
  await atomicJson(join(workDir(root, manifest.id), "manifest.json"), manifest);
}

export async function setActiveWork(root, id) {
  const project = await loadProject(root);
  project.activeWorkId = id;
  await saveProject(root, project);
}

async function nextId(root) {
  const today = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const prefix = `W-${today}-`;
  const ids = await listWorkIds(root);
  const nums = ids
    .filter((id) => id.startsWith(prefix))
    .map((id) => Number(id.slice(prefix.length, prefix.length + 3)))
    .filter(Number.isFinite);
  const n = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}${String(n).padStart(3, "0")}`;
}

export async function createWork(root, request, options = {}) {
  const id = await nextId(root);
  const title = String(options.title || request).trim().replace(/\s+/g, " ").slice(0, 90);
  const classification = triage(request);
  const dir = workDir(root, id);
  await mkdir(join(dir, "artifacts"), { recursive: true });

  const stages = {};
  for (const stage of classification.route) {
    stages[stage] = { status: "PENDING", updatedAt: null };
  }
  stages.TRIAGE = { status: "DONE", updatedAt: new Date().toISOString() };

  const firstAfterTriage = classification.route[1] ?? "COMPLETE";
  const dirtyDomains = {};
  for (const domain of classification.domains) {
    dirtyDomains[domain] = {
      dirty: false,
      review: "PENDING",
      verification: "PENDING",
      files: [],
    };
  }

  const manifest = {
    schemaVersion: SCHEMA_VERSION,
    id,
    slug: slugify(title),
    title,
    request,
    type: classification.type,
    status: firstAfterTriage === "APPROVE" ? "WAITING_APPROVAL" : "IN_PROGRESS",
    currentStage: firstAfterTriage,
    route: classification.route,
    domains: classification.domains,
    risks: classification.risks,
    stages,
    approval: { status: "PENDING", at: null, reason: null },
    reviewVerdict: "PENDING",
    verificationVerdict: "PENDING",
    dirtyDomains,
    artifacts: {},
    artifactHistory: {},
    staleArtifacts: [],
    changeRequests: [],
    cancellation: null,
    ...(options.source ? { source: options.source } : {}),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const sourceSection = options.source
    ? `\n\n## Source\n\n- Type: ${options.source.type || "external"}\n- Backlog: ${options.source.backlogId || "-"}\n- Backlog item: ${options.source.itemId || "-"}\n- Documents: ${(options.source.sourceDocuments ?? []).join(", ") || "-"}\n`
    : "";

  await writeFile(
    join(dir, "requirement.md"),
    `# ${title}\n\n## Request\n\n${request.trim()}${sourceSection}\n\n## Triage\n\n- Type: ${manifest.type}\n- Domains: ${manifest.domains.join(", ")}\n- Risks: ${manifest.risks.join(", ") || "none detected"}\n- Route: ${manifest.route.join(" → ")}\n`,
    "utf8",
  );
  await atomicJson(join(dir, "tasks.json"), { schemaVersion: SCHEMA_VERSION, tasks: [] });
  await saveManifest(root, manifest);
  await appendJournal(root, id, { event: "work_created", type: manifest.type, request });
  await setActiveWork(root, id);
  return manifest;
}

export async function appendJournal(root, id, payload) {
  const line = JSON.stringify({ at: new Date().toISOString(), ...payload });
  await appendFile(join(workDir(root, id), "journal.jsonl"), `${line}\n`, "utf8");
}

function sanitizeFileName(kind) {
  return kind.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/-+/g, "-");
}

export async function saveArtifact(root, id, kind, content, verdict) {
  const manifest = await loadManifest(root, id);
  const name = `${sanitizeFileName(kind)}.md`;
  const rel = `artifacts/${name}`;
  const target = join(workDir(root, id), rel);

  manifest.artifactHistory ??= {};
  manifest.artifactHistory[kind] ??= [];
  if (await exists(target)) {
    const previous = await readFile(target, "utf8");
    const revision = manifest.artifactHistory[kind].length + 1;
    const historyRel = `artifacts/history/${sanitizeFileName(kind)}-r${String(revision).padStart(3, "0")}.md`;
    const historyTarget = join(workDir(root, id), historyRel);
    await mkdir(dirname(historyTarget), { recursive: true });
    await writeFile(historyTarget, previous, "utf8");
    manifest.artifactHistory[kind].push({
      revision,
      path: historyRel,
      archivedAt: new Date().toISOString(),
      verdict: kind === "review" ? manifest.reviewVerdict : kind === "verification" ? manifest.verificationVerdict : null,
    });
    await appendJournal(root, id, { event: "artifact_archived", kind, revision, path: historyRel });
  }
  await writeFile(target, content.endsWith("\n") ? content : `${content}\n`, "utf8");
  manifest.artifacts[kind] = rel;
  manifest.staleArtifacts = (manifest.staleArtifacts ?? []).filter((entry) => entry !== kind);
  if (kind === "review" && verdict) manifest.reviewVerdict = verdict;
  if (kind === "verification" && verdict) manifest.verificationVerdict = verdict;
  await saveManifest(root, manifest);
  await appendJournal(root, id, { event: "artifact_saved", kind, path: rel, verdict: verdict ?? null });
  return rel;
}

export async function loadTasks(root, id) {
  return readJson(join(workDir(root, id), "tasks.json"), { schemaVersion: SCHEMA_VERSION, tasks: [] });
}

export async function setTasks(root, id, tasks) {
  const normalized = tasks.map((task, index) => ({
    id: task.id || `T-${String(index + 1).padStart(3, "0")}`,
    owner: task.owner || "backend",
    description: task.description,
    dependsOn: task.dependsOn ?? [],
    status: task.status ?? "PENDING",
    notes: task.notes ?? null,
    updatedAt: new Date().toISOString(),
  }));
  await atomicJson(join(workDir(root, id), "tasks.json"), {
    schemaVersion: SCHEMA_VERSION,
    tasks: normalized,
  });
  await appendJournal(root, id, { event: "tasks_set", count: normalized.length });
  return normalized;
}

export async function updateTask(root, id, taskId, status, notes) {
  const data = await loadTasks(root, id);
  const task = data.tasks.find((item) => item.id === taskId);
  if (!task) throw new Error(`Unknown task: ${taskId}`);
  task.status = status;
  if (notes !== undefined) task.notes = notes;
  task.updatedAt = new Date().toISOString();
  await atomicJson(join(workDir(root, id), "tasks.json"), data);
  await appendJournal(root, id, { event: "task_updated", taskId, status, notes: notes ?? null });
  return task;
}

export async function updateProjectMemory(root, section, content) {
  const allowed = new Set(["architecture", "conventions", "domain-map", "database", "testing"]);
  if (!allowed.has(section)) throw new Error(`Unsupported project-memory section: ${section}`);
  const target = join(paths(root).memory, `${section}.md`);
  await writeFile(target, content.endsWith("\n") ? content : `${content}\n`, "utf8");
  return target;
}

export async function remember(root, content, confidence = "CONFIRMED", source = "user") {
  const p = paths(root);
  const index = await readJson(p.memoryIndex, { schemaVersion: SCHEMA_VERSION, entries: [] });
  const n = index.entries.length + 1;
  const id = `MEM-${String(n).padStart(4, "0")}`;
  const file = `decisions/${id}.md`;
  const target = join(p.memory, file);
  const now = new Date().toISOString();
  await writeFile(
    target,
    `# ${id}\n\n- Confidence: ${confidence}\n- Source: ${source}\n- Created: ${now}\n\n## Memory\n\n${content.trim()}\n`,
    "utf8",
  );
  index.entries.push({
    id,
    file,
    confidence,
    source,
    summary: content.trim().replace(/\s+/g, " ").slice(0, 180),
    createdAt: now,
    updatedAt: now,
  });
  await atomicJson(p.memoryIndex, index);
  return index.entries[index.entries.length - 1];
}

export async function listMemory(root) {
  return readJson(paths(root).memoryIndex, { schemaVersion: SCHEMA_VERSION, entries: [] });
}

export async function markDirty(root, id, domain, file) {
  const manifest = await loadManifest(root, id);
  if (["COMPLETE", "CANCELLED"].includes(manifest.status)) {
    await appendJournal(root, id, { event: "post_terminal_change_observed", domain, file: file ?? null, status: manifest.status });
    return manifest;
  }

  if (!manifest.dirtyDomains[domain]) {
    manifest.dirtyDomains[domain] = {
      dirty: false,
      review: "PENDING",
      verification: "PENDING",
      files: [],
    };
  }
  const state = manifest.dirtyDomains[domain];
  state.dirty = true;
  state.review = "PENDING";
  state.verification = "PENDING";
  if (file && !state.files.includes(file)) state.files.push(file);

  manifest.staleArtifacts ??= [];
  const reviewIndex = manifest.route.indexOf("REVIEW");
  const verifyIndex = manifest.route.indexOf("VERIFY");
  const currentIndex = manifest.route.indexOf(manifest.currentStage);
  let rewoundFrom = null;

  if (reviewIndex >= 0 && (currentIndex > reviewIndex || manifest.stages?.REVIEW?.status === "DONE" || manifest.reviewVerdict === "PASS")) {
    rewoundFrom = manifest.currentStage;
    manifest.reviewVerdict = "PENDING";
    manifest.verificationVerdict = "PENDING";
    if (!manifest.staleArtifacts.includes("review")) manifest.staleArtifacts.push("review");
    if (!manifest.staleArtifacts.includes("verification")) manifest.staleArtifacts.push("verification");
    manifest.stages.REVIEW = { status: "IN_PROGRESS", updatedAt: new Date().toISOString(), summary: "Invalidated by subsequent implementation change" };
    if (verifyIndex >= 0) manifest.stages.VERIFY = { status: "PENDING", updatedAt: new Date().toISOString() };
    if (manifest.stages.COMPLETE) manifest.stages.COMPLETE = { status: "PENDING", updatedAt: new Date().toISOString() };
    manifest.currentStage = "REVIEW";
    manifest.status = "IN_PROGRESS";
  } else if (verifyIndex >= 0 && (currentIndex >= verifyIndex || manifest.stages?.VERIFY?.status === "DONE")) {
    manifest.verificationVerdict = "PENDING";
    if (!manifest.staleArtifacts.includes("verification")) manifest.staleArtifacts.push("verification");
    manifest.stages.VERIFY = { status: "IN_PROGRESS", updatedAt: new Date().toISOString(), summary: "Invalidated by subsequent implementation change" };
    manifest.currentStage = "VERIFY";
    manifest.status = "IN_PROGRESS";
  }

  await saveManifest(root, manifest);
  await appendJournal(root, id, { event: "domain_dirty", domain, file: file ?? null, rewoundFrom, currentStage: manifest.currentStage });
  if (rewoundFrom) {
    await appendJournal(root, id, { event: "evidence_invalidated", reason: "implementation_changed_after_gate", fromStage: rewoundFrom, nextStage: manifest.currentStage, domain, file: file ?? null });
  }
  return manifest;
}

export async function completeStage(root, id) {
  const manifest = await loadManifest(root, id);
  const stage = manifest.currentStage;

  if (stage === "APPROVE") throw new Error("APPROVE is a human gate. Use /approve.");
  if (stage === "COMPLETE") return manifest;
  if (manifest.status === "CANCELLED") throw new Error(`Work ${id} is CANCELLED.`);

  const requiredArtifacts = {
    DISCOVER: "discovery",
    PARTY: "party",
    PLAN: "plan",
    DESIGN: "design",
    REVIEW: "review",
    VERIFY: "verification",
  };
  const required = requiredArtifacts[stage];
  if (required && !manifest.artifacts?.[required]) {
    throw new Error(`Cannot complete ${stage}: required ${required} artifact is missing.`);
  }
  if (required && (manifest.staleArtifacts ?? []).includes(required)) {
    throw new Error(`Cannot complete ${stage}: ${required} artifact is stale and must be regenerated.`);
  }

  if (stage === "DECOMPOSE") {
    const tasks = await loadTasks(root, id);
    if (!tasks.tasks.length) throw new Error("Cannot complete DECOMPOSE: no implementation tasks were persisted.");
  }
  if (stage === "IMPLEMENT") {
    const tasks = await loadTasks(root, id);
    const unfinished = tasks.tasks.filter((t) => t.status !== "DONE");
    if (tasks.tasks.length > 0 && unfinished.length > 0) {
      throw new Error(`Cannot complete IMPLEMENT: ${unfinished.length} task(s) are not DONE.`);
    }
  }
  if (stage === "REVIEW" && manifest.reviewVerdict !== "PASS") {
    throw new Error(`Cannot complete REVIEW with verdict ${manifest.reviewVerdict}.`);
  }
  if (stage === "VERIFY" && !["PASS", "PASS_WITH_WARNINGS"].includes(manifest.verificationVerdict)) {
    throw new Error(`Cannot complete VERIFY with verdict ${manifest.verificationVerdict}.`);
  }

  manifest.stages[stage] = { status: "DONE", updatedAt: new Date().toISOString() };
  if (stage === "REVIEW") {
    for (const state of Object.values(manifest.dirtyDomains ?? {})) {
      if (state.dirty) state.review = "PASS";
    }
  }
  if (stage === "VERIFY") {
    for (const state of Object.values(manifest.dirtyDomains ?? {})) {
      if (state.dirty) state.verification = manifest.verificationVerdict;
    }
  }

  const index = manifest.route.indexOf(stage);
  const next = manifest.route[index + 1] ?? "COMPLETE";
  manifest.currentStage = next;

  if (next === "APPROVE") {
    manifest.status = "WAITING_APPROVAL";
    manifest.stages.APPROVE = { status: "WAITING", updatedAt: new Date().toISOString() };
  } else if (next === "COMPLETE") {
    manifest.status = "COMPLETE";
    manifest.stages.COMPLETE = { status: "DONE", updatedAt: new Date().toISOString() };
    for (const state of Object.values(manifest.dirtyDomains ?? {})) {
      state.dirty = false;
      state.review = manifest.reviewVerdict === "PASS" ? "PASS" : state.review;
      state.verification = ["PASS", "PASS_WITH_WARNINGS"].includes(manifest.verificationVerdict)
        ? manifest.verificationVerdict
        : state.verification;
    }
  } else {
    manifest.status = "IN_PROGRESS";
    manifest.stages[next] = { status: "IN_PROGRESS", updatedAt: new Date().toISOString() };
  }

  await saveManifest(root, manifest);
  await appendJournal(root, id, { event: "stage_completed", stage, nextStage: next });
  if (next === "COMPLETE") {
    const synced = manifest.source?.type === "backlog"
      ? await syncBacklogWorkCompletion(root, manifest.source, manifest.id)
      : false;
    if (!synced) await syncBacklogWorkCompletionByWorkId(root, manifest.id);
  }
  return manifest;
}

export async function failStage(root, id, summary) {
  const manifest = await loadManifest(root, id);
  const failedStage = manifest.currentStage;
  manifest.stages[failedStage] = {
    status: "FAILED",
    updatedAt: new Date().toISOString(),
    summary: summary ?? null,
  };
  manifest.lastFailure = { stage: failedStage, summary: summary ?? null, at: new Date().toISOString() };

  if (failedStage === "REVIEW" && manifest.route.includes("IMPLEMENT")) {
    manifest.status = "IN_PROGRESS";
    manifest.currentStage = "IMPLEMENT";
    manifest.stages.IMPLEMENT = { status: "IN_PROGRESS", updatedAt: new Date().toISOString(), summary: "Rework required after review failure" };
    manifest.reviewVerdict = "FAIL";
    manifest.verificationVerdict = "PENDING";
  } else {
    manifest.status = "BLOCKED";
  }

  await saveManifest(root, manifest);
  await appendJournal(root, id, { event: "stage_failed", stage: failedStage, summary: summary ?? null, nextStage: manifest.currentStage, status: manifest.status });
  if (failedStage === "REVIEW" && manifest.currentStage === "IMPLEMENT") {
    await appendJournal(root, id, { event: "rework_started", sourceStage: "REVIEW", reason: summary ?? "Review failed" });
  }
  return manifest;
}

export async function reopenVerification(root, id, reason = "Re-verification requested") {
  const manifest = await loadManifest(root, id);
  if (manifest.currentStage !== "VERIFY") {
    throw new Error(`Work ${id} is at ${manifest.currentStage}, not VERIFY.`);
  }

  const previousVerdict = manifest.verificationVerdict;
  const previousStageStatus = manifest.stages?.VERIFY?.status ?? null;
  const previousWorkStatus = manifest.status;

  manifest.status = "IN_PROGRESS";
  manifest.stages.VERIFY = {
    status: "IN_PROGRESS",
    updatedAt: new Date().toISOString(),
    summary: reason || "Re-verification requested",
  };

  await saveManifest(root, manifest);
  await appendJournal(root, id, {
    event: "verification_reopened",
    stage: "VERIFY",
    reason: reason || "Re-verification requested",
    previousVerdict,
    previousStageStatus,
    previousWorkStatus,
  });
  return manifest;
}

export async function approve(root, id) {
  const manifest = await loadManifest(root, id);
  if (manifest.currentStage !== "APPROVE") {
    throw new Error(`Work ${id} is at ${manifest.currentStage}, not APPROVE.`);
  }
  manifest.approval = { status: "APPROVED", at: new Date().toISOString(), reason: null };
  manifest.stages.APPROVE = { status: "DONE", updatedAt: new Date().toISOString() };
  const index = manifest.route.indexOf("APPROVE");
  const next = manifest.route[index + 1] ?? "DECOMPOSE";
  manifest.currentStage = next;
  manifest.status = "IN_PROGRESS";
  manifest.stages[next] = { status: "IN_PROGRESS", updatedAt: new Date().toISOString() };
  await saveManifest(root, manifest);
  await appendJournal(root, id, { event: "approved", nextStage: next });
  return manifest;
}

export async function reject(root, id, reason) {
  const manifest = await loadManifest(root, id);
  if (manifest.currentStage !== "APPROVE") {
    throw new Error(`Work ${id} is at ${manifest.currentStage}, not APPROVE.`);
  }
  const target = manifest.route.includes("DESIGN") ? "DESIGN" : "PLAN";
  const artifactKind = target === "DESIGN" ? "design" : "plan";
  manifest.approval = {
    status: "REJECTED",
    at: new Date().toISOString(),
    reason: reason || "Revision requested",
    revision: Number(manifest.approval?.revision ?? 0) + 1,
  };
  manifest.stages.APPROVE = { status: "REJECTED", updatedAt: new Date().toISOString() };
  manifest.currentStage = target;
  manifest.status = "IN_PROGRESS";
  manifest.stages[target] = { status: "IN_PROGRESS", updatedAt: new Date().toISOString(), summary: "Revision requested by human" };
  manifest.staleArtifacts ??= [];
  if (manifest.artifacts?.[artifactKind] && !manifest.staleArtifacts.includes(artifactKind)) manifest.staleArtifacts.push(artifactKind);
  await saveManifest(root, manifest);
  await appendJournal(root, id, { event: "rejected", reason: manifest.approval.reason, nextStage: target, revision: manifest.approval.revision });
  return manifest;
}

export async function requestRework(root, id, reason = "Implementation rework requested") {
  const manifest = await loadManifest(root, id);
  if (["COMPLETE", "CANCELLED"].includes(manifest.status)) throw new Error(`Cannot rework terminal work ${id} (${manifest.status}).`);
  if (!manifest.route.includes("IMPLEMENT")) throw new Error(`Work ${id} has no IMPLEMENT stage.`);
  const previousStage = manifest.currentStage;
  manifest.status = "IN_PROGRESS";
  manifest.currentStage = "IMPLEMENT";
  manifest.stages.IMPLEMENT = { status: "IN_PROGRESS", updatedAt: new Date().toISOString(), summary: reason };
  manifest.reviewVerdict = "PENDING";
  manifest.verificationVerdict = "PENDING";
  manifest.staleArtifacts ??= [];
  for (const kind of ["review", "verification"]) {
    if (manifest.artifacts?.[kind] && !manifest.staleArtifacts.includes(kind)) manifest.staleArtifacts.push(kind);
  }
  if (manifest.stages.REVIEW) manifest.stages.REVIEW = { status: "PENDING", updatedAt: new Date().toISOString() };
  if (manifest.stages.VERIFY) manifest.stages.VERIFY = { status: "PENDING", updatedAt: new Date().toISOString() };
  if (manifest.stages.COMPLETE) manifest.stages.COMPLETE = { status: "PENDING", updatedAt: new Date().toISOString() };
  await saveManifest(root, manifest);
  await appendJournal(root, id, { event: "rework_requested", fromStage: previousStage, nextStage: "IMPLEMENT", reason });
  return manifest;
}

export async function changeRequest(root, id, content) {
  const manifest = await loadManifest(root, id);
  if (["COMPLETE", "CANCELLED"].includes(manifest.status)) throw new Error(`Cannot change terminal work ${id} (${manifest.status}). Create a new work item.`);
  const text = String(content || "").trim();
  if (!text) throw new Error("Change request content is required.");

  manifest.changeRequests ??= [];
  const number = manifest.changeRequests.length + 1;
  const rel = `artifacts/change-request-${String(number).padStart(3, "0")}.md`;
  const targetPath = join(workDir(root, id), rel);
  await writeFile(targetPath, `# Change Request ${number}

${text}
`, "utf8");
  manifest.changeRequests.push({ id: `CR-${String(number).padStart(3, "0")}`, path: rel, summary: text.replace(/\s+/g, " ").slice(0, 180), at: new Date().toISOString() });

  const previousStage = manifest.currentStage;
  const targetStage = manifest.route.includes("DESIGN") ? "DESIGN" : manifest.route.includes("PLAN") ? "PLAN" : "IMPLEMENT";
  const targetIndex = manifest.route.indexOf(targetStage);
  for (let i = targetIndex; i < manifest.route.length; i++) {
    const stage = manifest.route[i];
    manifest.stages[stage] = { status: stage === targetStage ? "IN_PROGRESS" : "PENDING", updatedAt: new Date().toISOString() };
  }
  manifest.currentStage = targetStage;
  manifest.status = "IN_PROGRESS";
  manifest.approval = { status: "PENDING", at: null, reason: null, revision: Number(manifest.approval?.revision ?? 0) };
  manifest.reviewVerdict = "PENDING";
  manifest.verificationVerdict = "PENDING";
  manifest.staleArtifacts ??= [];
  for (const kind of [targetStage === "DESIGN" ? "design" : targetStage === "PLAN" ? "plan" : null, "review", "verification"].filter(Boolean)) {
    if (manifest.artifacts?.[kind] && !manifest.staleArtifacts.includes(kind)) manifest.staleArtifacts.push(kind);
  }

  if (targetStage !== "IMPLEMENT") {
    const tasks = await loadTasks(root, id);
    if (tasks.tasks.length) {
      const historyRel = `artifacts/history/tasks-before-change-${String(number).padStart(3, "0")}.json`;
      const historyTarget = join(workDir(root, id), historyRel);
      await mkdir(dirname(historyTarget), { recursive: true });
      await writeFile(historyTarget, `${JSON.stringify(tasks, null, 2)}
`, "utf8");
      await atomicJson(join(workDir(root, id), "tasks.json"), { schemaVersion: SCHEMA_VERSION, tasks: [] });
    }
  }

  await saveManifest(root, manifest);
  await appendJournal(root, id, { event: "change_request", changeRequestId: manifest.changeRequests.at(-1).id, fromStage: previousStage, nextStage: targetStage, summary: text });
  return manifest;
}

export async function cancelWork(root, id, reason = "Cancelled by user") {
  const manifest = await loadManifest(root, id);
  if (manifest.status === "COMPLETE") throw new Error(`Work ${id} is already COMPLETE.`);
  if (manifest.status === "CANCELLED") return manifest;
  manifest.status = "CANCELLED";
  manifest.cancellation = { at: new Date().toISOString(), reason };
  await saveManifest(root, manifest);
  await appendJournal(root, id, { event: "work_cancelled", stage: manifest.currentStage, reason });
  if (manifest.source?.type === "backlog") {
    await syncBacklogWorkCancellation(root, manifest.source, manifest.id, reason);
  }
  return manifest;
}

async function readIfExists(path) {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return "";
    throw error;
  }
}

function appendBounded(parts, title, content, budget) {
  if (!content || budget.remaining <= 0) return;
  const header = `\n\n## ${title}\n\n`;
  const available = Math.max(0, budget.remaining - header.length);
  const body = content.length > available
    ? `${content.slice(0, Math.max(0, available - 80))}\n\n[truncated by context builder]\n`
    : content;
  const chunk = `${header}${body}`;
  parts.push(chunk);
  budget.remaining -= chunk.length;
}

export async function buildContextPacket(root, id, maxChars = 24000) {
  const p = paths(root);
  const manifest = await loadManifest(root, id);
  const project = await loadProject(root);
  const dir = workDir(root, id);
  const parts = [
    `# Durable Context Packet\n\nWork: ${manifest.id} — ${manifest.title}\nStage: ${manifest.currentStage}\nStatus: ${manifest.status}\nType: ${manifest.type}\nDomains: ${manifest.domains.join(", ")}\nRisks: ${manifest.risks.join(", ") || "none"}\nStale artifacts: ${(manifest.staleArtifacts ?? []).join(", ") || "none"}\n`,
  ];
  const budget = { remaining: maxChars - parts[0].length };

  appendBounded(parts, "Requirement", await readIfExists(join(dir, "requirement.md")), budget);
  if (manifest.changeRequests?.length) {
    const summaries = manifest.changeRequests.map((entry) => `- ${entry.id}: ${entry.summary} (${entry.path})`).join("\n");
    appendBounded(parts, "Change Requests", summaries, budget);
    for (const entry of manifest.changeRequests.slice(-3)) {
      appendBounded(parts, `${entry.id} Detail`, await readIfExists(join(dir, entry.path)), budget);
    }
  }
  appendBounded(parts, "Repository Profile", JSON.stringify(project.repositoryProfile ?? {}, null, 2), budget);
  appendBounded(parts, "Architecture Memory", await readIfExists(join(p.memory, "architecture.md")), budget);
  appendBounded(parts, "Conventions Memory", await readIfExists(join(p.memory, "conventions.md")), budget);
  appendBounded(parts, "Domain Map", await readIfExists(join(p.memory, "domain-map.md")), budget);

  if (manifest.domains.includes("database")) {
    appendBounded(parts, "Database Memory", await readIfExists(join(p.memory, "database.md")), budget);
  }

  for (const kind of ["discovery", "party", "plan", "design", "review", "verification"]) {
    const rel = manifest.artifacts[kind];
    if (rel) {
      const stale = (manifest.staleArtifacts ?? []).includes(kind) ? " [STALE]" : "";
      appendBounded(parts, `${kind} artifact${stale}`, await readIfExists(join(dir, rel)), budget);
    }
  }

  const tasks = await loadTasks(root, id);
  if (tasks.tasks.length) {
    appendBounded(parts, "Tasks", JSON.stringify(tasks.tasks, null, 2), budget);
  }

  if (["REVIEW", "VERIFY", "COMPLETE"].includes(manifest.currentStage)) {
    appendBounded(parts, "Testing Memory", await readIfExists(join(p.memory, "testing.md")), budget);
  }

  const memory = await listMemory(root);
  if (memory.entries.length) {
    const summaries = memory.entries.slice(-10).map((entry) =>
      `- ${entry.id} [${entry.confidence}] ${entry.summary}`
    ).join("\n");
    appendBounded(parts, "Recent Durable Memory Index", summaries, budget);
  }

  const output = parts.join("").slice(0, maxChars);
  const target = join(p.context, `${id}.md`);
  await writeFile(target, output.endsWith("\n") ? output : `${output}\n`, "utf8");
  return { path: target, content: output };
}

export async function getFileStats(root) {
  const p = paths(root);
  const result = {};
  for (const file of ["architecture.md", "conventions.md", "domain-map.md", "database.md", "testing.md"]) {
    const target = join(p.memory, file);
    try {
      const s = await stat(target);
      result[file] = { bytes: s.size };
    } catch {}
  }
  return result;
}
