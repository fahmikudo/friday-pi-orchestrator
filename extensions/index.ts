import {
  isToolCallEventType,
  withFileMutationQueue,
  type ExtensionAPI,
} from "@earendil-works/pi-coding-agent";
import { StringEnum } from "@earendil-works/pi-ai";
import { Type } from "typebox";
import { Text } from "@earendil-works/pi-tui";
import { relative, resolve } from "node:path";

import {
  MODULE_VERSION as CORE_MODULE_VERSION,
  compactManifest,
  inferDomainFromPath,
  looksLikeMutatingBash,
  resolveModelProfile,
  resolveSkills,
  shouldAutoContinue,
  stageInstruction,
} from "./core.js";

import {
  MODULE_VERSION as STORE_MODULE_VERSION,
  approve,
  buildContextPacket,
  cancelWork,
  changeRequest,
  completeStage,
  createWork,
  ensureWorkspace,
  failStage,
  findWorkspaceRoot,
  getActiveManifest,
  listMemory,
  listWorkIds,
  loadManifest,
  loadProject,
  loadTasks,
  markDirty,
  remember,
  reject,
  reopenVerification,
  requestRework,
  saveArtifact,
  setActiveWork,
  setTasks,
  updateModelProfile,
  updateProjectMemory,
  updateRepositoryProfile,
  updateTask,
  updateWorkflowPolicy,
} from "./store.js";

import {
  MODULE_VERSION as FORMAT_MODULE_VERSION,
  formatStatus,
  formatTasks,
  formatWorkList,
} from "./format.js";

import {
  MODULE_VERSION as BACKLOG_FORMAT_MODULE_VERSION,
  formatBacklog,
  formatBacklogList,
} from "./backlog-format.js";

import {
  MODULE_VERSION as BACKLOG_MODULE_VERSION,
  exportBacklogMarkdown,
  getActiveBacklog,
  getActiveBacklogId,
  linkBacklogWork,
  listBacklogs,
  loadBacklog,
  reconcileBacklogWorkStates,
  resolveStartableItem,
  saveBacklog,
  saveBacklogClosure,
  setActiveBacklog,
  updateBacklogItem,
} from "./backlog.js";

import {
  MODULE_VERSION as RUNTIME_MODULE_VERSION,
  commandTouchesPiWork,
  isInsidePiWork,
  normalizeToolPath,
  stateQueueTarget,
} from "./runtime.js";

type UiContext = {
  cwd: string;
  ui: {
    notify(message: string, level?: "info" | "warning" | "error" | "success"): void;
    confirm(title: string, message: string): Promise<boolean>;
  };
  getContextUsage(): unknown;
  model?: unknown;
};

async function rootOrNotify(ctx: UiContext): Promise<string | undefined> {
  const root = await findWorkspaceRoot(ctx.cwd);
  if (!root) ctx.ui.notify("No .pi-work workspace. Run /init-workspace first.", "warning");
  return root;
}

async function activeOrNotify(ctx: UiContext) {
  const root = await rootOrNotify(ctx);
  if (!root) return {};
  const manifest = await getActiveManifest(root);
  if (!manifest) {
    ctx.ui.notify("No active work item. Start with /work <request>.", "warning");
    return { root };
  }
  return { root, manifest };
}

function contextPercent(ctx: UiContext): number | undefined {
  const usage = ctx.getContextUsage?.() as any;
  if (!usage) return undefined;
  if (typeof usage.percent === "number") return usage.percent;
  const tokens = usage.tokens;
  const window = (ctx.model as any)?.contextWindow;
  if (typeof tokens === "number" && typeof window === "number" && window > 0) {
    return (tokens / window) * 100;
  }
  return undefined;
}

async function tryGetSubagentService() {
  try {
    const mod = await import("@gotgenes/pi-subagents");
    return mod.getSubagentsService?.();
  } catch {
    return undefined;
  }
}

function parseBacklogItemRef(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return {};
  const colon = trimmed.indexOf(":");
  if (colon > 0) {
    return { backlogId: trimmed.slice(0, colon).trim(), itemId: trimmed.slice(colon + 1).trim() };
  }
  return { itemId: trimmed };
}

function backlogItemRequest(backlog: any, item: any) {
  const parts = [
    `Implement backlog item ${item.id}: ${item.title}.`,
    item.objective ? `\nObjective:\n${item.objective}` : "",
    item.scope?.length ? `\nIn scope:\n${item.scope.map((entry: string) => `- ${entry}`).join("\n")}` : "",
    item.outOfScope?.length ? `\nOut of scope:\n${item.outOfScope.map((entry: string) => `- ${entry}`).join("\n")}` : "",
    item.acceptanceCriteria?.length ? `\nAcceptance criteria:\n${item.acceptanceCriteria.map((entry: string) => `- ${entry}`).join("\n")}` : "",
    item.sourceRequirements?.length ? `\nSource requirements: ${item.sourceRequirements.join(", ")}` : "",
    backlog.sourceDocuments?.length ? `\nAuthoritative source documents: ${backlog.sourceDocuments.join(", ")}` : "",
    "\nKeep the work limited to this backlog item. Validate referenced documents against the current repository. Do not silently expand scope.",
  ];
  return parts.filter(Boolean).join("\n");
}

async function routingContext(root: string, manifest: any) {
  const project = await loadProject(root);
  const skills = resolveSkills(manifest, project.repositoryProfile ?? {});
  const modelProfile = resolveModelProfile(manifest);
  const model = project.modelProfiles?.[modelProfile] ?? "inherit";
  return { project, skills, modelProfile, model };
}

async function instructionFor(root: string, manifest: any) {
  const routing = await routingContext(root, manifest);
  return stageInstruction(manifest.currentStage, manifest.id, routing);
}

async function coordinatorKickoff(root: string, manifest: any) {
  return [
    `Continue durable engineering work ${manifest.id}: ${manifest.title}.`,
    await instructionFor(root, manifest),
    "",
    "Important orchestration rules:",
    "- Persist meaningful stage output with the `orchestrator` tool instead of relying on conversation history.",
    "- Load the resolved skills before substantive work; project conventions and approved design override generic skill defaults.",
    "- Use specialized subagents and keep implementation writers separate from independent reviewer/QA.",
    "- Read `.pi-work` artifacts/memory only when relevant; keep context bounded.",
    "- A human approval gate is mandatory at APPROVE.",
    "- If a stage fails, record the failure rather than pretending completion.",
    "- When complete_stage advances to another safe stage, Friday may queue a continuation automatically. Follow durable state, not stale chat instructions.",
  ].join("\n");
}

function continuationKickoff(workId: string) {
  return [
    `Continue durable work item ${workId}.`,
    "First call orchestrator action=get_state and treat the returned current stage as authoritative.",
    "Continue exactly that stage using its resolved skills and evidence requirements.",
    "Do not replay a stage merely because an older chat message mentioned it.",
  ].join("\n");
}


