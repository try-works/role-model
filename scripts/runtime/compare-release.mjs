#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const OPERATOR_PORTS = new Set([3456, 3457, 3458]);
const args = process.argv.slice(2);
const value = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const left = value("--left"), right = value("--right"), rightExe = value("--right-exe"), rightPort = value("--right-port"), rightState = value("--right-state");
const problems = [];
if (!left) problems.push("--left is required");
if (!right && !rightExe) problems.push("--right or --right-exe is required");
if (rightExe && !rightPort) problems.push("--right-port is required with --right-exe");
for (const [name, raw] of [["--left", left], ["--right", right]]) if (raw) { try { const url = new URL(raw); if (OPERATOR_PORTS.has(Number(url.port))) problems.push(name + " uses an operator port"); } catch { problems.push(name + " is not a URL"); } }
if (rightPort && (!Number.isInteger(Number(rightPort)) || OPERATOR_PORTS.has(Number(rightPort)))) problems.push("--right-port is invalid or an operator port");
if (rightExe && !existsSync(rightExe)) problems.push("--right-exe does not exist");
if (problems.length > 0) { console.log("NOT RUN: " + problems.join("; ")); process.exit(2); }
let child;
let rightBase = right;
if (rightExe) { mkdirSync(path.resolve(rightState ?? path.join("E:/rm-tmp", "compare-release-state")), { recursive: true }); child = spawn(rightExe, ["--repo-root", path.dirname(rightExe), "--runtime-state-root", path.resolve(rightState ?? path.join("E:/rm-tmp", "compare-release-state")), "--scope-id", "standalone-runtime-dev", "--host", "127.0.0.1", "--port", String(rightPort)], { stdio: "ignore" }); rightBase = "http://127.0.0.1:" + String(rightPort); for (let i = 0; i < 120; i += 1) { try { const r = await fetch(rightBase + "/healthz"); if (r.ok) break; } catch {} await new Promise((r) => setTimeout(r, 250)); } }
const endpoints = ["/healthz", "/api/role-model/runtime/summary", "/api/role-model/models", "/api/role-model/endpoints", "/api/role-model/router/summary", "/api/role-model/telemetry/summary", "/api/role-model/operator/learning", "/api/role-model/operator/replay/jobs", "/api/role-model/operator/evaluation/jobs"];
const IDENTITY = new Set(["version", "release_version", "commit", "build_date", "executable_sha256", "core_payload_sha256", "source_tree", "runtimeStateRoot", "endpoint", "port", "startedAt", "finishedAt", "stages", "pid", "rssBytes", "path", "reconciledAt"]);
const strip = (value) => { if (Array.isArray(value)) return value.map(strip); if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([key]) => !IDENTITY.has(key)).map(([key, item]) => [key, strip(item)])); return value; };
const rows = [];
try { for (const endpoint of endpoints) { let leftResult, rightResult; try { leftResult = await fetch(left + endpoint); } catch (error) { leftResult = undefined; } try { rightResult = await fetch(rightBase + endpoint); } catch (error) { rightResult = undefined; } const lb = leftResult ? await leftResult.text() : ""; const rb = rightResult ? await rightResult.text() : ""; let lj, rj; try { lj = JSON.parse(lb); } catch {} try { rj = JSON.parse(rb); } catch {} const ls = leftResult?.status, rs = rightResult?.status; let classification = "same"; if (ls !== rs) classification = "different"; else if (endpoint.includes("telemetry") || endpoint.includes("operator/learning") || endpoint.includes("replay") || endpoint.includes("evaluation")) { if (JSON.stringify(lj) !== JSON.stringify(rj)) classification = "environment-state"; } else if (JSON.stringify(strip(lj)) !== JSON.stringify(strip(rj))) classification = "different"; rows.push({ endpoint, leftStatus: ls, rightStatus: rs, classification }); } } finally { child?.kill(); }
for (const row of rows) console.log(row.classification + " " + row.endpoint + " (" + String(row.leftStatus) + "/" + String(row.rightStatus) + ")");
const counts = rows.reduce((map, row) => ({ ...map, [row.classification]: (map[row.classification] ?? 0) + 1 }), {});
console.log(JSON.stringify(counts));
process.exit((counts.different ?? 0) > 0 ? 1 : 0);
