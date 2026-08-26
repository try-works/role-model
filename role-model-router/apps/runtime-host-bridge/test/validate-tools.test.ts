import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
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

    expect(result.endpointId).toBe("test.capture.tool-v1");
    expect(result.toolCalls).toEqual([
      {
        id: "call_1",
        type: "function",
        function: {
          name: "lookupRegistry",
          arguments: '{"endpointId":"test.capture.tool-v1"}',
        },
      },
    ]);
    expect(result.toolExecutions).toEqual([]);
    // Run 94 (SP2): the persisted observation is a compact identity stub; tool payloads
    // are graph-external and no longer ride the inline SQLite row.
    expect(result.observation).toMatchObject({
      requestId: result.requestId,
      endpointId: result.endpointId,
    });
    expect(result.observation).not.toHaveProperty("tooling");
  });
});
