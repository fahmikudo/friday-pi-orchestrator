export const MODULE_VERSION = "2.0.0";

import { isAbsolute, relative, resolve } from "node:path";

export function stateQueueTarget(root) {
  return resolve(root, ".pi-work", "runtime", "orchestrator-state.lock");
}

export function normalizeToolPath(value) {
  const raw = String(value ?? "");
  return raw.startsWith("@") ? raw.slice(1) : raw;
}

export function isInsidePiWork(root, candidatePath) {
  const base = resolve(root, ".pi-work");
  const candidate = resolve(candidatePath);
  const rel = relative(base, candidate);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

export function commandTouchesPiWork(command) {
  return /(^|[\s"'`])\.pi-work(?:[\/\\\s"'`]|$)/.test(String(command ?? ""));
}
