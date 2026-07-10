import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import * as cli from "../src/cli.js";
import * as bridge from "../src/index.js";

describe("cli startup readiness", () => {
  test("binds health and static UI before backend initialization completes", async () => {
    const staticRoot = await mkdtemp(path.join(os.tmpdir(), "runtime-ui-static-"));
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
      expect(healthResponse.status).toBe(200);
      await expect(healthResponse.json()).resolves.toEqual(
        expect.objectContaining({
          status: "degraded",
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
});
