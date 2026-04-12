import { readFile } from "node:fs/promises";

import { describe, expect, test } from "vitest";

import { exportStableConfig } from "../src/index.ts";

describe("exportStableConfig", () => {
  test("exports normalized ACP, MCP, and CLI endpoints to a stable machine-readable artifact", async () => {
    const outputPath = await exportStableConfig();
    const artifact = JSON.parse(await readFile(outputPath, "utf8")) as {
      endpoints: Array<{
        endpointId: string;
        providerKind: string;
        strategyTags: string[];
      }>;
    };

    expect(artifact.endpoints).toHaveLength(3);
    expect(artifact.endpoints.map((endpoint) => endpoint.endpointId).sort()).toEqual([
      "acp.remote.general",
      "cli.local.coder",
      "mcp.remote.embedder",
    ]);
    expect(artifact.endpoints.map((endpoint) => endpoint.providerKind).sort()).toEqual([
      "provider-acp",
      "provider-cli",
      "provider-mcp",
    ]);
  });
});
