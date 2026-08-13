export const MODULE_VERSION = "2.0.0";
export const WORK_TYPES = ["BUGFIX", "SMALL", "MEDIUM", "LARGE"];

export const ROUTES = {
  BUGFIX: ["TRIAGE", "IMPLEMENT", "REVIEW", "VERIFY", "COMPLETE"],
  SMALL: ["TRIAGE", "PLAN", "IMPLEMENT", "REVIEW", "VERIFY", "COMPLETE"],
  MEDIUM: ["TRIAGE", "DISCOVER", "DESIGN", "APPROVE", "DECOMPOSE", "IMPLEMENT", "REVIEW", "VERIFY", "COMPLETE"],
  LARGE: ["TRIAGE", "DISCOVER", "PARTY", "DESIGN", "APPROVE", "DECOMPOSE", "IMPLEMENT", "REVIEW", "VERIFY", "COMPLETE"],
};

export const DEFAULT_WORKFLOW_POLICY = {
  autoContinueSafeStages: true,
  requireHumanApproval: true,
  preserveArtifactHistory: true,
  invalidateEvidenceOnChange: true,
};

export const DEFAULT_MODEL_PROFILES = {
  "product-analysis": "inherit",
  "high-reasoning": "inherit",
  implementation: "inherit",
  "independent-review": "inherit",
  verification: "inherit",
};

const BUG_WORDS = [
  "fix", "bug", "error", "regression", "broken", "panic", "crash", "incorrect",
  "gagal", "rusak", "bugfix", "hotfix", "500", "timeout",
];

const LARGE_WORDS = [
  "new module", "module baru", "architecture", "arsitektur", "redesign",
  "platform", "system", "sistem", "end-to-end", "e2e", "multi-tenant",
  "migration project", "full implementation", "major refactor",
];

const DB_WORDS = [
  "database", "schema", "migration", "migrations", "table", "column",
  "index", "constraint", "postgres", "mysql", "gorm", "jpa",
];

const FRONTEND_WORDS = [
  "frontend", "react", "vue", "angular", "ui", "ux", "component", "page", "form", "vite",
  "tanstack", "mui", "tailwind",
];

const BACKEND_WORDS = [
  "backend", "api", "endpoint", "service", "repository", "handler", "controller",
  "golang", " go ", "java", "spring", "spring boot", "nestjs", "node", "typescript", "grpc",
];

const INFRA_WORDS = [
  "kubernetes", "k8s", "docker", "helm", "terraform", "ci/cd", "pipeline",
  "deployment", "nginx", "ingress", "observability",
];

const SECURITY_WORDS = [
  "auth", "authentication", "authorization", "rbac", "permission", "security",
  "jwt", "oauth", "oidc", "credential", "secret", "tenant", "facility access",
];

const CONCURRENCY_WORDS = [
  "concurrency", "goroutine", "race", "idempot", "retry", "parallel",
  "lock", "deadlock", "webhook",
];

function includesAny(text, words) {
  return words.some((word) => text.includes(word));
}

export function detectDomains(request) {
  const text = ` ${request.toLowerCase()} `;
  const domains = [];
  if (includesAny(text, DB_WORDS)) domains.push("database");
  if (includesAny(text, FRONTEND_WORDS)) domains.push("frontend");
  if (includesAny(text, BACKEND_WORDS)) domains.push("backend");
  if (includesAny(text, INFRA_WORDS)) domains.push("infrastructure");
  if (includesAny(text, SECURITY_WORDS)) domains.push("security");
  if (domains.length === 0) domains.push("application");
  return [...new Set(domains)];
}

export function detectRisks(request, domains = detectDomains(request)) {
  const text = ` ${request.toLowerCase()} `;
  const risks = [];
  if (domains.includes("database")) risks.push("data_change");
  if (domains.includes("security")) risks.push("security");
  if (domains.includes("infrastructure")) risks.push("operational");
  if (includesAny(text, CONCURRENCY_WORDS)) risks.push("concurrency_idempotency");
  if (text.includes("breaking") || text.includes("public api") || text.includes("contract") || text.includes("backward")) {
    risks.push("compatibility");
  }
  return [...new Set(risks)];
}

