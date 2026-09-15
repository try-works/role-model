/**
 * Run 99 UI audit: open every runtime route in a real browser, record what rendered, what failed and
 * a screenshot per page. Optional operator token is injected into localStorage so the token-gated
 * surfaces are exercised the same way an operator would.
 *
 *   node scripts/run99-ui-audit.mjs <baseUrl> <outDir> [operatorToken]
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const baseUrl = process.argv[2] ?? "http://127.0.0.1:3457";
const outDir = process.argv[3] ?? "E:\\tmp\\p99\\pages";
const operatorToken = process.argv[4] ?? "";

/** [route, markers that must be present] */
const routes = [
  ["/app", ["Runtime overview"]],
  ["/app/studio/chat", ["Chat"]],
  ["/app/studio/images", ["Image"]],
  ["/app/studio/audio", ["Audio"]],
  ["/app/studio/rerank", ["Rerank"]],
  ["/app/studio/advanced", ["Advanced"]],
  ["/app/local/endpoints", ["Endpoint"]],
  ["/app/local/peer-models", ["Peer"]],
  ["/app/local/llama-swap/models", ["Llama"]],
  ["/app/local/llama-swap/swap", ["Swap"]],
  ["/app/local/llama-swap/policy", ["Policy"]],
  ["/app/local/llama-swap/logs", ["Log"]],
  ["/app/local/llama-swap/matrix", ["Matrix"]],
  ["/app/remote/providers", ["Provider"]],
  ["/app/models", ["Models"]],
  ["/app/models/roles", ["Roles"]],
  ["/app/models/benchmark", ["Benchmark"]],
  ["/app/router", ["Router"]],
  ["/app/router/strategy", ["Strategy"]],
  ["/app/router/controller", ["Controller"]],
  ["/app/router/candidates", ["Candidate"]],
  ["/app/router/decisions", ["Decision"]],
  ["/app/observe/requests", ["Request"]],
  ["/app/observe/routing", ["Routing"]],
  ["/app/observe/activity", ["Activity"]],
  ["/app/observe/logs", ["Log"]],
  ["/app/connect", ["Available models"]],
  ["/app/connect/downstream", ["application"]],
  ["/app/connect/upstream", ["Upstream"]],
  ["/app/system/session-readiness", ["readiness"]],
  ["/app/system/runtime", ["Runtime"]],
  ["/app/system/runtime-config", ["config"]],
  ["/app/system/peers", ["Peer"]],
  ["/app/system/extensions", ["Extension"]],
  ["/app/system/storage-retention", ["Storage"]],
  ["/app/learning", ["Learning overview", "Live replay & evaluation"]],
  ["/app/learning/configuration", ["Learning configuration"]],
  ["/app/learning/packs", ["pack"]],
  ["/app/learning/decisions", ["Decision"]],
  ["/app/learning/evidence", ["evidence"]],
  ["/app/learning/history", ["Learning history", "Activity by bucket"]],
];

// Page-level failure phrasing only: the word "unavailable" is legitimate data on several pages
// (advisory state counts, capability notes), so the markers stay specific.
const ERROR_MARKERS = [
  "No value is fabricated",
  "surface unavailable:",
  "failed with",
  "Cannot read properties",
  "Something went wrong",
  "operator_authentication_required",
];

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1600, height: 1200 }, colorScheme: "dark" });
if (operatorToken) {
  await context.addInitScript(
    ([key, value]) => window.localStorage.setItem(key, value),
    ["role-model.learning.operator-token", operatorToken],
  );
}

const report = [];
for (const [route, markers] of routes) {
  const page = await context.newPage();
  const consoleErrors = [];
  const failedRequests = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text().slice(0, 200));
  });
  page.on("response", (response) => {
    if (response.status() >= 400) failedRequests.push(`${response.status()} ${response.url()}`);
  });
  const slug = route.replace(/^\/app\/?/, "").replaceAll("/", "-") || "overview";
  try {
    await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3500);
    const body = await page.locator("body").innerText();
    const missing = markers.filter((marker) => !body.toLowerCase().includes(marker.toLowerCase()));
    const errorHits = ERROR_MARKERS.filter((marker) => body.includes(marker));
    const placeholders = (body.match(/—/g) ?? []).length;
    await page.screenshot({ path: path.join(outDir, `${slug}.png`), fullPage: true });
    report.push({
      route,
      ok: missing.length === 0 && errorHits.length === 0 && consoleErrors.length === 0 && failedRequests.length === 0,
      missingMarkers: missing,
      errorMarkers: errorHits,
      placeholders,
      characters: body.length,
      consoleErrors: consoleErrors.slice(0, 4),
      failedRequests: failedRequests.slice(0, 6),
    });
  } catch (error) {
    report.push({ route, ok: false, crash: String(error?.message ?? error) });
  } finally {
    await page.close();
  }
}

await browser.close();
writeFileSync(path.join(outDir, "audit-report.json"), `${JSON.stringify(report, null, 1)}\n`, "utf8");
const failing = report.filter((entry) => !entry.ok);
console.log(
  JSON.stringify(
    {
      pages: report.length,
      passing: report.length - failing.length,
      failing: failing.length,
      failures: failing.map((entry) => ({
        route: entry.route,
        missing: entry.missingMarkers,
        errors: entry.errorMarkers,
        console: entry.consoleErrors,
        requests: entry.failedRequests,
        crash: entry.crash,
      })),
    },
    null,
    1,
  ),
);
