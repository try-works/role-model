import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

import { ExtensionHost } from "./index.mjs";

const RECEIPT_ROOT =
  process.env.ROLE_MODEL_TEST_TEMP_ROOT?.trim() ||
  process.env.RUN96_TEST_TEMP_ROOT?.trim() ||
  "E:\\role-model-temp";
const protocolVersion = "1.1.0";

/**
 * A worker that dies while the host is writing to its stdin must reject the invoke
 * and leave the host serving. Before this contract the stdin socket emitted an
 * unhandled `error` (EPIPE) and the packaged runtime process exited, which is what
 * killed the Phase 5 proof runtime under real traffic.
 */
test("run97 an extension worker that dies mid-invoke degrades the invoke without crashing the host", async () => {
  await mkdir(RECEIPT_ROOT, { recursive: true });
  const root = await mkdtemp(path.join(RECEIPT_ROOT, "run97-worker-crash-"));
  const fixture = path.join(root, "crash-extension.mjs");
  await writeFile(
    fixture,
    `
export async function run(envelope) {
  return { ok: true, capability: envelope.capability, pid: process.pid };
}
`,
    "utf8",
  );
  const host = new ExtensionHost({
    protocolVersion,
    authorizationEpoch: 1,
    startupTimeoutMs: 10_000,
    timeoutMs: 5_000,
    restartBackoffMs: 1,
  });
  const extensionId = "run97-crash-extension";
  await host.registerProcess(
    {
      id: extensionId,
      protocolVersion,
      capabilities: ["crash:alive"],
    },
    pathToFileURL(fixture).href,
  );
  const envelope = (capability) => ({
    requestId: `run97-${capability}-${Math.random().toString(16).slice(2)}`,
    protocolVersion,
    authorizationEpoch: 1,
    channel: "development",
    scope: "run97-crash",
    capability,
  });
  try {
    const first = await host.invoke(extensionId, envelope("crash:alive"));
    assert.equal(first.ok, true);
    const workerPid = first.workerPid;
    assert.ok(Number.isSafeInteger(workerPid) && workerPid > 0, "worker pid must be visible");
    // Kill the worker while the host believes it is alive: the host->worker pipe then
    // errors (EPIPE) and the host must degrade the invoke instead of exiting.
    process.kill(workerPid, "SIGKILL");
    await Promise.allSettled([host.invoke(extensionId, envelope("crash:alive"))]);
    const after = await host.invoke(extensionId, envelope("crash:alive"));
    assert.equal(after.ok, true, "the host must keep serving after a worker death");
  } finally {
    await host.shutdown();
  }
});

/**
 * Run 98 addendum 04 (live finding, stage v177): a transient crash-loop permanently disabled the
 * worker. `record.restarts` is cumulative and never reset, so once the budget was spent the record
 * stayed `degraded` for the lifetime of the runtime: every later replay/evaluation was refused —
 * `worker restart budget exhausted` — long after the contention that caused the crashes had passed
 * (the trigger was CPU starvation from a concurrent suite run, not a defect in the worker).
 *
 * The budget must be a circuit breaker, not a one-way latch: after a bounded cooldown the host gives
 * the worker a fresh budget and tries again, so a transient crash-loop cannot disable replays until
 * the next restart of the runtime.
 */
