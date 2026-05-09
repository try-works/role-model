import { describe, expect, test } from "vitest";

import {
  normalizeUnifiedRuntimeConfigInput,
  parseUnifiedRuntimeConfigText,
  renderUnifiedRuntimeConfigText,
} from "../src/unified-runtime-config.js";

describe("unified runtime config", () => {
  test("derives hybrid mode when both vendor sections are populated", () => {
    const result = parseUnifiedRuntimeConfigText(`
version: "1.0"
routing:
  strategy: balanced
llama_swap:
  models:
    llama-3-70b:
      path: ./models/llama-3-70b-q4.gguf
litellm_proxy:
  providers:
    openai:
      api_key: \${OPENAI_API_KEY}
      model_list:
        - model_name: gpt-4o
          litellm_params:
            model: openai/gpt-4o
`);

    expect(result.executionMode).toBe("hybrid");
    expect(result.llamaSwap.enabled).toBe(true);
    expect(result.liteLLM.enabled).toBe(true);
    expect(result.llamaSwap.models).toEqual([
      {
        modelId: "llama-3-70b",
        path: "./models/llama-3-70b-q4.gguf",
        contextWindow: null,
        command: null,
        proxyBaseUrl: null,
        checkEndpoint: null,
        useModelName: null,
      },
    ]);
    expect(result.liteLLM.providers.map((provider) => provider.providerId)).toEqual(["openai"]);
  });

  test("derives decision-only mode when no vendor sections are active", () => {
    const result = parseUnifiedRuntimeConfigText(`
version: "1.0"
routing:
  strategy: balanced
`);

    expect(result.executionMode).toBe("decision_only");
    expect(result.llamaSwap.enabled).toBe(false);
    expect(result.liteLLM.enabled).toBe(false);
  });

  test("derives remote-only mode when only the LiteLLM section is populated", () => {
    const result = parseUnifiedRuntimeConfigText(`
version: "1.0"
litellm_proxy:
  providers:
    openai:
      api_key: \${OPENAI_API_KEY}
      model_list:
        - model_name: gpt-4o
          litellm_params:
            model: openai/gpt-4o
`);

    expect(result.executionMode).toBe("remote_only");
    expect(result.llamaSwap.enabled).toBe(false);
    expect(result.liteLLM.enabled).toBe(true);
    expect(result.liteLLM.providers).toEqual([
      {
        providerId: "openai",
        apiKeyRef: "${OPENAI_API_KEY}",
        modelNames: ["gpt-4o"],
        modelMappings: [
          {
            modelId: "gpt-4o",
            litellmModel: "openai/gpt-4o",
            litellmParams: {
              model: "openai/gpt-4o",
            },
          },
        ],
      },
    ]);
  });

  test("preserves advanced real-vendor settings for llama-swap and litellm", () => {
    const result = parseUnifiedRuntimeConfigText(`
version: "1.0"
llama_swap:
  models:
    local/mock-llama:
      path: ./models/mock-llama.gguf
      command: node ./scripts/mock-llama-server.js --port \${PORT}
      proxy: http://127.0.0.1:\${PORT}/v1
      check_endpoint: /ready
      use_model_name: mock/llama-upstream
litellm_proxy:
  providers:
    openai:
      api_key: none
      model_list:
        - model_name: openai/gpt-4.1-mini-fast
          litellm_params:
            model: openai/gpt-4.1-mini
            api_base: http://127.0.0.1:4010/v1
            api_key: none
            temperature: 0
`);

    expect(result.llamaSwap.models).toEqual([
      expect.objectContaining({
        modelId: "local/mock-llama",
        path: "./models/mock-llama.gguf",
        command: "node ./scripts/mock-llama-server.js --port ${PORT}",
        proxyBaseUrl: "http://127.0.0.1:${PORT}/v1",
        checkEndpoint: "/ready",
        useModelName: "mock/llama-upstream",
      }),
    ]);
    expect(result.liteLLM.providers).toEqual([
      expect.objectContaining({
        providerId: "openai",
        modelMappings: [
          expect.objectContaining({
            modelId: "openai/gpt-4.1-mini-fast",
            litellmModel: "openai/gpt-4.1-mini",
            litellmParams: {
              model: "openai/gpt-4.1-mini",
              api_base: "http://127.0.0.1:4010/v1",
              api_key: "none",
              temperature: 0,
            },
          }),
        ],
      }),
    ]);
  });

  test("leaves process startup timeouts unset unless the unified config specifies them", () => {
    const result = parseUnifiedRuntimeConfigText(`
version: "1.0"
llama_swap:
  models:
    local/mock-llama:
      path: ./models/mock-llama.gguf
litellm_proxy:
  providers:
    openai:
      api_key: none
      model_list:
        - model_name: openai/gpt-4.1-mini-fast
          litellm_params:
            model: openai/gpt-4.1-mini
`);

    expect(result.llamaSwap.process.startupTimeoutMs).toBeNull();
    expect(result.liteLLM.process.startupTimeoutMs).toBeNull();
  });

  test("normalizes object input and round-trips advanced vendor settings back to config text", () => {
    const normalized = normalizeUnifiedRuntimeConfigInput({
      version: "1.0",
      routingStrategy: "latency-first",
      llamaSwap: {
        models: [
          {
            modelId: "local/mock-llama",
            path: "./models/mock-llama.gguf",
            contextWindow: 8192,
            command: "node ./scripts/mock-llama-server.js --port ${PORT}",
            proxyBaseUrl: "http://127.0.0.1:${PORT}/v1",
            checkEndpoint: "/ready",
            useModelName: "mock/llama-upstream",
          },
        ],
        process: {
          command: null,
          args: [],
          env: {
            LLAMA_SWAP_MODE: "live-reload",
          },
          cwd: null,
          startupTimeoutMs: 15000,
        },
      },
      liteLLM: {
        providers: [
          {
            providerId: "moonshot",
            apiKeyRef: "${MOONSHOT_API_KEY}",
            modelNames: ["moonshot/kimi-k2.5"],
            modelMappings: [
              {
                modelId: "moonshot/kimi-k2.5",
                litellmModel: "moonshot/kimi-k2.5",
                litellmParams: {
                  model: "moonshot/kimi-k2.5",
                  api_base: "https://api.moonshot.ai/v1",
                  temperature: 0,
                },
              },
            ],
          },
        ],
        process: {
          command: "litellm",
          args: ["--debug"],
          env: {
            LITELLM_MODE: "live-reload",
          },
          cwd: null,
          startupTimeoutMs: 30000,
        },
      },
    });

    expect(parseUnifiedRuntimeConfigText(renderUnifiedRuntimeConfigText(normalized))).toEqual({
      version: "1.0",
      routingStrategy: "latency-first",
      executionMode: "hybrid",
      llamaSwap: {
        enabled: true,
        models: [
          {
            modelId: "local/mock-llama",
            path: "./models/mock-llama.gguf",
            contextWindow: 8192,
            command: "node ./scripts/mock-llama-server.js --port ${PORT}",
            proxyBaseUrl: "http://127.0.0.1:${PORT}/v1",
            checkEndpoint: "/ready",
            useModelName: "mock/llama-upstream",
          },
        ],
        process: {
          command: null,
          args: [],
          env: {
            LLAMA_SWAP_MODE: "live-reload",
          },
          cwd: null,
          startupTimeoutMs: 15000,
        },
      },
      liteLLM: {
        enabled: true,
        providers: [
          {
            providerId: "moonshot",
            apiKeyRef: "${MOONSHOT_API_KEY}",
            modelNames: ["moonshot/kimi-k2.5"],
            modelMappings: [
              {
                modelId: "moonshot/kimi-k2.5",
                litellmModel: "moonshot/kimi-k2.5",
                litellmParams: {
                  model: "moonshot/kimi-k2.5",
                  api_base: "https://api.moonshot.ai/v1",
                  temperature: 0,
                },
              },
            ],
          },
        ],
        process: {
          command: "litellm",
          args: ["--debug"],
          env: {
            LITELLM_MODE: "live-reload",
          },
          cwd: null,
          startupTimeoutMs: 30000,
        },
      },
    });
  });
});
