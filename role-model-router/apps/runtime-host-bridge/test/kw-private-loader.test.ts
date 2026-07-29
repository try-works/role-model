import { describe, expect, test } from "vitest";

import {
  createPrivateKwJoinWorkerFactory,
  resolvePrivateKnowledgeWorkerModulePath,
} from "../src/kw-private-loader.js";

const distributionRoot =
  process.env.ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT?.trim() ||
  "D:/DEV/role-model-internal/.worktrees/85-kw-gated-router-prompt-inject/dist/run00-dev";

describe("kw-private-loader", () => {
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