export function triage(request) {
  const text = ` ${request.toLowerCase()} `;
  const domains = detectDomains(request);
  const risks = detectRisks(request, domains);

  const isBug = includesAny(text, BUG_WORDS);
  const looksLarge = includesAny(text, LARGE_WORDS);
  const crossLayer = domains.filter((d) => ["backend", "frontend", "database", "infrastructure"].includes(d)).length >= 3;
  const highConsequence =
    risks.includes("security") ||
    risks.includes("compatibility") ||
    (domains.includes("database") && /\b(drop|rename|alter|migration|schema|constraint|backfill)\b/.test(text));
  const mediumSignal =
    domains.filter((d) => ["backend", "frontend", "database", "infrastructure"].includes(d)).length >= 2 ||
    risks.length >= 2 ||
    highConsequence ||
    request.length > 180;

  let type;
  if (isBug && !looksLarge && !crossLayer && !highConsequence) type = "BUGFIX";
  else if (looksLarge || crossLayer) type = "LARGE";
  else if (mediumSignal) type = "MEDIUM";
  else type = "SMALL";

  return {
    type,
    domains,
    risks,
    route: [...ROUTES[type]],
  };
}

export function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 64) || "work";
}

export function nextStage(manifest) {
  const index = manifest.route.indexOf(manifest.currentStage);
  if (index < 0 || index + 1 >= manifest.route.length) return undefined;
  return manifest.route[index + 1];
}

function normalizeValues(values = []) {
  return values.map((value) => String(value).toLowerCase().replaceAll("_", "-").trim());
}

