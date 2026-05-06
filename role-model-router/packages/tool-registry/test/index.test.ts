import { describe, expect, test } from "vitest";

import { createToolRegistry, executeToolCalls } from "../src/index.js";

describe("tool-registry", () => {
  test("executes a normalized tool call through an MCP-backed registry entry", async () => {
    const registry = createToolRegistry({
      connectors: [
        {
          connectorId: "mcp.local.registry",
          connectorKind: "mcp",
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
              execute: async ({ arguments: toolArguments }) => ({
                content: {
                  endpointId: (toolArguments as { endpointId: string }).endpointId,
                  status: "active",
                },
              }),
            },
          ],
        },
      ],
    });

    const result = await executeToolCalls(registry, {
      requestId: "req-tool-001",
      toolCalls: [
        {
          name: "lookupRegistry",
          arguments: {
            endpointId: "openai.personal.primary.us-east-1.fast",
          },
          providerToolId: "call_1",
        },
      ],
    });

    expect(result.executions).toEqual([
      {
        toolCallId: "call_1",
        toolName: "lookupRegistry",
        connectorId: "mcp.local.registry",
        connectorKind: "mcp",
        status: "succeeded",
        output: {
          endpointId: "openai.personal.primary.us-east-1.fast",
          status: "active",
        },
        diagnostics: [],
      },
    ]);
    expect(result.diagnostics).toEqual([]);
  });

  test("rejects a tool call when required schema fields are missing", async () => {
    let executed = false;
    const registry = createToolRegistry({
      connectors: [
        {
          connectorId: "mcp.local.registry",
          connectorKind: "mcp",
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
              execute: async () => {
                executed = true;
                return {
                  content: {
                    ok: true,
                  },
                };
              },
            },
          ],
        },
      ],
    });

    const result = await executeToolCalls(registry, {
      requestId: "req-tool-002",
      toolCalls: [
        {
          name: "lookupRegistry",
          arguments: {},
          providerToolId: "call_2",
        },
      ],
    });

    expect(executed).toBe(false);
    expect(result.executions).toEqual([
      {
        toolCallId: "call_2",
        toolName: "lookupRegistry",
        connectorId: "mcp.local.registry",
        connectorKind: "mcp",
        status: "rejected",
        output: null,
        diagnostics: [
          {
            code: "TOOL_SCHEMA_INVALID",
            message:
              "Tool lookupRegistry is missing required field endpointId.",
          },
        ],
      },
    ]);
    expect(result.diagnostics).toEqual([
      {
        code: "TOOL_SCHEMA_INVALID",
        message:
          "Tool lookupRegistry is missing required field endpointId.",
      },
    ]);
  });

  test("records a failed execution when no tool is registered", async () => {
    const registry = createToolRegistry({
      connectors: [],
    });

    const result = await executeToolCalls(registry, {
      requestId: "req-tool-003",
      toolCalls: [
        {
          name: "missingTool",
          arguments: {
            endpointId: "openai.personal.primary.us-east-1.fast",
          },
          providerToolId: "call_3",
        },
      ],
    });

    expect(result.executions).toEqual([
      {
        toolCallId: "call_3",
        toolName: "missingTool",
        connectorId: "unresolved",
        connectorKind: "unknown",
        status: "failed",
        output: null,
        diagnostics: [
          {
            code: "TOOL_NOT_REGISTERED",
            message: "No tool is registered for missingTool.",
          },
        ],
      },
    ]);
    expect(result.diagnostics).toEqual([
      {
        code: "TOOL_NOT_REGISTERED",
        message: "No tool is registered for missingTool.",
      },
    ]);
  });

  test("records a failed execution when the tool throws", async () => {
    const registry = createToolRegistry({
      connectors: [
        {
          connectorId: "mcp.local.registry",
          connectorKind: "mcp",
          tools: [
            {
              name: "lookupRegistry",
              inputSchema: {
                type: "object",
                properties: {
                  endpointId: { type: "string" },
                },
                required: ["endpointId"],
              },
              execute: async () => {
                throw new Error("Connector timed out.");
              },
            },
          ],
        },
      ],
    });

    const result = await executeToolCalls(registry, {
      requestId: "req-tool-004",
      toolCalls: [
        {
          name: "lookupRegistry",
          arguments: {
            endpointId: "openai.personal.primary.us-east-1.fast",
          },
          providerToolId: "call_4",
        },
      ],
    });

    expect(result.executions).toEqual([
      {
        toolCallId: "call_4",
        toolName: "lookupRegistry",
        connectorId: "mcp.local.registry",
        connectorKind: "mcp",
        status: "failed",
        output: null,
        diagnostics: [
          {
            code: "TOOL_EXECUTION_FAILED",
            message: "Connector timed out.",
          },
        ],
      },
    ]);
    expect(result.diagnostics).toEqual([
      {
        code: "TOOL_EXECUTION_FAILED",
        message: "Connector timed out.",
      },
    ]);
  });
});