const RELEASE_VERSION = "2.0.1";

const ORCHESTRATOR_ACTIONS = [
  "init",
  "get_state",
  "save_artifact",
  "complete_stage",
  "fail_stage",
  "set_tasks",
  "update_task",
  "update_project_memory",
  "update_repository_profile",
  "update_workflow_policy",
  "update_model_profile",
  "request_rework",
  "change_request",
  "cancel_work",
  "remember",
  "save_backlog",
  "get_backlog",
  "save_backlog_closure",
] as const;

const VERDICTS = ["PASS", "PASS_WITH_WARNINGS", "FAIL"] as const;
const TASK_STATUSES = ["PENDING", "IN_PROGRESS", "DONE", "FAILED"] as const;
const MEMORY_SECTIONS = ["architecture", "conventions", "domain-map", "database", "testing"] as const;
const MEMORY_CONFIDENCE = ["CONFIRMED", "OBSERVED", "INFERRED", "STALE"] as const;

const MUTATING_ACTIONS = new Set<string>([
  "init",
  "get_state", // context packet is materialized under runtime/context
  "save_artifact",
  "complete_stage",
  "fail_stage",
  "set_tasks",
  "update_task",
  "update_project_memory",
  "update_repository_profile",
  "update_workflow_policy",
  "update_model_profile",
  "request_rework",
  "change_request",
  "cancel_work",
  "remember",
  "save_backlog",
  "save_backlog_closure",
]);

async function withStateMutation<T>(root: string, fn: () => Promise<T>): Promise<T> {
  return withFileMutationQueue(stateQueueTarget(root), fn);
}


function dispatchUserMessage(
  pi: ExtensionAPI,
  ctx: any,
  content: string | Array<any>,
  queuedNotice = "Continuation queued after the current agent turn.",
) {
  if (ctx.isIdle()) {
    pi.sendUserMessage(content);
    return "sent";
  }

  pi.sendUserMessage(content, { deliverAs: "followUp" });
  ctx.ui.notify(queuedNotice, "info");
  return "queued";
}


function appendCommandOutput(
  pi: ExtensionAPI,
  title: string,
  text: string,
  level: "info" | "success" | "warning" | "error" = "info",
) {
  pi.appendEntry("engineering-orchestrator-output", {
    title,
    text,
    level,
    at: new Date().toISOString(),
  });
}

function assertRuntimeModules() {
  const versions = {
    core: CORE_MODULE_VERSION,
    store: STORE_MODULE_VERSION,
    format: FORMAT_MODULE_VERSION,
    backlogFormat: BACKLOG_FORMAT_MODULE_VERSION,
    backlog: BACKLOG_MODULE_VERSION,
    runtime: RUNTIME_MODULE_VERSION,
  };
  const mismatched = Object.entries(versions).filter(([, version]) => version !== RELEASE_VERSION);
  if (mismatched.length) {
    throw new Error(
      `Friday Pi Orchestrator module mismatch: ${mismatched
        .map(([name, version]) => `${name}=${version}`)
        .join(", ")}; expected ${RELEASE_VERSION}. Fully restart Pi after reinstalling.`,
    );
  }
  return versions;
}

