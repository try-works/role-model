#!/usr/bin/env node
/**
 * R14 (S650): packaged selfcheck surface + 0diff.
 *
 * Both clients serve the same deterministic semantic specimen at /selfcheck and publish its checksum
 * in data-selfcheck-marker. This runner starts the packaged executable twice per target with a fresh
 * state root and each client's static root, loads /selfcheck in headless Chrome, extracts the marker
 * and the ordered specimen entries, and records 0DIFF only when React and Foldkit agree across two
 * identical runs. A missing surface or browser is NOT_RUN, never a fabricated pass.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { launchChrome } from "./parity-selfcheck.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const checkoutRoot = path.resolve(__dirname, "../..");

import {
  SELFCHECK_ROUTE,
  SELFCHECK_TARGETS,
  evaluateSelfcheckSurfaceRuns,
  parseSelfcheckSurfaceDom,
} from "../../role-model-router/packages/ui-parity/src/selfcheck-surface-core.js";

export {
  evaluateSelfcheckSurfaceRuns,
  parseSelfcheckSurfaceDom,
};
export const SELFCHECK_PATH = SELFCHECK_ROUTE;

const freePort = () =>
  new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = address === null ? undefined : Object(address).port;
      server.close(() => {
        if (Number.isInteger(port)) resolve(port);
        else reject(new Error("no free port"));
      });
    });
    server.on("error", reject);
  });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForHealth = async (baseUrl, child, timeoutMs = 60_000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) return false;
    try {
      const response = await fetch(`${baseUrl}/healthz`);
      if (response.ok) return true;
    } catch {
      // host is still starting
    }
    await sleep(500);
  }
  return false;
};

const startHost = async ({ exe, fixtureRoot, staticRoot, timeoutMs = 60_000 }) => {
  const port = await freePort();
  const stateRoot = mkdtempSync(path.join(os.tmpdir(), "r14-selfcheck-state-"));
  mkdirSync(stateRoot, { recursive: true });
  const args = [
    "--repo-root",
    path.dirname(exe),
    "--runtime-state-root",
    stateRoot,
    "--host",
    "127.0.0.1",
    "--port",
    String(port),
    "--fixture-root",
    fixtureRoot,
    "--static-root",
    staticRoot,
  ];
  const child = spawn(exe, args, {
    env: { ...process.env, MOONSHOT_API_KEY: process.env.MOONSHOT_API_KEY || "r14-selfcheck-key" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += String(chunk);
  });
  const baseUrl = `http://127.0.0.1:${String(port)}`;
  const healthy = await waitForHealth(baseUrl, child, timeoutMs);
  if (!healthy) {
    child.kill();
    rmSync(stateRoot, { force: true, recursive: true });
    throw new Error(`packaged host did not become healthy: ${stderr.slice(-400)}`);
  }
  return {
    baseUrl,
    close: async () => {
      if (child.exitCode === null && child.signalCode === null) {
        child.kill();
        await new Promise((resolve) => {
          const timer = setTimeout(resolve, 5_000);
          child.once("exit", () => {
            clearTimeout(timer);
            resolve();
          });
        });
      }
      try {
        rmSync(stateRoot, { force: true, maxRetries: 5, recursive: true, retryDelay: 100 });
      } catch {
        // A still-closing host can hold the state root; the temp root is disposable.
      }
    },
  };
};

const resolveChrome = () => {
  const candidates = [
    process.env.CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].filter((candidate) => Boolean(candidate));
  return candidates.find((candidate) => existsSync(candidate));
};

const dumpDom = async ({ chromePath, url, timeoutMs = 45_000 }) => {
  const userDataDir = mkdtempSync(path.join(os.tmpdir(), "r14-selfcheck-chrome-"));
  const chrome = await launchChrome({ chromePath, userDataDir });
  let socket;
  try {
    const port = new URL(chrome.endpoint).port;
    const created = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, {
      method: "PUT",
    });
    if (!created.ok) throw new Error(`chrome target creation failed: HTTP ${String(created.status)}`);
    const target = await created.json();
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("chrome DevTools socket did not open")), 10_000);
      socket.addEventListener("open", () => {
        clearTimeout(timer);
        resolve();
      });
      socket.addEventListener("error", (event) => {
        clearTimeout(timer);
        reject(new Error(`chrome DevTools socket error: ${String(event.type)}`));
      });
    });
    let nextId = 0;
    const pending = new Map();
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data));
      if (!Number.isInteger(message.id)) return;
      const settle = pending.get(message.id);
      if (settle === undefined) return;
      pending.delete(message.id);
      if (message.error !== undefined) settle.reject(new Error(String(message.error.message)));
      else settle.resolve(message.result);
    });
    const send = (method, params) =>
      new Promise((resolve, reject) => {
        nextId += 1;
        const id = nextId;
        pending.set(id, { reject, resolve });
        socket.send(JSON.stringify({ id, method, params }));
      });
    await send("Runtime.enable", {});
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const evaluated = await send("Runtime.evaluate", {
        expression:
          "(() => { const root = document.querySelector('[data-selfcheck-marker]'); return root ? document.documentElement.outerHTML : null; })()",
        returnByValue: true,
      });
      const value = evaluated?.result?.value;
      const text = value === null || value === undefined ? "" : String(value);
      if (text.length > 0) return text;
      await sleep(250);
    }
    throw new Error(`selfcheck surface did not render within ${String(timeoutMs)}ms: ${url}`);
  } finally {
    try {
      socket?.close();
    } catch {
      // best effort
    }
    try {
      chrome.child.kill();
    } catch {
      // best effort
    }
    try {
      rmSync(userDataDir, { force: true, maxRetries: 5, recursive: true, retryDelay: 100 });
    } catch {
      // Chrome can release its profile after close; the temp profile is disposable.
    }
  }
};

const parseArgs = (argv) => {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith("--")) continue;
    const next = argv[index + 1];
    if (next !== undefined && !next.startsWith("--")) {
      values.set(key, next);
      index += 1;
    } else values.set(key, "true");
  }
  return values;
};

export const main = async (argv = process.argv.slice(2)) => {
  const args = parseArgs(argv);
  const value = (key, fallback) => args.get(key) ?? fallback;
  const exe = path.resolve(
    value("--exe", path.join(checkoutRoot, "role-model-router/dist/release/win32-x64/role-model-dev.exe")),
  );
  const roots = {
    react: path.resolve(
      value("--react-static-root", path.join(checkoutRoot, "role-model-router/apps/runtime-ui/build/client")),
    ),
    foldkit: path.resolve(
      value("--foldkit-static-root", path.join(checkoutRoot, "role-model-router/apps/runtime-ui-next/dist/client")),
    ),
  };
  const fixtureRoot = path.resolve(
    value("--fixture-root", path.join(checkoutRoot, "testdata/router-runtime/fixtures")),
  );
  const logPath = path.resolve(
    value(
      "--log",
      path.join(
        checkoutRoot,
        ".recursive/run/115-effect-foldkit-runtime-migration/evidence/logs/r14-selfcheck-surface-packaged.log",
      ),
    ),
  );
  const jsonPath = path.resolve(
    value("--json", logPath.replace(/\.log$/, ".json")),
  );
  const chromePath = value("--chrome", resolveChrome());
  const lines = [];
  const record = (line = "") => {
    lines.push(line);
    console.log(line);
  };
  const finish = (result, exitCode) => {
    mkdirSync(path.dirname(logPath), { recursive: true });
    writeFileSync(logPath, `${lines.join("\n")}\n`, "utf8");
    writeFileSync(jsonPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    console.log(`log=${logPath}`);
    console.log(`json=${jsonPath}`);
    return { exitCode, result };
  };

  record("# R14 packaged selfcheck surface");
  record(`head=${spawnSync("git", ["rev-parse", "--short", "HEAD"], { cwd: checkoutRoot, encoding: "utf8" }).stdout.trim()}`);
  record(`exe=${exe}`);
  record(`react_static_root=${roots.react}`);
  record(`foldkit_static_root=${roots.foldkit}`);
  record(`chrome=${String(chromePath)}`);
  record(`route=${SELFCHECK_PATH}`);
  record("");
  if (chromePath === undefined || !existsSync(chromePath)) {
    record("NOT RUN: no headless browser available (set CHROME_PATH)");
    return finish(
      { reason: "no-browser-available", status: "NOT_RUN", verdict: "NOT_RUN" },
      2,
    );
  }
  if (!existsSync(exe)) {
    record(`NOT RUN: packaged executable missing: ${exe}`);
    return finish({ reason: "exe-missing", status: "NOT_RUN", verdict: "NOT_RUN" }, 2);
  }
  for (const [targetId, root] of Object.entries(roots)) {
    if (!existsSync(root)) {
      record(`NOT RUN: ${targetId} static root missing: ${root}`);
      return finish({ reason: "static-root-missing", status: "NOT_RUN", verdict: "NOT_RUN" }, 2);
    }
  }
  if (!existsSync(fixtureRoot)) {
    record(`NOT RUN: fixture root missing: ${fixtureRoot}`);
    return finish({ reason: "fixture-missing", status: "NOT_RUN", verdict: "NOT_RUN" }, 2);
  }

  const runs = [];
  try {
    for (let run = 0; run < 2; run += 1) {
      const captures = [];
      for (const targetId of SELFCHECK_TARGETS) {
        const host = await startHost({
          exe,
          fixtureRoot,
          staticRoot: roots[targetId],
        });
        try {
          const html = await dumpDom({
            chromePath,
            url: `${host.baseUrl}${SELFCHECK_PATH}`,
          });
          const capture = parseSelfcheckSurfaceDom(html, targetId);
          captures.push(capture);
          record(
            `run=${String(run + 1)} target=${targetId} marker=${String(capture.marker)} entries=${String(capture.entries.length)}`,
          );
          for (const entry of capture.entries)
            record(`  ${entry.key}=${entry.value}`);
        } finally {
          await host.close();
        }
      }
      runs.push(captures);
    }
  } catch (error) {
    record(`FAILED: ${error instanceof Error ? error.message : String(error)}`);
    return finish(
      {
        reason: `runner-failure: ${error instanceof Error ? error.message : String(error)}`,
        status: "FAILED",
        verdict: "DIVERGENCE",
      },
      1,
    );
  }

  const result = evaluateSelfcheckSurfaceRuns({ chromeAvailable: true, runs });
  record("");
  record(
    result.status === "PASSED"
      ? `SELFCHECK 0DIFF: React and Foldkit markers agree (${String(result.markers?.react)}) across two identical runs`
      : `SELFCHECK ${result.status}: ${String(result.reason)}`,
  );
  record(`RESULT: ${result.status}`);
  return finish(result, result.status === "PASSED" ? 0 : 1);
};

const isMain =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const { exitCode } = await main();
  process.exitCode = exitCode;
}
