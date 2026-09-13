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
