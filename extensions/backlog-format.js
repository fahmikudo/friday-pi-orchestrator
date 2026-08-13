export const MODULE_VERSION = "2.0.2";
export function formatBacklog(backlog) {
  const items = [...(backlog.workItems ?? [])].sort(
    (a, b) => (a.recommendedOrder ?? 0) - (b.recommendedOrder ?? 0),
  );

  const counts = items.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] ?? 0) + 1;
    return acc;
  }, {});

  const lines = [
    `${backlog.id} — ${backlog.title}`,
    `Status: ${backlog.status}`,
    `Sources: ${(backlog.sourceDocuments ?? []).join(", ") || "-"}`,
    `Items: ${items.length} | DONE ${counts.DONE ?? 0} | IN_PROGRESS ${counts.IN_PROGRESS ?? 0} | READY ${counts.READY ?? 0} | BLOCKED ${counts.BLOCKED ?? 0} | CANCELLED ${counts.CANCELLED ?? 0}`,
    "",
  ];

  for (const item of items) {
    const icon =
      item.status === "DONE" ? "✓" :
      item.status === "IN_PROGRESS" ? "→" :
      item.status === "BLOCKED" ? "●" :
      item.status === "CANCELLED" ? "×" : "○";

    const work = item.workId ? ` -> ${item.workId}` : "";
    const deps = item.dependsOn?.length ? ` <- ${item.dependsOn.join(",")}` : "";
    const block = item.blockReason ? ` | ${item.blockReason}` : "";

    lines.push(
      `${icon} ${item.id} [${item.status}] ${item.title}${deps}${work}${block}`,
    );
  }

  if (backlog.closure) {
    lines.push(
      "",
      `Closure: ${backlog.closure.verdict} (${backlog.closure.artifact})`,
    );
  }

  return lines.join("\n");
}

export function formatBacklogList(items) {
  if (!items.length) return "No backlogs.";

  return items
    .map(
      (item) =>
        `${item.id}  ${String(item.status).padEnd(20)} ${item.title}`,
    )
    .join("\n");
}