test("run98 a04 a worker that exhausted its restart budget recovers after the cooldown", async () => {
  await mkdir(RECEIPT_ROOT, { recursive: true });
  const root = await mkdtemp(path.join(RECEIPT_ROOT, "run98-a04-recover-"));
  const marker = path.join(root, "healthy.marker");
  const fixture = path.join(root, "flaky-extension.mjs");
  await writeFile(
    fixture,
    `
import { existsSync } from "node:fs";
export async function run(envelope) {
  if (!existsSync(${JSON.stringify(marker)})) {
    process.stderr.write("Error: run98 fixture crash: sqlite open failed\\n");
    process.exit(3);
  }
  return { ok: true, capability: envelope.capability, pid: process.pid };
}
`,
    "utf8",
  );
  const host = new ExtensionHost({
    protocolVersion,
    authorizationEpoch: 1,
    startupTimeoutMs: 10_000,
    timeoutMs: 5_000,
    restartBackoffMs: 1,
    maxRestarts: 1,
    restartCooldownMs: 150,
  });
  const extensionId = "run98-a04-flaky-extension";
  await host.registerProcess(
    { id: extensionId, protocolVersion, capabilities: ["a04:alive"] },
    pathToFileURL(fixture).href,
  );
  const envelope = () => ({
    requestId: `run98-a04-${Math.random().toString(16).slice(2)}`,
    protocolVersion,
    authorizationEpoch: 1,
    channel: "development",
    scope: "run98-a04",
    capability: "a04:alive",
  });
  const waitFor = async (predicate, label) => {
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      if (predicate()) return;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    throw new Error(`timed out waiting for ${label}`);
  };
  try {
    // Spend the budget: two failing invokes with maxRestarts 1.
    await assert.rejects(host.invoke(extensionId, envelope()));
    await waitFor(() => host.extensionState(extensionId).restarts >= 1, "the first restart");
    await assert.rejects(host.invoke(extensionId, envelope()));
    await waitFor(
      () => host.extensionState(extensionId).lifecycle === "degraded",
      "the exhausted budget",
    );
    // Inside the cooldown the host keeps refusing rather than thrashing.
    await assert.rejects(
      host.invoke(extensionId, envelope()),
      /restart budget exhausted/,
      "an exhausted budget must be refused while the cooldown is running",
    );
    // Heal the worker, wait out the cooldown, and the same host must serve again.
    await writeFile(marker, "ok", "utf8");
    await new Promise((resolve) => setTimeout(resolve, 200));
    const recovered = await host.invoke(extensionId, envelope());
    assert.equal(recovered.ok, true, "the host must recover once the cooldown has elapsed");
    assert.equal(host.extensionState(extensionId).lifecycle, "ready");
  } finally {
    await host.shutdown();
  }
});

/**
 * Run 98 addendum 04: the exhausted-budget error reported the worker's *stderr tail*, which for a
 * Node worker is usually a warning (`ExperimentalWarning: SQLite is an experimental feature …`) —
 * the reason the operator saw was therefore not a failure cause at all. The report must name the
 * exit code/signal and the last substantive stderr line, and must not present a bare warning as the
 * cause.
 */
test("run98 a04 the exhausted-budget error reports the exit code and the substantive failure", async () => {
  await mkdir(RECEIPT_ROOT, { recursive: true });
  const root = await mkdtemp(path.join(RECEIPT_ROOT, "run98-a04-detail-"));
  const fixture = path.join(root, "noisy-crash-extension.mjs");
  await writeFile(
    fixture,
    `
export async function run() {
  process.stderr.write("Error: run98 fixture crash: sqlite open failed\\n");
  process.stderr.write("(node:1) ExperimentalWarning: SQLite is an experimental feature and might change at any time\\n");
  process.stderr.write("(Use \`node --trace-warnings ...\` to show where the warning was created)\\n");
  process.exit(3);
}
`,
    "utf8",
  );
  const host = new ExtensionHost({
    protocolVersion,
    authorizationEpoch: 1,
    startupTimeoutMs: 10_000,
    timeoutMs: 5_000,
    restartBackoffMs: 1,
    maxRestarts: 0,
    restartCooldownMs: 60_000,
  });
  const extensionId = "run98-a04-noisy-extension";
  await host.registerProcess(
    { id: extensionId, protocolVersion, capabilities: ["a04:noisy"] },
    pathToFileURL(fixture).href,
  );
  try {
    const envelope = () => ({
      requestId: `run98-a04-noisy-${Math.random().toString(16).slice(2)}`,
      protocolVersion,
      authorizationEpoch: 1,
      channel: "development",
      scope: "run98-a04",
      capability: "a04:noisy",
    });
    await assert.rejects(host.invoke(extensionId, envelope()));
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline && host.extensionState(extensionId).lifecycle !== "degraded") {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    await assert.rejects(
      host.invoke(extensionId, envelope()),
      (error) => {
        const message = String(error?.message ?? "");
        assert.match(message, /restart budget exhausted/);
        assert.match(message, /exit code 3/, "the report must name the exit code");
        assert.match(
          message,
          /sqlite open failed/,
          "the report must carry the substantive stderr line",
        );
        assert.doesNotMatch(
          message,
          /ExperimentalWarning/,
          "a Node warning is not a failure cause",
        );
        return true;
      },
    );
  } finally {
    await host.shutdown();
  }
});
