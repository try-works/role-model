/**
 * Run 101 / R9 (Phase 5 repair) - the host operator façade must forward the queue surface.
 *
 * Measured on the packaged stage RC `e7e3389a` (2026-09-26T17:2xZ): the sidecar served
 * `/operator/queues` (401 without its token), but the host answered **404** for
 * `/api/role-model/operator/queues` while `/api/role-model/operator/learning/activity` answered
 * 200. The host's operator surface is a hand-written route table, and the queue routes were never
 * added there, so `/app/observe/queues` and the Learning Configuration card rendered empty in a
 * packaged runtime even though the read model worked.
 *
 * This pins the three places that have to agree, because any one of them missing turns the whole
 * surface into a 404 or a 503: the host's route chain, the route-to-capability map that stamps
 * `x-role-model-capability`, and the CLI wiring that binds the handlers to the sidecar client.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const hostSource = readFileSync(path.join(here, "..", "src", "index.ts"), "utf8");
const operationsSource = readFileSync(
  path.join(here, "..", "src", "track-b-operations.ts"),
  "utf8",
);
const cliSource = readFileSync(path.join(here, "..", "src", "cli.ts"), "utf8");

describe("run 101 R9 queue operator proxy", () => {
  it("routes every queue path the UI calls through the host operator surface", () => {
    for (const route of [
      'url.pathname === "/api/role-model/operator/queues"',
      'url.pathname === "/api/role-model/operator/queues/config"',
      'url.pathname === "/api/role-model/operator/queues/receipts"',
      'url.pathname.startsWith("/api/role-model/operator/queues/")',
    ]) {
      expect(hostSource).toContain(route);
    }
    for (const handler of [
      "options.readQueues",
      "options.readQueueJobs",
      "options.readQueueJob",
      "options.readQueueReceipts",
      "options.readQueueConfig",
      "options.setQueueConfig",
      "options.retryQueueJob",
      "options.cancelQueueJob",
      "options.setQueueDrain",
    ]) {
      expect(hostSource).toContain(handler);
      expect(cliSource).toContain(handler.replace("options.", "operations."));
    }
  });

  it("gives the queue routes their own capability instead of throwing before the call", () => {
    const capabilityBlock = operationsSource.slice(
      operationsSource.indexOf("const operatorCapabilityForRoute"),
      operationsSource.indexOf("const operatorSensitiveKey"),
    );
    assert.ok(capabilityBlock.includes('pathname.includes("/queues")'), "the map knows /queues");
    assert.ok(
      capabilityBlock.indexOf('pathname.includes("/queues")') <
        capabilityBlock.indexOf("throw new Error"),
      "the queues branch must precede the unknown-route throw",
    );
  });

  it("keeps the sidecar routes and the host routes in step", () => {
    // The sidecar (private repository) owns `/operator/queues*`; the host forwards the same
    // suffixes. If one side renames a route the other has to move with it.
    for (const suffix of [
      "operator/queues",
      "operator/queues/config",
      "operator/queues/receipts",
    ]) {
      expect(operationsSource).toContain(suffix);
    }
  });
});
