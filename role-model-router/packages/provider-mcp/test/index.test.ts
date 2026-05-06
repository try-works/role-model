import { describe, expect, test } from "vitest";

import { createMcpConnectorDefinitions } from "../src/index.js";

describe("provider-mcp", () => {
  test("creates runtime MCP connector definitions with declared tools", () => {
    const connectors = createMcpConnectorDefinitions([
      {
        connector_id: "mcp.local.registry",
        endpoint_id: "mcp.remote.registry",
        model_id: "registry/tool-router",
        capabilities: ["text.chat", "tools.function_calling"],
        modalities: ["text"],
        tools: [
          {
            name: "lookupRegistry",
            description: "Look up endpoint details.",
            input_schema: {
              type: "object",
              properties: {
                endpointId: { type: "string" },
              },
              required: ["endpointId"],
            },
          },
        ],
      },
    ]);

    expect(connectors).toEqual([
      {
        connectorId: "mcp.local.registry",
        connectorKind: "mcp",
        endpointId: "mcp.remote.registry",
        modelId: "registry/tool-router",
        capabilities: ["text.chat", "tools.function_calling"],
        tools: [
          {
            name: "lookupRegistry",
            description: "Look up endpoint details.",
            inputSchema: {
              type: "object",
              properties: {
                endpointId: { type: "string" },
              },
              required: ["endpointId"],
            },
          },
        ],
      },
    ]);
  });
});
