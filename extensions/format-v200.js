export const MODULE_VERSION = "2.0.0";

export function formatStatus(manifest, tasks = [], agents = [], routing = undefined) {
  const done = Object.entries(manifest.stages ?? {}).filter(([, value]) => value.status === "DONE").length;
  const total = manifest.route.length;
  const taskDone = tasks.filter((t) => t.status === "DONE").length;

  const lines = [
    `${manifest.id} — ${manifest.title}`,
    `Type: ${manifest.type} | Status: ${manifest.status} | Stage: ${manifest.currentStage}`,
    `Flow: ${manifest.route.join(" → ")}`,
    `Stages: ${done}/${total} done`,
    `Domains: ${(manifest.domains ?? []).join(", ")}`,
  ];

  if (manifest.source?.type === "backlog") lines.push(`Source: ${manifest.source.backlogId}:${manifest.source.itemId}`);
  if (manifest.risks?.length) lines.push(`Risks: ${manifest.risks.join(", ")}`);
  if (tasks.length) lines.push(`Tasks: ${taskDone}/${tasks.length} done`);
  lines.push(`Review: ${manifest.reviewVerdict} | Verify: ${manifest.verificationVerdict}`);

  const dirty = Object.entries(manifest.dirtyDomains ?? {})
    .filter(([, state]) => state.dirty)
    .map(([domain, state]) => `${domain}${state.files?.length ? `(${state.files.length})` : ""}`);
  lines.push(`Dirty: ${dirty.length ? dirty.join(", ") : "clean"}`);

  if (manifest.staleArtifacts?.length) lines.push(`Stale evidence: ${manifest.staleArtifacts.join(", ")}`);
  if (manifest.changeRequests?.length) lines.push(`Change requests: ${manifest.changeRequests.length}`);
  if (manifest.cancellation) lines.push(`Cancelled: ${manifest.cancellation.reason}`);
  if (manifest.lastFailure) lines.push(`Last failure: ${manifest.lastFailure.stage} — ${manifest.lastFailure.summary || "-"}`);

  if (routing) {
    lines.push(`Model profile: ${routing.modelProfile}${routing.model && routing.model !== "inherit" ? ` -> ${routing.model}` : ""}`);
    if (routing.skills?.length) lines.push(`Resolved skills: ${routing.skills.join(", ")}`);
  }

  const running = agents.filter((a) => ["running", "queued"].includes(a.status));
  if (running.length) lines.push(`Subagents: ${running.map((a) => `${a.type}:${a.status}`).join(", ")}`);
  return lines.join("\n");
}

export function formatWorkList(items) {
  if (!items.length) return "No work items.";
  return items.map((m) => `${m.id}  ${String(m.status).padEnd(16)} ${String(m.currentStage).padEnd(10)} ${m.title}`).join("\n");
}

export function formatTasks(tasks) {
  if (!tasks.length) return "No tasks yet.";
  return tasks.map((t) => {
    const deps = t.dependsOn?.length ? ` <- ${t.dependsOn.join(",")}` : "";
    return `${t.status === "DONE" ? "✓" : t.status === "IN_PROGRESS" ? "→" : t.status === "FAILED" ? "!" : "○"} ${t.id} [${t.owner}] ${t.description}${deps}`;
  }).join("\n");
}
