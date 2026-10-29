import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, test } from "vitest";

import * as cli from "../src/cli.js";
import * as bridge from "../src/index.js";
import { resolveRuntimeChannelProfile } from "../src/runtime-channel.js";

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
  test("marks the shared readiness owner exactly once and clears bootstrap message", () => {
    const state: Parameters<typeof cli.completeCliStartupReadiness>[0] = {
      status: "pending",
      message: "runtime_initializing",
    };
    let readyCalls = 0;
    cli.completeCliStartupReadiness(state, { markReady: () => { readyCalls += 1; } });
    expect(state.status).toBe("ready");
    expect("message" in state).toBe(false);
    expect(readyCalls).toBe(1);
  });
});
describe("S478/S479 packaged branch readiness", () => {
  test("a packaged branch run through runCliBackendBranch marks readiness exactly once", async () => {
    const state: Parameters<typeof cli.completeCliStartupReadiness>[0] = {
      status: "pending",
      message: "runtime_initializing",
    };
    let readyCalls = 0;
    let packagedRan = false;
    let plainRan = false;
    await cli.runCliBackendBranch({
      bootstrapState: state,
      hasPackagedDistribution: true,
      readinessOwner: { markReady: () => { readyCalls += 1; } },
      runPackaged: async () => { packagedRan = true; },
      runPlain: async () => { plainRan = true; },
    });
    expect(packagedRan).toBe(true);
    expect(plainRan).toBe(false);
    expect(state.status).toBe("ready");
    expect("message" in state).toBe(false);
    expect(readyCalls).toBe(1);
  });

  test("a non-packaged branch run still marks readiness exactly once", async () => {
    const state: Parameters<typeof cli.completeCliStartupReadiness>[0] = { status: "pending", message: "x" };
    let readyCalls = 0;
    await cli.runCliBackendBranch({
      bootstrapState: state,
      hasPackagedDistribution: false,
      readinessOwner: { markReady: () => { readyCalls += 1; } },
      runPackaged: async () => {},
      runPlain: async () => {},
    });
    expect(state.status).toBe("ready");
    expect(readyCalls).toBe(1);
  });
});
describe("S479 branch selection", () => {
  test("manifest present without a release id selects the packaged path", async () => {
    const state: Parameters<typeof cli.completeCliStartupReadiness>[0] = { status: "pending", message: "x" };
    let packagedRan = 0;
    let plainRan = 0;
    await cli.runCliBackendBranch({
      bootstrapState: state,
      hasPackagedDistribution: true,
      packagedReleaseId: undefined,
      readinessOwner: { markReady: () => {} },
      runPackaged: async () => { packagedRan += 1; },
      runPlain: async () => { plainRan += 1; },
    });
    expect(packagedRan).toBe(1);
    expect(plainRan).toBe(0);
    expect(state.status).toBe("ready");
  });

  test("a release id without a manifest falls back to the plain path without TypeError", async () => {
    const state: Parameters<typeof cli.completeCliStartupReadiness>[0] = { status: "pending", message: "x" };
    let plainRan = 0;
    await expect(
      cli.runCliBackendBranch({
        bootstrapState: state,
        hasPackagedDistribution: false,
        packagedReleaseId: "run88:release-without-manifest",
        readinessOwner: { markReady: () => {} },
        runPlain: async () => { plainRan += 1; },
      }),
    ).resolves.toBeUndefined();
    expect(plainRan).toBe(1);
    expect(state.status).toBe("ready");
  });
});