export default function engineeringOrchestrator(pi: ExtensionAPI) {
  assertRuntimeModules();

  pi.registerEntryRenderer("engineering-orchestrator-output", (entry, _options, theme) => {
    const data = entry.data as {
      title?: string;
      text?: string;
      level?: "info" | "success" | "warning" | "error";
      at?: string;
    };

    const level = data.level ?? "info";
    const color =
      level === "error" ? "error" :
      level === "warning" ? "warning" :
      level === "success" ? "success" :
      "accent";

    const title = data.title ? `${theme.bold(theme.fg(color, data.title))}\n` : "";
    return new Text(`${title}${data.text ?? ""}`);
  });

  let warnedWork: string | undefined;

  pi.registerTool({
    name: "orchestrator",
    label: "Friday Pi Orchestrator",
    description: "Read or update durable .pi-work work state, artifacts, tasks, project memory, and optional sprint backlogs.",
    promptSnippet: "Use `orchestrator` to persist durable engineering workflow state, project memory, artifacts, and optional backlog planning.",
    promptGuidelines: [
      "Use orchestrator for durable work state instead of relying on conversation memory.",
      "Use orchestrator complete_stage only after the current stage's required artifact/evidence is persisted.",
      "For PRD/sprint planning, persist the final work-item breakdown with save_backlog before presenting it as durable.",
    ],
    parameters: Type.Object({
      action: StringEnum(ORCHESTRATOR_ACTIONS),
      kind: Type.Optional(Type.String()),
      content: Type.Optional(Type.String()),
      verdict: Type.Optional(StringEnum(VERDICTS)),
      tasks: Type.Optional(Type.Array(Type.Object({
        id: Type.Optional(Type.String()),
        owner: Type.Optional(Type.String()),
        description: Type.String(),
        dependsOn: Type.Optional(Type.Array(Type.String())),
        status: Type.Optional(StringEnum(TASK_STATUSES)),
        notes: Type.Optional(Type.String()),
      }))),
      taskId: Type.Optional(Type.String()),
      taskStatus: Type.Optional(StringEnum(TASK_STATUSES)),
      notes: Type.Optional(Type.String()),
      section: Type.Optional(StringEnum(MEMORY_SECTIONS)),
      confidence: Type.Optional(StringEnum(MEMORY_CONFIDENCE)),
      source: Type.Optional(Type.String()),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      assertRuntimeModules();

      let root = await findWorkspaceRoot(ctx.cwd);

      if (!root && params.action === "init") {
        await withStateMutation(ctx.cwd, () => ensureWorkspace(ctx.cwd));
        root = await findWorkspaceRoot(ctx.cwd);
      }

      if (!root) {
        throw new Error("No .pi-work workspace. Run /init-workspace first.");
      }

      const runAction = async () => {
        // Project-scoped actions are valid before the first /work item.
        if (params.action === "init") {
          const p = await ensureWorkspace(root!);
          return {
            content: [{
              type: "text",
              text: `Workspace is initialized at ${relative(root!, p.base) || ".pi-work"}. Continue bootstrap with action=update_project_memory.`,
            }],
            details: { ok: true, workspace: relative(root!, p.base) || ".pi-work" },
          };
        }

        if (params.action === "update_project_memory") {
          if (!params.section || !params.content) throw new Error("section and content are required");
          const target = await updateProjectMemory(root!, params.section, params.content);
          return {
            content: [{ type: "text", text: `Updated project memory: ${relative(root!, target)}` }],
            details: { ok: true, section: params.section },
          };
        }

        if (params.action === "update_repository_profile") {
          if (!params.content) throw new Error("content JSON is required");
          let profile;
          try { profile = JSON.parse(params.content); } catch { throw new Error("update_repository_profile content must be valid JSON."); }
          const updated = await updateRepositoryProfile(root!, profile);
          return {
            content: [{ type: "text", text: `Updated repository profile: ${JSON.stringify(updated)}` }],
            details: { ok: true, profile: updated },
          };
        }

        if (params.action === "update_workflow_policy") {
          if (!params.content) throw new Error("content JSON is required");
          let patch;
          try { patch = JSON.parse(params.content); } catch { throw new Error("update_workflow_policy content must be valid JSON."); }
          const updated = await updateWorkflowPolicy(root!, patch);
          return {
            content: [{ type: "text", text: `Updated workflow policy: ${JSON.stringify(updated)}` }],
            details: { ok: true, workflowPolicy: updated },
          };
        }

        if (params.action === "update_model_profile") {
          if (!params.kind) throw new Error("kind must be the model profile name");
          const updated = await updateModelProfile(root!, params.kind, params.content || "inherit");
          return {
            content: [{ type: "text", text: `Updated model profile ${params.kind} -> ${updated[params.kind]}.` }],
            details: { ok: true, modelProfiles: updated },
          };
        }

        if (params.action === "remember") {
          if (!params.content) throw new Error("content is required");
          const active = await getActiveManifest(root!);
          const entry = await remember(
            root!,
            params.content,
            params.confidence ?? "OBSERVED",
            params.source ?? (active ? `work:${active.id}` : "project"),
          );
          return {
            content: [{ type: "text", text: `Saved durable memory ${entry.id} (${entry.confidence}).` }],
            details: { ok: true, entry },
          };
        }

        if (params.action === "save_backlog") {
          if (!params.content) throw new Error("content JSON is required");
          let payload;
          try {
            payload = JSON.parse(params.content);
          } catch {
            throw new Error("save_backlog content must be valid JSON.");
          }
          const backlog = await saveBacklog(root!, payload);
          return {
            content: [{ type: "text", text: `Saved backlog ${backlog.id} with ${backlog.workItems.length} work item(s).` }],
            details: { ok: true, backlogId: backlog.id, status: backlog.status },
          };
        }

        if (params.action === "get_backlog") {
          const backlog = params.kind ? await loadBacklog(root!, params.kind) : await getActiveBacklog(root!);
          if (!backlog) throw new Error("No active backlog.");
          return {
            content: [{ type: "text", text: JSON.stringify(backlog, null, 2) }],
            details: { ok: true, backlogId: backlog.id },
          };
        }

        if (params.action === "save_backlog_closure") {
          if (!params.content || !params.verdict) throw new Error("content and verdict are required");
          const backlog = await saveBacklogClosure(root!, params.kind, params.content, params.verdict);
          return {
            content: [{ type: "text", text: `Saved closure for ${backlog.id}: ${backlog.closure?.verdict}.` }],
            details: { ok: true, backlogId: backlog.id, status: backlog.status, verdict: backlog.closure?.verdict },
          };
        }

        // Remaining actions are work-scoped.
        const manifest = await getActiveManifest(root!);
        if (!manifest) {
          throw new Error("No active work item. Start with /work <request>.");
        }

        switch (params.action) {
          case "get_state": {
            const tasks = await loadTasks(root!, manifest.id);
            const packet = await buildContextPacket(root!, manifest.id);
            const routing = await routingContext(root!, manifest);
            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  work: compactManifest(manifest),
                  tasks: tasks.tasks,
                  contextPacket: relative(root!, packet.path),
                  routing: { skills: routing.skills, modelProfile: routing.modelProfile, model: routing.model },
                  instruction: stageInstruction(manifest.currentStage, manifest.id, routing),
                }, null, 2),
              }],
              details: { ok: true, workId: manifest.id },
            };
          }

          case "save_artifact": {
            if (!params.kind || !params.content) throw new Error("kind and content are required");
            const path = await saveArtifact(root!, manifest.id, params.kind, params.content, params.verdict);
            return {
              content: [{ type: "text", text: `Saved ${params.kind} artifact: ${path}` }],
              details: { ok: true, path, verdict: params.verdict ?? null },
            };
          }

          case "complete_stage": {
            const updated = await completeStage(root!, manifest.id);
            pi.appendEntry("friday-orchestrator-state", compactManifest(updated));
            const routing = await routingContext(root!, updated);
            const autoContinue = shouldAutoContinue(updated, routing.project);
            if (autoContinue) {
              dispatchUserMessage(pi, ctx, continuationKickoff(updated.id), `Friday queued ${updated.id} continuation at ${updated.currentStage}.`);
            }
            return {
              content: [{
                type: "text",
                text: [
                  `Stage advanced to ${updated.currentStage}. Status: ${updated.status}.`,
                  stageInstruction(updated.currentStage, updated.id, routing),
                  autoContinue ? "Friday queued the next safe stage as a follow-up. The follow-up will re-read durable state." : "",
                ].filter(Boolean).join("\n"),
              }],
              details: { ok: true, work: compactManifest(updated), autoContinue },
            };
          }

          case "fail_stage": {
            const failedStage = manifest.currentStage;
            const updated = await failStage(root!, manifest.id, params.content || params.notes || "Stage failed");
            pi.appendEntry("friday-orchestrator-state", compactManifest(updated));
            const routing = await routingContext(root!, updated);
            const autoContinue = shouldAutoContinue(updated, routing.project);
            if (autoContinue) {
              dispatchUserMessage(pi, ctx, continuationKickoff(updated.id), `Friday queued ${updated.id} recovery at ${updated.currentStage}.`);
            }
            return {
              content: [{
                type: "text",
                text: [
                  `${failedStage} recorded as FAILED. Work status: ${updated.status}.`,
                  updated.currentStage !== failedStage ? `Recovery stage: ${updated.currentStage}.` : `Current stage remains ${updated.currentStage}.`,
                  autoContinue ? "Friday queued the safe recovery stage as a follow-up." : "",
                ].filter(Boolean).join("\n"),
              }],
              details: { ok: true, work: compactManifest(updated), failedStage, autoContinue },
            };
          }

          case "set_tasks": {
            if (!params.tasks?.length) throw new Error("tasks are required");
            const tasks = await setTasks(root!, manifest.id, params.tasks);
            return {
              content: [{ type: "text", text: `Persisted ${tasks.length} implementation task(s).` }],
              details: { ok: true, taskCount: tasks.length },
            };
          }

          case "update_task": {
            if (!params.taskId || !params.taskStatus) throw new Error("taskId and taskStatus are required");
            const task = await updateTask(root!, manifest.id, params.taskId, params.taskStatus, params.notes);
            return {
              content: [{ type: "text", text: `${task.id} → ${task.status}` }],
              details: { ok: true, task },
            };
          }

          case "request_rework": {
            const updated = await requestRework(root!, manifest.id, params.content || params.notes || "Implementation rework requested");
            pi.appendEntry("friday-orchestrator-state", compactManifest(updated));
            return { content: [{ type: "text", text: `${updated.id} returned to IMPLEMENT for rework.` }], details: { ok: true, work: compactManifest(updated) } };
          }

          case "change_request": {
            if (!params.content) throw new Error("content is required");
            const updated = await changeRequest(root!, manifest.id, params.content);
            pi.appendEntry("friday-orchestrator-state", compactManifest(updated));
            return { content: [{ type: "text", text: `${updated.id} change request persisted; returned to ${updated.currentStage}.` }], details: { ok: true, work: compactManifest(updated) } };
          }

          case "cancel_work": {
            const updated = await cancelWork(root!, manifest.id, params.content || params.notes || "Cancelled by user");
            pi.appendEntry("friday-orchestrator-state", compactManifest(updated));
            return { content: [{ type: "text", text: `${updated.id} CANCELLED.` }], details: { ok: true, work: compactManifest(updated) } };
          }

          default:
            throw new Error(`Unsupported orchestrator action: ${params.action}`);
        }
      };

      if (MUTATING_ACTIONS.has(params.action)) {
        return withStateMutation(root, runAction);
      }
      return runAction();
    },
  });

  pi.registerCommand("init-workspace", {
    description: "Initialize durable .pi-work state and bootstrap project memory",
    handler: async (args, ctx) => {
      const p = await withStateMutation(ctx.cwd, () => ensureWorkspace(ctx.cwd));
      ctx.ui.notify(`Initialized ${relative(ctx.cwd, p.base) || ".pi-work"}`, "success");

      const noScan = args.includes("--no-scan");
      if (noScan) return;

      dispatchUserMessage(pi, ctx, [
        "Bootstrap durable project memory for this repository.",
        "Inspect the repository efficiently; do not modify product code.",
        "The workspace is already initialized. Do not call action=init unless you only need an idempotent initialization check.",
        "Use the `orchestrator` tool with action=update_project_memory to populate:",
        "1. architecture — architecture style, dependency direction, module boundaries",
        "2. conventions — language/framework/tooling and important coding conventions",
        "3. domain-map — modules/domains and ownership",
        "4. database — DB engine, migration tooling, schema ownership conventions",
        "5. testing — formatter/linter/test/build commands actually supported by the repository",
        "Then call orchestrator action=update_repository_profile with content as JSON containing detected languages, frameworks, databases, infrastructure, packageManagers, and testCommands.",
        "Example: {\"languages\":[\"Go\",\"TypeScript\"],\"frameworks\":[\"Echo\",\"React\"],\"databases\":[\"PostgreSQL\"],\"infrastructure\":[\"Docker\"],\"packageManagers\":[\"Go modules\",\"npm\"],\"testCommands\":[\"go test ./...\",\"npm test\"]}",
        "Keep memory and repository profile concise and evidence-based. Do not invent facts.",
      ].join("\n"));
    },
  });

  pi.registerCommand("plan-sprint", {
    description: "Plan and persist a sprint backlog from a PRD or technical documents",
    handler: async (args, ctx) => {
      const sourceSpec = args.trim();
      if (!sourceSpec) {
        ctx.ui.notify("Usage: /plan-sprint <PRD path and optional supporting documents>", "warning");
        return;
      }
      const root = await findWorkspaceRoot(ctx.cwd) ?? ctx.cwd;
      await withStateMutation(root, () => ensureWorkspace(root));

      dispatchUserMessage(pi, ctx, [
        "Create a durable sprint engineering backlog from the following source documents/specification:",
        sourceSpec,
        "",
        "Do not implement code and do not create /work items yet.",
        "Treat the PRD/product document as scope truth. Treat explicitly approved technical documents as design truth unless they conflict with the current repository.",
        "Inspect enough repository context to make the work breakdown realistic, but keep this planning pass read-only.",
        "Use product-manager and software-architect read-only subagents when they materially improve scope or dependency analysis.",
        "",
        "Break the sprint into independently deliverable work items. Each item should have one clear outcome and be independently reviewable.",
        "Preserve dependencies and recommended execution order. Avoid one giant work item for the whole sprint.",
        "",
        "Persist the final backlog using orchestrator action=save_backlog. The `content` field must be a JSON string with this shape:",
        JSON.stringify({
          id: "sprint-2",
          title: "Sprint 2",
          objective: "Sprint objective",
          sourceDocuments: ["docs/sprints/sprint-2-prd.md"],
          inScope: ["..."],
          outOfScope: ["..."],
          assumptions: ["..."],
          dependencies: ["..."],
          risks: ["..."],
          acceptanceCriteria: ["..."],
          workItems: [{
            id: "S2-01",
            title: "Clear delivery unit",
            objective: "Outcome",
            scope: ["..."],
            outOfScope: ["..."],
            dependsOn: [],
            domains: ["backend", "database"],
            sourceRequirements: ["FR-2.1"],
            acceptanceCriteria: ["..."],
            recommendedOrder: 1,
          }],
        }, null, 2),
        "",
        "After persistence, summarize execution order, READY/BLOCKED items, important scope boundaries, and risks.",
      ].join("\n"));
    },
  });

  pi.registerCommand("backlog-list", {
    description: "List persisted sprint/project backlogs",
    handler: async (_args, ctx) => {
      const root = await rootOrNotify(ctx);
      if (!root) return;
      const items = await listBacklogs(root);
      appendCommandOutput(pi, "Sprint Backlogs", formatBacklogList(items));
    },
  });

  pi.registerCommand("backlog", {
    description: "Show a backlog; providing an id also makes it active",
    handler: async (args, ctx) => {
      const root = await rootOrNotify(ctx);
      if (!root) return;
      try {
        const requested = args.trim();
        let backlog;
        let reconciled;
        if (requested) {
          ({ backlog, reconciled } = await withStateMutation(root, async () => {
            const selected = await loadBacklog(root, requested);
            await setActiveBacklog(root, requested);
            const repaired = await reconcileBacklogWorkStates(root, selected.id);
            return { backlog: repaired.backlog, reconciled: repaired };
          }));
        } else {
          const active = await getActiveBacklog(root);
          if (!active) {
            ctx.ui.notify("No active backlog. Use /plan-sprint or /backlog-list.", "warning");
            return;
          }
          reconciled = await withStateMutation(root, () => reconcileBacklogWorkStates(root, active.id));
          backlog = reconciled.backlog;
        }
        if (!backlog) {
          ctx.ui.notify("No active backlog. Use /plan-sprint or /backlog-list.", "warning");
          return;
        }
        if (reconciled.changed) {
          ctx.ui.notify(
            `Reconciled ${reconciled.reconciled.length} linked work item(s) from durable work state.`,
            "success",
          );
        }
        appendCommandOutput(pi, "Sprint Backlog", formatBacklog(backlog));
      } catch (error) {
        ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
      }
    },
  });

  pi.registerCommand("backlog-reconcile", {
    description: "Reconcile backlog item statuses from linked durable work manifests",
    handler: async (args, ctx) => {
      const root = await rootOrNotify(ctx);
      if (!root) return;

      try {
        const requested = args.trim() || undefined;
        const result = await withStateMutation(root, () => reconcileBacklogWorkStates(root, requested));
        const summary = result.reconciled.length
          ? result.reconciled.map((item) => `${item.itemId} -> ${item.status} (${item.workId})`).join("\n")
          : "No backlog/work state differences found.";
        appendCommandOutput(
          pi,
          "Backlog Reconciliation",
          summary,
          result.changed ? "success" : "info",
        );
        appendCommandOutput(pi, "Sprint Backlog", formatBacklog(result.backlog));
      } catch (error) {
        ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
      }
    },
  });

  pi.registerCommand("start", {
    description: "Start a READY backlog item as a normal durable /work lifecycle",
    handler: async (args, ctx) => {
      const ref = parseBacklogItemRef(args);
      if (!ref.itemId) {
        ctx.ui.notify("Usage: /start <item-id> or /start <backlog-id>:<item-id>", "warning");
        return;
      }
      const root = await rootOrNotify(ctx);
      if (!root) return;

      try {
        const { backlog, item, manifest } = await withStateMutation(root, async () => {
          const { backlog, item } = await resolveStartableItem(root, ref.itemId, ref.backlogId);
          await setActiveBacklog(root, backlog.id);
          const request = backlogItemRequest(backlog, item);
          const source = {
            type: "backlog",
            backlogId: backlog.id,
            itemId: item.id,
            sourceDocuments: backlog.sourceDocuments ?? [],
            sourceRequirements: item.sourceRequirements ?? [],
          };
          const manifest = await createWork(root, request, {
            title: `${item.id} ${item.title}`,
            source,
          });
          await linkBacklogWork(root, backlog.id, item.id, manifest.id);
          return { backlog, item, manifest };
        });
        pi.setSessionName(`${manifest.id} ${manifest.title.slice(0, 48)}`);
        pi.appendEntry("friday-orchestrator-state", compactManifest(manifest));
        ctx.ui.notify(`${item.id} -> ${manifest.id}: ${manifest.type} | ${manifest.route.join(" → ")}`, "success");
        dispatchUserMessage(pi, ctx, await coordinatorKickoff(root, manifest));
      } catch (error) {
        ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
      }
    },
  });

  pi.registerCommand("backlog-update", {
    description: "Manually READY/BLOCK/CANCEL a backlog item (lifecycle owns IN_PROGRESS/DONE)",
    handler: async (args, ctx) => {
      const root = await rootOrNotify(ctx);
      if (!root) return;
      const parts = args.trim().split(/\s+/);
      if (parts.length < 2) {
        ctx.ui.notify("Usage: /backlog-update <item-id> <READY|BLOCKED|CANCELLED> [notes]", "warning");
        return;
      }
      const ref = parseBacklogItemRef(parts[0]);
      const status = String(parts[1]).toUpperCase();
      const notes = parts.slice(2).join(" ") || undefined;
      try {
        const backlog = await withStateMutation(root, () => updateBacklogItem(root, ref.itemId!, status, notes, ref.backlogId));
        ctx.ui.notify(formatBacklog(backlog), "success");
      } catch (error) {
        ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
      }
    },
  });

  pi.registerCommand("backlog-export", {
    description: "Export the active backlog as human-readable Markdown",
    handler: async (args, ctx) => {
      const root = await rootOrNotify(ctx);
      if (!root) return;
      const destinationArg = args.trim();
      if (!destinationArg) {
        ctx.ui.notify("Usage: /backlog-export <destination.md>", "warning");
        return;
      }
      try {
        const destination = resolve(ctx.cwd, destinationArg);
        const backlog = await withFileMutationQueue(destination, () => exportBacklogMarkdown(root, destination));
        ctx.ui.notify(`Exported ${backlog.id} to ${relative(root, destination)}`, "success");
      } catch (error) {
        ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
      }
    },
  });

  pi.registerCommand("close-sprint", {
    description: "Audit a completed backlog against its sources and persist sprint closure",
    handler: async (args, ctx) => {
      const root = await rootOrNotify(ctx);
      if (!root) return;
      const id = args.trim() || await getActiveBacklogId(root);
      if (!id) {
        ctx.ui.notify("No active backlog.", "warning");
        return;
      }
      try {
        const backlog = await loadBacklog(root, id);
        const remaining = backlog.workItems.filter((item: any) => !["DONE", "CANCELLED"].includes(item.status));
        if (remaining.length) {
          ctx.ui.notify(`Cannot close ${id}: ${remaining.length} item(s) are not DONE/CANCELLED.`, "warning");
          return;
        }
        await withStateMutation(root, () => setActiveBacklog(root, id));
        dispatchUserMessage(pi, ctx, [
          `Perform closure for backlog ${id}: ${backlog.title}.`,
          "Do not modify product code.",
          `Authoritative source documents: ${(backlog.sourceDocuments ?? []).join(", ") || "recorded backlog sources"}.`,
          "Audit the source requirements against the linked completed work items under .pi-work/work/.",
          "Report requirement coverage, incomplete/deferred scope, deviations, review/verification evidence, technical debt, and residual risk.",
          "Persist the closure using orchestrator action=save_backlog_closure, kind set to the backlog id, content set to the Markdown closure report, and verdict PASS, PASS_WITH_WARNINGS, or FAIL.",
        ].join("\n"));
      } catch (error) {
        ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
      }
    },
  });

  pi.registerCommand("work", {
    description: "Start a durable engineering work item",
    handler: async (args, ctx) => {
      const request = args.trim();
      if (!request) {
        ctx.ui.notify("Usage: /work <request>", "warning");
        return;
      }
      const root = await findWorkspaceRoot(ctx.cwd) ?? ctx.cwd;
      const manifest = await withStateMutation(root, async () => {
        await ensureWorkspace(root);
        return createWork(root, request);
      });
      pi.setSessionName(`${manifest.id} ${manifest.title.slice(0, 48)}`);
      pi.appendEntry("friday-orchestrator-state", compactManifest(manifest));

      ctx.ui.notify(
        `${manifest.id}: ${manifest.type} | ${manifest.route.join(" → ")}`,
        "success",
      );

      dispatchUserMessage(pi, ctx, await coordinatorKickoff(root, manifest));
    },
  });

  const workStatusHandler = async (args: string, ctx: any) => {
    const root = await rootOrNotify(ctx);
    if (!root) return;
    const project = await loadProject(root);
    const id = args.trim() || project.activeWorkId;
    if (!id) {
      ctx.ui.notify("No active work item.", "info");
      return;
    }
    try {
      const manifest = await loadManifest(root, id);
      const tasks = (await loadTasks(root, id)).tasks;
      const svc = await tryGetSubagentService();
      const agents = svc?.listAgents?.() ?? [];
      const routing = await routingContext(root, manifest);
      appendCommandOutput(pi, "Work Status", formatStatus(manifest, tasks, agents, routing));
    } catch (error) {
      ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
    }
  };

  pi.registerCommand("status", {
    description: "Show current durable work status",
    handler: workStatusHandler,
  });

  pi.registerCommand("work-status", {
    description: "Alias for /status; show current durable work status",
    handler: workStatusHandler,
  });

  pi.registerCommand("work-list", {
    description: "List durable work items",
    handler: async (_args, ctx) => {
      const root = await rootOrNotify(ctx);
      if (!root) return;
      const ids = await listWorkIds(root);
      const manifests = [];
      for (const id of ids.slice(0, 30)) {
        try { manifests.push(await loadManifest(root, id)); } catch {}
      }
      appendCommandOutput(pi, "Work Items", formatWorkList(manifests));
    },
  });

  pi.registerCommand("tasks", {
    description: "Show tasks for the active work item",
    handler: async (_args, ctx) => {
      const { root, manifest } = await activeOrNotify(ctx);
      if (!root || !manifest) return;
      const tasks = (await loadTasks(root, manifest.id)).tasks;
      appendCommandOutput(pi, "Work Tasks", formatTasks(tasks));
    },
  });

  pi.registerCommand("work-resume", {
    description: "Resume a durable work item using a bounded context packet (recommended explicit command)",
    handler: async (args, ctx) => {
      const root = await rootOrNotify(ctx);
      if (!root) return;
      const project = await loadProject(root);
      const id = args.trim() || project.activeWorkId;
      if (!id) {
        ctx.ui.notify("No work item to resume.", "warning");
        return;
      }
      const { manifest, packet } = await withStateMutation(root, async () => {
        const manifest = await loadManifest(root, id);
        await setActiveWork(root, id);
        const packet = await buildContextPacket(root, id);
        return { manifest, packet };
      });

      pi.setSessionName(`${manifest.id} ${manifest.title.slice(0, 48)}`);
      pi.appendEntry("friday-orchestrator-state", compactManifest(manifest));
      ctx.ui.notify(`Resuming ${manifest.id} at ${manifest.currentStage}. Context packet: ${relative(root, packet.path)}`, "success");

      const percent = contextPercent(ctx);
      if (percent !== undefined && percent >= 80) {
        const continueHere = await ctx.ui.confirm(
          "High context usage",
          `Current session is ${percent.toFixed(0)}% full. Continue here instead of using /new then /work-resume ${id}?`,
        );
        if (!continueHere) {
          ctx.ui.notify(`State is ready. Start /new, then run /work-resume ${id}.`, "info");
          return;
        }
      } else if (percent !== undefined && percent >= 70) {
        ctx.ui.notify(`Context is ${percent.toFixed(0)}%. A fresh /new + /work-resume ${id} will be more token-efficient.`, "warning");
      }

      const routing = await routingContext(root, manifest);
      if (manifest.status === "BLOCKED" && manifest.currentStage === "VERIFY") {
        appendCommandOutput(
          pi,
          "Work Blocked",
          `${manifest.id} is blocked at VERIFY. Use /work-verify to re-run verification without implementation changes, or /rework <reason> if code must change before verification.`,
          "warning",
        );
        return;
      }
      if (manifest.status === "CANCELLED") {
        appendCommandOutput(pi, "Work Cancelled", `${manifest.id} is CANCELLED: ${manifest.cancellation?.reason || "-"}`, "warning");
        return;
      }

      dispatchUserMessage(
        pi,
        ctx,
        [
          `Resume durable work item ${manifest.id}.`,
          "Treat the context packet below as the durable handoff; do not reconstruct prior conversation history.",
          "",
          packet.content,
          "",
          stageInstruction(manifest.currentStage, manifest.id, routing),
        ].join("\n"),
        `Work ${manifest.id} continuation queued after the current agent turn.`,
      );
    },
  });

  pi.registerCommand("work-verify", {
    description: "Run orchestrator-aware verification and persist the verdict into the active durable work item",
    handler: async (args, ctx) => {
      const { root, manifest } = await activeOrNotify(ctx);
      if (!root || !manifest) return;

      if (manifest.currentStage !== "VERIFY") {
        ctx.ui.notify(`Work ${manifest.id} is at ${manifest.currentStage}, not VERIFY.`, "warning");
        return;
      }

      try {
        const reopened = await withStateMutation(root, () =>
          reopenVerification(root, manifest.id, args.trim() || "Orchestrator-aware re-verification requested"),
        );
        const packet = await withStateMutation(root, () => buildContextPacket(root, manifest.id));
        pi.appendEntry("friday-orchestrator-state", compactManifest(reopened));
        ctx.ui.notify(`${manifest.id} VERIFY reopened for durable re-verification.`, "success");

        dispatchUserMessage(
          pi,
          ctx,
          [
            `Verify durable work item ${manifest.id}.`,
            args.trim() ? `Verification scope: ${args.trim()}` : "Verify all changes relevant to the active work item.",
            "",
            "This verification is part of the durable orchestrator lifecycle, not a chat-only QA report.",
            "Use the qa-engineer as the independent verifier when it works. If the qa-engineer returns no useful report or tools, the parent agent may perform direct read-only verification and must record that limitation.",
            "Run the strongest appropriate checks supported by the repository. Distinguish implementation failures from tooling/environment failures and pre-existing failures.",
            "",
            "After verification you MUST persist the result with the orchestrator tool:",
            "- action=save_artifact",
            "- kind=verification",
            "- content=<full Markdown verification report>",
            "- verdict exactly PASS, PASS_WITH_WARNINGS, or FAIL.",
            "",
            "Then:",
            "- for PASS or PASS_WITH_WARNINGS: call orchestrator action=complete_stage;",
            "- for FAIL: call orchestrator action=fail_stage with a concise failure summary.",
            "Do not stop after printing a verdict to chat.",
            "A previous FAIL is historical evidence and may be replaced by a newer verification verdict after re-verification; preserve the old failure in the journal rather than treating it as immutable terminal state.",
            "",
            packet.content,
          ].join("\n"),
          `Verification for ${manifest.id} queued after the current agent turn.`,
        );
      } catch (error) {
        ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
      }
    },
  });

  pi.registerCommand("approve", {
    description: "Approve the active design gate and continue",
    handler: async (args, ctx) => {
      const root = await rootOrNotify(ctx);
      if (!root) return;
      const project = await loadProject(root);
      const id = args.trim() || project.activeWorkId;
      if (!id) return ctx.ui.notify("No work item.", "warning");

      try {
        const manifest = await withStateMutation(root, () => approve(root, id));
        pi.appendEntry("friday-orchestrator-state", compactManifest(manifest));
        ctx.ui.notify(`${id} approved. Next: ${manifest.currentStage}`, "success");

        const percent = contextPercent(ctx);
        if (percent !== undefined && percent >= 70) {
          ctx.ui.notify(
            `Approval persisted. Context is ${percent.toFixed(0)}%; use /new then /work-resume ${id} to continue with a fresh bounded context.`,
            "warning",
          );
          return;
        }

        const packet = await withStateMutation(root, () => buildContextPacket(root, id));
        const routing = await routingContext(root, manifest);
        dispatchUserMessage(
          pi,
          ctx,
          [
            `Human approval granted for ${id}.`,
            packet.content,
            stageInstruction(manifest.currentStage, manifest.id, routing),
          ].join("\n\n"),
          `Approval for ${id} persisted; continuation queued after the current agent turn.`,
        );
      } catch (error) {
        ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
      }
    },
  });

  pi.registerCommand("reject", {
    description: "Reject the active design gate and request revision",
    handler: async (args, ctx) => {
      const { root, manifest } = await activeOrNotify(ctx);
      if (!root || !manifest) return;
      try {
        const updated = await withStateMutation(root, () => reject(root, manifest.id, args.trim()));
        pi.appendEntry("friday-orchestrator-state", compactManifest(updated));
        ctx.ui.notify(`${updated.id} returned to ${updated.currentStage}`, "warning");
        const routing = await routingContext(root, updated);
        dispatchUserMessage(
          pi,
          ctx,
          `Revise ${updated.id}. Human feedback: ${args.trim() || "Design rejected; revise based on current discussion."}\n${stageInstruction(updated.currentStage, updated.id, routing)}`,
          `Revision for ${updated.id} queued after the current agent turn.`,
        );
      } catch (error) {
        ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
      }
    },
  });

  pi.registerCommand("rework", {
    description: "Return blocked/reviewed work to IMPLEMENT when code changes are required",
    handler: async (args, ctx) => {
      const { root, manifest } = await activeOrNotify(ctx);
      if (!root || !manifest) return;
      try {
        const updated = await withStateMutation(root, () => requestRework(root, manifest.id, args.trim() || "Implementation rework requested by user"));
        pi.appendEntry("friday-orchestrator-state", compactManifest(updated));
        ctx.ui.notify(`${updated.id} returned to IMPLEMENT.`, "success");
        dispatchUserMessage(pi, ctx, continuationKickoff(updated.id), `Rework for ${updated.id} queued.`);
      } catch (error) {
        ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
      }
    },
  });

  pi.registerCommand("change-request", {
    description: "Persist a mid-work requirement change and invalidate affected downstream design/evidence",
    handler: async (args, ctx) => {
      const content = args.trim();
      if (!content) return ctx.ui.notify("Usage: /change-request <new or changed requirement>", "warning");
      const { root, manifest } = await activeOrNotify(ctx);
      if (!root || !manifest) return;
      try {
        const updated = await withStateMutation(root, () => changeRequest(root, manifest.id, content));
        pi.appendEntry("friday-orchestrator-state", compactManifest(updated));
        ctx.ui.notify(`${updated.id} change request saved. Reopened ${updated.currentStage}.`, "warning");
        dispatchUserMessage(pi, ctx, continuationKickoff(updated.id), `Change request for ${updated.id} queued for replanning.`);
      } catch (error) {
        ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
      }
    },
  });

  pi.registerCommand("cancel-work", {
    description: "Cancel the active durable work item while preserving audit history",
    handler: async (args, ctx) => {
      const { root, manifest } = await activeOrNotify(ctx);
      if (!root || !manifest) return;
      const reason = args.trim() || "Cancelled by user";
      try {
        const updated = await withStateMutation(root, () => cancelWork(root, manifest.id, reason));
        pi.appendEntry("friday-orchestrator-state", compactManifest(updated));
        appendCommandOutput(pi, "Work Cancelled", `${updated.id} CANCELLED\nReason: ${reason}`, "warning");
      } catch (error) {
        ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
      }
    },
  });

  pi.registerCommand("skill-routing", {
    description: "Show deterministic skills and model profile resolved for the active stage",
    handler: async (_args, ctx) => {
      const { root, manifest } = await activeOrNotify(ctx);
      if (!root || !manifest) return;
      const routing = await routingContext(root, manifest);
      appendCommandOutput(
        pi,
        "Skill & Model Routing",
        [
          `${manifest.id} @ ${manifest.currentStage}`,
          `Model profile: ${routing.modelProfile}${routing.model !== "inherit" ? ` -> ${routing.model}` : " (inherit)"}`,
          `Skills: ${routing.skills.join(", ") || "none"}`,
        ].join("\n"),
      );
    },
  });

  pi.registerCommand("orchestrator-settings", {
    description: "Show or update Friday workflow/model routing settings",
    handler: async (args, ctx) => {
      const root = await rootOrNotify(ctx);
      if (!root) return;
      const parts = args.trim().split(/\s+/).filter(Boolean);
      try {
        if (!parts.length) {
          const project = await loadProject(root);
          appendCommandOutput(pi, "Friday Settings", JSON.stringify({ workflowPolicy: project.workflowPolicy, modelProfiles: project.modelProfiles, repositoryProfile: project.repositoryProfile }, null, 2));
          return;
        }
        if (parts[0] === "auto-continue" && ["on", "off"].includes(parts[1])) {
          const policy = await withStateMutation(root, () => updateWorkflowPolicy(root, { autoContinueSafeStages: parts[1] === "on" }));
          appendCommandOutput(pi, "Friday Settings", `autoContinueSafeStages=${policy.autoContinueSafeStages}`, "success");
          return;
        }
        if (parts[0] === "model" && parts.length >= 3) {
          const profile = parts[1];
          const model = parts.slice(2).join(" ");
          const profiles = await withStateMutation(root, () => updateModelProfile(root, profile, model));
          appendCommandOutput(pi, "Friday Settings", `${profile} -> ${profiles[profile]}`, "success");
          return;
        }
        ctx.ui.notify("Usage: /orchestrator-settings | /orchestrator-settings auto-continue on|off | /orchestrator-settings model <profile> <model>", "warning");
      } catch (error) {
        ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
      }
    },
  });

  pi.registerCommand("memory", {
    description: "List durable project memory entries",
    handler: async (_args, ctx) => {
      const root = await rootOrNotify(ctx);
      if (!root) return;
      const index = await listMemory(root);
      const lines = index.entries.length
        ? index.entries.slice(-30).map((entry) => `${entry.id} [${entry.confidence}] ${entry.summary}`)
        : ["No decision memory yet."];
      appendCommandOutput(pi, "Project Memory", lines.join("\n"));
    },
  });

  pi.registerCommand("remember", {
    description: "Save confirmed durable project memory",
    handler: async (args, ctx) => {
      const content = args.trim();
      if (!content) return ctx.ui.notify("Usage: /remember <confirmed project decision/fact>", "warning");
      const root = await rootOrNotify(ctx);
      if (!root) return;
      const entry = await withStateMutation(root, () => remember(root, content, "CONFIRMED", "user"));
      ctx.ui.notify(`Saved ${entry.id}: ${entry.summary}`, "success");
    },
  });

  pi.registerCommand("orchestrator-doctor", {
    description: "Validate orchestrator runtime modules and durable state references",
    handler: async (_args, ctx) => {
      try {
        const versions = assertRuntimeModules();
        const root = await findWorkspaceRoot(ctx.cwd);
        const lines = [
          `Friday Pi Orchestrator ${RELEASE_VERSION}`,
          `Modules: ${Object.entries(versions).map(([name, version]) => `${name}=${version}`).join(", ")}`,
        ];

        if (!root) {
          lines.push("Workspace: not initialized in this directory.");
          appendCommandOutput(pi, "Orchestrator Doctor", lines.join("\n"));
          return;
        }

        const project = await loadProject(root);
        lines.push(`Workspace: ${relative(ctx.cwd, resolve(root, ".pi-work")) || ".pi-work"}`);

        if (project.activeWorkId) {
          try {
            const manifest = await loadManifest(root, project.activeWorkId);
            lines.push(`Active work: ${manifest.id} (${manifest.status}/${manifest.currentStage})`);
          } catch {
            lines.push(`Active work: BROKEN reference ${project.activeWorkId}`);
          }
        } else {
          lines.push("Active work: none");
        }

        const activeBacklogId = await getActiveBacklogId(root);
        if (activeBacklogId) {
          try {
            const backlog = await loadBacklog(root, activeBacklogId);
            const mismatches = [];
            for (const item of backlog.workItems ?? []) {
              if (!item.workId) continue;
              try {
                const manifest = await loadManifest(root, item.workId);
                const complete = manifest.status === "COMPLETE" || manifest.currentStage === "COMPLETE";
                if (complete && item.status !== "DONE") {
                  mismatches.push(`${item.id}:${item.status}->DONE (${item.workId})`);
                }
              } catch {
                mismatches.push(`${item.id}:missing-work(${item.workId})`);
              }
            }
            lines.push(`Active backlog: ${backlog.id} (${backlog.status})`);
            lines.push(`Backlog projection: ${mismatches.length ? `needs reconcile: ${mismatches.join(", ")}` : "consistent"}`);
          } catch {
            lines.push(`Active backlog: BROKEN reference ${activeBacklogId}`);
          }
        } else {
          lines.push("Active backlog: none");
        }

        appendCommandOutput(pi, "Orchestrator Doctor", lines.join("\n"));
      } catch (error) {
        ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
      }
    },
  });

  pi.registerCommand("work-context", {
    description: "Rebuild bounded context packet for the active work",
    handler: async (_args, ctx) => {
      const { root, manifest } = await activeOrNotify(ctx);
      if (!root || !manifest) return;
      const packet = await withStateMutation(root, () => buildContextPacket(root, manifest.id));
      appendCommandOutput(
        pi,
        "Work Context",
        `Context packet rebuilt: ${relative(root, packet.path)} (${packet.content.length} chars)`,
        "success",
      );
    },
  });

  pi.on("before_agent_start", async (event, ctx) => {
    // Custom subagents include an <active_agent> marker in their child system prompt.
    // The durable coordinator hint belongs only in the parent session; workers get
    // bounded task prompts from the coordinator instead.
    if (event.systemPrompt.includes("<active_agent>")) return;

    const root = await findWorkspaceRoot(ctx.cwd);
    if (!root) return;
    const manifest = await getActiveManifest(root);
    if (!manifest || manifest.status === "COMPLETE") return;

    const percent = contextPercent(ctx as any);
    if (percent !== undefined && percent >= 80 && warnedWork !== manifest.id) {
      warnedWork = manifest.id;
      ctx.ui.notify(
        `Context usage ${percent.toFixed(0)}% for ${manifest.id}. Prefer /new + /work-resume ${manifest.id} before heavy work.`,
        "warning",
      );
    }

    const routing = await routingContext(root, manifest);
    return {
      systemPrompt: `${event.systemPrompt}\n\n<durable_engineering_work>\n${stageInstruction(manifest.currentStage, manifest.id, routing)}\nState source: .pi-work/work/${manifest.id}/manifest.json\nUse bounded durable artifacts rather than replaying old conversation.\nWorkflow authority belongs to Friday's deterministic state machine, not to the model.\n</durable_engineering_work>`,
    };
  });

  pi.on("tool_call", async (event, ctx) => {
    const root = await findWorkspaceRoot(ctx.cwd);
    if (!root) return;
    const activeManifest = await getActiveManifest(root);
    const productMutationAllowed = !activeManifest || ["COMPLETE", "CANCELLED"].includes(activeManifest.status) || activeManifest.currentStage === "IMPLEMENT";

    if (isToolCallEventType("write", event) || isToolCallEventType("edit", event)) {
      const rawPath = (event.input as any)?.path;
      if (rawPath) {
        const absolute = resolve(ctx.cwd, normalizeToolPath(rawPath));
        if (isInsidePiWork(root, absolute)) {
          return {
            block: true,
            reason: "Direct write/edit to .pi-work is blocked. Use the orchestrator tool or orchestrator commands so state transitions remain serialized and auditable.",
          };
        }
        if (!productMutationAllowed && activeManifest) {
          return {
            block: true,
            reason: `Product write/edit is blocked while ${activeManifest.id} is at ${activeManifest.currentStage}. Product mutation is allowed only during IMPLEMENT. Use /work-resume, /approve, /reject, /rework, or /change-request to move the durable lifecycle correctly.`,
          };
        }
      }
    }

    if (isToolCallEventType("bash", event)) {
      const command = String((event.input as any)?.command ?? "");
      if (looksLikeMutatingBash(command) && commandTouchesPiWork(command)) {
        return {
          block: true,
          reason: "Mutating .pi-work through bash is blocked. Use the orchestrator tool or orchestrator commands.",
        };
      }
      if (looksLikeMutatingBash(command) && !productMutationAllowed && activeManifest) {
        return {
          block: true,
          reason: `Mutating shell commands are blocked while ${activeManifest.id} is at ${activeManifest.currentStage}. Product mutation is allowed only during IMPLEMENT.`,
        };
      }
    }
  });

  pi.on("tool_result", async (event, ctx) => {
    if (event.isError) return;
    const root = await findWorkspaceRoot(ctx.cwd);
    if (!root) return;
    const manifest = await getActiveManifest(root);
    if (!manifest || manifest.status === "COMPLETE") return;

    try {
      if (event.toolName === "write" || event.toolName === "edit") {
        const input = event.input as any;
        if (!input?.path) return;
        const absolute = resolve(ctx.cwd, normalizeToolPath(input.path));
        if (isInsidePiWork(root, absolute)) return;
        const file = relative(root, absolute);
        await withStateMutation(root, () => markDirty(root, manifest.id, inferDomainFromPath(file), file));
      } else if (event.toolName === "bash") {
        const input = event.input as any;
        if (typeof input?.command === "string" && looksLikeMutatingBash(input.command)) {
          await withStateMutation(root, () => markDirty(root, manifest.id, "application", "[mutating bash command]"));
        }
      }
    } catch {
      // Dirty tracking must never break the user's tool result.
    }
  });

}
