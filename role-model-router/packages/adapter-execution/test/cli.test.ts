import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import { runRuntimeAdapterValidation } from "../src/cli.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("runRuntimeAdapterValidation", () => {
  test("routes onto a supported cloud adapter and returns capture-aware diagnostics", async () => {
    const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");
    const result = await runRuntimeAdapterValidation({
      repoRoot,
      runtimeStateRoot: path.join(os.tmpdir(), "role-model-runtime-adapter"),
      scopeId: "vitest-validation",
    });

    expect(result.decision.chosen_endpoint_id).toBe("openai.personal.primary.us-east-1.fast");
    expect(result.execution.target.adapterFamily).toBe("ai-sdk-openai");
    expect(result.execution.requestCapture.url).toContain("/responses");
    expect(result.execution.normalized.outputText).toBe("OpenAI summary");
    expect(result.execution.usageEvent.tokens_in).toBe(32);
    expect(result.captureFixture).toBe("adapter-openai-response.json");
  });
});
