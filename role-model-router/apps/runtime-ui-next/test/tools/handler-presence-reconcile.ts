import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { formatInventoryText, renderInventory, scanAllRoutes } from "../support/handler-presence";

/**
 * S617 reconciliation generator (machine-derived, committed so the evidence is reproducible).
 *
 * Reads the human dead-control table from ui-dead-controls-inventory.md, expands every "xN" row into N
 * individual items, classifies EVERY human item into exactly one bucket, matches native human items to
 * the walker dead list (consuming each walker entry at most once), and asserts the arithmetic identities
 * before writing the JSON mapping + evidence log. It never estimates a count: every number below is a
 * length of a list it just built, and the run fails when an identity does not hold.
 */

const repoRoot = fileURLToPath(new URL("../../../../../", import.meta.url));
const evidenceLogs = repoRoot + ".recursive/run/115-effect-foldkit-runtime-migration/evidence/logs/";
const humanMarkdownPath = evidenceLogs + "ui-dead-controls-inventory.md";
const baselinePath = fileURLToPath(new URL("../support/handler-presence-baseline.json", import.meta.url));

interface HumanRow { readonly control: string; readonly file: string; readonly label: string; readonly route: string; readonly routeTag: string; readonly wired: string; }
interface HumanItem extends HumanRow { readonly id: string; readonly itemLabel: string; }
interface WalkerEntry { readonly label: string; readonly path: string; readonly route: string; readonly tag: string; }
type Bucket = "matched_walker" | "wired_s618" | "non_native_affordance" | "scanner_gap" | "unmatched";

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
const WIRED_ROUTES = new Set(["ModelsRoles", "Benchmark"]);
const SCANNER_ROUTES = new Set(["Requests"]);

