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
    expectedHelpers: [
      "fetchRuntimeAccounts",
      "fetchRuntimeEndpoints",
      "fetchRuntimeModels",
      "fetchRuntimeRequests",
    ],
  },
  {
    routePath: "/app/router",
    fileName: "router.tsx",
    expectedHelpers: ["fetchRuntimeEndpoints"],
  },
  {
    routePath: "/app/studio/chat",
    fileName: "workbench.tsx",
    expectedHelpers: [
      "fetchRuntimeSummary",
      "fetchRuntimeAccounts",
      "fetchRuntimeEndpoints",
      "fetchRuntimeModels",
    ],
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
    expectedHelpers: ["fetchRuntimeSummary", "fetchRuntimeModels"],
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
    });
  }
});
