export const MODULE_VERSION = "2.0.1";
import {
  access,
  appendFile,
  mkdir,
  readFile,
  readdir,
  rename,
  writeFile,
} from "node:fs/promises";
import { dirname, join } from "node:path";
import { slugify } from "./core.js";

const WORKSPACE = ".pi-work";
const BACKLOG_SCHEMA_VERSION = 1;

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

export function backlogPaths(root) {
  const base = join(root, WORKSPACE, "backlogs");
  return {
    base,
    index: join(base, "index.json"),
  };
}

function backlogDir(root, id) {
  return join(backlogPaths(root).base, id);
}

function workManifestPath(root, workId) {
  return join(root, WORKSPACE, "work", workId, "manifest.json");
}

function normalizeId(value) {
  const id = slugify(value || "backlog");
  if (!id) throw new Error("Backlog id is required.");
  return id;
}

function now() {
  return new Date().toISOString();
}

export async function ensureBacklogStore(root) {
  const p = backlogPaths(root);
  await mkdir(p.base, { recursive: true });
  if (!(await exists(p.index))) {
    await atomicJson(p.index, {
      schemaVersion: BACKLOG_SCHEMA_VERSION,
      activeBacklogId: null,
      backlogs: [],
      updatedAt: now(),
    });
  }
  return p;
}

async function loadIndex(root) {
  await ensureBacklogStore(root);
  return readJson(backlogPaths(root).index, {
    schemaVersion: BACKLOG_SCHEMA_VERSION,
    activeBacklogId: null,
    backlogs: [],
  });
}

async function saveIndex(root, index) {
  index.schemaVersion = BACKLOG_SCHEMA_VERSION;
  index.updatedAt = now();
  await atomicJson(backlogPaths(root).index, index);
}

function validateNoDuplicateIds(items) {
  const seen = new Set();
  for (const item of items) {
    if (!item.id) throw new Error("Every backlog item requires an id.");
    if (!/^[A-Za-z0-9._-]+$/.test(item.id)) {
      throw new Error(`Backlog item id must use only letters, numbers, dot, underscore, or dash: ${item.id}`);
    }
    if (seen.has(item.id)) throw new Error(`Duplicate backlog item id: ${item.id}`);
    seen.add(item.id);
  }
}

function validateDependencies(items) {
  const ids = new Set(items.map((item) => item.id));
  for (const item of items) {
    for (const dependency of item.dependsOn ?? []) {
      if (!ids.has(dependency)) {
        throw new Error(`Backlog item ${item.id} depends on unknown item ${dependency}.`);
      }
      if (dependency === item.id) {
        throw new Error(`Backlog item ${item.id} cannot depend on itself.`);
      }
    }
  }

  const visiting = new Set();
  const visited = new Set();
  const map = new Map(items.map((item) => [item.id, item]));

  function visit(id, chain = []) {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      throw new Error(`Backlog dependency cycle detected: ${[...chain, id].join(" -> ")}`);
    }
    visiting.add(id);
    const item = map.get(id);
    for (const dep of item?.dependsOn ?? []) visit(dep, [...chain, id]);
    visiting.delete(id);
    visited.add(id);
  }

  for (const item of items) visit(item.id);
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value.filter((entry) => entry !== null && entry !== undefined).map(String);
  if (value === null || value === undefined || value === "") return [];
  return [String(value)];
}

