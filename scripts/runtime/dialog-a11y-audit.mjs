#!/usr/bin/env node
/**
 * S502: device-auth dialog accessibility audit in a real packaged browser.
 *
 * Reuses the audit-rendered-ui Chrome/CDP pattern (no new deps). Seeds one pending
 * device-auth session into the packaged host SQLite store, opens the Providers route,
 * starts the device-auth read, then asserts the real Foldkit dialog contract:
 * aria-modal, initial focus on Dismiss, Tab trapped, Escape closes, focus returns.
 *
 * Usage:
 *   node scripts/runtime/dialog-a11y-audit.mjs --exe <role-model-dev.exe> --static-root <build/client>
 * Exit: 0 PASS, 1 FAIL, 2 NOT RUN.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync, statSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import os from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
const value = (name) => { const at = args.indexOf(name); return at < 0 ? undefined : args[at + 1]; };
const fail = (message) => { console.log("FAIL: " + message); cleanup(); process.exit(1); };
const notRun = (message) => { console.log("NOT RUN: " + message); cleanup(); process.exit(2); };

const exe = value("--exe");
const staticRoot = value("--static-root");
if (!exe || !existsSync(exe)) notRun("pass --exe <packaged executable>");
if (!staticRoot || !existsSync(staticRoot)) notRun("pass --static-root <packaged build/client>");

const chromeCandidates = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);
const chromePath = process.env.CHROME_PATH === undefined
  ? chromeCandidates.find((candidate) => existsSync(candidate))
  : (existsSync(process.env.CHROME_PATH) ? process.env.CHROME_PATH : undefined);
if (!chromePath) notRun("no Chromium-family browser found (set CHROME_PATH)");

const port = Number(value("--port") ?? process.env.DIALOG_AUDIT_PORT ?? 6242);
const stateRoot = value("--state-root") ?? mkdtempSync(path.join(os.tmpdir(), "dialog-a11y-state-"));
const userDataDir = mkdtempSync(path.join(os.tmpdir(), "dialog-a11y-chrome-"));
let host;
let chrome;
function cleanup() {
  try { host?.kill(); } catch {}
  try { chrome?.kill(); } catch {}
  try { rmSync(userDataDir, { force: true, recursive: true }); } catch {}
}

const walk = (directory) => {
  const found = [];
  for (const entry of readdirSync(directory)) {
    const full = path.join(directory, entry);
    const info = statSync(full);
    if (info.isDirectory()) found.push(...walk(full));
    else if (entry === "memory.sqlite") found.push(full);
  }
  return found;
};

try {
  host = spawn(exe, [
    "--repo-root", path.dirname(exe),
    "--runtime-state-root", stateRoot,
    "--host", "127.0.0.1",
    "--port", String(port),
    "--static-root", staticRoot,
    ...(value("--fixture-root") ? ["--fixture-root", value("--fixture-root")] : []),
  ], { stdio: ["ignore", "pipe", "pipe"] });
  const base = "http://127.0.0.1:" + String(port);
  const readyDeadline = Date.now() + Number(process.env.DIALOG_AUDIT_READY_TIMEOUT_MS ?? 120_000);
  while (Date.now() < readyDeadline) {
    try { if ((await fetch(base + "/healthz")).ok) break; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  try { if (!(await fetch(base + "/healthz")).ok) notRun(base + " did not become healthy"); } catch { notRun(base + " did not become healthy"); }

  // Seed one pending session through the real state database; the packaged host reads it per request.
  let databasePath;
  const databaseDeadline = Date.now() + 15_000;
  while (Date.now() < databaseDeadline && databasePath === undefined) {
    try { databasePath = walk(stateRoot)[0]; } catch {}
    if (databasePath === undefined) await new Promise((resolve) => setTimeout(resolve, 200));
  }
  if (databasePath === undefined) notRun("packaged host did not create memory.sqlite");
  const database = new DatabaseSync(databasePath);
  const now = Date.now();
  try {
    database.prepare(`INSERT OR REPLACE INTO provider_device_auth_sessions (
      auth_request_id, provider_account_id, provider_id, variant_id, credential_backend,
      credential_ref, auth_mode, verification_uri, verification_uri_complete, user_code,
      device_code, interval_seconds, status, last_error, expires_at_ms, created_at_ms, updated_at_ms
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      "a11y-auth-request", "a11y-account", "openai", "openai-codex-subscription", "keyring",
      "a11y-ref", "device", "https://auth.openai.com/device",
      "https://auth.openai.com/device?user_code=ABCD-EFGH", "ABCD-EFGH", "a11y-device-code",
      5, "pending", null, now + 600_000, now, now,
    );
  } finally {
    database.close();
  }

  chrome = spawn(chromePath, [
    "--headless=new", "--remote-debugging-port=0", "--user-data-dir=" + userDataDir,
    "--no-first-run", "--no-default-browser-check", "--disable-gpu", "--disable-dev-shm-usage",
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
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    if (message.id && pending.has(message.id)) {
      const handler = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) handler.reject(new Error(message.error.message)); else handler.resolve(message.result);
    }
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
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }, sessionId);
    return result.result?.value;
  };
  const waitFor = async (expression, label, timeoutMs = 15000) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (await evaluate(expression)) return true;
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    const snapshot = await evaluate("location.pathname + ' dialogs=' + document.querySelectorAll('dialog').length + ' modalAttrs=' + document.querySelectorAll('[data-device-auth-modal]').length + ' | ' + document.body.innerText.replace(/\\s+/g, ' ').slice(0, 500) + ' | html=' + (document.querySelector('[data-route=\"device-authorization\"]')?.outerHTML ?? '').slice(-1200)");
    fail("timed out waiting for " + label + " at " + String(snapshot));
  };
  const press = async (key) => {
    await send("Input.dispatchKeyEvent", { type: "keyDown", key, windowsVirtualKeyCode: key === "Tab" ? 9 : 27, nativeVirtualKeyCode: key === "Tab" ? 9 : 27 }, sessionId);
    await send("Input.dispatchKeyEvent", { type: "keyUp", key, windowsVirtualKeyCode: key === "Tab" ? 9 : 27, nativeVirtualKeyCode: key === "Tab" ? 9 : 27 }, sessionId);
  };

  await send("Page.navigate", { url: base + "/control/providers" }, sessionId);
  await waitFor("document.readyState === 'complete' && document.querySelector('[data-device-auth-start]') !== null", "providers route");
  await evaluate(`(() => {
    const scope = document.querySelector('section[data-route="device-authorization"]');
    const fill = (labelText, value) => {
      const label = [...scope.querySelectorAll("label")].find((entry) => entry.innerText.trim() === labelText);
      const input = label?.querySelector("input");
      if (!input) throw new Error("missing input " + labelText);
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      setter.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    };
    fill("Provider", "openai");
    fill("Variant", "openai-codex-subscription");
    fill("Model", "chatgpt/gpt-5.3-codex");
    const add = [...scope.querySelectorAll("button")].find((button) => button.innerText.trim() === "Add model");
    add?.click();
    return "filled";
  })()`);
  await new Promise((resolve) => setTimeout(resolve, 300));
  await evaluate("const start = document.querySelector('[data-device-auth-start]'); start.focus(); start.click()");
  await waitFor("document.querySelector('[data-device-auth-modal]') !== null", "device-auth dialog");
  await new Promise((resolve) => setTimeout(resolve, 500));

  const ariaModal = await evaluate("document.querySelector('[data-device-auth-modal]').getAttribute('aria-modal')");
  if (ariaModal !== "true") fail("dialog aria-modal is " + String(ariaModal));
  const code = await evaluate("document.querySelector('[data-device-auth-user-code]')?.textContent?.trim()");
  if (!code || String(code).trim().length === 0) fail("dialog user code is missing");
  const initialFocus = await evaluate("document.activeElement?.textContent?.trim()");
  if (initialFocus !== "Dismiss") fail("initial focus is " + String(initialFocus) + ", expected Dismiss");

  await press("Tab");
  const trapped = await evaluate("!!document.querySelector('[data-device-auth-modal]')?.contains(document.activeElement)");
  if (!trapped) fail("Tab moved focus outside the dialog");
  const focusAfterTab = await evaluate("document.activeElement?.textContent?.trim() || document.activeElement?.getAttribute('aria-label') || document.activeElement?.tagName");
  if (focusAfterTab === "Dismiss") fail("Tab did not move focus within the dialog");

  await press("Escape");
  await waitFor("document.querySelector('[data-device-auth-modal]') === null", "dialog close on Escape");
  await new Promise((resolve) => setTimeout(resolve, 300));
  const focusReturn = await evaluate("document.activeElement?.textContent?.trim()");
  if (focusReturn !== "Start device authorization") fail("focus returned to " + String(focusReturn) + ", expected Start device authorization");

  console.log("PASS: dialog aria-modal, initial focus Dismiss, Tab trapped, Escape closed, focus returned to Start device authorization");
  cleanup();
  process.exit(0);
} catch (error) {
  fail(String(error));
}
