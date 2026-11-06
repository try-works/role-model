import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resolveChannelScopedReplayLedgerLimits } from "../src/cli.js";
import {
  applyAutoQueueDailyCap,
  resolveAutoQueueConfigPath,
  resolveAutoQueueDailyCap,
} from "../src/queue-runtime/auto-queue.js";
import { createReplayLedger, replayBudgetAvailable } from "../src/track-b-replay-ledger.js";
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
const repoRoot = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "..",
  "..",
  "..",
  "..",
);

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
    await writeFile(
      configPath(),
      "version: '1.0'\nreplay:\n  auto_queue:\n    daily_cap: 7\n",
      "utf8",
    );
    expect(resolveAutoQueueDailyCap(configPath())).toBe(7);
  });

  it("resolves the host's root, legacy and explicit unified-config paths", async () => {
    expect(resolveAutoQueueConfigPath({ runtimeStateRoot: stateRoot })).toBe(configPath());
    const { mkdir } = await import("node:fs/promises");
    const legacy = path.join(stateRoot, "state", "runtime-config.yaml");
    await mkdir(path.dirname(legacy), { recursive: true });
    await writeFile(legacy, "version: '1.0'\n", "utf8");
    expect(resolveAutoQueueConfigPath({ runtimeStateRoot: stateRoot })).toBe(legacy);
    const explicit = path.join(stateRoot, "explicit-config.yaml");
    expect(
      resolveAutoQueueConfigPath({
        runtimeStateRoot: stateRoot,
        unifiedRuntimeConfigPath: explicit,
      }),
    ).toBe(explicit);
  });

  it("reads a root-config PUT through the real ledger resolver", async () => {
    const scopeId = "scope-auto-queue";
    await writeFile(
      configPath(),
      "version: '1.0'\nreplay:\n  auto_queue:\n    daily_cap: 7\n",
      "utf8",
    );
    const limits = resolveChannelScopedReplayLedgerLimits({
      repoRoot,
      runtimeStateRoot: stateRoot,
      scopeId,
      channel: "development",
    });
    expect(limits.counterfactualsPerDay).toBe(7);
    expect(limits.hardCounterfactualLimit).toBe(7);
  });

  it("prefers the host's explicit unified-config path over root and legacy", async () => {
    const explicit = path.join(stateRoot, "explicit-config.yaml");
    await writeFile(explicit, "version: '1.0'\nreplay:\n  auto_queue:\n    daily_cap: 9\n", "utf8");
    const limits = resolveChannelScopedReplayLedgerLimits({
      repoRoot,
      runtimeStateRoot: stateRoot,
      scopeId: "scope-explicit",
      channel: "development",
      unifiedRuntimeConfigPath: explicit,
    });
    expect(limits.counterfactualsPerDay).toBe(9);
  });

  it("falls back to the legacy state/runtime-config.yaml document", async () => {
    const { mkdir } = await import("node:fs/promises");
    const legacy = path.join(stateRoot, "state", "runtime-config.yaml");
    await mkdir(path.dirname(legacy), { recursive: true });
    await writeFile(legacy, "version: '1.0'\nreplay:\n  auto_queue:\n    daily_cap: 5\n", "utf8");
    const limits = resolveChannelScopedReplayLedgerLimits({
      repoRoot,
      runtimeStateRoot: stateRoot,
      scopeId: "scope-legacy",
      channel: "development",
    });
    expect(limits.counterfactualsPerDay).toBe(5);
  });

  it("applies the cap to the replay ledger's daily counterfactual ceiling", () => {
    expect(applyAutoQueueDailyCap({ dispatchesPerDay: 300 }, 7)).toEqual({
      counterfactualsPerDay: 7,
      dispatchesPerDay: 300,
      hardCounterfactualLimit: 7,
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

  it("reports no budget when the hard ceiling is zero even unenforced", () => {
    const ledger = createReplayLedger({
      filePath: path.join(stateRoot, "unavailable-ledger.json"),
      now: () => Date.UTC(2026, 0, 1, 12),
      limits: applyAutoQueueDailyCap({ enforced: false }, 0),
    });
    const status = ledger.status();
    expect(status.hardCounterfactualLimit).toBe(0);
    expect(replayBudgetAvailable(status)).toBe(false);
  });

  it("refuses automatic replays when disabled on a non-production channel", () => {
    const ledger = createReplayLedger({
      filePath: path.join(stateRoot, "disabled-ledger.json"),
      now: () => Date.UTC(2026, 0, 1, 12),
      limits: applyAutoQueueDailyCap({ enforced: false }, 0),
    });
    expect(
      ledger.reserve({
        captureRef: "capture-disabled",
        policySetDigest: "digest",
        candidateDispatches: 1,
      }),
    ).toMatchObject({ accepted: false, code: "budget_exhausted" });
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