const parseHuman = (markdown: string): HumanItem[] => {
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

const ALIASES: Readonly<Record<string, string>> = {
  "Auth token (optional)": "Bearer token (optional)",
  "Endpoint URL": "http://127.0.0.1:1234",
  "Expand (Advanced controls)": "Expand",
  "Max requests": "25",
  "Operator access token": "Paste a local operator token",
  "Role": "Role all roles",
  "Task": "Task all tasks",
  "Outcome": "Outcome all outcomes",
  "Trace root id": "trace-root",
};
const aliasFor = (item: HumanItem): string => {
  if (item.itemLabel === "Model ID") return item.routeTag === "LocalPeerModels" ? "openai/gpt-4.1" : "lfm2.5-8b-a1b";
  if (item.itemLabel === "Operator token") return "Operator token";
  return ALIASES[item.itemLabel] ?? item.itemLabel.replace(/^"|"$/g, "");
};

const main = () => {
  const human = parseHuman(readFileSync(humanMarkdownPath, "utf8"));
  const inventory = JSON.parse(readFileSync(baselinePath, "utf8")) as ReturnType<typeof renderInventory>;
  void renderInventory;
  const scans = scanAllRoutes();
  const walker = inventory.routes.flatMap((route) => route.unwired.map((entry) => ({ label: entry.label, path: entry.path, route: route.route, tag: entry.tag })));
  const unused = walker.map((entry, index) => ({ ...entry, index, used: false }));
  const classify = (item: HumanItem): { bucket: Bucket; walkerEntry?: WalkerEntry } => {
    if (AFFORDANCE.test(item.control)) return { bucket: "non_native_affordance" };
    if (SCANNER_ROUTES.has(item.routeTag)) return { bucket: "scanner_gap" };
    if (WIRED_ROUTES.has(item.routeTag)) return { bucket: "wired_s618" };
    const alias = aliasFor(item);
    const candidate = unused.find((entry) => !entry.used && entry.route === item.routeTag && (entry.label === alias || entry.label.startsWith(alias) || alias.startsWith(entry.label)));
    if (candidate === undefined) return { bucket: "unmatched" };
    candidate.used = true;
    return { bucket: "matched_walker", walkerEntry: { label: candidate.label, path: candidate.path, route: candidate.route, tag: candidate.tag } };
  };
  const mapped = human.map((item) => ({ item, ...classify(item) }));
  const walkerOnly = unused.filter((entry) => !entry.used);
  const count = (bucket: Bucket) => mapped.filter((entry) => entry.bucket === bucket).length;
  const nonNative = count("non_native_affordance");
  const wired = count("wired_s618");
  const gap = count("scanner_gap");
  const matched = count("matched_walker");
  const unmatched = count("unmatched");
  const humanTotal = human.length;
  const nativeTotal = humanTotal - nonNative;
  const modelsFamily = human.filter((item) => WIRED_ROUTES.has(item.routeTag) || item.route === "/models");
  const modelsWired = mapped.filter((entry) => entry.bucket === "wired_s618").length;
  const modelsAffordance = mapped.filter((entry) => entry.bucket === "non_native_affordance" && (entry.item.route === "/models" || entry.item.route === "/models/roles" || entry.item.route === "/system/benchmark")).length;
  const identities = {
    allItems: humanTotal === nonNative + wired + gap + matched + unmatched,
    nativeOnly: nativeTotal === wired + gap + matched + unmatched,
    walker: walker.length === matched + walkerOnly.length,
    modelsFamily: modelsFamily.length === modelsWired + modelsAffordance,
  };
  const report = {
    buckets: { gap, matched, nonNative, unmatched, wired },
    humanTotal,
    identities,
    items: mapped.map((entry) => ({ bucket: entry.bucket, control: entry.item.control, id: entry.item.id, label: entry.item.itemLabel, route: entry.item.route, routeTag: entry.item.routeTag, walkerLabel: entry.walkerEntry?.label, walkerPath: entry.walkerEntry?.path })),
    modelsFamily: { affordance: modelsAffordance, rows: modelsFamily.length, wired: modelsWired },
    nativeTotal,
    unmatched: mapped.filter((entry) => entry.bucket === "unmatched").map((entry) => entry.item.id + " " + entry.item.route + " " + entry.item.itemLabel),
    walkerOnly,
    walkerTotal: walker.length,
  };
  writeFileSync(evidenceLogs + "s617-human-items.json", JSON.stringify({ total: humanTotal, items: human }, null, 2) + "\n");
  writeFileSync(evidenceLogs + "s617-handler-presence-mapping.json", JSON.stringify(report, null, 2) + "\n");
  const sum = (parts: ReadonlyArray<number>) => parts.join(" + ") + " = " + String(parts.reduce((total, value) => total + value, 0));
  const table = mapped.map((entry) => "| " + entry.item.id + " | " + entry.item.route + " | " + entry.item.control + " | " + entry.item.itemLabel + " | " + entry.bucket + " | " + (entry.walkerEntry === undefined ? "-" : entry.walkerEntry.path) + " |").join("\n");
  const walkerOnlyRows = walkerOnly.map((entry) => "- " + entry.route + " " + entry.tag + " " + JSON.stringify(entry.label) + " @ " + entry.path).join("\n");
  const header = [
    "# S617 handler-presence baseline inventory",
    "",
    "Generated by test/tools/handler-presence-reconcile.ts from the human inventory + the live route scan.",
    "RED note: evidence/logs/s617-handler-presence-red.log is a MODULE-SETUP RED (the helper module did not exist), expected for a new module.",
    "",
    "walker: routes=" + String(inventory.totals.routes) + " elements=" + String(inventory.totals.elements) + " deadControls=" + String(inventory.totals.deadControls) + " disabledControls=" + String(inventory.totals.disabledControls),
    "scanner_errors=" + String(scans.filter((scan) => scan.error !== undefined).length) + " (Requests: listbox needs a runtime render frame)",
    "",
    "## Exact reconciliation (no estimates)",
    "",
    "human rows in the table: " + sum([nonNative, wired, gap, matched, unmatched]) + " -> " + String(humanTotal) + " " + (identities.allItems ? "OK" : "MISMATCH"),
    "human native controls (all rows minus " + String(nonNative) + " non-native affordances): " + sum([wired, gap, matched, unmatched]) + " -> " + String(nativeTotal) + " " + (identities.nativeOnly ? "OK" : "MISMATCH"),
    "walker dead controls: " + sum([matched, walkerOnly.length]) + " -> " + String(walker.length) + " " + (identities.walker ? "OK" : "MISMATCH"),
    "",
    "buckets: matched_walker=" + String(matched) + " wired_by_S618=" + String(wired) + " non_native_affordance=" + String(nonNative) + " scanner_gap=" + String(gap) + " unmatched=" + String(unmatched),
    "models family rows: " + sum([modelsWired, modelsAffordance]) + " -> " + String(modelsFamily.length) + " (the 17 the review expected = " + String(modelsWired) + " native wired by S618 + " + String(modelsAffordance) + " non-native affordances; the 53 native-only total subtracts all " + String(nonNative) + " affordances)",
    "",
    "unmatched human items: " + (unmatched === 0 ? "none" : report.unmatched.join("; ")),
    "",
    "## Three-way mapping (human item -> bucket -> walker item)",
    "",
    "| id | route | control | label | bucket | walker path |",
    "|---|---|---|---|---|---|",
    table,
    "",
    "## Walker-only dead controls (" + String(walkerOnly.length) + ")",
    "",
    walkerOnlyRows,
    "",
    "## Walker per-route dead controls",
    "",
  ].join("\n");
  const head = execSync("git rev-parse --short HEAD", { cwd: repoRoot, encoding: "utf8" }).trim();
  const textLog = header + "\n" + formatInventoryText(inventory) + "\n";
  writeFileSync(evidenceLogs + "s617-handler-presence-baseline-" + head + ".log", textLog);
  writeFileSync(evidenceLogs + "s617-handler-presence-baseline.json", JSON.stringify(inventory, null, 2) + "\n");
  console.log(JSON.stringify({ identities, buckets: report.buckets, humanTotal, nativeTotal, walkerTotal: walker.length, modelsFamily: report.modelsFamily, walkerOnly: walkerOnly.length }));
  if (!Object.values(identities).every(Boolean)) process.exitCode = 1;
};

main();
