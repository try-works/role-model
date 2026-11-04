#!/usr/bin/env node
/**
 * CI-only oxlint baseline ratchet (plan section 9, T2.5 / audit B9).
 *
 * Reruns the repo-wide oxlint report and fails when:
 *  - any enforced rule reports a finding inside the enforced scope, or
 *  - any report-only rule reports more findings outside the scope than the
 *    committed baseline allows (a new finding outside the scope is still new).
 *
 * Every scope path is re-checked so a renamed/deleted path fails closed instead
 * of silently linting nothing. Node builtins plus the sibling report module.
 *
 * Run with: `node scripts/quality/oxlint-baseline-check.mjs`
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectReport } from "./oxlint-report.mjs";

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const BASELINE_PATH = "scripts/quality/oxlint-baseline.json";

/** True when a repo-relative diagnostic path is the scope entry or below it. */
function isInScope(filename, scope) {
  const normalized = String(filename).replaceAll("\\", "/").replace(/^\.\//u, "");
  return scope.some((entry) => normalized === entry || normalized.startsWith(`${entry}/`));
}

const baseline = JSON.parse(readFileSync(path.join(REPO_ROOT, BASELINE_PATH), "utf8"));
const missingScope = baseline.scope.filter(
  (scopePath) => !existsSync(path.join(REPO_ROOT, ...scopePath.split("/"))),
);
if (missingScope.length > 0) {
  console.error(
    `oxlint-baseline: failing closed; enforced scope path(s) missing: ${missingScope.join(", ")}`,
  );
  process.exit(1);
}

const report = collectReport();
const enforced = {};
const reportOnly = {};
const otherDiagnostics = [];
for (const diagnostic of report.diagnostics) {
  if (!diagnostic.ruleId.startsWith("effecttsgo/")) {
    otherDiagnostics.push(diagnostic);
    continue;
  }
  const bucket = isInScope(diagnostic.filename, baseline.scope) ? enforced : reportOnly;
  bucket[diagnostic.ruleId] = (bucket[diagnostic.ruleId] ?? 0) + 1;
}

const baselineRules = new Set([
  ...Object.keys(baseline.enforcedRules),
  ...Object.keys(baseline.reportOnly),
]);
const failures = [];
for (const [rule, allowed] of Object.entries(baseline.enforcedRules)) {
  const actual = enforced[rule] ?? 0;
  if (actual > allowed) {
    failures.push(
      `${rule}: ${actual} finding(s) in the enforced scope (baseline allows ${allowed})`,
    );
  }
}
for (const [rule, allowed] of Object.entries(baseline.reportOnly)) {
  const actual = reportOnly[rule] ?? 0;
  if (actual > allowed) {
    failures.push(
      `${rule}: ${actual} finding(s) outside the enforced scope (baseline allows ${allowed})`,
    );
  }
}
for (const rule of Object.keys(report.counts).sort()) {
  if (rule.startsWith("effecttsgo/") && !baselineRules.has(rule)) {
    failures.push(
      `${rule}: ${report.counts[rule]} finding(s) for a rule missing from the baseline`,
    );
  }
}
for (const diagnostic of otherDiagnostics) {
  if (isInScope(diagnostic.filename, baseline.scope)) {
    failures.push(
      `non-effect diagnostic in the enforced scope: ${diagnostic.ruleId} (${diagnostic.filename})`,
    );
  }
}

const sum = (counts) => Object.values(counts).reduce((total, count) => total + count, 0);
console.log(
  `oxlint-baseline: enforced-scope findings ${sum(enforced)} (must be 0); outside-scope findings ${sum(reportOnly)} (baseline ${sum(baseline.reportOnly)})`,
);
if (otherDiagnostics.length > 0) {
  console.log(
    `oxlint-baseline: ${otherDiagnostics.length} non-effect diagnostic(s) outside the enforced scope are informational (TypeScript/tsconfig infrastructure, not effecttsgo rules)`,
  );
}
if (failures.length > 0) {
  console.error("oxlint-baseline: FAILED");
  for (const failure of failures.sort()) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log("oxlint-baseline: OK");
