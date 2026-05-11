import os from "node:os";
import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, test } from "vitest";

import {
  createRuntimeVendorValidationPlan,
  runRuntimeVendorValidation,
} from "../src/validate-vendors.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");

const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map(async (tempRoot) => {
      await rm(tempRoot, { recursive: true, force: true });
    }),
  );
});

describe("runRuntimeVendorValidation", () => {
  test("executes decision-only, local-only, remote-only, and hybrid vendor modes end to end", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-vendors-"));
    tempRoots.push(runtimeStateRoot);

    const result = await runRuntimeVendorValidation({
      repoRoot,
      runtimeStateRoot,
      scopeId: "runtime-vendor-validation",
      harnessMode: "mock",
    });

    expect(result.decisionOnly).toEqual(
      expect.objectContaining({
        statusCode: 503,
        errorClass: "VENDOR_NOT_CONFIGURED",
      }),
    );
    expect(result.localOnly).toEqual(
      expect.objectContaining({
        executionMode: "local_only",
        vendorId: "llama-swap",
        outputText: "local llama summary",
      }),
    );
    expect(result.remoteOnly).toEqual(
      expect.objectContaining({
        executionMode: "remote_only",
        vendorId: "litellm",
        outputText: "remote litellm summary",
        costUsd: 0.0042,
        responseHeaders: expect.objectContaining({
          "x-role-model-endpoint-id": "openai.litellm.global.openai-gpt-4-1-mini-fast",
          "x-role-model-adapter-family": "litellm-proxy",
          "x-role-model-routing-decision-id": "decision-req-runtime-vendor-remote",
          "x-role-model-cost-usd": "0.0042",
        }),
      }),
    );
    expect(result.streaming).toEqual({
      local: expect.objectContaining({
        vendorId: "llama-swap",
        outputText: "local llama summary",
        chunkCount: 3,
      }),
      remote: expect.objectContaining({
        vendorId: "litellm",
        outputText: "remote litellm summary",
        chunkCount: 3,
      }),
    });
    expect(result.hybrid).toEqual(
      expect.objectContaining({
        executionMode: "hybrid",
        localVendorId: "llama-swap",
        remoteVendorId: "litellm",
      }),
    );
    expect(result.aliasHybrid).toEqual(
      expect.objectContaining({
        vendorId: expect.stringMatching(/^(llama-swap|litellm)$/),
        observation: expect.objectContaining({
          routingDiagnostics: expect.objectContaining({
            aliasResolution: {
              requestedModel: "gpt-5.4",
              aliasId: "gpt-5.4",
              resolvedModelIds: ["local/llama-3.1-8b-instruct", "openai/gpt-4.1-mini-fast"],
              allowEndpoints: [
                "llama-swap.local.local-llama-3-1-8b-instruct",
                "openai.litellm.global.openai-gpt-4-1-mini-fast",
              ],
            },
          }),
        }),
      }),
    );
    expect(
      result as typeof result & {
        difficultyHybrid?: {
          easyVendorId?: string;
          hardVendorId?: string;
          easyObservation?: {
            routingDiagnostics?: {
              difficultyRouting?: {
                difficulty?: string;
                strategy?: string;
              };
            };
          };
          hardObservation?: {
            routingDiagnostics?: {
              difficultyRouting?: {
                difficulty?: string;
                strategy?: string;
                excludedEndpointIds?: readonly string[];
              };
            };
          };
        };
      },
    ).toEqual(
      expect.objectContaining({
        difficultyHybrid: expect.objectContaining({
          easyVendorId: expect.stringMatching(/^(llama-swap|litellm)$/),
          hardVendorId: "litellm",
          easyObservation: expect.objectContaining({
            routingDiagnostics: expect.objectContaining({
              aliasResolution: expect.objectContaining({
                requestedModel: "gpt-5.4-difficulty",
                aliasId: "gpt-5.4-difficulty",
                allowEndpoints: [
                  "llama-swap.local.local-llama-3-1-8b-instruct",
                  "openai.litellm.global.openai-gpt-4-1-mini-fast",
                ],
              }),
              difficultyRouting: expect.objectContaining({
                difficulty: "easy",
                strategy: "cost",
              }),
            }),
          }),
          hardObservation: expect.objectContaining({
            routingDiagnostics: expect.objectContaining({
              aliasResolution: expect.objectContaining({
                requestedModel: "gpt-5.4-difficulty",
                aliasId: "gpt-5.4-difficulty",
                allowEndpoints: [
                  "llama-swap.local.local-llama-3-1-8b-instruct",
                  "openai.litellm.global.openai-gpt-4-1-mini-fast",
                ],
              }),
              difficultyRouting: expect.objectContaining({
                difficulty: "hard",
                strategy: "quality",
                excludedEndpointIds: ["llama-swap.local.local-llama-3-1-8b-instruct"],
              }),
            }),
          }),
        }),
      }),
    );
    expect(result.vendorHarness).toEqual({
      local: "managed-node-mock",
      remote: "managed-node-mock",
      realVendorCoverage: false,
    });
    expect(result.telemetry.summary).toEqual(
      expect.objectContaining({
        requestCount: 5,
        sourceBreakdown: expect.objectContaining({
          local: expect.objectContaining({ requestCount: 1 }),
          remote: expect.objectContaining({ requestCount: 4 }),
        }),
      }),
    );
    expect(result.telemetry.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceType: "local",
          endpointId: "llama-swap.local.local-llama-3-1-8b-instruct",
        }),
        expect.objectContaining({
          sourceType: "remote",
          endpointId: "openai.litellm.global.openai-gpt-4-1-mini-fast",
        }),
      ]),
    );
    expect(result.telemetry.requests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requestId: "req-runtime-vendor-hybrid-local",
          sourceType: "local",
        }),
        expect.objectContaining({
          requestId: "req-runtime-vendor-hybrid-remote",
          sourceType: "remote",
        }),
        expect.objectContaining({
          requestId: "req-runtime-vendor-hybrid-alias",
          sourceType: "remote",
        }),
        expect.objectContaining({
          requestId: "req-runtime-vendor-hybrid-difficulty-easy",
          sourceType: "remote",
        }),
        expect.objectContaining({
          requestId: "req-runtime-vendor-hybrid-difficulty-hard",
          sourceType: "remote",
        }),
      ]),
    );
    expect(result.health).toEqual(
      expect.objectContaining({
        status: "healthy",
        executionMode: "hybrid",
        inactiveVendors: [],
        vendors: expect.objectContaining({
          "llama-swap": expect.objectContaining({
            healthStatus: "healthy",
          }),
          litellm: expect.objectContaining({
            healthStatus: "healthy",
          }),
        }),
      }),
    );
    const feedbackResult = result as typeof result & {
      observations?: {
        local?: {
          routingDiagnostics?: {
            observedProfile?: {
              source?: string;
              readMode?: string;
            };
            effectiveMetrics?: {
              latency?: {
                value?: number;
                freshnessWeight?: number;
              };
              throughput?: {
                value?: number;
                freshnessWeight?: number;
              };
            };
            throughputPenalty?: {
              endpointId?: string;
              active?: boolean;
            };
          };
        };
        remote?: {
          routingDiagnostics?: {
            observedProfile?: {
              source?: string;
              readMode?: string;
            };
            effectiveMetrics?: {
              latency?: {
                value?: number;
                freshnessWeight?: number;
              };
              throughput?: {
                value?: number;
                freshnessWeight?: number;
              };
            };
            throughputPenalty?: {
              endpointId?: string;
              active?: boolean;
            };
          };
        };
      };
      observedProfiles?: {
        local?: {
          latestProfile?: {
            endpoint_id?: string;
          };
        };
        remote?: {
          latestProfile?: {
            endpoint_id?: string;
          };
        };
      };
    };
    expect(feedbackResult.observations?.local).toEqual(
      expect.objectContaining({
        routingDiagnostics: expect.objectContaining({
          observedProfile: expect.objectContaining({
            source: "runtime-state",
            readMode: "per-request",
          }),
          effectiveMetrics: expect.objectContaining({
            latency: expect.objectContaining({
              value: expect.any(Number),
              freshnessWeight: expect.any(Number),
            }),
            throughput: expect.objectContaining({
              value: expect.any(Number),
              freshnessWeight: expect.any(Number),
            }),
          }),
          throughputPenalty: expect.objectContaining({
            endpointId: "llama-swap.local.local-llama-3-1-8b-instruct",
            active: false,
          }),
        }),
      }),
    );
    expect(feedbackResult.observations?.remote).toEqual(
      expect.objectContaining({
        routingDiagnostics: expect.objectContaining({
          observedProfile: expect.objectContaining({
            source: "runtime-state",
            readMode: "per-request",
          }),
          effectiveMetrics: expect.objectContaining({
            latency: expect.objectContaining({
              value: expect.any(Number),
              freshnessWeight: expect.any(Number),
            }),
            throughput: expect.objectContaining({
              value: expect.any(Number),
              freshnessWeight: expect.any(Number),
            }),
          }),
          throughputPenalty: expect.objectContaining({
            endpointId: "openai.litellm.global.openai-gpt-4-1-mini-fast",
            active: false,
          }),
        }),
      }),
    );
    expect(feedbackResult.observedProfiles?.local).toEqual(
      expect.objectContaining({
        latestProfile: expect.objectContaining({
          endpoint_id: "llama-swap.local.local-llama-3-1-8b-instruct",
        }),
      }),
    );
    expect(feedbackResult.observedProfiles?.remote).toEqual(
      expect.objectContaining({
        latestProfile: expect.objectContaining({
          endpoint_id: "openai.litellm.global.openai-gpt-4-1-mini-fast",
        }),
      }),
    );
  }, 15_000);

  test("plans a real-vendor harness with repo-owned mock upstreams", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-vendor-plan-"));
    tempRoots.push(runtimeStateRoot);

    const plan = await createRuntimeVendorValidationPlan({
      runtimeStateRoot,
      scopeId: "runtime-vendor-validation-plan",
      harnessMode: "real",
    });

    expect(plan.vendorHarness).toEqual({
      local: "real-llama-swap-mock-upstream",
      remote: "real-litellm-mock-upstream",
      realVendorCoverage: true,
    });
    expect(plan.localConfig.llama_swap.command).toBeUndefined();
    expect(plan.localConfig.llama_swap.args).toBeUndefined();
    expect(plan.localConfig.llama_swap.models[plan.localModelId]).toEqual(
      expect.objectContaining({
        command: expect.stringContaining("local-llama-upstream.cjs"),
        check_endpoint: "/health",
        use_model_name: "mock/llama-upstream",
      }),
    );
    expect(plan.remoteConfig.litellm_proxy.command).toBeUndefined();
    expect(plan.remoteConfig.litellm_proxy.args).toBeUndefined();
    expect(plan.remoteUpstream).toEqual(
      expect.objectContaining({
        scriptPath: expect.stringContaining("remote-openai-upstream.cjs"),
        apiBaseUrl: expect.stringMatching(/^http:\/\/127\.0\.0\.1:\d+\/v1$/),
        healthUrl: expect.stringMatching(/^http:\/\/127\.0\.0\.1:\d+\/health\/liveliness$/),
      }),
    );
    expect(
      plan.remoteConfig.litellm_proxy.providers.openai.model_list[0].litellm_params.api_base,
    ).toBe(plan.remoteUpstream?.apiBaseUrl);
  });
});
