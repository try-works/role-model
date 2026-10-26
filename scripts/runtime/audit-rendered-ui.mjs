#!/usr/bin/env node
/**
 * Rendered-UI audit (S182).
 *
 * Drives a real headless Chrome over the DevTools protocol - no new dependency, Node's global
 * WebSocket does the work - and checks the things HTTP-level gates cannot see. Four defects were
 * found by hand in S175-S181 that this script catches:
 *
 *   invisible control (background == colour)          S175 Studio "Run"
 *   accessible name repeating its option text        S177 filter selects
 *   contrast below WCAG AA                           S178 light theme 1.12:1
 *   application crash banner / missing bypass block   S181 my own regression
 *
 * Usage:
 *   node scripts/runtime/audit-rendered-ui.mjs --url http://127.0.0.1:6201 [--routes /,/studio]
 *   node scripts/runtime/audit-rendered-ui.mjs --exe <role-model-dev.exe> --static-root <dist> ...
 *
 * Exit: 0 all routes clean, 1 failures, 2 not run (no browser / host unreachable).
 */
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
const value = (name) => { const at = args.indexOf(name); return at < 0 ? undefined : args[at + 1]; };
const has = (name) => args.includes(name);

const DEFAULT_ROUTES = ["/", "/runtime", "/models", "/router", "/router/candidates", "/projects-not-a-route".replace("projects-not-a-route","router/decisions"), "/control/providers", "/control/endpoints", "/control/controller", "/observe/queues", "/observe/observability-snapshot", "/local/logs", "/local/swap", "/system/peers", "/requests", "/session-readiness", "/dashboard", "/studio", "/learning", "/diagnostics/42"];
const viewportWidth = Number(value("--width") ?? process.env.AUDIT_WIDTH ?? 1280);
const viewportHeight = Number(value("--height") ?? process.env.AUDIT_HEIGHT ?? 800);
const routes = (value("--routes") ?? DEFAULT_ROUTES.join(",")).split(",").map((r) => r.trim()).filter(Boolean);

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);
// CHROME_PATH is authoritative when set: a wrong value must mean "not run", not "silently pick
// another browser". That distinction is what makes an offline CI skip honest.
const chromePath = process.env.CHROME_PATH === undefined
  ? CHROME_CANDIDATES.find((candidate) => existsSync(candidate))
  : (existsSync(process.env.CHROME_PATH) ? process.env.CHROME_PATH : undefined);
if (!chromePath) { console.log("NOT RUN: no Chromium-family browser found (set CHROME_PATH)"); process.exit(2); }

let base = value("--url");
let host;
const stateRoot = value("--state-root") ?? mkdtempSync(path.join(os.tmpdir(), "audit-ui-state-"));
const userDataDir = mkdtempSync(path.join(os.tmpdir(), "audit-ui-chrome-"));
const cleanup = () => {
  try { host?.kill(); } catch {}
  try { chrome?.kill(); } catch {}
  try { rmSync(userDataDir, { force: true, recursive: true }); } catch {}
};
let chrome;

if (base === undefined) {
  const exe = value("--exe");
  if (!exe) { console.log("NOT RUN: pass --url or --exe"); process.exit(2); }
  const port = value("--port") ?? "6231";
  host = spawn(exe, [
    "--repo-root", path.dirname(exe),
    "--runtime-state-root", stateRoot,
    "--host", "127.0.0.1",
    "--port", String(port),
    ...(value("--fixture-root") ? ["--fixture-root", value("--fixture-root")] : []),
    ...(value("--static-root") ? ["--static-root", value("--static-root")] : []),
  ], { stdio: ["ignore", "pipe", "pipe"] });
  base = "http://127.0.0.1:" + String(port);
  const deadline = Date.now() + Number(process.env.AUDIT_READY_TIMEOUT_MS ?? 120_000);
  let ready = false;
  while (Date.now() < deadline && !ready) {
    try { const response = await fetch(base + "/healthz"); ready = response.ok; } catch {}
    if (!ready) await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (!ready) { console.log("NOT RUN: " + base + " did not become healthy"); cleanup(); process.exit(2); }
}

chrome = spawn(chromePath, [
  "--headless=new",
  "--remote-debugging-port=0",
  "--user-data-dir=" + userDataDir,
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-gpu",
  "--disable-dev-shm-usage",
  "about:blank",
], { stdio: ["ignore", "pipe", "pipe"] });

const wsUrl = await new Promise((resolve, reject) => {
  let buffer = "";
  const timer = setTimeout(() => reject(new Error("chrome did not report a DevTools endpoint")), 30_000);
  chrome.stderr.on("data", (chunk) => {
    buffer += String(chunk);
    const match = buffer.match(/DevTools listening on (ws:\/\/\S+)/);
    if (match) { clearTimeout(timer); resolve(match[1]); }
  });
  chrome.on("exit", () => { clearTimeout(timer); reject(new Error("chrome exited before reporting an endpoint")); });
});

const socket = new WebSocket(wsUrl);
await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });

