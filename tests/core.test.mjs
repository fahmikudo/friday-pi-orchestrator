import test from "node:test";
import assert from "node:assert/strict";
import { detectDomains, inferDomainFromPath, triage } from "../extensions/core-v200.js";

test("bugfix uses short route", () => {
  const result = triage("fix login endpoint returning 500 when email is empty");
  assert.equal(result.type, "BUGFIX");
  assert.deepEqual(result.route, ["TRIAGE", "IMPLEMENT", "REVIEW", "VERIFY", "COMPLETE"]);
});

test("cross-layer change becomes medium or large", () => {
  const result = triage("add backend API, database migration, and React page for doctor schedule");
  assert.equal(result.type, "LARGE");
  assert.ok(result.domains.includes("backend"));
  assert.ok(result.domains.includes("database"));
  assert.ok(result.domains.includes("frontend"));
});

test("new module is large", () => {
  const result = triage("implement new module for patient registration end-to-end");
  assert.equal(result.type, "LARGE");
});

test("domain detection is deterministic", () => {
  assert.deepEqual(
    detectDomains("add PostgreSQL migration and API endpoint"),
    ["database", "backend"],
  );
});

test("path domain inference", () => {
  assert.equal(inferDomainFromPath("db/migrations/001.sql"), "database");
  assert.equal(inferDomainFromPath("frontend/src/pages/a.tsx"), "frontend");
  assert.equal(inferDomainFromPath("internal/patient/service.go"), "backend");
});
