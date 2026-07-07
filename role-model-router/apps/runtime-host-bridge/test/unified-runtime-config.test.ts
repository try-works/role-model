import { describe, expect, test } from "vitest";
import { parse } from "yaml";

import {
  DEFAULT_UNIFIED_RUNTIME_CONTROLLER_TIMEOUT_MS,
  deriveUnifiedRuntimeRoutingAliasId,
  deriveUnifiedRuntimeRoutingAliasMode,
  mergeUnifiedRuntimeConfigDocuments,
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
      expect.objectContaining({
        modelId: "llama-3-70b",
        path: "./models/llama-3-70b-q4.gguf",
        contextWindow: null,
        command: null,
        proxyBaseUrl: null,
        checkEndpoint: null,
        useModelName: null,
        maxDifficulty: null,
      }),
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

  test("preserves explicit execution mode from parsed YAML and normalized API payloads", () => {
    expect(
      parseUnifiedRuntimeConfigText(`
version: "1.0"
execution_mode: hybrid
llama_swap:
  models:
    lfm2.5-1.2b-instruct:
      path: ./models/lfm2.5-1.2b-instruct.gguf
`).executionMode,
    ).toBe("hybrid");

    const normalized = normalizeUnifiedRuntimeConfigInput({
      version: "1.1",
      routingStrategy: "controller",
      executionMode: "hybrid",
      llamaSwap: {
        enabled: true,
        models: [
          {
            modelId: "lfm2.5-1.2b-instruct",
            path: "./models/lfm2.5-1.2b-instruct.gguf",
          },
        ],
      },
      liteLLM: {
        enabled: false,
        providers: [],
      },
    });

    expect(normalized.executionMode).toBe("hybrid");
    expect(renderUnifiedRuntimeConfigText(normalized)).toContain("execution_mode: hybrid");
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
      expect.objectContaining({
        providerId: "openai",
        apiKeyRef: "${OPENAI_API_KEY}",
        modelNames: ["gpt-4o"],
        modelMappings: [
          expect.objectContaining({
            modelId: "gpt-4o",
            litellmModel: "openai/gpt-4o",
            maxDifficulty: null,
            litellmParams: {
              model: "openai/gpt-4o",
            },
          }),
        ],
      }),
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

    expect(parseUnifiedRuntimeConfigText(renderUnifiedRuntimeConfigText(normalized))).toMatchObject(
      {
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
              maxDifficulty: null,
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
                  maxDifficulty: null,
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
      },
    );
  });

  test("parses observed-data policy and round-trips it back to config text", () => {
    const result = parseUnifiedRuntimeConfigText(`
version: "1.0"
observed_data:
  enabled: true
  aggregation:
    min_samples: 3
  metric_halflives:
    quality_ms: 900000
    latency_ms: 300000
    throughput_ms: 120000
    reliability_ms: 600000
    cost_ms: 1800000
  throughput_sla:
    enabled: true
    min_tokens_per_sec: 24
    penalty_timeout_ms: 600000
    penalty_factor: 0
`);

    expect(
      (
        result as unknown as {
          observedData?: {
            enabled: boolean;
            aggregation: { minSamples: number };
            difficultyLearning: {
              cacheTtlMs: number;
              invalidation: {
                maxContextTokensDelta: number;
                maxHistoryTurnDelta: number;
                maxToolCountDelta: number;
                maxInstructionConstraintDelta: number;
                maxDecompositionKeywordDelta: number;
                reclassifyOnCodeOrSchemaChange: boolean;
              };
              override: {
                minSamples: number;
                maxFailureRate: number;
                minQualityScore: number;
                minTokensPerSec: number;
              };
              recommendation: {
                minSamples: number;
                maxFailureRate: number;
                minQualityScore: number;
                minTokensPerSec: number;
              };
            };
            metricHalflives: {
              qualityMs: number;
              latencyMs: number;
              throughputMs: number;
              reliabilityMs: number;
              costMs: number;
            };
            throughputSla: {
              enabled: boolean;
              minTokensPerSec: number;
              penaltyTimeoutMs: number;
              penaltyFactor: number;
            };
          };
        }
      ).observedData,
    ).toMatchObject({
      enabled: true,
      aggregation: {
        minSamples: 3,
      },
      difficultyLearning: {
        cacheTtlMs: 900000,
        invalidation: {
          maxContextTokensDelta: 800,
          maxHistoryTurnDelta: 2,
          maxToolCountDelta: 1,
          maxInstructionConstraintDelta: 3,
          maxDecompositionKeywordDelta: 2,
          reclassifyOnCodeOrSchemaChange: true,
        },
        override: {
          minSamples: 3,
          maxFailureRate: 0.35,
          minQualityScore: 0.7,
          minTokensPerSec: 18,
        },
        recommendation: {
          minSamples: 4,
          maxFailureRate: 0.2,
          minQualityScore: 0.8,
          minTokensPerSec: 22,
        },
      },
      metricHalflives: {
        qualityMs: 900000,
        latencyMs: 300000,
        throughputMs: 120000,
        reliabilityMs: 600000,
        costMs: 1800000,
      },
      throughputSla: {
        enabled: true,
        minTokensPerSec: 24,
        penaltyTimeoutMs: 600000,
        penaltyFactor: 0,
      },
    });

    expect(
      renderUnifiedRuntimeConfigText(
        normalizeUnifiedRuntimeConfigInput({
          version: "1.0",
          observedData: {
            enabled: true,
            aggregation: {
              minSamples: 3,
            },
            metricHalflives: {
              qualityMs: 900000,
              latencyMs: 300000,
              throughputMs: 120000,
              reliabilityMs: 600000,
              costMs: 1800000,
            },
            throughputSla: {
              enabled: true,
              minTokensPerSec: 24,
              penaltyTimeoutMs: 600000,
              penaltyFactor: 0,
            },
          },
        }) as unknown as Parameters<typeof renderUnifiedRuntimeConfigText>[0],
      ),
    ).toContain("observed_data:");
  });

  test("rejects invalid observed-data throughput SLA policy values", () => {
    expect(() =>
      parseUnifiedRuntimeConfigText(`
version: "1.0"
observed_data:
  throughput_sla:
    enabled: true
    min_tokens_per_sec: 0
    penalty_timeout_ms: -1
    penalty_factor: 1.5
`),
    ).toThrow(/observed_data\.throughput_sla/i);
  });

  test("parses difficulty-learning policy and round-trips it back to config text", () => {
    const result = parseUnifiedRuntimeConfigText(`
version: "1.0"
observed_data:
  difficulty_learning:
    cache_ttl_ms: 900000
    invalidation:
      max_context_tokens_delta: 800
      max_history_turn_delta: 2
      max_tool_count_delta: 1
      max_instruction_constraint_delta: 3
      max_decomposition_keyword_delta: 2
      reclassify_on_code_or_schema_change: true
    override:
      min_samples: 3
      max_failure_rate: 0.35
      min_quality_score: 0.7
      min_tokens_per_sec: 18
    recommendation:
      min_samples: 4
      max_failure_rate: 0.2
      min_quality_score: 0.8
      min_tokens_per_sec: 22
`);

    expect(
      (
        result as unknown as {
          observedData?: {
            difficultyLearning?: {
              cacheTtlMs: number;
              invalidation: {
                maxContextTokensDelta: number;
                maxHistoryTurnDelta: number;
                maxToolCountDelta: number;
                maxInstructionConstraintDelta: number;
                maxDecompositionKeywordDelta: number;
                reclassifyOnCodeOrSchemaChange: boolean;
              };
              override: {
                minSamples: number;
                maxFailureRate: number;
                minQualityScore: number;
                minTokensPerSec: number;
              };
              recommendation: {
                minSamples: number;
                maxFailureRate: number;
                minQualityScore: number;
                minTokensPerSec: number;
              };
            };
          };
        }
      ).observedData?.difficultyLearning,
    ).toEqual({
      cacheTtlMs: 900000,
      invalidation: {
        maxContextTokensDelta: 800,
        maxHistoryTurnDelta: 2,
        maxToolCountDelta: 1,
        maxInstructionConstraintDelta: 3,
        maxDecompositionKeywordDelta: 2,
        reclassifyOnCodeOrSchemaChange: true,
      },
      override: {
        minSamples: 3,
        maxFailureRate: 0.35,
        minQualityScore: 0.7,
        minTokensPerSec: 18,
      },
      recommendation: {
        minSamples: 4,
        maxFailureRate: 0.2,
        minQualityScore: 0.8,
        minTokensPerSec: 22,
      },
    });

    expect(
      renderUnifiedRuntimeConfigText(
        normalizeUnifiedRuntimeConfigInput({
          version: "1.0",
          observedData: {
            enabled: true,
            aggregation: {
              minSamples: 2,
            },
            metricHalflives: {
              qualityMs: 900000,
              latencyMs: 300000,
              throughputMs: 120000,
              reliabilityMs: 600000,
              costMs: 1800000,
            },
            throughputSla: {
              enabled: true,
              minTokensPerSec: 24,
              penaltyTimeoutMs: 600000,
              penaltyFactor: 0,
            },
            difficultyLearning: {
              cacheTtlMs: 900000,
              invalidation: {
                maxContextTokensDelta: 800,
                maxHistoryTurnDelta: 2,
                maxToolCountDelta: 1,
                maxInstructionConstraintDelta: 3,
                maxDecompositionKeywordDelta: 2,
                reclassifyOnCodeOrSchemaChange: true,
              },
              override: {
                minSamples: 3,
                maxFailureRate: 0.35,
                minQualityScore: 0.7,
                minTokensPerSec: 18,
              },
              recommendation: {
                minSamples: 4,
                maxFailureRate: 0.2,
                minQualityScore: 0.8,
                minTokensPerSec: 22,
              },
            },
          },
        }) as unknown as Parameters<typeof renderUnifiedRuntimeConfigText>[0],
      ),
    ).toContain("difficulty_learning:");
  });

  test("parses model-alias policy and round-trips it back to config text", () => {
    const result = parseUnifiedRuntimeConfigText(`
version: "1.0"
model_aliases:
  gpt-5.4:
    model_ids:
      - local/mock-llama
      - openai/gpt-4.1-mini-fast
`);

    expect(
      (
        result as unknown as {
          modelAliases?: readonly {
            aliasId: string;
            modelIds: readonly string[];
          }[];
        }
      ).modelAliases,
    ).toEqual([
      {
        aliasId: "gpt-5.4",
        mode: null,
        modelIds: ["local/mock-llama", "openai/gpt-4.1-mini-fast"],
      },
    ]);

    expect(
      renderUnifiedRuntimeConfigText(
        normalizeUnifiedRuntimeConfigInput({
          version: "1.0",
          modelAliases: [
            {
              aliasId: "gpt-5.4",
              modelIds: ["local/mock-llama", "openai/gpt-4.1-mini-fast"],
            },
          ],
        }) as unknown as Parameters<typeof renderUnifiedRuntimeConfigText>[0],
      ),
    ).toContain("model_aliases:");
  });

  test("rejects invalid model-alias definitions", () => {
    expect(() =>
      parseUnifiedRuntimeConfigText(`
version: "1.0"
model_aliases:
  gpt-5.4:
    model_ids: []
`),
    ).toThrow(/model_aliases/i);
  });

  test("parses difficulty-classifier policy, alias difficulty mode, and max-difficulty settings", () => {
    const result = parseUnifiedRuntimeConfigText(`
version: "1.0"
difficulty_classifier:
  enabled: true
  rubric_version: v1
  source_type: remote
  model_id: openai/gpt-4.1-mini-fast
  timeout_ms: 1500
  fallback_difficulty: hard
model_aliases:
  gpt-5.4:
    mode: difficulty
    model_ids:
      - local/mock-llama
      - openai/gpt-4.1-mini-fast
llama_swap:
  models:
    local/mock-llama:
      path: ./models/mock-llama.gguf
      max_difficulty: medium
litellm_proxy:
  providers:
    openai:
      api_key: \${OPENAI_API_KEY}
      model_list:
        - model_name: openai/gpt-4.1-mini-fast
          max_difficulty: hard
          litellm_params:
            model: openai/gpt-4.1-mini
`);

    expect(
      result as unknown as {
        difficultyClassifier?: {
          enabled: boolean;
          rubricVersion: string;
          sourceType: "local" | "remote";
          endpointId: string | null;
          modelId: string | null;
          timeoutMs: number;
          fallbackDifficulty: "easy" | "medium" | "hard";
        };
        modelAliases?: readonly {
          aliasId: string;
          mode?: "basic" | "difficulty" | "intelligent" | "hybrid";
          modelIds: readonly string[];
        }[];
        llamaSwap: {
          models: readonly {
            modelId: string;
            maxDifficulty?: "easy" | "medium" | "hard" | null;
          }[];
        };
        liteLLM: {
          providers: readonly {
            modelMappings: readonly {
              modelId: string;
              maxDifficulty?: "easy" | "medium" | "hard" | null;
            }[];
          }[];
        };
      },
    ).toMatchObject({
      difficultyClassifier: {
        enabled: true,
        rubricVersion: "v1",
        sourceType: "remote",
        endpointId: null,
        modelId: "openai/gpt-4.1-mini-fast",
        timeoutMs: 1500,
        fallbackDifficulty: "hard",
      },
      modelAliases: [
        {
          aliasId: "gpt-5.4",
          mode: "difficulty",
          modelIds: ["local/mock-llama", "openai/gpt-4.1-mini-fast"],
        },
      ],
      llamaSwap: {
        models: [
          {
            modelId: "local/mock-llama",
            maxDifficulty: "medium",
          },
        ],
      },
      liteLLM: {
        providers: [
          {
            modelMappings: [
              {
                modelId: "openai/gpt-4.1-mini-fast",
                maxDifficulty: "hard",
              },
            ],
          },
        ],
      },
    });

    expect(
      renderUnifiedRuntimeConfigText(
        normalizeUnifiedRuntimeConfigInput({
          version: "1.0",
          difficultyClassifier: {
            enabled: true,
            rubricVersion: "v1",
            sourceType: "remote",
            endpointId: null,
            modelId: "openai/gpt-4.1-mini-fast",
            timeoutMs: 1500,
            fallbackDifficulty: "hard",
          },
          modelAliases: [
            {
              aliasId: "gpt-5.4",
              mode: "difficulty",
              modelIds: ["local/mock-llama", "openai/gpt-4.1-mini-fast"],
            },
          ],
          llamaSwap: {
            models: [
              {
                modelId: "local/mock-llama",
                path: "./models/mock-llama.gguf",
                contextWindow: null,
                command: null,
                proxyBaseUrl: null,
                checkEndpoint: null,
                useModelName: null,
                maxDifficulty: "medium",
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
          liteLLM: {
            providers: [
              {
                providerId: "openai",
                apiKeyRef: "${OPENAI_API_KEY}",
                modelNames: ["openai/gpt-4.1-mini-fast"],
                modelMappings: [
                  {
                    modelId: "openai/gpt-4.1-mini-fast",
                    litellmModel: "openai/gpt-4.1-mini",
                    litellmParams: {
                      model: "openai/gpt-4.1-mini",
                    },
                    maxDifficulty: "hard",
                  },
                ],
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
        }) as unknown as Parameters<typeof renderUnifiedRuntimeConfigText>[0],
      ),
    ).toContain("difficulty_classifier:");
  });

  test("parses and renders controller config for intelligent aliases", () => {
    const result = parseUnifiedRuntimeConfigText(`
version: "1.0"
controller:
  enabled: true
  source_type: remote
  endpoint_id: moonshot.personal.primary.global.kimi-k2.5
  model_id: moonshot/kimi-k2.5
  timeout_ms: 1200
model_aliases:
  gpt-5.4:
    mode: intelligent
    model_ids:
      - local/mock-llama
      - moonshot/kimi-k2.5
`);

    expect(
      result as unknown as {
        controller?: {
          enabled: boolean;
          sourceType: "local" | "remote";
          endpointId: string | null;
          modelId: string | null;
          timeoutMs: number;
        };
        modelAliases?: readonly {
          aliasId: string;
          mode?: "basic" | "difficulty" | "intelligent" | "hybrid";
          modelIds: readonly string[];
        }[];
      },
    ).toMatchObject({
      controller: {
        enabled: true,
        sourceType: "remote",
        endpointId: "moonshot.personal.primary.global.kimi-k2.5",
        modelId: "moonshot/kimi-k2.5",
        timeoutMs: 1200,
      },
      modelAliases: [
        {
          aliasId: "gpt-5.4",
          mode: "intelligent",
          modelIds: ["local/mock-llama", "moonshot/kimi-k2.5"],
        },
      ],
    });

    expect(
      renderUnifiedRuntimeConfigText(
        normalizeUnifiedRuntimeConfigInput({
          version: "1.0",
          controller: {
            enabled: true,
            sourceType: "remote",
            endpointId: "moonshot.personal.primary.global.kimi-k2.5",
            modelId: "moonshot/kimi-k2.5",
            timeoutMs: 1200,
          },
          modelAliases: [
            {
              aliasId: "gpt-5.4",
              mode: "intelligent",
              modelIds: ["local/mock-llama", "moonshot/kimi-k2.5"],
            },
          ],
          llamaSwap: {
            models: [],
            process: {
              command: null,
              args: [],
              env: {},
              cwd: null,
              startupTimeoutMs: null,
            },
          },
          liteLLM: {
            providers: [],
            process: {
              command: null,
              args: [],
              env: {},
              cwd: null,
              startupTimeoutMs: null,
            },
          },
        } as never),
      ),
    ).toContain("controller:");
  });

  test("defaults controller timeout to the longer shared controller latency budget when omitted", () => {
    const result = parseUnifiedRuntimeConfigText(`
version: "1.0"
controller:
  enabled: true
  source_type: remote
  model_id: moonshot/kimi-k2.5
model_aliases:
  gpt-5.4:
    mode: intelligent
    model_ids:
      - moonshot/kimi-k2.5
litellm_proxy:
  providers:
    moonshot:
      api_key: \${MOONSHOT_API_KEY}
      model_list:
        - model_name: moonshot/kimi-k2.5
          litellm_params:
            model: moonshot/kimi-k2.5
`);

    expect(result.controller).toMatchObject({
      enabled: true,
      sourceType: "remote",
      modelId: "moonshot/kimi-k2.5",
      timeoutMs: 15_000,
    });
    expect(DEFAULT_UNIFIED_RUNTIME_CONTROLLER_TIMEOUT_MS).toBe(15_000);
  });

  test("rejects invalid difficulty-classifier and max-difficulty settings", () => {
    expect(() =>
      parseUnifiedRuntimeConfigText(`
version: "1.0"
difficulty_classifier:
  source_type: hybrid
  fallback_difficulty: impossible
model_aliases:
  gpt-5.4:
    mode: difficulty
    model_ids:
      - local/mock-llama
llama_swap:
  models:
    local/mock-llama:
      path: ./models/mock-llama.gguf
      max_difficulty: impossible
`),
    ).toThrow(/difficulty_classifier|max_difficulty|mode/i);
  });

  test("merges partial runtime config patches without dropping existing routing strategy", () => {
    const merged = mergeUnifiedRuntimeConfigDocuments(
      parse(`
version: "1.0"
routing:
  strategy: difficulty
observed_data:
  enabled: true
  throughput_sla:
    enabled: true
    min_tokens_per_sec: 24
`) as Record<string, unknown>,
      {
        model_aliases: {
          "mixed.local-remote": {
            mode: "difficulty",
            model_ids: ["lfm2.5-1.2b-instruct", "moonshot/kimi-k2.6"],
          },
        },
      },
    );

    expect(merged.routingStrategy).toBe("difficulty");
    expect(merged.modelAliases).toEqual([
      {
        aliasId: "difficulty.decision-only",
        mode: "difficulty",
        modelIds: ["lfm2.5-1.2b-instruct", "moonshot/kimi-k2.6"],
      },
    ]);
    expect(merged.observedData?.throughputSla.enabled).toBe(true);
  });

  test("accepts routing_strategy alias in partial runtime config patches", () => {
    const merged = mergeUnifiedRuntimeConfigDocuments(
      {
        version: "1.0",
        model_aliases: {
          "mixed.local-remote": {
            mode: "difficulty",
            model_ids: ["local-model"],
          },
        },
      },
      {
        routing_strategy: "difficulty",
      },
    );

    expect(merged.routingStrategy).toBe("difficulty");
    expect(merged.modelAliases?.[0]?.aliasId).toBe("difficulty.decision-only");
  });

  test("derives the primary routing alias from routing strategy and execution mode", () => {
    const merged = mergeUnifiedRuntimeConfigDocuments(
      {
        version: "1.0",
        routing: {
          strategy: "difficulty",
        },
        execution_mode: "hybrid",
        model_aliases: {
          "mixed.local-remote": {
            mode: "difficulty",
            model_ids: ["lfm2.5-1.2b-instruct", "moonshot/kimi-k2.7-code"],
          },
        },
      },
      {
        routing_strategy: "hybrid",
        execution_mode: "remote_only",
      },
    );

    expect(merged.routingStrategy).toBe("hybrid");
    expect(merged.executionMode).toBe("remote_only");
    expect(merged.modelAliases).toEqual([
      {
        aliasId: "hybrid.remote-only",
        mode: "hybrid",
        modelIds: ["lfm2.5-1.2b-instruct", "moonshot/kimi-k2.7-code"],
      },
    ]);
  });

  test("derives the routing alias matrix across strategy families and execution modes", () => {
    const executionModes = ["decision_only", "hybrid", "local_only", "remote_only"] as const;
    const strategyCases = [
      { strategy: null, expectedPrefix: "default", expectedMode: "basic" },
      { strategy: "baseline", expectedPrefix: "baseline", expectedMode: "basic" },
      { strategy: "latency-first", expectedPrefix: "baseline", expectedMode: "basic" },
      { strategy: "controller", expectedPrefix: "controller", expectedMode: "intelligent" },
      { strategy: "intelligent", expectedPrefix: "controller", expectedMode: "intelligent" },
      { strategy: "difficulty", expectedPrefix: "difficulty", expectedMode: "difficulty" },
      { strategy: "hybrid", expectedPrefix: "hybrid", expectedMode: "hybrid" },
      { strategy: "craft-ask", expectedPrefix: "default", expectedMode: "basic" },
    ] as const;

    for (const executionMode of executionModes) {
      for (const strategyCase of strategyCases) {
        expect(
          deriveUnifiedRuntimeRoutingAliasId({
            routingStrategy: strategyCase.strategy,
            executionMode,
          }),
        ).toBe(`${strategyCase.expectedPrefix}.${executionMode.replaceAll("_", "-")}`);
        expect(deriveUnifiedRuntimeRoutingAliasMode(strategyCase.strategy, null)).toBe(
          strategyCase.expectedMode,
        );
      }
    }
  });

  test("normalizes legacy craft-ask routing strategy inputs out of persisted config", () => {
    const parsed = parseUnifiedRuntimeConfigText(
      [
        'version: "1.0"',
        "routing:",
        '  strategy: "craft-ask"',
        'execution_mode: "remote_only"',
      ].join("\n"),
    );

    expect(parsed.routingStrategy).toBeNull();
    expect(
      deriveUnifiedRuntimeRoutingAliasId({
        routingStrategy: parsed.routingStrategy,
        executionMode: parsed.executionMode,
      }),
    ).toBe("default.remote-only");
  });

  test("normalizes persisted craft-ask alias ids out of multi-alias config payloads", () => {
    const parsed = parseUnifiedRuntimeConfigText(
      [
        'version: "1.0"',
        'execution_mode: "remote_only"',
        "model_aliases:",
        "  craft-ask.remote-only:",
        '    mode: "basic"',
        "    model_ids:",
        '      - "chatgpt/gpt-5.4"',
        "  controller.remote-only:",
        '    mode: "intelligent"',
        "    model_ids:",
        '      - "deepseek/deepseek-v4-flash"',
        "  exact.gpt-5.4:",
        '    mode: "basic"',
        "    model_ids:",
        '      - "chatgpt/gpt-5.4"',
      ].join("\n"),
    );

    expect(parsed.modelAliases).toEqual([
      {
        aliasId: "default.remote-only",
        mode: "basic",
        modelIds: ["chatgpt/gpt-5.4"],
      },
      {
        aliasId: "controller.remote-only",
        mode: "intelligent",
        modelIds: ["deepseek/deepseek-v4-flash"],
      },
      {
        aliasId: "exact.gpt-5.4",
        mode: "basic",
        modelIds: ["chatgpt/gpt-5.4"],
      },
    ]);
  });

  test("canonicalizes the primary routing alias to the default matrix when persisted strategy is unset", () => {
    const merged = mergeUnifiedRuntimeConfigDocuments(
      {
        version: "1.0",
        execution_mode: "local_only",
        model_aliases: {
          "mixed.local-remote": {
            mode: "difficulty",
            model_ids: ["lfm2.5-1.2b-instruct"],
          },
        },
      },
      {
        routing_strategy: null,
      },
    );

    expect(merged.routingStrategy).toBeNull();
    expect(merged.modelAliases).toEqual([
      {
        aliasId: "default.local-only",
        mode: "basic",
        modelIds: ["lfm2.5-1.2b-instruct"],
      },
    ]);
  });

  test("preserves custom single-alias ids when they are not the primary routing alias", () => {
    const merged = mergeUnifiedRuntimeConfigDocuments(
      {
        version: "1.0",
        routing: {
          strategy: "controller",
        },
        execution_mode: "remote_only",
        model_aliases: {
          "gpt-5.4": {
            mode: "intelligent",
            model_ids: ["chatgpt/gpt-5.4"],
          },
        },
      },
      {},
    );

    expect(merged.routingStrategy).toBe("controller");
    expect(merged.executionMode).toBe("remote_only");
    expect(merged.modelAliases).toEqual([
      {
        aliasId: "gpt-5.4",
        mode: "intelligent",
        modelIds: ["chatgpt/gpt-5.4"],
      },
    ]);
  });

  test("preserves explicitly configured modern primary alias ids even when routing strategy differs", () => {
    const merged = mergeUnifiedRuntimeConfigDocuments(
      {
        version: "1.0",
        routing: {
          strategy: "balanced",
        },
        execution_mode: "remote_only",
        model_aliases: {
          "difficulty.remote-only": {
            mode: "difficulty",
            model_ids: ["remote/vision-model", "remote/code-model"],
          },
        },
      },
      {},
    );

    expect(merged.routingStrategy).toBe("balanced");
    expect(merged.executionMode).toBe("remote_only");
    expect(merged.modelAliases).toEqual([
      {
        aliasId: "difficulty.remote-only",
        mode: "difficulty",
        modelIds: ["remote/vision-model", "remote/code-model"],
      },
    ]);
  });
});