let nextId = 1;
const pending = new Map();
const events = [];
socket.addEventListener("message", (event) => {
  const message = JSON.parse(String(event.data));
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message)); else resolve(message.result);
    return;
  }
  events.push(message);
});
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const id = nextId++;
  pending.set(id, { resolve, reject });
  socket.send(JSON.stringify(sessionId === undefined ? { id, method, params } : { id, method, params, sessionId }));
});

const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
await send("Page.enable", {}, sessionId);
await send("Runtime.enable", {}, sessionId);
await send("Emulation.setDeviceMetricsOverride", { width: viewportWidth, height: viewportHeight, deviceScaleFactor: 1, mobile: viewportWidth < 600 }, sessionId);

const AUDIT = `(() => {
  const parse = (color) => { const m = String(color).match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const parts = m[1].split(",").map(Number); return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 }; };
  const lum = ({ r, g, b }) => { const f = (v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); const hi = Math.max(l1, l2), lo = Math.min(l1, l2); return (hi + 0.05) / (lo + 0.05); };
  const backgroundOf = (el) => { let node = el; while (node) { const bg = parse(getComputedStyle(node).backgroundColor); if (bg && bg.a > 0.5) return bg; node = node.parentElement; } return { r: 10, g: 10, b: 10, a: 1 }; };
  const text = (document.querySelector("main") || document.body).innerText.replace(/\\s+/g, " ").trim();
  const crash = /Application Crash|unrecoverable error/i.test(document.body.innerText || "");
  const controls = [...document.querySelectorAll("button, a[href], [role=button], select")];
  const invisible = controls.filter((el) => { const cs = getComputedStyle(el); const bg = cs.backgroundColor; if (!bg || bg === "rgba(0, 0, 0, 0)" || bg === "transparent") return false; return cs.color === bg; }).map((el) => (el.innerText || el.tagName).trim().slice(0, 30));
  const unnamed = controls.filter((el) => { const name = (el.getAttribute("aria-label") || el.innerText || (el.labels && el.labels[0] ? el.labels[0].innerText : "") || "").trim(); return name.length === 0; }).length;
  const tooLongName = controls.filter((el) => { const name = (el.getAttribute("aria-label") || el.innerText || "").trim(); return name.length > 60 || name.includes("\\n"); }).map((el) => (el.getAttribute("aria-label") || el.innerText).trim().slice(0, 30));
  const lowContrast = [];
  for (const el of document.querySelectorAll("p,span,h1,h2,h3,label,td,th,li,a,code,pre")) {
    const value = (el.innerText || "").trim();
    if (!value || value.length > 120) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none") continue;
    const fg = parse(cs.color);
    if (!fg || fg.a < 0.5) continue;
    const bg = backgroundOf(el);
    const contrast = ratio(fg, bg);
    if (contrast < 4.5) lowContrast.push({ text: value.slice(0, 30), ratio: Number(contrast.toFixed(2)) });
  }
  // S194: WCAG 2.5.8 - a pointer target should be at least 24x24 CSS px. A control that is
  // technically present but a 12px sliver is the same class of "looks fine in the DOM" defect.
  // Measure in the FOCUSED state: a skip link is deliberately 1x1 until focused, and judging it in
  // its hidden state reported 20 false failures on the first run of this check.
  const smallTargets = [];
  for (const el of controls) {
    if (typeof el.focus !== "function") continue;
    const cs = getComputedStyle(el);
    // sr-only controls are 1x1 BY DESIGN until focused; measuring them in their resting state
    // produced 20 false failures (S194). They are checked separately below.
    if (cs.clipPath && cs.clipPath.includes("inset(50%)")) continue;
    if (cs.clip && cs.clip !== "auto") continue;
    const active = document.activeElement;
    el.focus();
    const rect = el.getBoundingClientRect();
    el.blur?.();
    if (active && typeof active.focus === "function") active.focus();
    if (rect.width === 0 && rect.height === 0) continue;
    if (rect.width < 24 || rect.height < 24) {
      smallTargets.push((el.innerText || el.getAttribute("aria-label") || el.tagName).trim().slice(0, 24) + " " + Math.round(rect.width) + "x" + Math.round(rect.height));
    }
  }
  // The bypass block must actually become a usable target when focused.
  const skipLink = [...document.querySelectorAll('a[href^="#"]')].find((el) => /skip to/i.test(el.innerText || ""));
  let skipLinkFocus = null;
  if (skipLink) {
    skipLink.focus();
    const rect = skipLink.getBoundingClientRect();
    skipLink.blur?.();
    skipLinkFocus = Math.round(rect.width) + "x" + Math.round(rect.height);
    if (rect.width < 24 || rect.height < 24) smallTargets.push("skip link does not become visible on focus " + skipLinkFocus);
  }
  const skip = [...document.querySelectorAll('a[href^="#"]')].some((a) => /skip to/i.test(a.innerText || ""));
  const overflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 2;
  const wide = overflow ? [...document.querySelectorAll("*")].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.right > document.documentElement.clientWidth + 2; }).slice(0, 4).map((el) => el.tagName + "." + String(el.className || "").slice(0, 30)) : [];
  const routeMarker = document.querySelector("[data-route]");
  const hiddenControls = controls.filter((el) => {
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    if (cs.visibility === "hidden" || cs.display === "none") return true;
    if (Number(cs.opacity) < 0.1) return true;
    return rect.width === 0 && rect.height === 0;
  }).map((el) => (el.innerText || el.getAttribute("aria-label") || el.tagName).trim().slice(0, 24));
  return { title: document.title, pathname: location.pathname, readyState: document.readyState, routeMarker: routeMarker ? routeMarker.getAttribute("data-route") : null, hiddenControls: hiddenControls.slice(0, 4), hiddenControlCount: hiddenControls.length, chars: text.length, head: text.slice(0, 70), crash, invisible, unnamed, tooLongName, lowContrast: lowContrast.slice(0, 5), lowContrastCount: lowContrast.length, skip, overflow, wide, skipLinkFocus, smallTargets: smallTargets.slice(0, 4), smallTargetCount: smallTargets.length, viewport: document.documentElement.clientWidth };
})()`;

