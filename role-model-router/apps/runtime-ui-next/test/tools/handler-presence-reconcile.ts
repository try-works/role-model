import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { formatInventoryText, renderInventory, scanAllRoutes } from "../support/handler-presence";

/**
 * S617 reconciliation generator (machine-derived, committed so the evidence is reproducible).
 *
 * Flow: parse every human inventory row (expanding xN) -> build the current mapping by consuming each
 * walker dead entry at most once -> assert the arithmetic identities AND the walkerPath/what-it-means
 * invariant -> load-and-compare the committed mapping (identical: exit 0 and write NOTHING; different: exit
 * non-zero with the diff and write NOTHING) -> only then write. A deliberate refresh (--refresh) is the one
 * way to rewrite committed evidence, and it still asserts everything first.
 */

export type ReconcileBucket = "matched_walker" | "wired_after_inventory" | "non_native_affordance" | "scanner_gap" | "unmatched";

export interface ReconcileItem {
  bucket: ReconcileBucket;
  control: string;
  id: string;
  label: string;
  route: string;
  routeTag: string;
  /** Set IF AND ONLY IF bucket is matched_walker; every other bucket carries null (documented in the log). */
  walkerPath: string | null;
  /** Set IF AND ONLY IF bucket is wired_after_inventory; names the task/evidence that wired it. */
  wiredEvidence: string | null;
}

export interface ReconcileMapping {
  buckets: Record<ReconcileBucket, number>;
  humanTotal: number;
  identities: { allItems: boolean; modelsFamily: boolean; nativeOnly: boolean; walker: boolean };
  items: ReconcileItem[];
  modelsFamily: { affordance: number; rows: number; wired: number };
  nativeTotal: number;
  unmatched: string[];
  walkerOnly: ReadonlyArray<{ label: string; path: string; route: string; tag: string }>;
  walkerTotal: number;
}

export interface HumanItem { control: string; file: string; id: string; itemLabel: string; label: string; route: string; routeTag: string; wired: string; }

const ROUTE_TAGS: Readonly<Record<string, string>> = {
  "/learning": "Learning",
  "/learning/configuration": "LearningConfiguration",
  "/learning/decisions": "LearningDecisions",
  "/learning/evidence": "LearningEvidence",
  "/learning/history": "LearningHistory",
  "/learning/packs": "LearningPacks",
  "/local/llama-swap/models": "LocalLlamaSwapModels",
  "/local/peer-models": "LocalPeerModels",
  "/local/peers": "LocalPeers",
  "/models": "Models",
  "/models/roles": "ModelsRoles",
  "/observe/activity": "ObserveActivity",
  "/observe/logs": "ObserveLogs",
  "/observe/observability-snapshot": "Observability",
  "/observe/routing": "ObserveRouting",
  "/observe/store-degradation-receipts": "StoreReceipts",
  "/requests": "Requests",
  "/system/benchmark": "Benchmark",
  "/system/operator": "SystemOperator",
};
const AFFORDANCE = /clickable model row|detail selection|table rows|table row actions|activity rows|static text/i;

/** Which task wired the human item away; the classifier only uses this for routes proven wired in the current tree. */
const WIRED_EVIDENCE: Readonly<Record<string, string>> = {
  Benchmark: "S618 models wiring",
  LocalLlamaSwapModels: "S628 task-102 wiring",
  LocalLogs: "S625 task-102 wiring",
  LocalPeerModels: "S627 task-102 wiring",
  LocalPeers: "S626 task-102 wiring",
  ObserveLogs: "S624 task-102 wiring",
  SystemExtensions: "S630 task-102 wiring",
  SystemOperator: "S629 task-102 wiring",
  Learning: "S619 learning wiring",
  LearningConfiguration: "S619 learning wiring",
  LearningDecisions: "S619 learning wiring",
  LearningEvidence: "S619 learning wiring",
  LearningHistory: "S619 learning wiring",
  LearningPacks: "S619 learning wiring",
  ModelsRoles: "S618 models wiring",
  Observability: "S619 requests/observe wiring",
  ObserveRouting: "S619 requests/observe wiring",
  Requests: "S619 requests/observe wiring",
  StoreReceipts: "S619 requests/observe wiring",
};

const ALIASES: Readonly<Record<string, string>> = {
  "Auth token (optional)": "Bearer token (optional)",
  "Endpoint URL": "http://127.0.0.1:1234",
  "Expand (Advanced controls)": "Expand",
  "Max requests": "25",
  "Operator access token": "Paste a local operator token",
  "Outcome": "Outcome all outcomes",
  "Role": "Role all roles",
  "Task": "Task all tasks",
  "Trace root id": "trace-root",
};