export function resolveSkills(manifest, repositoryProfile = {}) {
  const stage = manifest.currentStage;
  const domains = new Set(manifest.domains ?? []);
  const risks = new Set(manifest.risks ?? []);
  const languages = new Set(normalizeValues(repositoryProfile.languages));
  const frameworks = new Set(normalizeValues(repositoryProfile.frameworks));
  const databases = new Set(normalizeValues(repositoryProfile.databases));
  const infrastructure = new Set(normalizeValues(repositoryProfile.infrastructure));
  const skills = new Set();

  if (stage === "DISCOVER") skills.add("brownfield-analysis");
  if (stage === "PARTY") {
    skills.add("requirement-analysis");
    skills.add("module-boundary-design");
    skills.add("test-strategy");
  }
  if (stage === "PLAN") skills.add("test-strategy");
  if (stage === "DESIGN") {
    skills.add("module-boundary-design");
    skills.add("architecture-tradeoff");
    skills.add("test-strategy");
    if (domains.has("backend") || domains.has("application")) skills.add("domain-driven-design");
    if (domains.has("backend")) skills.add("api-contract-design");
    if (domains.has("database")) skills.add("relational-schema-design");
    if (risks.has("data_change")) skills.add("safe-database-migration");
    if (risks.has("security")) {
      skills.add("authorization-design");
      skills.add("threat-modeling");
      skills.add("secure-api");
    }
    if (risks.has("compatibility")) skills.add("backward-compatibility");
    if (risks.has("concurrency_idempotency")) {
      skills.add("transaction-boundary-design");
      skills.add("idempotency-reliability");
    }
  }
  if (stage === "DECOMPOSE") {
    skills.add("acceptance-criteria");
    skills.add("requirement-traceability");
  }
  if (stage === "IMPLEMENT") {
    skills.add("tdd");
    if (domains.has("backend")) {
      skills.add("backend-error-handling");
      if (languages.has("go") || languages.has("golang")) skills.add("go-backend");
      if (languages.has("java")) skills.add("java-backend");
      if (frameworks.has("spring") || frameworks.has("spring-boot") || frameworks.has("springboot")) skills.add("spring-boot-backend");
      if (languages.has("javascript") || languages.has("node") || frameworks.has("node") || frameworks.has("nodejs")) skills.add("node-backend");
      if (languages.has("typescript")) skills.add("typescript-backend");
      if (frameworks.has("nestjs") || frameworks.has("nest-js")) skills.add("nestjs-backend");
    }
    if (domains.has("frontend")) {
      skills.add("frontend-component-design");
      skills.add("frontend-testing");
      if (frameworks.has("react")) skills.add("react-frontend");
      if (frameworks.has("vue") || frameworks.has("vuejs")) skills.add("vue-frontend");
      if (frameworks.has("angular")) skills.add("angular-frontend");
    }
    if (domains.has("database")) {
      skills.add("relational-schema-design");
      skills.add("safe-database-migration");
      skills.add("data-integrity");
    }
    if (risks.has("security")) {
      skills.add("authorization-design");
      skills.add("secure-api");
    }
    if (risks.has("concurrency_idempotency")) {
      skills.add("concurrency-background-work");
      skills.add("idempotency-reliability");
    }
    if (risks.has("compatibility")) skills.add("backward-compatibility");
  }
  if (stage === "REVIEW") {
    skills.add("code-review");
    skills.add("test-quality-review");
    if (domains.has("database")) skills.add("database-review");
    if (domains.has("security") || risks.has("security")) skills.add("security-review");
    if (manifest.type === "LARGE" || manifest.type === "MEDIUM") skills.add("architecture-review");
    if (risks.has("compatibility")) skills.add("backward-compatibility");
    if (domains.has("infrastructure") || risks.has("operational")) skills.add("production-readiness-review");
  }
  if (stage === "VERIFY") {
    skills.add("risk-based-testing");
    skills.add("test-strategy");
    if (domains.has("database") || domains.has("backend") || risks.has("compatibility")) skills.add("integration-contract-testing");
    if (risks.has("security")) {
      skills.add("authorization-design");
      skills.add("secure-api");
    }
  }

  if (databases.has("postgres") || databases.has("postgresql")) skills.add("postgresql");
  if (infrastructure.has("docker")) skills.add("docker-containers");
  if (infrastructure.has("kubernetes") || infrastructure.has("k8s")) skills.add("kubernetes");

  return [...skills];
}

export function resolveModelProfile(manifest) {
  const stage = manifest.currentStage;
  const highRisk = (manifest.risks ?? []).some((risk) => ["security", "compatibility", "data_change"].includes(risk));
  if ((stage === "DESIGN" || stage === "PARTY") && (manifest.type === "LARGE" || highRisk)) return "high-reasoning";
  if (["DISCOVER", "PARTY", "PLAN", "DESIGN", "APPROVE"].includes(stage)) return "product-analysis";
  if (["DECOMPOSE", "IMPLEMENT"].includes(stage)) return "implementation";
  if (stage === "REVIEW") return "independent-review";
  if (stage === "VERIFY") return "verification";
  return "implementation";
}

export function shouldAutoContinue(manifest, project = {}) {
  const policy = { ...DEFAULT_WORKFLOW_POLICY, ...(project.workflowPolicy ?? {}) };
  if (!policy.autoContinueSafeStages) return false;
  if (manifest.status !== "IN_PROGRESS") return false;
  return !["APPROVE", "COMPLETE"].includes(manifest.currentStage);
}

