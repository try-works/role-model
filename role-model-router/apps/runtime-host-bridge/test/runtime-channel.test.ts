import { describe, expect, test } from "vitest";

import { resolveRuntimeChannelProfile, resolveRuntimeStateRoot } from "../src/runtime-channel.js";

describe("runtime channel profiles", () => {
  test.each([
    ["production", "role-model", 3456, "role-model-runtime", "standalone-runtime"],
    ["stage", "role-model-stage", 3457, "role-model-runtime-stage", "standalone-runtime-stage"],
    ["development", "role-model-dev", 3458, "role-model-runtime-dev", "standalone-runtime-dev"],
  ] as const)("resolves %s", (channel, name, port, stateRootName, scopeId) => {
    expect(resolveRuntimeChannelProfile(channel)).toEqual({
      schema_version: 1,
      channel,
      name,
      host: "127.0.0.1",
      port,
      state_root_name: stateRootName,
      scope_id: scopeId,
    });
  });

  test("rejects unsupported build channels", () => {
    expect(() => resolveRuntimeChannelProfile("preview")).toThrow(/unsupported runtime channel/i);
  });

  test("derives separate state roots from one platform base", () => {
    const base = "C:\\Users\\tester\\AppData\\Local";
    expect(resolveRuntimeStateRoot(base, resolveRuntimeChannelProfile("production"))).toContain(
      "role-model-runtime",
    );
    expect(resolveRuntimeStateRoot(base, resolveRuntimeChannelProfile("stage"))).toContain(
      "role-model-runtime-stage",
    );
    expect(resolveRuntimeStateRoot(base, resolveRuntimeChannelProfile("development"))).toContain(
      "role-model-runtime-dev",
    );
  });
});
