import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readRouteSource(fileName: string): string {
  return readFileSync(path.join(__dirname, fileName), "utf8");
}

const p0BootstrapExpectations = [
  {
    routePath: "/app/models",
    fileName: "control-models.tsx",
    expectedHelpers: ["fetchRuntimeAccounts", "fetchRuntimeEndpoints", "fetchRuntimeModels"],
  },
  {
    routePath: "/app/router",
    fileName: "router.tsx",
    expectedHelpers: ["fetchRuntimeEndpoints"],
  },
  {
    routePath: "/app/studio/chat",
    fileName: "workbench.tsx",
    // RM3 Studio Chat is Model · Prompt · Run only (no Endpoint / Routing mode).
    // Bounded startup is models inventory — see addenda/03-studio-startup-bounded-fetch.md.
    expectedHelpers: ["fetchRuntimeModels"],
  },
  {
    routePath: "/app/studio/images",
    fileName: "studio-images.tsx",
    expectedHelpers: ["fetchRuntimeModels"],
  },
  {
    routePath: "/app/studio/audio",
    fileName: "studio-audio.tsx",
    expectedHelpers: ["fetchRuntimeModels"],
  },
  {
    routePath: "/app/studio/rerank",
    fileName: "studio-rerank.tsx",
    expectedHelpers: ["fetchRuntimeModels"],
  },
  {
    routePath: "/app/studio/advanced",
    fileName: "studio-advanced.tsx",
    // RM3 Studio Advanced is Family · Model · JSON · Submit — models inventory only.
    expectedHelpers: ["fetchRuntimeModels"],
  },
  {
    routePath: "/app/connect",
    fileName: "endpoints.tsx",
    expectedHelpers: [
      "fetchRuntimeSummary",
      "fetchRuntimeAccounts",
      "fetchRuntimeDeviceAuthorizations",
      "fetchRuntimeEndpoints",
    ],
  },
  {
    routePath: "/app/connect/upstream",
    fileName: "integrations-upstream.tsx",
    expectedHelpers: ["fetchRuntimeProviders", "fetchRuntimeAccounts", "fetchRuntimeModels"],
  },
  {
    routePath: "/app/router/controller",
    fileName: "control-controller.tsx",
    expectedHelpers: ["fetchRuntimeEndpoints"],
  },
  {
    routePath: "/app/system/peers",
    fileName: "system-peers.tsx",
    expectedHelpers: ["fetchRuntimeModels"],
  },
] as const;

describe("runtime-ui P0 startup bootstrap regressions", () => {
  for (const expectation of p0BootstrapExpectations) {
    test(`${expectation.routePath} avoids full runtime snapshot startup fanout`, () => {
      const source = readRouteSource(expectation.fileName);

      expect(source).not.toContain("fetchRuntimeSnapshot(");
      for (const helperName of expectation.expectedHelpers) {
        expect(source).toContain(helperName);
      }
      if (expectation.routePath === "/app/models") {
        expect(source).not.toContain("fetchRuntimeRequests");
      }
    });
  }
});
