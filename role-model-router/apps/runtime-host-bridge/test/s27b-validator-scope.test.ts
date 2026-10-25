import { describe, expect, it } from "vitest";

import {
  resolvePackagedValidationScope,
  type PackagedValidationManifest,
} from "../src/validate-packaging.js";
import {
  CURRENT_RUNTIME_CHANNEL_VERSION,
  negotiateRuntimeChannelStartup,
} from "../src/runtime-channel.js";

describe("S27b packaged validator scope", () => {
  const manifest: PackagedValidationManifest = {
    channel: "development",
    executable: "role-model-dev.exe",
    scope_id: "standalone-runtime-dev",
  };

  it("derives the packaged channel scope from the manifest and accepts it explicitly", () => {
    expect(resolvePackagedValidationScope(manifest)).toBe("standalone-runtime-dev");
    expect(resolvePackagedValidationScope(manifest, "standalone-runtime-dev")).toBe(
      "standalone-runtime-dev",
    );
  });

  it("refuses a foreign requested scope instead of launching with it", () => {
    expect(() => resolvePackagedValidationScope(manifest, "runtime-sea-validation")).toThrow(
      /scope mismatch: requested runtime-sea-validation, manifest declares standalone-runtime-dev/,
    );
  });

  it("refuses a manifest without a scope", () => {
    expect(() => resolvePackagedValidationScope({ executable: "x.exe" })).toThrow(
      /missing scope_id/,
    );
  });

  it("keeps product enforcement: a foreign runtime context still fails negotiation", () => {
    expect(() =>
      negotiateRuntimeChannelStartup({
        channel: "development",
        writerVersion: CURRENT_RUNTIME_CHANNEL_VERSION,
        readerVersion: CURRENT_RUNTIME_CHANNEL_VERSION,
        offeredCapabilities: [],
        requiredCapabilities: [],
        writerContext: {
          authorizationEpoch: 1,
          channel: "development",
          scopeId: "standalone-runtime-dev",
        },
        readerContext: {
          authorizationEpoch: 1,
          channel: "development",
          scopeId: "runtime-sea-validation",
        },
      }),
    ).toThrow(/runtime channel context scope mismatch/);
  });
});
