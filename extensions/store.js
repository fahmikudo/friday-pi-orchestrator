export const MODULE_VERSION = "2.0.2";
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
  const normalizedRequest = String(request || "").trim();
  if (/^W-\d{8}-\d{3}$/.test(normalizedRequest)) {
    try {
      await loadManifest(root, normalizedRequest);
      throw new Error(`Work ${normalizedRequest} already exists. Use /work-resume ${normalizedRequest} instead of /work.`);
    } catch (error) {
      if (error?.code !== "ENOENT" && !String(error?.message || "").includes("Unexpected end of JSON")) throw error;
    }
  }

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
    ? [
        "",
        "## Source",
        "",
        `- Type: ${options.source.type || "external"}`,
        options.source.backlogId ? `- Backlog: ${options.source.backlogId}` : null,
        options.source.itemId ? `- Backlog item: ${options.source.itemId}` : null,
        options.source.originWorkId ? `- Origin work: ${options.source.originWorkId}` : null,
        options.source.changeRequestId ? `- Change request: ${options.source.changeRequestId}` : null,
        options.source.sourceDocuments?.length ? `- Documents: ${options.source.sourceDocuments.join(", ")}` : null,
        "",
      ].filter((line) => line !== null).join("\n")
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

  if (stage === "VERIFY") {
    const now = new Date().toISOString();
    for (const cr of manifest.changeRequests ?? []) {
      if (cr.scopeClassification === "IN_SCOPE" && cr.status !== "COMPLETE") {
        cr.status = "COMPLETE";
        cr.resolution = "IMPLEMENTED";
        cr.completedAt = now;
        cr.updatedAt = now;
        const body = await readChangeRequestArtifact(root, id, cr.path);
        const requestBody = body.includes("## Request") ? body.split("## Request")[1].split("## Resolution Note")[0].trim() : cr.summary;
        await writeChangeRequestArtifact(root, id, cr, requestBody, `Resolved automatically after VERIFY ${manifest.verificationVerdict}.`);
        await appendJournal(root, id, { event: "change_request_resolved", changeRequestId: cr.id, resolution: "IMPLEMENTED", verdict: manifest.verificationVerdict });
      }
    }
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

function normalizeChangeRequest(entry, index = 0) {
  const id = entry?.id || `CR-${String(index + 1).padStart(3, "0")}`;
  return {
    id,
    path: entry?.path ?? null,
    summary: String(entry?.summary || "").trim(),
    scopeClassification: entry?.scopeClassification || (entry?.legacy ? "UNCLASSIFIED" : "IN_SCOPE"),
    status: entry?.status || "OPEN",
    impact: entry?.impact || null,
    originTaskId: entry?.originTaskId || null,
    resolution: entry?.resolution || null,
    resultWorkId: entry?.resultWorkId || null,
    note: entry?.note || null,
    createdAt: entry?.createdAt || entry?.at || new Date().toISOString(),
    updatedAt: entry?.updatedAt || entry?.at || new Date().toISOString(),
    completedAt: entry?.completedAt || null,
    legacy: Boolean(entry?.legacy),
  };
}

function inferLegacyScope(content = "") {
  return /out[- ]of[- ]scope|out of scope|separate work|separate work item|unrelated work/i.test(content)
    ? "OUT_OF_SCOPE"
    : "UNCLASSIFIED";
}

async function readChangeRequestArtifact(root, workId, rel) {
  if (!rel) return "";
  try {
    return await readFile(join(workDir(root, workId), rel), "utf8");
  } catch {
    return "";
  }
}

async function writeChangeRequestArtifact(root, workId, cr, body, resolutionNote = null) {
  const rel = cr.path || `artifacts/change-request-${cr.id.slice(3)}.md`;
  const target = join(workDir(root, workId), rel);
  const lines = [
    `# ${cr.id}`,
    "",
    "## Metadata",
    "",
    `- Scope: ${cr.scopeClassification}`,
    `- Status: ${cr.status}`,
    `- Impact: ${cr.impact || "-"}`,
    `- Origin task: ${cr.originTaskId || "-"}`,
    `- Resolution: ${cr.resolution || "-"}`,
    `- Result work: ${cr.resultWorkId || "-"}`,
    "",
    "## Request",
    "",
    String(body || cr.summary || "").trim(),
  ];
  if (resolutionNote || cr.note) {
    lines.push("", "## Resolution Note", "", String(resolutionNote || cr.note).trim());
  }
  await writeFile(target, `${lines.join("\n")}\n`, "utf8");
  cr.path = rel;
}

export async function listChangeRequests(root, id) {
  const manifest = await loadManifest(root, id);
  manifest.changeRequests ??= [];
  const normalized = manifest.changeRequests.map((entry, index) => {
    const cr = normalizeChangeRequest(entry, index);
    const legacyStructured = !entry?.scopeClassification && !entry?.status && Boolean(entry?.id && entry?.path);
    if (legacyStructured) cr.legacy = true;
    if (legacyStructured && manifest.status === "COMPLETE" && ["PASS", "PASS_WITH_WARNINGS"].includes(manifest.verificationVerdict)) {
      cr.scopeClassification = "IN_SCOPE";
      cr.status = "COMPLETE";
      cr.resolution = "IMPLEMENTED";
      cr.completedAt = manifest.updatedAt || new Date().toISOString();
      cr.updatedAt = cr.completedAt;
    }
    return cr;
  });
  const byId = new Map(normalized.map((entry) => [entry.id, entry]));

  const artifactDir = join(workDir(root, id), "artifacts");
  let names = [];
  try { names = await readdir(artifactDir); } catch { names = []; }
  for (const name of names.filter((value) => /^change-request-\d+\.md$/.test(value)).sort()) {
    const number = Number(name.match(/(\d+)/)?.[1] || 0);
    const crId = `CR-${String(number).padStart(3, "0")}`;
    if (byId.has(crId)) continue;
    const rel = `artifacts/${name}`;
    const content = await readChangeRequestArtifact(root, id, rel);
    const body = content
      .replace(/^#.*$/m, "")
      .replace(/## Metadata[\s\S]*?## Request/m, "")
      .replace(/## Resolution Note[\s\S]*$/m, "")
      .trim();
    const entry = normalizeChangeRequest({
      id: crId,
      path: rel,
      summary: (body || content).replace(/\s+/g, " ").slice(0, 180),
      scopeClassification: inferLegacyScope(content),
      status: "OPEN",
      legacy: true,
      createdAt: (await stat(join(artifactDir, name))).mtime.toISOString(),
    }, number - 1);
    normalized.push(entry);
    byId.set(crId, entry);
  }

  normalized.sort((a, b) => a.id.localeCompare(b.id));
  const changed = JSON.stringify(manifest.changeRequests) !== JSON.stringify(normalized);
  if (changed) {
    manifest.changeRequests = normalized;
    await saveManifest(root, manifest);
    await appendJournal(root, id, { event: "change_requests_normalized", count: normalized.length });
  }
  return normalized;
}

function resolveChangeTargetStage(manifest, impact, originTaskId) {
  const requested = String(impact || "AUTO").toUpperCase();
  if (requested === "DESIGN" && manifest.route.includes("DESIGN")) return "DESIGN";
  if (requested === "PLAN" && manifest.route.includes("PLAN")) return "PLAN";
  if (requested === "IMPLEMENTATION" && manifest.route.includes("IMPLEMENT")) return "IMPLEMENT";
  if (originTaskId && manifest.route.includes("IMPLEMENT")) return "IMPLEMENT";
  if (manifest.route.includes("DESIGN")) return "DESIGN";
  if (manifest.route.includes("PLAN")) return "PLAN";
  return "IMPLEMENT";
}

async function invalidateForChangeRequest(root, manifest, cr, targetStage) {
  const targetIndex = manifest.route.indexOf(targetStage);
  for (let i = targetIndex; i < manifest.route.length; i++) {
    const stage = manifest.route[i];
    manifest.stages[stage] = { status: stage === targetStage ? "IN_PROGRESS" : "PENDING", updatedAt: new Date().toISOString() };
  }
  manifest.currentStage = targetStage;
  manifest.status = "IN_PROGRESS";
  manifest.reviewVerdict = "PENDING";
  manifest.verificationVerdict = "PENDING";
  manifest.staleArtifacts ??= [];

  if (targetStage !== "IMPLEMENT") {
    manifest.approval = { status: "PENDING", at: null, reason: null, revision: Number(manifest.approval?.revision ?? 0) };
  }

  for (const kind of [targetStage === "DESIGN" ? "design" : targetStage === "PLAN" ? "plan" : null, "review", "verification"].filter(Boolean)) {
    if (manifest.artifacts?.[kind] && !manifest.staleArtifacts.includes(kind)) manifest.staleArtifacts.push(kind);
  }

  const tasks = await loadTasks(root, manifest.id);
  if (targetStage !== "IMPLEMENT") {
    if (tasks.tasks.length) {
      const historyRel = `artifacts/history/tasks-before-${cr.id.toLowerCase()}.json`;
      const historyTarget = join(workDir(root, manifest.id), historyRel);
      await mkdir(dirname(historyTarget), { recursive: true });
      await writeFile(historyTarget, `${JSON.stringify(tasks, null, 2)}\n`, "utf8");
      await atomicJson(join(workDir(root, manifest.id), "tasks.json"), { schemaVersion: SCHEMA_VERSION, tasks: [] });
    }
  } else if (cr.originTaskId) {
    const task = tasks.tasks.find((entry) => entry.id === cr.originTaskId);
    if (!task) throw new Error(`Unknown origin task: ${cr.originTaskId}`);
    task.status = "IN_PROGRESS";
    task.notes = [task.notes, `Reopened by ${cr.id}: ${cr.summary}`].filter(Boolean).join(" | ");
    task.updatedAt = new Date().toISOString();
    await atomicJson(join(workDir(root, manifest.id), "tasks.json"), tasks);
    await appendJournal(root, manifest.id, { event: "task_reopened_by_change_request", taskId: task.id, changeRequestId: cr.id });
  }
}

export async function changeRequest(root, id, content, options = {}) {
  const manifest = await loadManifest(root, id);
  const text = String(content || "").trim();
  if (!text) throw new Error("Change request content is required.");

  const scopeClassification = String(options.scopeClassification || "IN_SCOPE").toUpperCase();
  if (!["IN_SCOPE", "OUT_OF_SCOPE"].includes(scopeClassification)) {
    throw new Error(`Unsupported change-request scope: ${scopeClassification}`);
  }
  if (["COMPLETE", "CANCELLED"].includes(manifest.status) && scopeClassification !== "OUT_OF_SCOPE") {
    throw new Error(`Cannot change terminal work ${id} (${manifest.status}) with an in-scope CR. Record it as OUT_OF_SCOPE and promote it to a new work item.`);
  }

  await listChangeRequests(root, id);
  const refreshed = await loadManifest(root, id);
  refreshed.changeRequests ??= [];
  const existingNumbers = refreshed.changeRequests.map((entry) => Number(String(entry.id || "").slice(3))).filter(Number.isFinite);
  const number = (existingNumbers.length ? Math.max(...existingNumbers) : 0) + 1;
  const cr = normalizeChangeRequest({
    id: `CR-${String(number).padStart(3, "0")}`,
    summary: text.replace(/\s+/g, " ").slice(0, 180),
    scopeClassification,
    status: "OPEN",
    impact: String(options.impact || (options.originTaskId ? "IMPLEMENTATION" : "AUTO")).toUpperCase(),
    originTaskId: options.originTaskId || null,
    createdAt: new Date().toISOString(),
  }, number - 1);

  await writeChangeRequestArtifact(root, id, cr, text);
  refreshed.changeRequests.push(cr);

  const previousStage = refreshed.currentStage;
  let targetStage = previousStage;
  if (scopeClassification === "IN_SCOPE") {
    targetStage = resolveChangeTargetStage(refreshed, cr.impact, cr.originTaskId);
    cr.status = "IN_PROGRESS";
    cr.updatedAt = new Date().toISOString();
    await invalidateForChangeRequest(root, refreshed, cr, targetStage);
  }

  await saveManifest(root, refreshed);
  await appendJournal(root, id, {
    event: "change_request_recorded",
    changeRequestId: cr.id,
    scopeClassification,
    originTaskId: cr.originTaskId,
    impact: cr.impact,
    fromStage: previousStage,
    nextStage: targetStage,
    summary: text,
  });
  return refreshed;
}

export async function resolveChangeRequest(root, id, crId, resolution, note = "") {
  await listChangeRequests(root, id);
  const manifest = await loadManifest(root, id);
  const cr = manifest.changeRequests?.find((entry) => entry.id === crId);
  if (!cr) throw new Error(`Unknown change request ${crId} for ${id}.`);
  if (cr.status === "COMPLETE") return { manifest, changeRequest: cr };

  const normalizedResolution = String(resolution || "").toUpperCase();
  const allowed = new Set(["DECLINED", "DUPLICATE", "SUPERSEDED", "CANCELLED"]);
  if (!allowed.has(normalizedResolution)) {
    throw new Error(`Manual CR resolution must be one of: ${[...allowed].join(", ")}. IMPLEMENTED is completed automatically after successful VERIFY; PROMOTED_TO_WORK uses /promote-cr.`);
  }
  cr.status = "COMPLETE";
  cr.resolution = normalizedResolution;
  cr.note = note || null;
  cr.completedAt = new Date().toISOString();
  cr.updatedAt = cr.completedAt;
  const body = await readChangeRequestArtifact(root, id, cr.path);
  await writeChangeRequestArtifact(root, id, cr, body.includes("## Request") ? body.split("## Request")[1].split("## Resolution Note")[0].trim() : cr.summary, note);
  await saveManifest(root, manifest);
  await appendJournal(root, id, { event: "change_request_resolved", changeRequestId: cr.id, resolution: cr.resolution, note: cr.note });
  return { manifest, changeRequest: cr };
}

export async function promoteChangeRequest(root, originWorkId, crId, options = {}) {
  await listChangeRequests(root, originWorkId);
  const originManifest = await loadManifest(root, originWorkId);
  const cr = originManifest.changeRequests?.find((entry) => entry.id === crId);
  if (!cr) throw new Error(`Unknown change request ${crId} for ${originWorkId}.`);
  if (cr.status === "COMPLETE") {
    if (cr.resolution === "PROMOTED_TO_WORK" && cr.resultWorkId) {
      return { originManifest, changeRequest: cr, work: await loadManifest(root, cr.resultWorkId) };
    }
    throw new Error(`${crId} is already COMPLETE with resolution ${cr.resolution || "unknown"}.`);
  }
  if (cr.scopeClassification === "IN_SCOPE") {
    throw new Error(`${crId} is IN_SCOPE and has already affected ${originWorkId}. Resolve it in the same work, or record an OUT_OF_SCOPE CR for promotion.`);
  }

  const artifact = await readChangeRequestArtifact(root, originWorkId, cr.path);
  const requestBody = artifact.includes("## Request")
    ? artifact.split("## Request")[1].split("## Resolution Note")[0].trim()
    : (cr.summary || artifact.trim());
  const request = String(options.request || requestBody || cr.summary).trim();
  const title = String(options.title || cr.summary || request).replace(/\s+/g, " ").slice(0, 90);
  const work = await createWork(root, request, {
    title,
    source: {
      type: "change_request",
      originWorkId,
      changeRequestId: cr.id,
    },
  });

  cr.scopeClassification = "OUT_OF_SCOPE";
  cr.status = "COMPLETE";
  cr.resolution = "PROMOTED_TO_WORK";
  cr.resultWorkId = work.id;
  cr.completedAt = new Date().toISOString();
  cr.updatedAt = cr.completedAt;
  cr.note = options.note || `Promoted to ${work.id}`;
  await writeChangeRequestArtifact(root, originWorkId, cr, requestBody || cr.summary, cr.note);
  await saveManifest(root, originManifest);
  await appendJournal(root, originWorkId, { event: "change_request_promoted", changeRequestId: cr.id, resultWorkId: work.id });
  await appendJournal(root, work.id, { event: "work_created_from_change_request", originWorkId, changeRequestId: cr.id });
  return { originManifest, changeRequest: cr, work };
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