export const parseHuman = (markdown: string): HumanItem[] => {
  const items: HumanItem[] = [];
  for (const line of markdown.split("\n")) {
    if (!line.startsWith("| /")) continue;
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    if (cells.length < 5) continue;
    const [route, file, control, label, wired] = cells;
    const match = /x(\d+)/.exec(control.replace(/\u00d7/g, "x"));
    const count = match === null ? 1 : Number(match[1]);
    const labels = count === 1 ? [label] : (label.split(", ").length === count ? label.split(", ") : Array.from({ length: count }, () => label));
    const routeTag = ROUTE_TAGS[route] ?? "(unknown:" + route + ")";
    for (let index = 0; index < count; index += 1) {
      items.push({ control, file, id: "H" + String(items.length + 1).padStart(3, "0"), itemLabel: labels[index] ?? label, label, route, routeTag, wired });
    }
  }
  return items;
};

const aliasFor = (item: HumanItem): string => {
  if (item.itemLabel === "Model ID") return item.routeTag === "LocalPeerModels" ? "openai/gpt-4.1" : "lfm2.5-8b-a1b";
  if (item.itemLabel === "Operator token") return "Operator token";
  return ALIASES[item.itemLabel] ?? item.itemLabel.replace(/^"|"$/g, "");
};

export const buildMapping = (humanMarkdown: string, inventory: ReturnType<typeof renderInventory>, scans: ReturnType<typeof scanAllRoutes>): ReconcileMapping => {
  const human = parseHuman(humanMarkdown);
  const walker = inventory.routes.flatMap((route) => route.unwired.map((entry) => ({ label: entry.label, path: entry.path, route: route.route, tag: entry.tag })));
  const unused = walker.map((entry) => ({ ...entry, used: false }));
  const deadByRoute = new Map<string, number>();
  for (const scan of scans) deadByRoute.set(scan.route, scan.error === undefined ? scan.unwired.length : -1);
  const items: ReconcileItem[] = [];
  for (const humanItem of human) {
    const base = { control: humanItem.control, id: humanItem.id, label: humanItem.itemLabel, route: humanItem.route, routeTag: humanItem.routeTag, wiredEvidence: null as string | null, walkerPath: null as string | null };
    if (AFFORDANCE.test(humanItem.control)) { items.push({ ...base, bucket: "non_native_affordance" }); continue; }
    if (humanItem.routeTag === "Requests") { items.push({ ...base, bucket: "scanner_gap" }); continue; }
    const alias = aliasFor(humanItem);
    const candidate = unused.find((entry) => !entry.used && entry.route === humanItem.routeTag && (entry.label === alias || entry.label.startsWith(alias) || alias.startsWith(entry.label)));
    if (candidate !== undefined) {
      candidate.used = true;
      items.push({ ...base, bucket: "matched_walker", walkerPath: candidate.path });
      continue;
    }
    const evidence = WIRED_EVIDENCE[humanItem.routeTag];
    if (evidence !== undefined && deadByRoute.get(humanItem.routeTag) === 0) {
      items.push({ ...base, bucket: "wired_after_inventory", wiredEvidence: evidence });
      continue;
    }
    items.push({ ...base, bucket: "unmatched" });
  }
  const walkerOnly = unused.filter((entry) => !entry.used).map(({ label, path, route, tag }) => ({ label, path, route, tag }));
  const count = (bucket: ReconcileBucket) => items.filter((entry) => entry.bucket === bucket).length;
  const buckets: Record<ReconcileBucket, number> = {
    matched_walker: count("matched_walker"),
    non_native_affordance: count("non_native_affordance"),
    scanner_gap: count("scanner_gap"),
    unmatched: count("unmatched"),
    wired_after_inventory: count("wired_after_inventory"),
  };
  const humanTotal = human.length;
  const nativeTotal = humanTotal - buckets.non_native_affordance;
  const modelsRoutes = new Set(["Models", "ModelsRoles", "Benchmark"]);
  const modelsRows = items.filter((entry) => modelsRoutes.has(entry.routeTag)).length;
  const modelsWired = items.filter((entry) => modelsRoutes.has(entry.routeTag) && entry.bucket === "wired_after_inventory").length;
  const modelsAffordance = items.filter((entry) => modelsRoutes.has(entry.routeTag) && entry.bucket === "non_native_affordance").length;
  const identities = {
    allItems: humanTotal === buckets.non_native_affordance + buckets.wired_after_inventory + buckets.scanner_gap + buckets.matched_walker + buckets.unmatched,
    modelsFamily: modelsRows === modelsWired + modelsAffordance,
    nativeOnly: nativeTotal === buckets.wired_after_inventory + buckets.scanner_gap + buckets.matched_walker + buckets.unmatched,
    walker: walker.length === buckets.matched_walker + walkerOnly.length,
  };
  return {
    buckets,
    humanTotal,
    identities,
    items,
    modelsFamily: { affordance: modelsAffordance, rows: modelsRows, wired: modelsWired },
    nativeTotal,
    unmatched: items.filter((entry) => entry.bucket === "unmatched").map((entry) => entry.id + " " + entry.route + " " + entry.label),
    walkerOnly,
    walkerTotal: walker.length,
  };
};

