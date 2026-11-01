import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resolveAutoQueueDailyCap, applyAutoQueueDailyCap } from "../src/queue-runtime/auto-queue.js";
import { createReplayLedger } from "../src/track-b-replay-ledger.js";
import {
  mergeUnifiedRuntimeConfigDocuments,
  parseUnifiedRuntimeConfigText,
  renderUnifiedRuntimeConfigText,
} from "../src/unified-runtime-config.js";

/**
 * Run 115: replay auto-queues eligible routed requests, bounded by a daily cap.
 * The cap is part of the runtime config readback (default 100) so the Learning
 * Overview page can edit it through PUT /api/role-model/runtime/config.
 */
let stateRoot = "";
beforeEach(async () => {
  stateRoot = await mkdtemp(path.join(os.tmpdir(), "run115-auto-queue-"));
});
afterEach(async () => {
  await rm(stateRoot, { recursive: true, force: true });
});

const configPath = () => path.join(stateRoot, "runtime-config.yaml");

describe("auto-queue daily cap config", () => {
  it("defaults the readback to 100 and renders the section", () => {
    const config = parseUnifiedRuntimeConfigText("version: '1.0'\n");
    expect(config.replay).toEqual({ autoQueue: { dailyCap: 100, enabled: true } });
    const rendered = renderUnifiedRuntimeConfigText(config);
    expect(rendered).toContain("replay:");
    expect(rendered).toContain("daily_cap: 100");
  });

  it("round-trips a configured cap from the runtime config document", () => {
    const config = parseUnifiedRuntimeConfigText(
      "version: '1.0'\nreplay:\n  auto_queue:\n    enabled: true\n    daily_cap: 25\n",
    );
    expect(config.replay?.autoQueue.dailyCap).toBe(25);
    expect(renderUnifiedRuntimeConfigText(config)).toContain("daily_cap: 25");
  });

  it("accepts a runtime-config PUT patch for the cap and exposes it in the readback", () => {
    const current = parseUnifiedRuntimeConfigText("version: '1.0'\n");
    const merged = mergeUnifiedRuntimeConfigDocuments(current, {
      replay: { auto_queue: { daily_cap: 42 } },
    });
    expect(merged.replay?.autoQueue.dailyCap).toBe(42);
    expect(renderUnifiedRuntimeConfigText(merged)).toContain("daily_cap: 42");
  });

  it("reads the cap from the persisted scope config and falls back to 100", async () => {
    expect(resolveAutoQueueDailyCap(configPath())).toBe(100);
    await writeFile(configPath(), "version: '1.0'\nreplay:\n  auto_queue:\n    daily_cap: 7\n", "utf8");
    expect(resolveAutoQueueDailyCap(configPath())).toBe(7);
  });

  it("applies the cap to the replay ledger's daily counterfactual ceiling", () => {
    expect(applyAutoQueueDailyCap({ dispatchesPerDay: 300 }, 7)).toEqual({
      counterfactualsPerDay: 7,
      dispatchesPerDay: 300,
    });
  });

  it("applies a cap change on the next replay without restarting", () => {
    let dailyCap = 1;
    const ledger = createReplayLedger({
      filePath: path.join(stateRoot, "live-ledger.json"),
      now: () => Date.UTC(2026, 0, 1, 12),
      limits: applyAutoQueueDailyCap({ enforced: true }, dailyCap),
      limitsProvider: () => applyAutoQueueDailyCap({ enforced: true }, dailyCap),
    });
    const reserve = (captureRef: string) =>
      ledger.reserve({ captureRef, policySetDigest: "digest", candidateDispatches: 1 });
    expect(reserve("capture-1").accepted).toBe(true);
    expect(reserve("capture-2").accepted).toBe(false);
    dailyCap = 2;
    expect(reserve("capture-2").accepted).toBe(true);
  });

  it("refuses the replay after the configured cap is spent", () => {
    const ledger = createReplayLedger({
      filePath: path.join(stateRoot, "replay-ledger.json"),
      now: () => Date.UTC(2026, 0, 1, 12),
      limits: applyAutoQueueDailyCap({ enforced: true }, 2),
    });
    const reserve = (captureRef: string) =>
      ledger.reserve({ captureRef, policySetDigest: "digest", candidateDispatches: 1 });
    expect(reserve("capture-1").accepted).toBe(true);
    expect(reserve("capture-2").accepted).toBe(true);
    expect(reserve("capture-3")).toMatchObject({ accepted: false, code: "budget_exhausted" });
  });
});
