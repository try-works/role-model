import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
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
      await rm(tempRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }),
  );
}, 30_000);

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
          "x-role-model-routing-decision-id": expect.stringMatching(/^decision-req-/),
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
              requestedModel: "baseline.hybrid",
              aliasId: "baseline.hybrid",
              resolvedModelIds: [
                "chatgpt/gpt-5.4",
                "local/llama-3.1-8b-instruct",
                "openai/gpt-4.1-mini-fast",
              ],
              allowEndpoints: [
                "llama-swap.local.local-llama-3-1-8b-instruct",
                "openai.litellm.global.openai-gpt-4-1-mini-fast",
                "openai.personal.openai-codex-subscription.global.gpt-5.4",
              ],
            },
          }),
        }),
      }),
    );
    expect(
      (
        result as typeof result & {
          modeMatrix?: {
            baseline?: {
              vendorId?: string;
              observation?: {
                routingDiagnostics?: {
                  routingMode?: {
                    source?: string;
                    requestedOverride?: string;
                    effectiveMode?: string;
                  };
                  rewrite?: {
                    applied?: boolean;
                    requestedModel?: string;
                  };
                };
              };
            };
            difficulty?: {
              vendorId?: string;
              observation?: {
                routingDiagnostics?: {
                  routingMode?: {
                    source?: string;
                    requestedOverride?: string;
                    effectiveMode?: string;
                  };
                  difficultyRouting?: {
                    difficulty?: string;
                    strategy?: string;
                  };
                };
              };
            };
            controller?: {
              vendorId?: string;
              observation?: {
                routingDiagnostics?: {
                  routingMode?: {
                    source?: string;
                    requestedOverride?: string;
                    effectiveMode?: string;
                  };
                  controllerRouting?: {
                    active?: boolean;
                    acceptedDirectives?: {
                      strategy?: string;
                      preferredEndpointIds?: readonly string[];
                    };
                  };
                };
              };
            };
            hybrid?: {
              vendorId?: string;
              observation?: {
                routingDiagnostics?: {
                  routingMode?: {
                    source?: string;
                    requestedOverride?: string;
                    effectiveMode?: string;
                  };
                  difficultyRouting?: {
                    difficulty?: string;
                    strategy?: string;
                  };
                  controllerRouting?: {
                    active?: boolean;
                    acceptedDirectives?: {
                      strategy?: string;
                      preferredEndpointIds?: readonly string[];
                    };
                  };
                  hybridArbitration?: {
                    active?: boolean;
                    dominantSignal?: string;
                    controllerChangedPlan?: boolean;
                    finalStrategy?: string;
                  };
                  rewrite?: {
                    applied?: boolean;
                    requestedModel?: string;
                  };
                };
              };
            };
          };
        }
      ).modeMatrix,
    ).toMatchObject({
      baseline: {
        vendorId: expect.stringMatching(/^(llama-swap|litellm)$/),
        observation: {
          routingDiagnostics: {
            routingMode: {
              source: "request-override",
              requestedOverride: "baseline",
              effectiveMode: "baseline",
            },
            rewrite: {
              applied: true,
              requestedModel: "baseline.hybrid",
            },
          },
        },
      },
      difficulty: {
        vendorId: expect.stringMatching(/^(llama-swap|litellm)$/),
        observation: {
          routingDiagnostics: {
            routingMode: {
              source: "request-override",
              requestedOverride: "difficulty",
              effectiveMode: "difficulty",
            },
            difficultyRouting: {
              difficulty: "easy",
              strategy: "cost",
            },
          },
        },
      },
      controller: {
        vendorId: expect.stringMatching(/^(llama-swap|litellm)$/),
        observation: {
          routingDiagnostics: {
            routingMode: {
              source: "request-override",
              requestedOverride: "controller",
              effectiveMode: "controller",
            },
            controllerRouting: {
              active: true,
              acceptedDirectives: {
                strategy: "quality",
                preferredEndpointIds: ["openai.litellm.global.openai-gpt-4-1-mini-fast"],
              },
            },
          },
        },
      },
      hybrid: {
        vendorId: expect.stringMatching(/^(llama-swap|litellm)$/),
        observation: {
          routingDiagnostics: {
            routingMode: {
              source: "request-override",
              requestedOverride: "hybrid",
              effectiveMode: "hybrid",
            },
            difficultyRouting: {
              difficulty: "easy",
              strategy: "cost",
            },
            controllerRouting: {
              active: true,
              acceptedDirectives: {
                strategy: "quality",
                preferredEndpointIds: ["openai.litellm.global.openai-gpt-4-1-mini-fast"],
              },
            },
            hybridArbitration: {
              active: true,
              dominantSignal: "controller",
              controllerChangedPlan: true,
              finalStrategy: "quality",
            },
            rewrite: {
              applied: true,
              requestedModel: "baseline.hybrid",
            },
          },
        },
      },
    });
    expect(
      (
        result as typeof result & {
          intelligentHybrid?: {
            vendorId?: string;
            observation?: {
              routingDiagnostics?: {
                aliasResolution?: {
                  requestedModel?: string;
                  aliasId?: string;
                  allowEndpoints?: readonly string[];
                };
                controllerRouting?: {
                  active?: boolean;
                  acceptedDirectives?: {
                    strategy?: string;
                    preferredEndpointIds?: readonly string[];
                  };
                };
              };
            };
          };
          controllerFallback?: {
            vendorId?: string;
            observation?: {
              routingDiagnostics?: {
                controllerRouting?: {
                  active?: boolean;
                  fallbackApplied?: boolean;
                  fallbackReason?: string;
                };
              };
            };
          };
        }
      ).intelligentHybrid,
    ).toMatchObject({
      vendorId: expect.stringMatching(/^(llama-swap|litellm)$/),
      observation: {
        routingDiagnostics: {
          aliasResolution: {
            requestedModel: "controller.hybrid",
            aliasId: "controller.hybrid",
            allowEndpoints: [
              "llama-swap.local.local-llama-3-1-8b-instruct",
              "openai.litellm.global.openai-gpt-4-1-mini-fast",
              "openai.personal.openai-codex-subscription.global.gpt-5.4",
            ],
          },
          controllerRouting: {
            active: true,
            acceptedDirectives: {
              strategy: "quality",
              preferredEndpointIds: ["openai.litellm.global.openai-gpt-4-1-mini-fast"],
            },
          },
        },
      },
    });
    expect(
      (
        result as typeof result & {
          controllerFallback?: {
            vendorId?: string;
            observation?: {
              routingDiagnostics?: {
                aliasResolution?: {
                  requestedModel?: string;
                  aliasId?: string;
                };
                controllerRouting?: {
                  active?: boolean;
                  fallbackApplied?: boolean;
                  fallbackReason?: string;
                };
              };
            };
          };
        }
      ).controllerFallback,
    ).toMatchObject({
      vendorId: expect.stringMatching(/^(llama-swap|litellm)$/),
      observation: {
        routingDiagnostics: {
          aliasResolution: {
            requestedModel: "controller.hybrid",
            aliasId: "controller.hybrid",
          },
          controllerRouting: {
            active: true,
            fallbackApplied: true,
            fallbackReason: "controller-heuristic-fallback",
          },
        },
      },
    });
    expect(
      (
        result as typeof result & {
          difficultyHybrid?: {
            easyVendorId?: string;
            hardVendorId?: string;
            repeatObservation?: {
              routingDiagnostics?: {
                difficultyRouting?: {
                  difficulty?: string;
                  strategy?: string;
                  cacheHit?: boolean;
                };
              };
            };
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
        }
      ).difficultyHybrid,
    ).toMatchObject({
      easyVendorId: expect.stringMatching(/^(llama-swap|litellm)$/),
      hardVendorId: expect.stringMatching(/^(litellm|chatgpt-codex-responses)$/),
      easyObservation: {
        routingDiagnostics: {
          aliasResolution: {
            requestedModel: "difficulty.hybrid",
            aliasId: "difficulty.hybrid",
            allowEndpoints: [
              "llama-swap.local.local-llama-3-1-8b-instruct",
              "openai.litellm.global.openai-gpt-4-1-mini-fast",
              "openai.personal.openai-codex-subscription.global.gpt-5.4",
            ],
          },
          difficultyRouting: {
            difficulty: "easy",
            strategy: "cost",
          },
        },
      },
      hardObservation: {
        routingDiagnostics: {
          aliasResolution: {
            requestedModel: "difficulty.hybrid",
            aliasId: "difficulty.hybrid",
            allowEndpoints: [
              "llama-swap.local.local-llama-3-1-8b-instruct",
              "openai.litellm.global.openai-gpt-4-1-mini-fast",
              "openai.personal.openai-codex-subscription.global.gpt-5.4",
            ],
          },
          difficultyRouting: {
            difficulty: "hard",
            strategy: "quality",
            excludedEndpointIds: ["llama-swap.local.local-llama-3-1-8b-instruct"],
          },
        },
      },
      repeatObservation: {
        routingDiagnostics: {
          difficultyRouting: {
            difficulty: "hard",
            strategy: "quality",
            cacheHit: true,
          },
        },
      },
    });
    expect(result.vendorHarness).toEqual({
      local: "managed-node-mock",
      remote: "managed-node-mock",
      realVendorCoverage: false,
    });
    expect(result.telemetry.summary).toEqual(
      expect.objectContaining({
        requestCount: 11,
        sourceBreakdown: expect.objectContaining({
          local: expect.objectContaining({ requestCount: expect.any(Number) }),
          remote: expect.objectContaining({ requestCount: expect.any(Number) }),
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
          sourceType: expect.stringMatching(/^(local|remote)$/),
        }),
        expect.objectContaining({
          requestId: "req-runtime-vendor-hybrid-remote",
          sourceType: expect.stringMatching(/^(local|remote)$/),
        }),
        expect.objectContaining({
          requestId: "req-runtime-vendor-hybrid-alias",
          sourceType: expect.stringMatching(/^(local|remote)$/),
        }),
        expect.objectContaining({
          requestId: "req-runtime-vendor-hybrid-difficulty-easy",
          sourceType: expect.stringMatching(/^(local|remote)$/),
        }),
        expect.objectContaining({
          requestId: "req-runtime-vendor-hybrid-difficulty-hard",
          sourceType: expect.stringMatching(/^(local|remote)$/),
        }),
        expect.objectContaining({
          requestId: "req-runtime-vendor-hybrid-intelligent",
          sourceType: expect.stringMatching(/^(local|remote)$/),
        }),
        expect.objectContaining({
          requestId: "req-runtime-vendor-hybrid-controller-fallback",
          sourceType: expect.stringMatching(/^(local|remote)$/),
        }),
        expect.objectContaining({
          requestId: "req-runtime-vendor-mode-baseline",
          sourceType: expect.stringMatching(/^(local|remote)$/),
        }),
        expect.objectContaining({
          requestId: "req-runtime-vendor-mode-difficulty",
          sourceType: expect.stringMatching(/^(local|remote)$/),
        }),
        expect.objectContaining({
          requestId: "req-runtime-vendor-mode-controller",
          sourceType: expect.stringMatching(/^(local|remote)$/),
        }),
        expect.objectContaining({
          requestId: "req-runtime-vendor-mode-hybrid",
          sourceType: expect.stringMatching(/^(local|remote)$/),
        }),
      ]),
    );
    expect(result.health).toMatchObject({
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
      sessionBootstrap: expect.objectContaining({
        status: "ready",
        stages: expect.arrayContaining([
          expect.objectContaining({
            stageId: "inventory",
            status: "ready",
            details: expect.objectContaining({
              driftWarningCount: 0,
              driftWarnings: [],
            }),
          }),
        ]),
      }),
    });
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
    const corpusResult = result as typeof result & {
      corpus?: {
        summary?: {
          deterministic?: boolean;
          totalCaseCount?: number;
          successCaseCount?: number;
          failureCaseCount?: number;
          clientCaseCounts?: {
            pi?: number;
            craft?: number;
          };
          categoryCounts?: Record<string, number>;
        };
        cases?: Array<{
          caseId: string;
          clientKind: "pi" | "craft";
          category: string;
          requestPath: "/v1/responses" | "/v1/chat/completions";
          deterministic: boolean;
          routingConstraint: string;
          allowedEndpointIds: readonly string[];
          expectedExecutionFamily: string | null;
          expectedExecutionFamilies?: readonly string[];
          actualExecutionFamily: string | null;
          expectedOutcomeClass: "success" | "failure";
          actualOutcomeClass: "success" | "failure";
          selectedEndpointId: string | null;
          selectedModelId: string | null;
          providerFamily: string | null;
          adapterFamily: string | null;
          statusCode: number;
          streamTerminalStatus: string | null;
          failureClass: string | null;
          retryCount: number;
          rerouteCount: number;
          payloadBytes: {
            ingress: number;
            translated: number | null;
            providerCanonical: number | null;
            providerWire: number | null;
            providerResponse: number | null;
          };
          toolCallCount: number;
          toolExecutionCount: number;
          idempotencyDecision: string | null;
          requestId: string;
          routingDecisionId: string | null;
        }>;
      };
    };
    expect(corpusResult.corpus?.summary).toMatchObject({
      deterministic: true,
      totalCaseCount: 200,
      clientCaseCounts: {
        pi: 100,
        craft: 100,
      },
      categoryCounts: expect.objectContaining({
        "plain-text": expect.any(Number),
        "tool-bearing": expect.any(Number),
        "non-tool-mentions-tools": expect.any(Number),
        "continuation-after-tool-output": expect.any(Number),
        "long-context": expect.any(Number),
        "image-sensitive": expect.any(Number),
      }),
    });
    const corpusCases = corpusResult.corpus?.cases ?? [];
    expect(corpusCases).toHaveLength(200);
    for (const corpusCase of corpusCases) {
      expect(corpusCase.deterministic).toBe(true);
      expect(corpusCase.routingConstraint.length).toBeGreaterThan(0);
      expect(corpusCase.requestId.length).toBeGreaterThan(0);
      expect(corpusCase.statusCode).toBeGreaterThanOrEqual(200);
      expect(corpusCase.payloadBytes.ingress).toBeGreaterThan(0);
      expect(corpusCase.retryCount).toBeGreaterThanOrEqual(0);
      expect(corpusCase.rerouteCount).toBeGreaterThanOrEqual(0);
      expect(corpusCase.toolCallCount).toBeGreaterThanOrEqual(0);
      expect(corpusCase.toolExecutionCount).toBeGreaterThanOrEqual(0);
      if (corpusCase.actualOutcomeClass === "success") {
        expect(corpusCase.actualExecutionFamily).toMatch(
          /^(vendor-llama-swap|vendor-litellm|remote-service)$/,
        );
        expect(corpusCase.selectedEndpointId).toBeTruthy();
        expect(corpusCase.providerFamily).toBeTruthy();
        expect(corpusCase.adapterFamily).toBeTruthy();
        expect(corpusCase.payloadBytes.translated).toBeGreaterThan(0);
        expect(corpusCase.payloadBytes.providerCanonical).toBeGreaterThan(0);
        expect(corpusCase.payloadBytes.providerWire).toBeGreaterThan(0);
        expect(corpusCase.payloadBytes.providerResponse).toBeGreaterThan(0);
        expect(corpusCase.routingDecisionId).toBeTruthy();
      }
    }
    const corpusCasesById = new Map(
      corpusCases.map((corpusCase) => [corpusCase.caseId, corpusCase]),
    );
    expect(corpusCasesById.get("pi.responses.exact-local.plain-001")).toMatchObject({
      clientKind: "pi",
      category: "plain-text",
      requestPath: "/v1/responses",
      expectedExecutionFamily: "vendor-llama-swap",
      actualExecutionFamily: "vendor-llama-swap",
      expectedOutcomeClass: "success",
      actualOutcomeClass: "success",
      selectedEndpointId: "llama-swap.local.local-llama-3-1-8b-instruct",
      providerFamily: "llama-swap",
      adapterFamily: "ai-sdk-openai-compatible",
      idempotencyDecision: "not_needed",
    });
    expect(corpusCasesById.get("pi.responses.alias-hard-tools-001")).toMatchObject({
      clientKind: "pi",
      category: "tool-bearing",
      requestPath: "/v1/responses",
      expectedExecutionFamilies: ["vendor-litellm", "remote-service"],
      expectedOutcomeClass: "success",
      actualOutcomeClass: "success",
      providerFamily: "openai",
    });
    const piHardToolsCase = corpusCasesById.get("pi.responses.alias-hard-tools-001");
    expect(piHardToolsCase?.actualExecutionFamily).toMatch(/^(vendor-litellm|remote-service)$/);
    if (piHardToolsCase?.actualExecutionFamily === "vendor-litellm") {
      expect(piHardToolsCase).toMatchObject({
        selectedEndpointId: "openai.litellm.global.openai-gpt-4-1-mini-fast",
        adapterFamily: "litellm-proxy",
        vendorId: "litellm",
      });
    } else {
      expect(piHardToolsCase).toMatchObject({
        selectedEndpointId: "openai.personal.openai-codex-subscription.global.gpt-5.4",
        adapterFamily: "codex-subscription-responses",
        vendorId: "chatgpt-codex-responses",
      });
    }
    expect(corpusCasesById.get("pi.responses.image-sensitive.001")).toMatchObject({
      clientKind: "pi",
      category: "image-sensitive",
      requestPath: "/v1/responses",
      expectedExecutionFamily: "remote-service",
      actualExecutionFamily: "remote-service",
      expectedOutcomeClass: "success",
      actualOutcomeClass: "success",
      selectedEndpointId: "openai.personal.openai-codex-subscription.global.gpt-5.4",
      providerFamily: "openai",
      adapterFamily: "codex-subscription-responses",
      vendorId: "chatgpt-codex-responses",
    });
    expect(corpusCasesById.get("pi.responses.controller-remote-001")).toMatchObject({
      clientKind: "pi",
      category: "plain-text",
      requestPath: "/v1/responses",
      expectedExecutionFamilies: ["vendor-llama-swap", "vendor-litellm"],
      expectedOutcomeClass: "success",
      actualOutcomeClass: "success",
    });
    expect(
      corpusCasesById.get("pi.responses.controller-remote-001")?.actualExecutionFamily,
    ).toMatch(/^(vendor-llama-swap|vendor-litellm)$/);
    expect(corpusCasesById.get("craft.chat.dual-user-preamble.001")).toMatchObject({
      clientKind: "craft",
      category: "plain-text",
      requestPath: "/v1/chat/completions",
      expectedExecutionFamily: "vendor-llama-swap",
      actualExecutionFamily: "vendor-llama-swap",
      expectedOutcomeClass: "success",
      actualOutcomeClass: "success",
      selectedEndpointId: "llama-swap.local.local-llama-3-1-8b-instruct",
    });
    expect(corpusCasesById.get("craft.chat.declared-tools.001")).toMatchObject({
      clientKind: "craft",
      category: "tool-bearing",
      requestPath: "/v1/chat/completions",
      expectedExecutionFamily: "vendor-litellm",
      actualExecutionFamily: "vendor-litellm",
      expectedOutcomeClass: "success",
      actualOutcomeClass: "success",
      selectedEndpointId: "openai.litellm.global.openai-gpt-4-1-mini-fast",
      providerFamily: "openai",
      adapterFamily: "litellm-proxy",
      vendorId: "litellm",
    });
    const piToolBearingCase = corpusCasesById.get("pi.responses.alias-hard-tools-001");
    expect(piToolBearingCase).toBeDefined();
    if (!piToolBearingCase) {
      throw new Error("expected deterministic Pi tool-bearing corpus case to exist");
    }
    expect(piToolBearingCase.payloadBytes.translated).not.toBe(
      piToolBearingCase.payloadBytes.ingress,
    );
    expect(piToolBearingCase.payloadBytes.providerCanonical).toBe(
      piToolBearingCase.payloadBytes.providerWire,
    );
    if (piToolBearingCase.actualExecutionFamily === "vendor-litellm") {
      expect(piToolBearingCase.payloadBytes.translated).not.toBe(
        piToolBearingCase.payloadBytes.providerCanonical,
      );
    } else {
      expect(piToolBearingCase.actualExecutionFamily).toBe("remote-service");
      expect(piToolBearingCase.payloadBytes.translated).toBe(
        piToolBearingCase.payloadBytes.providerCanonical,
      );
    }
    expect(corpusCasesById.get("craft.chat.inline-image.001")).toMatchObject({
      clientKind: "craft",
      category: "image-sensitive",
      requestPath: "/v1/chat/completions",
      expectedExecutionFamily: "remote-service",
      actualExecutionFamily: "remote-service",
      expectedOutcomeClass: "success",
      actualOutcomeClass: "success",
      selectedEndpointId: "openai.personal.openai-codex-subscription.global.gpt-5.4",
      providerFamily: "openai",
      adapterFamily: "codex-subscription-responses",
      vendorId: "chatgpt-codex-responses",
    });
  }, 300_000);

  test("plans a real-vendor harness with repo-owned mock upstreams", async () => {
    const runtimeStateRoot = await mkdtemp(
      path.join(os.tmpdir(), "role-model-runtime-vendor-plan-"),
    );
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