const CONVENTION = "walkerPath is set if and only if bucket is matched_walker; wired_after_inventory rows carry wiredEvidence and a null walkerPath; non_native_affordance, scanner_gap and unmatched rows carry null for both.";

export const validateMappingShape = (mapping: ReconcileMapping): string[] => {
  const violations: string[] = [];
  for (const item of mapping.items) {
    if (item.bucket === "matched_walker" && item.walkerPath === null) violations.push(item.id + ": matched_walker requires walkerPath");
    if (item.bucket !== "matched_walker" && item.walkerPath !== null) violations.push(item.id + ": walkerPath must be null unless matched_walker");
    if (item.bucket === "wired_after_inventory" && item.wiredEvidence === null) violations.push(item.id + ": wired_after_inventory requires wiredEvidence");
    if (item.bucket !== "wired_after_inventory" && item.wiredEvidence !== null) violations.push(item.id + ": wiredEvidence must be null unless wired_after_inventory");
  }
  return violations;
};

export const compareMapping = (previous: ReconcileMapping, current: ReconcileMapping): string[] => {
  const diff: string[] = [];
  if (previous.items.length !== current.items.length) diff.push("row count " + String(previous.items.length) + " -> " + String(current.items.length));
  const previousById = new Map(previous.items.map((item) => [item.id, item]));
  const currentIds = new Set(current.items.map((item) => item.id));
  for (const item of current.items) {
    const before = previousById.get(item.id);
    if (before === undefined) { diff.push("added row " + item.id); continue; }
    if (before.bucket !== item.bucket) diff.push(item.id + " bucket " + before.bucket + " -> " + item.bucket);
    if (before.walkerPath !== item.walkerPath) diff.push(item.id + " walkerPath " + String(before.walkerPath) + " -> " + String(item.walkerPath));
    if (before.wiredEvidence !== item.wiredEvidence) diff.push(item.id + " wiredEvidence " + String(before.wiredEvidence) + " -> " + String(item.wiredEvidence));
  }
  for (const item of previous.items) if (!currentIds.has(item.id)) diff.push("dropped row " + item.id);
  for (const key of ["allItems", "modelsFamily", "nativeOnly", "walker"] as const) {
    if (previous.identities[key] !== current.identities[key]) diff.push("identity " + key + " " + String(previous.identities[key]) + " -> " + String(current.identities[key]));
  }
  for (const key of ["matched_walker", "non_native_affordance", "scanner_gap", "unmatched", "wired_after_inventory"] as const) {
    if (previous.buckets[key] !== current.buckets[key]) diff.push("bucket total " + key + " " + String(previous.buckets[key]) + " -> " + String(current.buckets[key]));
  }
  if (previous.humanTotal !== current.humanTotal) diff.push("humanTotal " + String(previous.humanTotal) + " -> " + String(current.humanTotal));
  if (previous.nativeTotal !== current.nativeTotal) diff.push("nativeTotal " + String(previous.nativeTotal) + " -> " + String(current.nativeTotal));
  if (previous.walkerTotal !== current.walkerTotal) diff.push("walkerTotal " + String(previous.walkerTotal) + " -> " + String(current.walkerTotal));
  return diff;
};

export interface PlanResult {
  diff: string[];
  humanItems: HumanItem[];
  inventory: ReturnType<typeof renderInventory>;
  mapping: ReconcileMapping;
  scans: ReturnType<typeof scanAllRoutes>;
  status: "changed" | "invalid" | "missing" | "unchanged";
  violations: string[];
}