function normalizeBacklogItem(raw, index) {
  return {
    id: String(raw.id || `ITEM-${String(index + 1).padStart(2, "0")}`).trim(),
    title: String(raw.title || raw.objective || `Work item ${index + 1}`).trim(),
    objective: String(raw.objective || "").trim(),
    scope: normalizeArray(raw.scope),
    outOfScope: normalizeArray(raw.outOfScope),
    dependsOn: normalizeArray(raw.dependsOn),
    domains: normalizeArray(raw.domains),
    sourceRequirements: normalizeArray(raw.sourceRequirements),
    acceptanceCriteria: normalizeArray(raw.acceptanceCriteria),
    notes: raw.notes ? String(raw.notes) : null,
    recommendedOrder: Number.isFinite(Number(raw.recommendedOrder)) ? Number(raw.recommendedOrder) : index + 1,
    status: ["READY", "BLOCKED", "IN_PROGRESS", "DONE", "CANCELLED"].includes(raw.status)
      ? raw.status
      : "PLANNED",
    workId: raw.workId ? String(raw.workId) : null,
    manualBlock: Boolean(raw.manualBlock),
    blockReason: raw.blockReason ? String(raw.blockReason) : null,
    createdAt: raw.createdAt || now(),
    updatedAt: now(),
  };
}

function deriveItemStatuses(backlog) {
  const byId = new Map(backlog.workItems.map((item) => [item.id, item]));

  for (const item of backlog.workItems) {
    if (["IN_PROGRESS", "DONE", "CANCELLED"].includes(item.status)) continue;
    if (item.manualBlock) {
      item.status = "BLOCKED";
      item.blockReason = item.blockReason || "Manually blocked";
      continue;
    }
    const dependencies = item.dependsOn ?? [];
    const pending = dependencies.filter((id) => byId.get(id)?.status !== "DONE");
    if (pending.length > 0) {
      item.status = "BLOCKED";
      item.blockReason = `Waiting for: ${pending.join(", ")}`;
    } else {
      item.status = "READY";
      item.blockReason = null;
    }
  }

  const active = backlog.workItems.filter((item) => item.status === "IN_PROGRESS");
  const relevant = backlog.workItems.filter((item) => item.status !== "CANCELLED");
  const allDone = relevant.length > 0 && relevant.every((item) => item.status === "DONE");

  if (["COMPLETE", "CLOSED_WITH_WARNINGS"].includes(backlog.status)) {
    // Closure is explicit and should not be downgraded by a refresh.
  } else if (allDone) {
    backlog.status = "READY_TO_CLOSE";
  } else if (active.length > 0) {
    backlog.status = "IN_PROGRESS";
  } else {
    backlog.status = "PLANNED";
  }

  backlog.updatedAt = now();
  return backlog;
}

export function backlogToMarkdown(backlog) {
  const lines = [
    `# ${backlog.title}`,
    "",
    `- ID: ${backlog.id}`,
    `- Status: ${backlog.status}`,
    `- Objective: ${backlog.objective || "-"}`,
    `- Sources: ${(backlog.sourceDocuments ?? []).join(", ") || "-"}`,
    "",
  ];

  if (backlog.inScope?.length) {
    lines.push("## In Scope", "", ...backlog.inScope.map((item) => `- ${item}`), "");
  }
  if (backlog.outOfScope?.length) {
    lines.push("## Out of Scope", "", ...backlog.outOfScope.map((item) => `- ${item}`), "");
  }
  if (backlog.risks?.length) {
    lines.push("## Sprint Risks", "", ...backlog.risks.map((item) => `- ${item}`), "");
  }

  lines.push("## Work Items", "");
  for (const item of [...backlog.workItems].sort((a, b) => a.recommendedOrder - b.recommendedOrder)) {
    lines.push(
      `### ${item.id} — ${item.title}`,
      "",
      `- Status: ${item.status}`,
      `- Work ID: ${item.workId || "-"}`,
      `- Domains: ${(item.domains ?? []).join(", ") || "-"}`,
      `- Depends on: ${(item.dependsOn ?? []).join(", ") || "-"}`,
      `- Source requirements: ${(item.sourceRequirements ?? []).join(", ") || "-"}`,
      "",
    );
    if (item.objective) lines.push("**Objective**", "", item.objective, "");
    if (item.scope?.length) lines.push("**Scope**", "", ...item.scope.map((entry) => `- ${entry}`), "");
    if (item.outOfScope?.length) lines.push("**Out of Scope**", "", ...item.outOfScope.map((entry) => `- ${entry}`), "");
    if (item.acceptanceCriteria?.length) {
      lines.push("**Acceptance Criteria**", "", ...item.acceptanceCriteria.map((entry) => `- ${entry}`), "");
    }
    if (item.notes) lines.push("**Notes**", "", item.notes, "");
  }

  return `${lines.join("\n").trim()}\n`;
}

