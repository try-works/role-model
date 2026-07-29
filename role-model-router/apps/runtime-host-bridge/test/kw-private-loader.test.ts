import { existsSync } from "node:fs";

import { describe, expect, test } from "vitest";

import {
  createPrivateKwJoinWorkerFactory,
  resolvePrivateKnowledgeWorkerModulePath,
} from "../src/kw-private-loader.js";

const distributionRoot = process.env.ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT?.trim() ?? "";
const hasDistribution = Boolean(distributionRoot && existsSync(distributionRoot));

describe.skipIf(!hasDistribution)("kw-private-loader", () => {
  test("resolves packaged knowledge-worker module path", () => {
    const modulePath = resolvePrivateKnowledgeWorkerModulePath(distributionRoot);
    expect(modulePath).toBeTruthy();
    expect(modulePath).toMatch(/knowledge-worker\.mjs$/);
  });

  test("factory returns a session worker with promptInject", async () => {
    const factory = createPrivateKwJoinWorkerFactory({ distributionRoot });
    const worker = await factory("session-loader-1");
    expect(worker).toBeTruthy();
    expect(typeof worker?.promptInject).toBe("function");
    const again = await factory("session-loader-1");
    expect(again).toBe(worker);
  });
});
