import { describe, expect, test } from "vitest";

import type { RuntimeConfig, RuntimeConfigRecord } from "./runtime-api";
import {
  LLAMA_SWAP_SCAFFOLD_MODEL_ID,
  LLAMA_SWAP_SCAFFOLD_YAML,
  applyLlamaSwapScaffold,
  createLlamaSwapScaffoldModel,
  readLlamaSwapConfigStatus,
} from "./llama-swap-setup";

function createBaseConfig(models: RuntimeConfig["llamaSwap"]["models"] = []): RuntimeConfig {
  return {
    version: "1.0",
    routingStrategy: null,
    executionMode: "decision_only",
    llamaSwap: {
      models,
      process: {
        command: null,
        args: [],
        env: {},
        cwd: null,
        startupTimeoutMs: null,
      },
    },
    liteLLM: {
      providers: [
        {
          providerId: "moonshot",
          modelMappings: [{ modelId: "moonshot/kimi-k2.6", litellmModel: "moonshot/kimi-k2.6" }],
        },
      ],
      process: {
        command: null,
        args: [],
        env: {},
        cwd: null,
        startupTimeoutMs: null,
      },
    },
  };
}

function asRecord(config: RuntimeConfig): RuntimeConfigRecord {
  return {
    applied: true,
    path: "C:\\Users\\You\\AppData\\Local\\Role Model Runtime\\runtime-config.yaml",
    config,
  };
}

describe("llama-swap-setup", () => {
  test("scaffold YAML includes model id and Windows path placeholder", () => {
    expect(LLAMA_SWAP_SCAFFOLD_YAML).toContain(`llama_swap:`);
    expect(LLAMA_SWAP_SCAFFOLD_YAML).toContain(LLAMA_SWAP_SCAFFOLD_MODEL_ID);
    expect(LLAMA_SWAP_SCAFFOLD_YAML).toContain("path:");
    expect(LLAMA_SWAP_SCAFFOLD_YAML).toContain("# context_window:");
    expect(LLAMA_SWAP_SCAFFOLD_YAML).toContain("# check_endpoint:");
  });

  test("applyLlamaSwapScaffold merges placeholder model when models are empty", () => {
    const base = createBaseConfig();
    const merged = applyLlamaSwapScaffold(base);
    expect(merged.llamaSwap.models).toHaveLength(1);
    expect(merged.llamaSwap.models[0]).toEqual(createLlamaSwapScaffoldModel());
    expect(merged.liteLLM.providers).toEqual(base.liteLLM.providers);
    expect(merged.routingStrategy).toBe(base.routingStrategy);
  });

  test("applyLlamaSwapScaffold is idempotent when models already exist", () => {
    const existing = createBaseConfig([
      { modelId: "lfm2.5-8b-a1b", path: "D:\\models\\lfm.gguf" },
    ]);
    const merged = applyLlamaSwapScaffold(existing);
    expect(merged).toBe(existing);
    expect(merged.llamaSwap.models).toHaveLength(1);
  });

  test("readLlamaSwapConfigStatus reports not configured when no models declared", () => {
    const status = readLlamaSwapConfigStatus(asRecord(createBaseConfig()));
    expect(status.operational).toBe(false);
    expect(status.variant).toBe("not_configured");
    expect(status.declaredModelIds).toEqual([]);
  });

  test("readLlamaSwapConfigStatus reports needs_paths when models lack paths", () => {
    const status = readLlamaSwapConfigStatus(
      asRecord(createBaseConfig([{ modelId: "draft-model", path: "" }])),
    );
    expect(status.operational).toBe(false);
    expect(status.variant).toBe("needs_paths");
    expect(status.declaredModelIds).toEqual(["draft-model"]);
  });

  test("readLlamaSwapConfigStatus reports operational when a model has a path", () => {
    const status = readLlamaSwapConfigStatus(
      asRecord(createBaseConfig([{ modelId: "lfm2.5-8b-a1b", path: "D:\\models\\lfm.gguf" }])),
    );
    expect(status.operational).toBe(true);
    expect(status.variant).toBe("operational");
  });
});
