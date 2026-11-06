#!/usr/bin/env node
/** R21 packaged/browser defect receipt: starts the candidate, loads /diagnostics in Chrome, injects a stale+loss+missing-build response for the authorized request, and records the rendered page. */
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
const value = (name) => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined; };
const exe = value("--exe");
const manifestPath = value("--manifest");
const staticRoot = value("--static-root");
const fixtureRoot = value("--fixture-root");
const receiptPath = value("--receipt") ?? "r21-diagnostics-receipt.json";
const screenshotPath = value("--screenshot") ?? "r21-diagnostics-page.png";
if (!exe || !manifestPath || !staticRoot || !fixtureRoot) { console.log("NOT RUN: --exe, --manifest, --static-root and --fixture-root are required"); process.exit(2); }
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const freePort = async () => {
  const server = net.createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const address = server.address();
  const port = typeof address === 'object' && address !== null ? address.port : 0;
  await new Promise((resolve) => server.close(resolve));
  if (!port) throw new Error('no loopback port');
  return port;
};
const stateRoot = mkdtempSync(path.join(os.tmpdir(), 'r21-packaged-state-'));
const chromeProfile = mkdtempSync(path.join(os.tmpdir(), 'r21-chrome-'));
const port = await freePort();
const candidate = spawn(exe, ['--repo-root', path.dirname(exe), '--runtime-state-root', stateRoot, '--host', '127.0.0.1', '--port', String(port), '--fixture-root', fixtureRoot, '--static-root', staticRoot], { stdio: ['ignore', 'pipe', 'pipe'] });
let candidateLog = '';
candidate.stdout.on('data', (chunk) => (candidateLog += String(chunk)));
candidate.stderr.on('data', (chunk) => (candidateLog += String(chunk)));
const base = 'http://127.0.0.1:' + String(port);
const waitHealth = async () => {
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) { try { const response = await fetch(base + '/healthz'); if (response.ok) return; } catch {} await sleep(250); }
  throw new Error('packaged candidate did not become healthy');
};
const chromeCandidates = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].filter((candidate) => typeof candidate === 'string' && candidate.length > 0);
const chrome = chromeCandidates.find((candidate) => existsSync(candidate));
if (!chrome) { console.log('NOT RUN: no Chromium browser found (set CHROME_PATH)'); candidate.kill(); process.exit(2); }
const defect = {
  bounds: { limit: 20, maxCodeBytes: 512, maxIdentityBytes: 256, maxRecords: 50, maxResponseBytes: 16384 },
  conditions: { dropped: true, stale: true },
  cursor: null,
  identity: { buildId: '', instanceId: 'packaged-defect' },
  loss: { dropped: 12, windowMs: 600000 },
  recordCount: 1,
  records: [{ atMs: Date.now() - 900000, code: 'cause.fail', count: 1, level: 'error' }],
  schemaVersion: 'role-model.local-diagnostics-read.v1',
  staleness: { ageMs: 900000, ruleMs: 300000, stale: true },
  state: 'stale',
  totalAvailable: 1,
  truncated: false,
};
let originalStatus = null;
let chromeProcess;
let socket;
try {
  await waitHealth();
  chromeProcess = spawn(chrome, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + chromeProfile, '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--disable-extensions', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  const activePortFile = path.join(chromeProfile, 'DevToolsActivePort');
  const deadline = Date.now() + 30000;
  while (!existsSync(activePortFile) && Date.now() < deadline) await sleep(100);
  if (!existsSync(activePortFile)) throw new Error('Chrome DevTools endpoint did not start');
  const [debugPort] = readFileSync(activePortFile, 'utf8').split(String.fromCharCode(10));
  const page = await (await fetch('http://127.0.0.1:' + debugPort + '/json/new?' + encodeURIComponent('about:blank'), { method: 'PUT' })).json();
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let nextId = 1;
  const pending = new Map();
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = nextId++; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
  socket.onmessage = (event) => {
    const message = JSON.parse(String(event.data));
    if (message.id !== undefined) { const waiter = pending.get(message.id); pending.delete(message.id); if (waiter) waiter.resolve(message.result); return; }
    if (message.method === 'Fetch.requestPaused') {
      originalStatus = message.params.responseStatusCode ?? null;
      const body = Buffer.from(JSON.stringify(defect), 'utf8').toString('base64');
      send('Fetch.fulfillRequest', { body, requestId: message.params.requestId, responseCode: 200, responseHeaders: [{ name: 'content-type', value: 'application/json' }] }).catch(() => {});
    }
  };
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Fetch.enable', { patterns: [{ requestStage: 'Response', urlPattern: '*operator/diagnostics*' }] });
  await send('Page.navigate', { url: base + '/diagnostics/42' });
  const textDeadline = Date.now() + 20000;
  let pageText = '';
  let state = '';
  while (Date.now() < textDeadline) {
    const evaluated = await send('Runtime.evaluate', { expression: "JSON.stringify({ state: document.querySelector('[data-diagnostics-state]')?.getAttribute('data-diagnostics-state') ?? '', text: document.body.innerText })", returnByValue: true });
    const raw = evaluated?.result?.value;
    if (typeof raw === 'string' && raw.length > 0) { const parsed = JSON.parse(raw); state = parsed.state; pageText = parsed.text; if (state === 'stale' && pageText.includes('also dropped:') && pageText.includes('missing')) break; }
    await sleep(250);
  }
  if (state !== 'stale' || !pageText.includes('also dropped:') || !pageText.includes('missing')) throw new Error('page did not render the injected defect honestly (state=' + state + ')');
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(screenshotPath, Buffer.from(shot.data, 'base64'));
  const receipt = {
    exe,
    exeSha256: createHash('sha256').update(readFileSync(exe)).digest('hex'),
    manifestSha256: manifest.executable_sha256 ?? null,
    version: manifest.version ?? null,
    commit: manifest.commit ?? null,
    sourceTree: manifest.source_tree ?? null,
    pageUrl: base + '/diagnostics/42',
    originalDiagnosticsStatus: originalStatus,
    injected: defect,
    renderedState: state,
    renderedBuild: pageText.includes('missing') ? 'missing' : 'present',
    renderedText: pageText,
    screenshot: screenshotPath,
    result: 'PASS',
  };
  writeFileSync(receiptPath, JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify(receipt, null, 2));
} catch (error) {
  writeFileSync(receiptPath, JSON.stringify({ result: 'FAIL', error: String(error), candidateLog }, null, 2));
  console.error(String(error));
  process.exitCode = 1;
} finally {
  try { socket?.close(); } catch {}
  try { chromeProcess?.kill(); } catch {}
  try { candidate.kill(); } catch {}
  await sleep(500);
  try { rmSync(stateRoot, { recursive: true, force: true }); } catch {}
  try { rmSync(chromeProfile, { recursive: true, force: true }); } catch {}
}