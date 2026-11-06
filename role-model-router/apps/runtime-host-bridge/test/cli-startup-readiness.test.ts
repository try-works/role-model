import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { Effect, Exit, Layer, Scope } from "effect";
import { describe, expect, test } from "vitest";

import * as cli from "../src/cli.js";
import { composeReadinessOwner } from "../src/composition-dag.js";
import * as bridge from "../src/index.js";
import { composeR27HostLayer } from "../src/r27-layer-dag.js";
import { resolveRuntimeChannelProfile } from "../src/runtime-channel.js";

const dagOwner = (): {
  readonly owner: ReturnType<typeof composeReadinessOwner>;
  readonly calls: () => number;
} => {
  const composed = composeReadinessOwner();
  let calls = 0;
  return {
    calls: () => calls,
    owner: {
      ...composed,
      markReady: () => {
        calls += 1;
        composed.markReady();
      },
    },
  };
};
const composeDag = async (owner: ReturnType<typeof composeReadinessOwner>) => {
  const scope = Effect.runSync(Scope.make());
  await Effect.runPromise(
    Layer.buildWithScope(composeR27HostLayer({ readiness: owner as never }), scope),
  );
  return scope;
};

describe("cli startup readiness", () => {
  test("rejects every packaged runtime channel when its Track B manifest is absent", () => {
    expect(typeof cli.requirePackagedTrackBManifest).toBe("function");

    for (const channel of ["development", "stage", "production"] as const) {
      expect(() =>
        cli.requirePackagedTrackBManifest(resolveRuntimeChannelProfile(channel), null),
      ).toThrow(/Track B distribution/i);
    }

    expect(() =>
      cli.requirePackagedTrackBManifest(
        resolveRuntimeChannelProfile("development"),
        '{"schemaVersion":"role-model.track-b-runtime-distribution.v2"}',
      ),
    ).not.toThrow();
  });

  test("binds health and static UI before backend initialization completes", async () => {
    const tempRoot = process.env.ROLE_MODEL_TEST_TEMP_ROOT ?? "E:/role-model-temp";
    await mkdir(tempRoot, { recursive: true });
    const staticRoot = await mkdtemp(path.join(tempRoot, "runtime-ui-static-"));
    const bootstrapState = {
      status: "pending" as const,
      message: "warming persisted runtime state",
    };

    await writeFile(
      path.join(staticRoot, "index.html"),
      "<!doctype html><html><body>runtime ui ready</body></html>",
      "utf8",
    );
    await writeFile(path.join(staticRoot, "app.css"), "body { font-family: Inter; }", "utf8");

    const server = await bridge.startBridgeServer(
      cli.createCliServerOptions(
        {
          host: "127.0.0.1",
          port: 0,
          staticRoot,
        },
        {
          getBackend: () => null,
          readBootstrapState: () => bootstrapState,
        },
      ),
    );

    try {
      const healthResponse = await fetch(`http://127.0.0.1:${server.port}/healthz`);
      expect(healthResponse.status).toBe(503);
      await expect(healthResponse.json()).resolves.toEqual(
        expect.objectContaining({
          status: "degraded",
          ready: false,
          sessionBootstrap: expect.objectContaining({
            status: "pending",
          }),
        }),
      );

      const uiResponse = await fetch(`http://127.0.0.1:${server.port}/`);
      expect(uiResponse.status).toBe(200);
      expect(uiResponse.headers.get("cache-control")).toBe("no-store");
      await expect(uiResponse.text()).resolves.toContain("runtime ui ready");

      const assetResponse = await fetch(`http://127.0.0.1:${server.port}/app.css`);
      expect(assetResponse.status).toBe(200);
      expect(assetResponse.headers.get("content-type")).toBe("text/css; charset=utf-8");
      expect(assetResponse.headers.get("cache-control")).toBe("no-store");
      await expect(assetResponse.text()).resolves.toContain("font-family: Inter");

      const apiResponse = await fetch(`http://127.0.0.1:${server.port}/api/version`);
      expect(apiResponse.status).toBe(503);
      await expect(apiResponse.json()).resolves.toEqual(
        expect.objectContaining({
          error: "runtime_initializing",
          status: "pending",
          message: "warming persisted runtime state",
        }),
      );
    } finally {
      await server.close();
      await rm(staticRoot, { recursive: true, force: true });
    }
  });

  test("exposes lightweight latest-request-id reads from the non-QA cli startup wiring", async () => {
    const server = await bridge.startBridgeServer(
      cli.createCliServerOptions(
        {
          host: "127.0.0.1",
          port: 0,
        },
        {
          getBackend: () =>
            ({
              effectiveRegistry: {
                endpoints: [],
                diagnostics: [],
                lifecycleSummary: {
                  active: 0,
                  degraded: 0,
                  offline: 0,
                },
              },
              listRecentRequestIds: async (limit = 10) =>
                ["req-010", "req-009", "req-008"].slice(0, limit),
            }) as Parameters<typeof cli.createCliServerOptions>[1],
        },
      ),
    );

    try {
      const response = await fetch(
        `http://127.0.0.1:${server.port}/api/role-model/requests/latest-ids?limit=2`,
      );
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual(["req-010", "req-009"]);
    } finally {
      await server.close();
    }
  });
});
describe("S478 packaged readiness transition", () => {
  test("the DAG host leaf marks the shared readiness owner once; the bootstrap helper only clears state", async () => {
    const state: Parameters<typeof cli.completeCliStartupReadiness>[0] = {
      status: "pending",
      message: "runtime_initializing",
    };
    const observed = dagOwner();
    const scope = await composeDag(observed.owner);
    try {
      cli.completeCliStartupReadiness(state, observed.owner);
      expect(state.status).toBe("ready");
      expect("message" in state).toBe(false);
      expect(observed.calls()).toBe(1);
    } finally {
      await Effect.runPromise(Scope.close(scope, Exit.void));
    }
  });
});
describe("S478/S479 packaged branch readiness", () => {
  test("a packaged branch run through runCliBackendBranch marks readiness exactly once", async () => {
    const state: Parameters<typeof cli.completeCliStartupReadiness>[0] = {
      status: "pending",
      message: "runtime_initializing",
    };
    const observed = dagOwner();
    let packagedRan = false;
    let plainRan = false;
    const scope = await composeDag(observed.owner);
    try {
      await cli.runCliBackendBranch({
        bootstrapState: state,
        hasPackagedDistribution: true,
        readinessOwner: observed.owner,
        runPackaged: async () => {
          packagedRan = true;
        },
        runPlain: async () => {
          plainRan = true;
        },
      });
    } finally {
      await Effect.runPromise(Scope.close(scope, Exit.void));
    }
    expect(packagedRan).toBe(true);
    expect(plainRan).toBe(false);
    expect(state.status).toBe("ready");
    expect("message" in state).toBe(false);
    expect(observed.calls()).toBe(1);
  });

  test("a non-packaged branch run still marks readiness exactly once", async () => {
    const state: Parameters<typeof cli.completeCliStartupReadiness>[0] = {
      status: "pending",
      message: "x",
    };
    const observed = dagOwner();
    const scope = await composeDag(observed.owner);
    try {
      await cli.runCliBackendBranch({
        bootstrapState: state,
        hasPackagedDistribution: false,
        readinessOwner: observed.owner,
        runPackaged: async () => {},
        runPlain: async () => {},
      });
    } finally {
      await Effect.runPromise(Scope.close(scope, Exit.void));
    }
    expect(state.status).toBe("ready");
    expect(observed.calls()).toBe(1);
  });
});
describe("S479 branch selection", () => {
  test("manifest present without a release id selects the packaged path", async () => {
    const state: Parameters<typeof cli.completeCliStartupReadiness>[0] = {
      status: "pending",
      message: "x",
    };
    let packagedRan = 0;
    let plainRan = 0;
    await cli.runCliBackendBranch({
      bootstrapState: state,
      hasPackagedDistribution: true,
      packagedReleaseId: undefined,
      readinessOwner: { markReady: () => {} },
      runPackaged: async () => {
        packagedRan += 1;
      },
      runPlain: async () => {
        plainRan += 1;
      },
    });
    expect(packagedRan).toBe(1);
    expect(plainRan).toBe(0);
    expect(state.status).toBe("ready");
  });

  test("a release id without a manifest falls back to the plain path without TypeError", async () => {
    const state: Parameters<typeof cli.completeCliStartupReadiness>[0] = {
      status: "pending",
      message: "x",
    };
    let plainRan = 0;
    await expect(
      cli.runCliBackendBranch({
        bootstrapState: state,
        hasPackagedDistribution: false,
        packagedReleaseId: "run88:release-without-manifest",
        readinessOwner: { markReady: () => {} },
        runPlain: async () => {
          plainRan += 1;
        },
      }),
    ).resolves.toBeUndefined();
    expect(plainRan).toBe(1);
    expect(state.status).toBe("ready");
  });
});
describe("S480 development Run88 gate", () => {
  const sha = "a".repeat(64);
  test("development distribution with no release id skips Run88 identity validation", () => {
    expect(() =>
      cli.validatePackagedRun88Identity({
        packagedReleaseId: undefined,
        identity: { channel: "development", generation: "N", manifestSha256: sha },
        expected: { channel: "stage", manifestSha256: sha, publicGeneration: "N" },
      }),
    ).not.toThrow();
  });

  test("stage release id still enforces the stage identity", () => {
    expect(() =>
      cli.validatePackagedRun88Identity({
        packagedReleaseId: "run88:release",
        identity: { channel: "development", generation: "N", manifestSha256: sha },
        expected: { channel: "stage", manifestSha256: sha, publicGeneration: "N" },
      }),
    ).toThrow(/channel mismatch/);
    expect(() =>
      cli.validatePackagedRun88Identity({
        packagedReleaseId: "run88:release",
        identity: { channel: "stage", generation: "N", manifestSha256: sha },
        expected: { channel: "stage", manifestSha256: sha, publicGeneration: "N" },
      }),
    ).not.toThrow();
  });
});