// S197: the Overview cards only render when telemetry rows exist, and every earlier capture of the
// port was on a host with zero traffic (S196). --seed-chat makes exactly one OpenAI-compatible
// request first, so the populated state is what gets audited.
if (has("--seed-chat")) {
  const model = value("--seed-model") ?? "openai/gpt-4.1-mini-fast";
  try {
    const response = await fetch(base + "/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", connection: "close" },
      body: JSON.stringify({ model, messages: [{ role: "user", content: "seed" }], max_tokens: 16 }),
    });
    console.log("seeded chat: status " + String(response.status));
  } catch (error) {
    console.log("NOT RUN: could not seed a chat request (" + String(error) + ")");
    cleanup();
    process.exit(2);
  }
}

const expectedCards = value("--expect-overview-cards");
const failures = [];
const report = [];
for (const route of routes) {
  events.length = 0;
  await send("Page.navigate", { url: base + route }, sessionId);
  await new Promise((resolve) => setTimeout(resolve, Number(process.env.AUDIT_SETTLE_MS ?? 1200)));
  const settleDeadline = Date.now() + Number(process.env.AUDIT_READYSTATE_TIMEOUT_MS ?? 8000);
  while (Date.now() < settleDeadline) {
    const state = await send("Runtime.evaluate", { expression: "document.readyState", returnByValue: true }, sessionId);
    if (state.result?.value === "complete") break;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  let audit;
  try {
    const result = await send("Runtime.evaluate", { expression: AUDIT, returnByValue: true, awaitPromise: true }, sessionId);
    audit = result.result?.value;
  } catch (error) {
    audit = undefined;
  }
  if (audit === undefined) { failures.push(route + ": audit failed to evaluate"); report.push("FAIL " + route + " (evaluation failed)"); continue; }
  // S184: keyboard focus must be visible. Tab through the first few stops and require an outline or
  // a box-shadow on whatever receives focus. S175-S183 found four render-only defects; a focus ring
  // that never appears is the same class of "valid code, invisible result".
  const focusReport = [];
  let focusStops = 0;
  if (args.includes("--focus")) {
    await send("Runtime.evaluate", { expression: "if (document.activeElement) document.activeElement.blur();" }, sessionId);
    for (let step = 0; step < Number(process.env.AUDIT_FOCUS_STEPS ?? 6); step += 1) {
      await send("Input.dispatchKeyEvent", { type: "rawKeyDown", windowsVirtualKeyCode: 9, key: "Tab", code: "Tab" }, sessionId);
      await send("Input.dispatchKeyEvent", { type: "keyUp", windowsVirtualKeyCode: 9, key: "Tab", code: "Tab" }, sessionId);
      const focused = await send("Runtime.evaluate", { expression: "(() => { const el = document.activeElement; if (!el || el === document.body) return { none: true }; const cs = getComputedStyle(el); return { tag: el.tagName, label: (el.getAttribute(\"aria-label\") || el.innerText || \"\").trim().slice(0, 24), outline: cs.outlineWidth + \" \" + cs.outlineStyle, shadow: cs.boxShadow, }; })()", returnByValue: true }, sessionId);
      const value = focused.result?.value;
      if (value?.none) continue;
      focusStops += 1;
      const hasRing = (value.outline && !value.outline.startsWith("0px") && !value.outline.includes("none")) || (value.shadow && value.shadow !== "none");
      if (!hasRing) focusReport.push(value.tag + " has no focus indicator: " + value.label);
    }
  }
  const problems = [];
  if (expectedCards !== undefined && route === "/") {
    // The shell fetches telemetry rows after hydration, so the cards appear a moment after load.
    // Poll instead of judging the first frame - that produced a false failure on the first run.
    let count = 0;
    const cardsDeadline = Date.now() + Number(process.env.AUDIT_CARDS_TIMEOUT_MS ?? 8000);
    while (Date.now() < cardsDeadline) {
      const cards = await send("Runtime.evaluate", { expression: '[...document.querySelectorAll("[data-overview-card]")].filter((el) => el.getBoundingClientRect().width > 0 && el.innerText.trim().length > 0).length', returnByValue: true }, sessionId);
      count = Number(cards.result?.value ?? 0);
      if (count >= Number(expectedCards)) break;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    if (count < Number(expectedCards)) problems.push("expected at least " + expectedCards + " Overview cards, saw " + String(count));
  }
  if (audit.readyState !== "complete") problems.push("page not settled (readyState " + String(audit.readyState) + ")");
  if (audit.pathname !== route) problems.push("audited " + String(audit.pathname) + " instead of " + route);
  if (audit.routeMarker === null) problems.push("no [data-route] section rendered");
  if (audit.crash) problems.push("application crash banner");
  if (audit.chars < 40) problems.push("page has almost no text (" + String(audit.chars) + " chars)");
  if (audit.invisible.length > 0) problems.push("invisible controls: " + audit.invisible.join(", "));
  if (audit.unnamed > 0) problems.push("unnamed controls: " + String(audit.unnamed));
  if (audit.tooLongName.length > 0) problems.push("control name repeats its content: " + audit.tooLongName.join(", "));
  if (audit.lowContrastCount > 0) problems.push("low contrast: " + audit.lowContrast.map((entry) => entry.text + " " + String(entry.ratio) + ":1").join(", "));
  if (audit.smallTargetCount > 0) problems.push("controls under 24x24: " + audit.smallTargets.join(", "));
  if (route === "/" && audit.skip !== true) problems.push("no skip-to-content link");
  if (audit.overflow) problems.push("horizontal overflow at " + String(audit.viewport) + "px: " + (audit.wide || []).join(", "));
  for (const entry of focusReport) problems.push(entry);
  if (args.includes("--focus") && focusStops < 3) problems.push("focus check saw only " + String(focusStops) + " focusable stops");
  if (problems.length > 0) failures.push(route + ": " + problems.join("; "));
  report.push((problems.length === 0 ? "PASS " : "FAIL ") + route + " (" + String(audit.chars) + " chars)" + (problems.length ? " - " + problems.join("; ") : ""));
}

for (const line of report) console.log(line);
console.log(JSON.stringify({ routes: routes.length, failures: failures.length, focus: args.includes("--focus") }));
cleanup();
process.exit(failures.length === 0 ? 0 : 1);
