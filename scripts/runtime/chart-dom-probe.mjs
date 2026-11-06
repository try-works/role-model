#!/usr/bin/env node
/**
 * Capture chart DOM evidence and screenshots from a running review instance.
 *
 * The shared browser is contested by other sessions, so this drives its own headless
 * Chrome over the DevTools protocol (no dependency) and records, per route, the number
 * of SVG paths and the chart-series count exposed by the chart component.
 *
 * Usage:
 *   node scripts/runtime/chart-dom-probe.mjs --url http://127.0.0.1:3480 --out-dir D:/DEV/rm-clean/chart-evidence
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
const value = (name, fallback) => {
  const at = args.indexOf(name);
  return at < 0 ? fallback : args[at + 1];
};
const base = value("--url", "http://127.0.0.1:3480");
const outDir = path.resolve(value("--out-dir", "chart-evidence"));
mkdirSync(outDir, { recursive: true });
const routes = [
  { route: "/", name: "overview" },
  { route: "/requests", name: "requests" },
  { route: "/observe/routing", name: "routing" },
  {
    route: "/observe/routing?source=local&breakdown=By+upstream+model&difficulty=hard",
    name: "routing-filtered",
  },
  { route: "/observe/routing?range=week", name: "routing-week" },
  { route: "/observe/queues", name: "queues" },
];
const CHROME = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
]
  .filter(Boolean)
  .find((candidate) => existsSync(candidate));
if (!CHROME) {
  console.log("NOT RUN: no Chromium-family browser found");
  process.exit(2);
}

const userDataDir = mkdtempSync(path.join(os.tmpdir(), "chart-probe-chrome-"));
const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    "--remote-debugging-port=0",
    `--user-data-dir=${userDataDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "about:blank",
  ],
  { stdio: ["ignore", "pipe", "pipe"] },
);
let chromeAlive = true;
const cleanup = () => {
  try {
    chrome.kill();
  } catch {}
  try {
    rmSync(userDataDir, { force: true, recursive: true });
  } catch {}
};
const wsUrl = await new Promise((resolve, reject) => {
  let buffer = "";
  const timer = setTimeout(
    () => reject(new Error("chrome did not report a DevTools endpoint")),
    30_000,
  );
  chrome.stderr.on("data", (chunk) => {
    buffer += String(chunk);
    const match = buffer.match(/DevTools listening on (ws:\/\/\S+)/);
    if (match) {
      clearTimeout(timer);
      resolve(match[1]);
    }
  });
  chrome.on("exit", () => {
    chromeAlive = false;
    clearTimeout(timer);
    reject(new Error("chrome exited before reporting an endpoint"));
  });
});
const socket = new WebSocket(wsUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});
let nextId = 1;
const pending = new Map();
const telemetryQueries = [];
socket.addEventListener("message", (event) => {
  const message = JSON.parse(String(event.data));
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
    return;
  }
  if (
    message.method === "Network.requestWillBeSent" &&
    String(message.params?.request?.url ?? "").includes("/api/role-model/telemetry/query")
  ) {
    const raw = message.params?.request?.postData;
    let parsed = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {}
    telemetryQueries.push({ url: message.params.request.url, body: parsed });
  }
});
const send = (method, params, sessionId) =>
  new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    socket.send(
      JSON.stringify(
        sessionId === undefined ? { id, method, params } : { id, method, params, sessionId },
      ),
    );
  });
const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
await send("Page.enable", {}, sessionId);
await send("Runtime.enable", {}, sessionId);
await send("Network.enable", {}, sessionId);
await send(
  "Emulation.setDeviceMetricsOverride",
  { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false },
  sessionId,
);

const expression = `JSON.stringify({
  overviewCards: [...document.querySelectorAll("[data-overview-card]")].map((card) => ({
    title: card.getAttribute("data-overview-card"),
    paths: card.querySelectorAll("svg path").length,
    series: card.querySelector("svg")?.getAttribute("data-chart-series-count") ?? null,
  })),
  plots: [...document.querySelectorAll("[data-chart-plot]")].map((plot) => ({
    title: plot.getAttribute("data-chart-plot"),
    paths: plot.querySelectorAll("svg path").length,
    series: plot.querySelector("svg")?.getAttribute("data-chart-series-count") ?? null,
  })),
  chartCards: document.querySelectorAll("[data-chart-plot]").length,
  totalTables: document.querySelectorAll("table").length,
  routingResultsText: /Routing results/i.test(document.body.innerText),
  bars: [...document.querySelectorAll("[data-chart-plot]")].reduce((sum, plot) => sum + plot.querySelectorAll("rect").length, 0),
  visibleChartTables: [...document.querySelectorAll("[data-chart-part='table']")].filter((table) => table.getClientRects().length > 0 && getComputedStyle(table).visibility !== "hidden" && !table.closest(".sr-only")).length,
  hiddenChartTables: [...document.querySelectorAll("[data-chart-part='table']")].filter((table) => table.closest(".sr-only") || getComputedStyle(table).clipPath.includes("inset(50%)") || table.hidden).length,
  title: document.title,
  pathCount: document.querySelectorAll("svg path").length,
})`;
const results = [];
for (const item of routes) {
  telemetryQueries.length = 0;
  await send("Page.navigate", { url: base + item.route }, sessionId);
  await new Promise((resolve) => setTimeout(resolve, 8000));
  const evaluated = await send("Runtime.evaluate", { expression, returnByValue: true }, sessionId);
  const data = JSON.parse(String(evaluated.result?.value ?? "{}"));
  await send(
    "Runtime.evaluate",
    { expression: 'document.querySelector("[data-chart-plot]")?.scrollIntoView({block:"center"})' },
    sessionId,
  );
  await new Promise((resolve) => setTimeout(resolve, 300));
  const screenshot = await send("Page.captureScreenshot", { format: "png" }, sessionId);
  const file = path.join(outDir, `${item.name}.png`);
  writeFileSync(file, Buffer.from(String(screenshot.data), "base64"));
  results.push({
    route: item.route,
    screenshot: file,
    telemetryQueries: item.route.includes("routing?") ? [...telemetryQueries] : undefined,
    ...data,
  });
}
console.log(JSON.stringify({ url: base, results }, null, 2));
cleanup();
if (!chromeAlive) process.exit(1);
