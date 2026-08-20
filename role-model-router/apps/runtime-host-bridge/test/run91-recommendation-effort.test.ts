import { createHmac } from "node:crypto";
import { mkdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import { createTrackBOperations } from "../src/track-b-operations.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

const signedLegacyBundle = (
  recommendations: readonly Record<string, unknown>[],
  revision: number,
) => {
  const key = "run91-recommendation-hmac-key";
  const unsigned = {
    channel: "production",
    revision,
    recommendations,
    provenance: { source: "run91-test", snapshot: `snapshot-${revision}` },
  };
  return {
    ...unsigned,
    signature: createHmac("sha256", key).update(JSON.stringify(unsigned)).digest("hex"),
    key,
  };
};

describe("Run 91 recommendation effort identity", () => {
  test("retains endpoint/model/effort identity for same-model high and max packs through apply and restart", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `run91-recommendation-effort-${Date.now()}`);
    roots.push(runtimeStateRoot);
    await mkdir(runtimeStateRoot, { recursive: true });
    const statePath = path.join(runtimeStateRoot, "track-b-production-bridge.json");
    const bundle = signedLegacyBundle(
      [
        {
          id: "deepseek-v4-high-pack",
          version: "1",
          provenance: "cloud:run91-high",
          endpointId: "deepseek.personal.deepseek-v4-pro~effort-v1~high",
          modelId: "deepseek/deepseek-v4-pro",
          reasoningEffort: "high",
          effortSource: "variant",
        },
        {
          id: "deepseek-v4-max-pack",
          version: "1",
          provenance: "cloud:run91-max",
          endpointId: "deepseek.personal.deepseek-v4-pro~effort-v1~max",
          modelId: "deepseek/deepseek-v4-pro",
          reasoningEffort: "max",
          effortSource: "variant",
        },
      ],
      1,
    );
    const operations = createTrackBOperations({ statePath, catalog: [] });
    const imported = await operations.importRecommendationBundle(bundle, bundle.key);
    expect(imported).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "deepseek-v4-high-pack",
          endpointId: "deepseek.personal.deepseek-v4-pro~effort-v1~high",
          modelId: "deepseek/deepseek-v4-pro",
          reasoningEffort: "high",
          effortSource: "variant",
        }),
        expect.objectContaining({
          id: "deepseek-v4-max-pack",
          endpointId: "deepseek.personal.deepseek-v4-pro~effort-v1~max",
          modelId: "deepseek/deepseek-v4-pro",
          reasoningEffort: "max",
          effortSource: "variant",
        }),
      ]),
    );

    const appliedHigh = (await operations.applyRecommendation({ id: "deepseek-v4-high-pack" })) as {
      activePack: Record<string, unknown>;
    };
    expect(appliedHigh.activePack).toMatchObject({
      id: "deepseek-v4-high-pack",
      version: "1",
      endpointId: "deepseek.personal.deepseek-v4-pro~effort-v1~high",
      modelId: "deepseek/deepseek-v4-pro",
      reasoningEffort: "high",
      effortSource: "variant",
    });

    const restarted = createTrackBOperations({ statePath, catalog: [] });
    expect(await restarted.readActivePack()).toMatchObject(appliedHigh.activePack);
    expect(await restarted.listRecommendations()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "deepseek-v4-high-pack",
          status: "applied",
          reasoningEffort: "high",
          effortSource: "variant",
        }),
        expect.objectContaining({
          id: "deepseek-v4-max-pack",
          status: "validated",
          reasoningEffort: "max",
          effortSource: "variant",
        }),
      ]),
    );

    const appliedMax = (await restarted.applyRecommendation({ id: "deepseek-v4-max-pack" })) as {
      activePack: Record<string, unknown>;
    };
    expect(appliedMax.activePack).toMatchObject({
      id: "deepseek-v4-max-pack",
      endpointId: "deepseek.personal.deepseek-v4-pro~effort-v1~max",
      modelId: "deepseek/deepseek-v4-pro",
      reasoningEffort: "max",
      effortSource: "variant",
    });
    expect(JSON.parse(await readFile(statePath, "utf8")).activePack).toMatchObject(
      appliedMax.activePack,
    );
  });

  test("keeps legacy recommendation records readable without inventing effort identity", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `run91-recommendation-legacy-${Date.now()}`);
    roots.push(runtimeStateRoot);
    await mkdir(runtimeStateRoot, { recursive: true });
    const statePath = path.join(runtimeStateRoot, "track-b-production-bridge.json");
    const bundle = signedLegacyBundle(
      [{ id: "legacy-pack", version: "7", provenance: "cloud:legacy" }],
      1,
    );
    const operations = createTrackBOperations({ statePath, catalog: [] });
    const [legacy] = await operations.importRecommendationBundle(bundle, bundle.key);
    expect(legacy).toMatchObject({
      id: "legacy-pack",
      version: "7",
      status: "validated",
    });
    expect(legacy).not.toHaveProperty("reasoningEffort");
    expect(legacy).not.toHaveProperty("effortSource");
    const applied = (await operations.applyRecommendation({ id: "legacy-pack" })) as {
      activePack: Record<string, unknown>;
    };
    expect(applied.activePack).toMatchObject({ id: "legacy-pack", version: "7" });
    expect(applied.activePack).not.toHaveProperty("reasoningEffort");
    expect(applied.activePack).not.toHaveProperty("effortSource");
  });
});