export function stageInstruction(stage, workId, context = {}) {
  const skills = context.skills ?? [];
  const modelProfile = context.modelProfile ?? null;
  const common = `Durable work item: ${workId}. Use the orchestrator tool to persist artifacts, tasks, memory, and stage transitions. Do not rely on chat history as durable state.`;
  const byStage = {
    TRIAGE: "Triage is managed by the platform. Confirm only if the deterministic classification is clearly inappropriate.",
    DISCOVER: "Inspect the existing repository. Save a discovery artifact, then complete the stage. Do not modify product code.",
    PARTY: "Run read-only product-manager, software-architect, code-reviewer, and qa-engineer perspectives in parallel when useful. Synthesize into a party artifact, then complete the stage.",
    PLAN: "Create the smallest coherent implementation plan. Save a plan artifact, then complete the stage.",
    DESIGN: "Use software-architect for consequential design. Save design.md with ownership, boundaries, contracts, data impact, tradeoffs, test strategy, and rollout notes. Then complete the stage.",
    APPROVE: "STOP. Do not continue until the human runs /approve. You may answer questions about the proposed design.",
    DECOMPOSE: "Convert the approved design/plan into small dependency-aware tasks. Persist them with orchestrator action=set_tasks, then complete the stage.",
    IMPLEMENT: "Execute implementation tasks sequentially. Use the matching write-capable subagent (backend-engineer, frontend-engineer, devops-engineer). Never run multiple writers concurrently in the same workspace. Update each task status. Complete the stage only when all tasks are done and required evidence exists.",
    REVIEW: "Use code-reviewer as an independent read-only reviewer. Save review artifact with verdict PASS or FAIL. Do not fix findings in the reviewer. Complete only on PASS.",
    VERIFY: "Use qa-engineer for independent evidence-driven verification. Save verification artifact with PASS, PASS_WITH_WARNINGS, or FAIL. Complete only on PASS/PASS_WITH_WARNINGS.",
    COMPLETE: "Work is complete. Summarize results and residual warnings. Do not start unrelated work under this work item.",
  };
  const routing = [
    skills.length ? `Resolved skills: ${skills.join(", ")}. Load the relevant skills before substantive work.` : "Resolved skills: none required beyond repository conventions.",
    modelProfile ? `Model profile: ${modelProfile}${context.model ? ` (${context.model})` : ""}. Treat this as routing guidance; workflow authority remains the state machine.${context.model && context.model !== "inherit" ? " When delegating to a subagent whose definition does not lock a model, pass this mapped model as the subagent model override." : ""}` : "",
  ].filter(Boolean).join("\n");
  return `${common}\nCurrent stage: ${stage}.\n${routing}\n${byStage[stage] ?? ""}`;
}

export function compactManifest(manifest) {
  return {
    id: manifest.id,
    title: manifest.title,
    type: manifest.type,
    status: manifest.status,
    currentStage: manifest.currentStage,
    route: manifest.route,
    domains: manifest.domains,
    risks: manifest.risks,
    approval: manifest.approval,
    reviewVerdict: manifest.reviewVerdict,
    verificationVerdict: manifest.verificationVerdict,
    dirtyDomains: manifest.dirtyDomains,
    artifacts: manifest.artifacts,
    artifactHistory: manifest.artifactHistory ?? {},
    changeRequests: manifest.changeRequests ?? [],
    cancellation: manifest.cancellation ?? null,
    source: manifest.source ?? null,
    updatedAt: manifest.updatedAt,
  };
}

export function inferDomainFromPath(filePath) {
  const path = filePath.toLowerCase().replaceAll("\\", "/");
  if (/migration|schema|database|db\//.test(path)) return "database";
  if (/terraform|k8s|kubernetes|helm|dockerfile|docker-compose|\.github\/workflows|infra\//.test(path)) return "infrastructure";
  if (/frontend|web\/|ui\/|components\/|pages\/|src\/.*\.(tsx|jsx)|\.vue$|\.svelte$/.test(path)) return "frontend";
  if (/\.(go|java|kt|ts)$|backend\/|server\/|api\/|internal\//.test(path)) return "backend";
  return "application";
}

export function looksLikeMutatingBash(command) {
  return /(^|\s)(rm|mv|cp|install|mkdir|touch|truncate)\b|sed\s+-i\b|>\s*[^&]|>>|tee\s+|git\s+(checkout|reset|clean|restore|apply)\b/.test(command);
}