export const planReconcile = ({ baselineDir, humanMarkdownPath, mappingPath }: { baselineDir: string; humanMarkdownPath: string; mappingPath: string }): PlanResult => {
  const humanItems = parseHuman(readFileSync(humanMarkdownPath, "utf8"));
  const scans = scanAllRoutes();
  const inventory = renderInventory(scans);
  const mapping = buildMapping(readFileSync(humanMarkdownPath, "utf8"), inventory, scans);
  const violations = validateMappingShape(mapping);
  const failedIdentities = Object.entries(mapping.identities).filter(([, ok]) => !ok).map(([key]) => key);
  for (const key of failedIdentities) violations.push("identity " + key + " is false");
  if (violations.length > 0) return { diff: [], humanItems, inventory, mapping, scans, status: "missing", violations };
  void baselineDir;
  if (!existsSync(mappingPath)) return { diff: [], humanItems, inventory, mapping, scans, status: "missing", violations };
  const previous = JSON.parse(readFileSync(mappingPath, "utf8")) as ReconcileMapping;
  // The committed mapping itself must satisfy the convention: an invalid committed file is exit 1 (contract
  // invalid), never exit 2 (stale) and never a rewrite.
  const previousViolations = validateMappingShape(previous);
  const diff = compareMapping(previous, mapping);
  if (previousViolations.length > 0) return { diff, humanItems, inventory, mapping, scans, status: "invalid", violations: previousViolations };
  return { diff, humanItems, inventory, mapping, scans, status: diff.length === 0 ? "unchanged" : "changed", violations };
};

const evidenceDir = () => {
  const root = fileURLToPath(new URL("../../../../../", import.meta.url));
  return root + ".recursive/run/115-effect-foldkit-runtime-migration/evidence/logs/";
};

export const writeEvidence = ({ dir, head, humanItems, inventory, mapping, scans }: { dir: string; head: string; humanItems: HumanItem[]; inventory: ReturnType<typeof renderInventory>; mapping: ReconcileMapping; scans: ReturnType<typeof scanAllRoutes>; }): void => {
  writeFileSync(dir + "s617-human-items.json", JSON.stringify({ total: humanItems.length, items: humanItems }, null, 2) + "\n");
  writeFileSync(dir + "s617-handler-presence-mapping.json", JSON.stringify(mapping, null, 2) + "\n");
  writeFileSync(dir + "s617-handler-presence-baseline.json", JSON.stringify(inventory, null, 2) + "\n");
  const sum = (parts: ReadonlyArray<number>) => parts.join(" + ") + " = " + String(parts.reduce((total, value) => total + value, 0));
  const rows = mapping.items.map((item) => "| " + item.id + " | " + item.route + " | " + item.control + " | " + item.label + " | " + item.bucket + " | " + (item.walkerPath ?? "-") + " | " + (item.wiredEvidence ?? "-") + " |").join("\n");
  const walkerOnlyRows = mapping.walkerOnly.map((entry) => "- " + entry.route + " " + entry.tag + " " + JSON.stringify(entry.label) + " @ " + entry.path).join("\n");
  const buckets = mapping.buckets;
  const header = [
    "# S617 handler-presence baseline inventory",
    "",
    "Generated by test/tools/handler-presence-reconcile.ts from the human inventory + the live route scan.",
    "RED note: evidence/logs/s617-handler-presence-red.log is a MODULE-SETUP RED (the helper module did not exist), expected for a new module.",
    "Convention: " + CONVENTION,
    "",
    "walker: routes=" + String(inventory.totals.routes) + " elements=" + String(inventory.totals.elements) + " deadControls=" + String(inventory.totals.deadControls) + " disabledControls=" + String(inventory.totals.disabledControls),
    "scanner_errors=" + String(scans.filter((scan) => scan.error !== undefined).length) + " (Requests: listbox needs a runtime render frame)",
    "",
    "## Exact reconciliation (no estimates; every count is a list length)",
    "",
    "human rows: " + sum([buckets.non_native_affordance, buckets.wired_after_inventory, buckets.scanner_gap, buckets.matched_walker, buckets.unmatched]) + " -> " + String(mapping.humanTotal) + " " + (mapping.identities.allItems ? "OK" : "MISMATCH"),
    "human native controls (rows minus " + String(buckets.non_native_affordance) + " native affordances): " + sum([buckets.wired_after_inventory, buckets.scanner_gap, buckets.matched_walker, buckets.unmatched]) + " -> " + String(mapping.nativeTotal) + " " + (mapping.identities.nativeOnly ? "OK" : "MISMATCH"),
    "walker dead controls: " + sum([buckets.matched_walker, mapping.walkerOnly.length]) + " -> " + String(mapping.walkerTotal) + " " + (mapping.identities.walker ? "OK" : "MISMATCH"),
    "models family rows: " + sum([mapping.modelsFamily.wired, mapping.modelsFamily.affordance]) + " -> " + String(mapping.modelsFamily.rows) + " (" + String(mapping.modelsFamily.wired) + " wired + " + String(mapping.modelsFamily.affordance) + " affordances)",
    "",
    "buckets: matched_walker=" + String(buckets.matched_walker) + " wired_after_inventory=" + String(buckets.wired_after_inventory) + " non_native_affordance=" + String(buckets.non_native_affordance) + " scanner_gap=" + String(buckets.scanner_gap) + " unmatched=" + String(buckets.unmatched),
    "wired evidence: " + JSON.stringify(mapping.items.filter((item) => item.bucket === "wired_after_inventory").reduce((acc, item) => { const key = item.wiredEvidence ?? "?"; acc[key] = (acc[key] ?? 0) + 1; return acc; }, {} as Record<string, number>)),
    "unmatched human items: " + (mapping.unmatched.length === 0 ? "none" : mapping.unmatched.join("; ")),
    "",
    "## Three-way mapping (human item -> bucket -> walker item / evidence)",
    "",
    "| id | route | control | label | bucket | walker path | wired evidence |",
    "|---|---|---|---|---|---|---|",
    rows,
    "",
    "## Walker-only dead controls (" + String(mapping.walkerOnly.length) + ")",
    "",
    walkerOnlyRows,
    "",
    "## Walker per-route dead controls",
    "",
  ].join("\n");
  writeFileSync(dir + "s617-handler-presence-baseline-" + head + ".log", header + "\n" + formatInventoryText(inventory) + "\n");
};