async function writeBacklogFiles(root, backlog) {
  const dir = backlogDir(root, backlog.id);
  await mkdir(dir, { recursive: true });
  await atomicJson(join(dir, "backlog.json"), backlog);
  await writeFile(join(dir, "backlog.md"), backlogToMarkdown(backlog), "utf8");
}

async function appendBacklogJournal(root, id, payload) {
  const dir = backlogDir(root, id);
  await mkdir(dir, { recursive: true });
  await appendFile(join(dir, "journal.jsonl"), `${JSON.stringify({ at: now(), ...payload })}\n`, "utf8");
}

async function upsertIndexEntry(root, backlog) {
  const index = await loadIndex(root);
  const entry = {
    id: backlog.id,
    title: backlog.title,
    status: backlog.status,
    sourceDocuments: backlog.sourceDocuments ?? [],
    updatedAt: backlog.updatedAt,
  };
  const position = index.backlogs.findIndex((item) => item.id === backlog.id);
  if (position >= 0) index.backlogs[position] = entry;
  else index.backlogs.push(entry);
  index.activeBacklogId = backlog.id;
  await saveIndex(root, index);
}

export async function saveBacklog(root, raw) {
  await ensureBacklogStore(root);
  if (!raw || typeof raw !== "object") throw new Error("Backlog payload must be an object.");

  const id = normalizeId(raw.id || raw.title || `backlog-${Date.now()}`);
  const existing = await loadBacklog(root, id, true);
  if (existing && ["COMPLETE", "CLOSED_WITH_WARNINGS"].includes(existing.status)) {
    throw new Error(`Backlog ${id} is already closed. Create a new backlog id for additional scope.`);
  }
  const rawItems = Array.isArray(raw.workItems) ? raw.workItems : [];
  if (rawItems.length === 0) throw new Error("Backlog requires at least one work item.");

  let workItems = rawItems.map(normalizeBacklogItem);

  // Re-planning the same backlog must never orphan already-started/completed work.
  if (existing?.workItems?.length) {
    const existingById = new Map(existing.workItems.map((item) => [item.id, item]));
    workItems = workItems.map((item) => {
      const previous = existingById.get(item.id);
      if (!previous) return item;
      if (["IN_PROGRESS", "DONE", "CANCELLED"].includes(previous.status) || previous.workId) {
        return {
          ...item,
          status: previous.status,
          workId: previous.workId ?? null,
          manualBlock: previous.manualBlock ?? false,
          blockReason: previous.blockReason ?? null,
          createdAt: previous.createdAt || item.createdAt,
        };
      }
      return { ...item, createdAt: previous.createdAt || item.createdAt };
    });

    const newIds = new Set(workItems.map((item) => item.id));
    for (const previous of existing.workItems) {
      if (!newIds.has(previous.id) && (previous.workId || ["IN_PROGRESS", "DONE"].includes(previous.status))) {
        workItems.push({ ...previous, updatedAt: now() });
      }
    }
  }

  validateNoDuplicateIds(workItems);
  validateDependencies(workItems);

  const backlog = deriveItemStatuses({
    schemaVersion: BACKLOG_SCHEMA_VERSION,
    id,
    title: String(raw.title || id).trim(),
    objective: String(raw.objective || "").trim(),
    sourceDocuments: normalizeArray(raw.sourceDocuments),
    inScope: normalizeArray(raw.inScope),
    outOfScope: normalizeArray(raw.outOfScope),
    assumptions: normalizeArray(raw.assumptions),
    dependencies: normalizeArray(raw.dependencies),
    risks: normalizeArray(raw.risks),
    acceptanceCriteria: normalizeArray(raw.acceptanceCriteria),
    status: existing?.status && ["IN_PROGRESS", "READY_TO_CLOSE", "COMPLETE", "CLOSED_WITH_WARNINGS"].includes(existing.status)
      ? existing.status
      : "PLANNED",
    workItems,
    closure: existing?.closure ?? null,
    createdAt: existing?.createdAt || now(),
    updatedAt: now(),
  });

  await writeBacklogFiles(root, backlog);
  await upsertIndexEntry(root, backlog);
  await appendBacklogJournal(root, id, { event: existing ? "backlog_updated" : "backlog_created", workItems: workItems.length });
  return backlog;
}

