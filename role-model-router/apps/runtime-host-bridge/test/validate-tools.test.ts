import os from "node:os";
import path from "node:path";
import { mkdtemp } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import { runRuntimeToolsValidation } from "../src/validate-tools.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");

describe("runRuntimeToolsValidation", () => {
  test("executes runtime-owned MCP tool calls and persists their observation receipts", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-tools-"));

    const result = await runRuntimeToolsValidation({
      repoRoot,
      runtimeStateRoot,
      scopeId: "runtime-tools-validation",
    });

    expect(result.endpointId).toBe("moonshot.personal.primary.global.kimi-k2.5");
    expect(result.toolCalls).toEqual([
      {
        id: "call_1",
        type: "function",
        function: {
          name: "lookupRegistry",
          arguments: "{\"endpointId\":\"moonshot.personal.primary.global.kimi-k2.5\"}",
        },
      },
    ]);
    expect(result.toolExecutions).toEqual([
      {
        toolCallId: "call_1",
        toolName: "lookupRegistry",
        connectorId: "mcp.local.registry",
        connectorKind: "mcp",
        status: "succeeded",
        output: {
          endpointId: "moonshot.personal.primary.global.kimi-k2.5",
          modelId: "moonshot/kimi-k2.5",
          status: "active",
        },
        diagnostics: [],
      },
    ]);
    expect(result.observation).toMatchObject({
      requestId: result.requestId,
      endpointId: result.endpointId,
      tooling: {
        toolCalls: [
          {
            toolCallId: "call_1",
            toolName: "lookupRegistry",
          },
        ],
        executions: [
          {
            toolCallId: "call_1",
            connectorId: "mcp.local.registry",
            status: "succeeded",
          },
        ],
      },
    });
  });
});