const main = () => {
  // Test seam: the CLI guard tests isolate the evidence dir so they can never touch committed evidence.
  const dirRaw = process.env.S617_RECONCILE_EVIDENCE ?? evidenceDir();
  const dir = dirRaw.endsWith("/") || dirRaw.endsWith("\\") ? dirRaw : dirRaw + "/";
  const mappingPath = process.env.S617_RECONCILE_MAPPING ?? dir + "s617-handler-presence-mapping.json";
  const refresh = process.argv.includes("--refresh");
  const plan = planReconcile({
    baselineDir: fileURLToPath(new URL("../support/", import.meta.url)),
    humanMarkdownPath: dir + "ui-dead-controls-inventory.md",
    mappingPath,
  });
  const summary = { buckets: plan.mapping.buckets, humanTotal: plan.mapping.humanTotal, identities: plan.mapping.identities, modelsFamily: plan.mapping.modelsFamily, nativeTotal: plan.mapping.nativeTotal, status: plan.status, walkerOnly: plan.mapping.walkerOnly.length, walkerTotal: plan.mapping.walkerTotal };
  if (plan.violations.length > 0) {
    console.error("RECONCILE INVALID (nothing written):\n" + plan.violations.join("\n"));
    process.exitCode = 1;
    return;
  }
  if (plan.status === "missing" && !refresh) {
    console.error("RECONCILE FAILED: committed mapping is missing at " + mappingPath + "; run with --refresh to bootstrap (nothing written).");
    process.exitCode = 3;
    return;
  }
  if (plan.status === "unchanged" && !refresh) {
    console.log(JSON.stringify({ ...summary, wrote: false }));
    console.log("RECONCILE OK: committed mapping matches; no files written.");
    return;
  }
  if (plan.status === "changed" && !refresh) {
    console.error("RECONCILE FAILED: committed mapping differs (nothing written). Re-run with --refresh to accept:\n" + plan.diff.join("\n"));
    process.exitCode = 2;
    return;
  }
  const head = execSync("git rev-parse --short HEAD", { cwd: process.cwd(), encoding: "utf8" }).trim();
  writeEvidence({ dir, head, humanItems: plan.humanItems, inventory: plan.inventory, mapping: plan.mapping, scans: plan.scans });
  console.log(JSON.stringify({ ...summary, wrote: true }));
  if (plan.diff.length > 0) console.error("REFRESH DIFF:\n" + plan.diff.join("\n"));
  if (!Object.values(plan.mapping.identities).every(Boolean)) process.exitCode = 1;
};

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) main();
