#!/usr/bin/env node
/**
 * Phase 2 oxlint report (plan section 9).
 *
 * Runs the same effecttsgo configuration as `lint:oxlint` without
 * `--deny-warnings`, so a warning cannot fail the report, and writes per-rule
 * diagnostic counts to `scripts/quality/oxlint-report.json` (gitignored).
 * `scripts/quality/oxlint-baseline-check.mjs` consumes `collectReport()` so the
 * CI check and the local report can never disagree about the counts.
 *
 * The JSON formatter is part of oxlint 1.90.0 (verified in the Phase 2 spike);
 * the report is repo-wide and relies on `.oxlintrc.effect.json` ignorePatterns.
 *
 * Run with: `node scripts/quality/oxlint-report.mjs`
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const EFFECT_CONFIG = ".oxlintrc.effect.json";
export const REPORT_PATH = "scripts/quality/oxlint-report.json";
export const REPORT_COMMAND = "effect-tsgo oxlint --config .oxlintrc.effect.json --format=json .";

/** Resolve the installed @effect/tsgo JS bin so it can run under process.execPath. */
export function resolveEffectTsgoBin() {
  const packageRoot = path.join(REPO_ROOT, "node_modules", "@effect", "tsgo");
  const manifestPath = path.join(packageRoot, "package.json");
  if (!existsSync(manifestPath)) {
    throw new Error('@effect/tsgo is not installed; run "corepack pnpm install --frozen-lockfile"');
  }
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const bin =
    typeof manifest.bin === "string"
      ? manifest.bin
      : (manifest.bin?.["effect-tsgo"] ?? Object.values(manifest.bin ?? {})[0]);
  if (typeof bin !== "string") {
    throw new Error("@effect/tsgo does not expose a bin entry");
  }
  return path.join(packageRoot, bin);
}

/** `effecttsgo(rule-name)` (the real diagnostic format) -> `effecttsgo/rule-name`. */
export function normalizeRuleId(code) {
  const effectRule = /^effecttsgo\(([a-z0-9-]+)\)$/u.exec(String(code));
  return effectRule ? `effecttsgo/${effectRule[1]}` : String(code);
}

/** Run oxlint over the repository and return diagnostics plus stable per-rule counts. */
export function collectReport() {
  const result = spawnSync(
    process.execPath,
    [resolveEffectTsgoBin(), "oxlint", "--config", EFFECT_CONFIG, "--format=json", "."],
    { cwd: REPO_ROOT, encoding: "utf8", maxBuffer: 128 * 1024 * 1024, timeout: 20 * 60 * 1000 },
  );
  const stdout = result.stdout ?? "";
  if (!stdout.trimStart().startsWith("{")) {
    throw new Error(
      [
        `oxlint report did not produce JSON (status ${result.status ?? "null"}).`,
        stdout.trim(),
        (result.stderr ?? "").trim(),
      ].join("\n"),
    );
  }
  const parsed = JSON.parse(stdout);
  const diagnostics = Array.isArray(parsed.diagnostics)
    ? parsed.diagnostics.map((diagnostic) => ({
        ruleId: normalizeRuleId(diagnostic.code),
        filename: String(diagnostic.filename ?? ""),
        severity: String(diagnostic.severity ?? ""),
      }))
    : [];
  const counts = {};
  for (const diagnostic of diagnostics) {
    counts[diagnostic.ruleId] = (counts[diagnostic.ruleId] ?? 0) + 1;
  }
  return { diagnostics, counts, fileCount: parsed.number_of_files ?? null };
}

/** Preserve the exact report shape the baseline check and reviewers read. */
export function writeReport(report) {
  const sortedRules = Object.fromEntries(
    Object.entries(report.counts).sort(([a], [b]) => a.localeCompare(b)),
  );
  const output = {
    version: 1,
    generatedAt: new Date().toISOString(),
    command: REPORT_COMMAND,
    files: report.fileCount,
    total: report.diagnostics.length,
    rules: sortedRules,
  };
  const target = path.join(REPO_ROOT, REPORT_PATH);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  return target;
}

const isMain = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
  : false;

if (isMain) {
  const report = collectReport();
  const target = writeReport(report);
  console.log(
    `oxlint-report: ${report.diagnostics.length} diagnostic(s) across ${report.fileCount ?? "?"} file(s)`,
  );
  for (const [rule, count] of Object.entries(report.counts).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    console.log(`  ${rule}: ${count}`);
  }
  console.log(`oxlint-report: wrote ${path.relative(REPO_ROOT, target).split(path.sep).join("/")}`);
}