export async function loadBacklog(root, id, optional = false) {
  await ensureBacklogStore(root);
  try {
    return await readJson(join(backlogDir(root, id), "backlog.json"));
  } catch (error) {
    if (optional && error?.code === "ENOENT") return undefined;
    throw error;
  }
}

export async function listBacklogs(root) {
  const index = await loadIndex(root);
  return index.backlogs.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

export async function getActiveBacklogId(root) {
  return (await loadIndex(root)).activeBacklogId || undefined;
}

export async function setActiveBacklog(root, id) {
  await loadBacklog(root, id);
  const index = await loadIndex(root);
  index.activeBacklogId = id;
  await saveIndex(root, index);
}

export async function getActiveBacklog(root) {
  const id = await getActiveBacklogId(root);
  if (!id) return undefined;
  return loadBacklog(root, id);
}

export async function resolveStartableItem(root, itemId, backlogId) {
  const id = backlogId || await getActiveBacklogId(root);
  if (!id) throw new Error("No active backlog. Use /backlog-list or /plan-sprint first.");
  const { backlog: reconciledBacklog } = await reconcileBacklogWorkStates(root, id);
  const backlog = deriveItemStatuses(reconciledBacklog);
  await writeBacklogFiles(root, backlog);
  await upsertIndexEntry(root, backlog);
  const item = backlog.workItems.find((entry) => entry.id === itemId);
  if (!item) throw new Error(`Backlog ${id} has no item ${itemId}.`);
  if (item.status === "DONE") throw new Error(`${itemId} is already DONE.`);
  if (item.status === "CANCELLED") throw new Error(`${itemId} is CANCELLED.`);
  if (item.status === "IN_PROGRESS") throw new Error(`${itemId} is already IN_PROGRESS as ${item.workId || "a work item"}.`);
  if (item.status !== "READY") throw new Error(`${itemId} is ${item.status}${item.blockReason ? `: ${item.blockReason}` : ""}.`);
  return { backlog, item };
}

export async function linkBacklogWork(root, backlogId, itemId, workId) {
  const backlog = await loadBacklog(root, backlogId);
  const item = backlog.workItems.find((entry) => entry.id === itemId);
  if (!item) throw new Error(`Backlog ${backlogId} has no item ${itemId}.`);
  item.status = "IN_PROGRESS";
  item.workId = workId;
  item.manualBlock = false;
  item.blockReason = null;
  item.updatedAt = now();
  deriveItemStatuses(backlog);
  await writeBacklogFiles(root, backlog);
  await upsertIndexEntry(root, backlog);
  await appendBacklogJournal(root, backlog.id, { event: "work_started", itemId, workId });
  return backlog;
}

export async function syncBacklogWorkCompletion(root, source, workId) {
  if (!source || source.type !== "backlog" || !source.backlogId || !source.itemId) return false;
  const backlog = await loadBacklog(root, source.backlogId, true);
  if (!backlog) return false;
  const item = backlog.workItems.find((entry) => entry.id === source.itemId);
  if (!item) return false;
  item.status = "DONE";
  item.workId = workId;
  item.manualBlock = false;
  item.blockReason = null;
  item.updatedAt = now();
  deriveItemStatuses(backlog);
  await writeBacklogFiles(root, backlog);
  await upsertIndexEntry(root, backlog);
  await appendBacklogJournal(root, backlog.id, { event: "work_completed", itemId: item.id, workId });
  return true;
}

export async function syncBacklogWorkCancellation(root, source, workId, reason = "Linked work cancelled") {
  if (!source || source.type !== "backlog" || !source.backlogId || !source.itemId) return false;
  const backlog = await loadBacklog(root, source.backlogId, true);
  if (!backlog) return false;
  const item = backlog.workItems.find((entry) => entry.id === source.itemId);
  if (!item || item.status === "DONE") return false;
  item.status = "CANCELLED";
  item.workId = workId;
  item.manualBlock = false;
  item.blockReason = null;
  item.notes = reason || item.notes;
  item.updatedAt = now();
  deriveItemStatuses(backlog);
  await writeBacklogFiles(root, backlog);
  await upsertIndexEntry(root, backlog);
  await appendBacklogJournal(root, backlog.id, { event: "work_cancelled", itemId: item.id, workId, reason });
  return true;
}

/**
 * Fallback completion sync for work manifests created by older/stale runtimes
 * that linked a backlog item but did not persist manifest.source metadata.
 *
 * The backlog's item.workId is authoritative enough to recover the relation.
 */
export async function syncBacklogWorkCompletionByWorkId(root, workId) {
  if (!workId) return false;
  const index = await loadIndex(root);

  for (const entry of index.backlogs ?? []) {
    const backlog = await loadBacklog(root, entry.id, true);
    if (!backlog) continue;
    const item = backlog.workItems.find((candidate) => candidate.workId === workId);
    if (!item) continue;

    item.status = "DONE";
    item.manualBlock = false;
    item.blockReason = null;
    item.updatedAt = now();
    deriveItemStatuses(backlog);
    await writeBacklogFiles(root, backlog);
    await upsertIndexEntry(root, backlog);
    await appendBacklogJournal(root, backlog.id, {
      event: "work_completed_reconciled",
      itemId: item.id,
      workId,
    });
    return true;
  }

  return false;
}

/**
 * Reconcile a backlog projection against linked durable work manifests.
 *
 * This makes backlog state self-healing after interrupted upgrades, stale
 * module loads, or missed completion projection events.
 */
export async function reconcileBacklogWorkStates(root, backlogId) {
  const id = backlogId || await getActiveBacklogId(root);
  if (!id) throw new Error("No active backlog. Use /backlog-list or /plan-sprint first.");

  const backlog = await loadBacklog(root, id);
  let changed = false;
  const reconciled = [];

  for (const item of backlog.workItems) {
    if (!item.workId || item.status === "CANCELLED") continue;

    let manifest;
    try {
      manifest = await readJson(workManifestPath(root, item.workId));
    } catch (error) {
      if (error?.code === "ENOENT") continue;
      throw error;
    }

    const workComplete =
      manifest.status === "COMPLETE" ||
      manifest.currentStage === "COMPLETE";
    const workCancelled = manifest.status === "CANCELLED";

    if (workCancelled && item.status !== "CANCELLED") {
      item.status = "CANCELLED";
      item.manualBlock = false;
      item.blockReason = null;
      item.updatedAt = now();
      changed = true;
      reconciled.push({ itemId: item.id, workId: item.workId, status: "CANCELLED" });
    } else if (workComplete && item.status !== "DONE") {
      item.status = "DONE";
      item.manualBlock = false;
      item.blockReason = null;
      item.updatedAt = now();
      changed = true;
      reconciled.push({ itemId: item.id, workId: item.workId, status: "DONE" });
    } else if (!workComplete && !["IN_PROGRESS", "DONE"].includes(item.status)) {
      item.status = "IN_PROGRESS";
      item.manualBlock = false;
      item.blockReason = null;
      item.updatedAt = now();
      changed = true;
      reconciled.push({ itemId: item.id, workId: item.workId, status: "IN_PROGRESS" });
    }
  }

  deriveItemStatuses(backlog);

  // deriveItemStatuses may unlock dependencies even if only one linked item changed.
  if (changed) {
    await writeBacklogFiles(root, backlog);
    await upsertIndexEntry(root, backlog);
    await appendBacklogJournal(root, backlog.id, {
      event: "backlog_reconciled",
      changes: reconciled,
    });
  }

  return { backlog, changed, reconciled };
}

export async function updateBacklogItem(root, itemId, status, notes, backlogId) {
  const id = backlogId || await getActiveBacklogId(root);
  if (!id) throw new Error("No active backlog.");
  const backlog = await loadBacklog(root, id);
  const item = backlog.workItems.find((entry) => entry.id === itemId);
  if (!item) throw new Error(`Backlog ${id} has no item ${itemId}.`);
  if (["IN_PROGRESS", "DONE"].includes(item.status) || item.workId) {
    throw new Error(`${itemId} is lifecycle-owned by linked work ${item.workId || "state"}; update the work lifecycle instead.`);
  }

  const allowed = new Set(["READY", "BLOCKED", "CANCELLED"]);
  if (!allowed.has(status)) {
    throw new Error("Manual backlog status may only be READY, BLOCKED, or CANCELLED. IN_PROGRESS/DONE are managed by linked work lifecycle.");
  }
  item.status = status;
  item.notes = notes ?? item.notes;
  item.manualBlock = status === "BLOCKED";
  item.blockReason = status === "BLOCKED" ? (notes || "Manually blocked") : null;
  item.updatedAt = now();
  deriveItemStatuses(backlog);
  await writeBacklogFiles(root, backlog);
  await upsertIndexEntry(root, backlog);
  await appendBacklogJournal(root, backlog.id, { event: "item_updated", itemId, status, notes: notes ?? null });
  return backlog;
}

export async function saveBacklogClosure(root, backlogId, content, verdict) {
  const id = backlogId || await getActiveBacklogId(root);
  if (!id) throw new Error("No active backlog.");
  const backlog = deriveItemStatuses(await loadBacklog(root, id));
  const remaining = backlog.workItems.filter((item) => !["DONE", "CANCELLED"].includes(item.status));
  if (remaining.length > 0) {
    throw new Error(`Cannot close backlog: ${remaining.length} item(s) are not DONE/CANCELLED.`);
  }
  if (!new Set(["PASS", "PASS_WITH_WARNINGS", "FAIL"]).has(verdict)) {
    throw new Error("Closure verdict must be PASS, PASS_WITH_WARNINGS, or FAIL.");
  }
  const dir = backlogDir(root, id);
  await writeFile(join(dir, "closure.md"), content.endsWith("\n") ? content : `${content}\n`, "utf8");
  backlog.closure = { verdict, artifact: "closure.md", at: now() };
  backlog.status = verdict === "PASS" ? "COMPLETE" : verdict === "PASS_WITH_WARNINGS" ? "CLOSED_WITH_WARNINGS" : "READY_TO_CLOSE";
  backlog.updatedAt = now();
  await writeBacklogFiles(root, backlog);
  await upsertIndexEntry(root, backlog);
  await appendBacklogJournal(root, id, { event: "backlog_closure", verdict });
  return backlog;
}

export async function exportBacklogMarkdown(root, destination, backlogId) {
  const id = backlogId || await getActiveBacklogId(root);
  if (!id) throw new Error("No active backlog.");
  const backlog = await loadBacklog(root, id);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, backlogToMarkdown(backlog), "utf8");
  return backlog;
}
