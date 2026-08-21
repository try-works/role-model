import { describe, expect, test, vi } from "vitest";

import type { RouterCandidate, RuntimeAccount } from "../lib/runtime-api";
import * as controlModelsModule from "./control-models";
import {
  buildConfiguredModelInventoryPills,
  buildModelRoleAssignmentForSelection,
  buildSelectedModelEvidencePills,
  buildSelectedModelPreviewPayload,
  configuredModelRoleDraftKey,
  createAccountMutationPayload,
  describeSavedModelRoleEligibility,
  readSelectedOperationalPerformance,
  resolveConfiguredModelEjectLabel,
  resolveConfiguredModelFooterAction,
  resolveConfiguredModelRemovalClick,
  resolveConfiguredModelStatusTone,
  resolveDefaultSelectedModelId,
  resolveSelectedBenchmarkCandidate,
  resolveSelectedModelAccount,
  saveConfiguredModelRoleEligibility,
} from "./control-models";

test("selects benchmark evidence by exact endpoint instead of the highest same-model sibling", () => {
  const candidates = [
    {
      endpointId: "deepseek.flash-high",
      modelId: "deepseek/deepseek-v4-flash",
      providerId: "deepseek",
      sourceType: "remote",
      benchmarkCapability: {
        overallScore: 0.71,
        benchmarkSamples: 2,
        sampleCount: 2,
        measuredAtMs: 10,
        freshnessScore: 1,
        lastRunId: "run-high",
        lastRunCompletedAtMs: 10,
        judgeEndpointId: "judge",
      },
      latestProfile: { latency_ms_p50: 410 },
    },
    {
      endpointId: "deepseek.flash-max",
      modelId: "deepseek/deepseek-v4-flash",
      providerId: "deepseek",
      sourceType: "remote",
      benchmarkCapability: {
        overallScore: 0.94,
        benchmarkSamples: 2,
        sampleCount: 2,
        measuredAtMs: 20,
        freshnessScore: 1,
        lastRunId: "run-max",
        lastRunCompletedAtMs: 20,
        judgeEndpointId: "judge",
      },
      latestProfile: { latency_ms_p50: 920 },
    },
  ] satisfies RouterCandidate[];

  expect(
    resolveSelectedBenchmarkCandidate(candidates, {
      modelId: "deepseek/deepseek-v4-flash",
      endpointId: "deepseek.flash-high",
    }),
  ).toMatchObject({
    endpointId: "deepseek.flash-high",
    benchmarkCapability: { overallScore: 0.71 },
    latestProfile: { latency_ms_p50: 410 },
  });
});

test("reads the canonical operational sample_size for one exact endpoint variant", () => {
  expect(
    readSelectedOperationalPerformance({
      endpointId: "deepseek.flash-high",
      modelId: "deepseek/deepseek-v4-flash",
      providerId: "deepseek",
      sourceType: "remote",
      operationalProfile: {
        latency_ms_p50: 2_693.5,
        latency_ms_p95: 3_604.6,
        failure_rate: 0,
        sample_size: 8,
      },
    }),
  ).toEqual({
    p50: 2_693.5,
    p95: 3_604.6,
    failureRate: 0,
    sampleCount: 8,
  });
});

const account = {
  providerAccountId: "openai.personal.primary",
  providerId: "openai",
  providerKind: "provider-openai",
  orgScope: "personal",
  accountScope: "workspace-default",
  credentialRef: { backend: "env", ref: "OPENAI_API_KEY" },
  authMode: "api-key-static",
  regionPolicy: { mode: "prefer", regions: ["global"] },
  baseUrlOverride: null,
  allowedModels: ["openai/gpt-4.1-mini-fast"],
  deniedModels: [],
  entitlementTags: [],
  budgetPolicyRef: "budget.default",
  quotaPolicyRef: "quota.default",
  status: "active",
  healthStatus: "healthy",
  rotationState: "stable",
} satisfies RuntimeAccount;

describe("control model role assignment helpers", () => {
  test("keeps transient role drafts separate for effort endpoint siblings", () => {
    expect(configuredModelRoleDraftKey("deepseek.personal", "endpoint-high")).not.toBe(
      configuredModelRoleDraftKey("deepseek.personal", "endpoint-max"),
    );
  });
  test("keeps the role list in document flow without an artificial viewport cap", () => {
    expect(controlModelsModule.configuredModelRoleSectionClassName).toBe("flex flex-col gap-3");
    expect(controlModelsModule.configuredModelRoleListClassName).toBe("space-y-2 pr-1");
    expect(controlModelsModule.configuredModelRoleSectionClassName).not.toContain("max-h");
    expect(controlModelsModule.configuredModelRoleListClassName).not.toContain("overflow-auto");
  });

  test("serializes checked all roles as an explicit all assignment", () => {
    expect(
      buildModelRoleAssignmentForSelection(["coder", "security"], ["coder", "security"]),
    ).toEqual({
      roleAssignmentMode: "all",
      enabledRoleIds: [],
      disabledRoleIds: [],
    });

    expect(
      createAccountMutationPayload(
        account,
        "openai/gpt-4.1-mini-fast",
        ["coder", "security"],
        ["coder", "security"],
      ),
    ).toMatchObject({
      modelRoleBindings: [
        {
          modelId: "openai/gpt-4.1-mini-fast",
          roleIds: [],
          roleAssignmentMode: "all",
          enabledRoleIds: [],
          disabledRoleIds: [],
        },
      ],
    });
  });

  test("serializes removed roles as an explicit exclude assignment", () => {
    expect(buildModelRoleAssignmentForSelection(["coder"], ["coder", "security"])).toEqual({
      roleAssignmentMode: "exclude",
      enabledRoleIds: [],
      disabledRoleIds: ["security"],
    });
  });

  test("persists role eligibility for one endpoint instance without replacing its effort siblings", () => {
    const endpointAccount = {
      ...account,
      allowedModels: ["deepseek/deepseek-v4-flash"],
      modelRoleBindings: [
        {
          modelId: "deepseek/deepseek-v4-flash",
          endpointId: "deepseek.personal.global.deepseek-v4-flash-high",
          roleIds: [],
          roleAssignmentMode: "include" as const,
          enabledRoleIds: ["coder"],
          disabledRoleIds: [],
        },
      ],
    } satisfies RuntimeAccount;

    expect(
      createAccountMutationPayload(
        endpointAccount,
        "deepseek/deepseek-v4-flash",
        ["analyst"],
        ["analyst", "coder"],
        "deepseek.personal.global.deepseek-v4-flash-max",
      ),
    ).toMatchObject({
      modelRoleBindings: [
        {
          endpointId: "deepseek.personal.global.deepseek-v4-flash-high",
          enabledRoleIds: ["coder"],
        },
        {
          modelId: "deepseek/deepseek-v4-flash",
          endpointId: "deepseek.personal.global.deepseek-v4-flash-max",
          roleAssignmentMode: "exclude",
          disabledRoleIds: ["coder"],
        },
      ],
    });
  });

  test("serializes unchecked all roles as explicit empty include instead of default all", () => {
    expect(buildModelRoleAssignmentForSelection([], ["coder", "security"])).toEqual({
      roleAssignmentMode: "include",
      enabledRoleIds: [],
      disabledRoleIds: [],
    });
  });

  test("uses explicit eject labels for peer-backed and remote-backed configured models", () => {
    expect(resolveConfiguredModelEjectLabel(true)).toBe("Eject from router");
    expect(resolveConfiguredModelEjectLabel(false)).toBe("Eject from pool");
  });

  test("enables the footer action for remote and peer-backed configured models", () => {
    expect(
      resolveConfiguredModelFooterAction({
        hasSelectedCard: true,
        isController: false,
        hasLlamaSwapEndpoint: false,
        hasPrimaryAccount: true,
        hasLocalPeerEndpoint: false,
        isRemoving: false,
      }),
    ).toEqual({
      kind: "eject-configured",
      label: "Eject from pool",
      disabled: false,
      isController: false,
    });

    expect(
      resolveConfiguredModelFooterAction({
        hasSelectedCard: true,
        isController: false,
        hasLlamaSwapEndpoint: false,
        hasPrimaryAccount: true,
        hasLocalPeerEndpoint: true,
        isRemoving: false,
      }),
    ).toEqual({
      kind: "eject-configured",
      label: "Eject from router",
      disabled: false,
      isController: false,
    });
  });

  test("keeps controller removal disabled and uses unload only for llama-swap models", () => {
    expect(
      resolveConfiguredModelFooterAction({
        hasSelectedCard: true,
        isController: true,
        hasLlamaSwapEndpoint: false,
        hasPrimaryAccount: true,
        hasLocalPeerEndpoint: false,
        isRemoving: false,
      }),
    ).toEqual({
      kind: "eject-controller",
      label: "Eject controller",
      disabled: false,
      isController: true,
    });

    expect(
      resolveConfiguredModelFooterAction({
        hasSelectedCard: true,
        isController: false,
        hasLlamaSwapEndpoint: true,
        hasPrimaryAccount: true,
        hasLocalPeerEndpoint: false,
        isRemoving: false,
      }),
    ).toEqual({ kind: "unload-local", label: "Unload", disabled: false, isController: false });
  });

  test("enables a destructive-confirmation eject action for the sole controller", () => {
    // The sole controller-backed endpoint must be ejectable (not hard-disabled), with
    // the confirmation flow gating the destructive second click.
    const action = resolveConfiguredModelFooterAction({
      hasSelectedCard: true,
      isController: true,
      hasLlamaSwapEndpoint: false,
      hasPrimaryAccount: true,
      hasLocalPeerEndpoint: false,
      isRemoving: false,
    });
    expect(action.kind).toBe("eject-controller");
    expect(action.disabled).toBe(false);
    expect(action.isController).toBe(true);

    expect(
      resolveConfiguredModelRemovalClick({
        actionKind: action.kind,
        targetKey: "endpoint:controller",
        pendingConfirmationKey: null,
      }),
    ).toBe("request-confirmation");
    expect(
      resolveConfiguredModelRemovalClick({
        actionKind: action.kind,
        targetKey: "endpoint:controller",
        pendingConfirmationKey: "endpoint:controller",
      }),
    ).toBe("execute");
  });

  test("never bypasses final-controller eject confirmation through a local unload action", () => {
    expect(
      resolveConfiguredModelFooterAction({
        hasSelectedCard: true,
        isController: true,
        hasLlamaSwapEndpoint: true,
        hasPrimaryAccount: true,
        hasLocalPeerEndpoint: false,
        isRemoving: false,
      }),
    ).toMatchObject({ kind: "eject-controller", label: "Eject controller", disabled: false });
  });

  test("edits the account that owns the selected effort endpoint instead of the first model match", () => {
    const selectedOwner = { ...account, providerAccountId: "deepseek.personal.primary" };
    expect(
      resolveSelectedModelAccount(
        [account, selectedOwner],
        [
          {
            endpointId: "deepseek.personal.primary.deepseek-v4-flash~high",
            providerAccountId: "deepseek.personal.primary",
          },
        ],
      ),
    ).toBe(selectedOwner);
  });

  test("requires an explicit second click for destructive eject actions", () => {
    expect(
      resolveConfiguredModelRemovalClick({
        actionKind: "eject-configured",
        targetKey: "endpoint:deepseek-high",
        pendingConfirmationKey: null,
      }),
    ).toBe("request-confirmation");
    expect(
      resolveConfiguredModelRemovalClick({
        actionKind: "eject-configured",
        targetKey: "endpoint:deepseek-high",
        pendingConfirmationKey: "endpoint:deepseek-high",
      }),
    ).toBe("execute");
    expect(
      resolveConfiguredModelRemovalClick({
        actionKind: "unload-local",
        targetKey: "local:qwen",
        pendingConfirmationKey: null,
      }),
    ).toBe("execute");
  });

  test("prefers the controller-backed card as the default selected model detail", () => {
    expect(
      resolveDefaultSelectedModelId([
        {
          modelId: "anthropic/claude-3-5-sonnet",
          displayName: "Claude 3.5 Sonnet",
          controllerState: "eligible",
          status: "active",
        },
        {
          modelId: "openai/gpt-4o-mini",
          displayName: "GPT-4o mini",
          controllerState: "active",
          status: "active",
        },
      ]),
    ).toBe("openai/gpt-4o-mini");
  });

  test("falls back to the first active card when no controller-backed model exists", () => {
    expect(
      resolveDefaultSelectedModelId([
        {
          modelId: "moonshot/kimi-k2.5",
          displayName: "Kimi K2.5",
          controllerState: "eligible",
          status: "healthy",
        },
        {
          modelId: "llama-swap/qwen2.5-coder-32b",
          displayName: "qwen2.5-coder-32b",
          controllerState: "inactive",
          status: "inactive",
        },
      ]),
    ).toBe("moonshot/kimi-k2.5");
  });

  test("falls back to the first healthy card when inactive or offline cards appear first", () => {
    expect(
      resolveDefaultSelectedModelId([
        {
          modelId: "deepseek/deepseek-v4-pro",
          displayName: "DeepSeek V4 Pro",
          controllerState: "eligible",
          status: "offline",
        },
        {
          modelId: "chatgpt/gpt-5.4",
          displayName: "GPT-5.4",
          controllerState: "inactive",
          status: "healthy",
        },
      ]),
    ).toBe("chatgpt/gpt-5.4");
  });

  test("returns null when no configured model cards exist", () => {
    expect(resolveDefaultSelectedModelId([])).toBeNull();
  });

  test("maps configured model card status pills to the paper-aligned tones", () => {
    expect(resolveConfiguredModelStatusTone("active", "active")).toBe("accent");
    expect(resolveConfiguredModelStatusTone("eligible", "healthy")).toBe("success");
    expect(resolveConfiguredModelStatusTone("inactive", "inactive")).toBe("neutral");
    expect(resolveConfiguredModelStatusTone("eligible", "offline")).toBe("warning");
  });

  test("builds configured model inventory pills with paper-aligned chip grammar", () => {
    expect(
      buildConfiguredModelInventoryPills({
        toolCallingSupported: true,
        endpointCount: 2,
        capabilityScore: 0.93,
      }),
    ).toEqual([
      { label: "tools", tone: "info" },
      { label: "2 endpoints", tone: "neutral" },
      { label: "score 93%", tone: "advisory" },
    ]);

    expect(
      buildConfiguredModelInventoryPills({
        toolCallingSupported: false,
        endpointCount: 1,
        capabilityScore: null,
      }),
    ).toEqual([
      { label: "no tools", tone: "neutral" },
      { label: "1 endpoint", tone: "neutral" },
    ]);
  });

  test("builds selected-model evidence pills using the paper token hierarchy", () => {
    expect(
      buildSelectedModelEvidencePills({
        assignedRoleRows: [{ roleId: "writer", label: "Writer", score: 0.94 }],
        groupRows: [{ groupId: "group.primary", score: 0.91, lowCoverage: false }],
        suggestedRoleRows: [
          { roleId: "code-hard", label: "Code hard", score: 0.73, lowCoverage: true },
        ],
      }),
    ).toEqual([
      { label: "assigned role evidence 94%", tone: "info" },
      { label: "group evidence 91%", tone: "advisory" },
      { label: "low coverage on code-hard", tone: "warning" },
    ]);
  });

  test("shows a neutral no-evidence pill when benchmark evidence is absent", () => {
    expect(
      buildSelectedModelEvidencePills({
        assignedRoleRows: [],
        groupRows: [],
        suggestedRoleRows: [],
      }),
    ).toEqual([{ label: "No benchmark evidence yet", tone: "neutral" }]);
  });

  test("builds the compact Paper preview payload instead of dumping full endpoint records", () => {
    expect(
      buildSelectedModelPreviewPayload({
        modelId: "openai/gpt-4o-mini",
        endpointIds: [
          "openai.personal.default/gpt-4o-mini",
          "openai.personal.fallback/gpt-4o-mini",
        ],
      }),
    ).toEqual({
      modelId: "openai/gpt-4o-mini",
      endpointIds: ["openai.personal.default/gpt-4o-mini", "openai.personal.fallback/gpt-4o-mini"],
    });
  });
});

describe("startDeferredConfiguredModelsBootstrap", () => {
  test("waits for the initial configured model inventory to settle before fetching deferred request evidence", async () => {
    const startDeferredConfiguredModelsBootstrap = (
      controlModelsModule as {
        startDeferredConfiguredModelsBootstrap?: unknown;
      }
    ).startDeferredConfiguredModelsBootstrap;
    expect(startDeferredConfiguredModelsBootstrap).toBeTypeOf("function");
    if (typeof startDeferredConfiguredModelsBootstrap !== "function") {
      return;
    }

    const events: string[] = [];
    let resolveInitialLoad: VoidFunction | undefined;
    startDeferredConfiguredModelsBootstrap({
      loadInitial: async () => {
        events.push("load:initial");
        return await new Promise<string>((resolve) => {
          resolveInitialLoad = () => {
            events.push("load:initial:resolved");
            resolve("models-ready");
          };
        });
      },
      onInitialData: (value: string) => {
        events.push(`initial:${value}`);
      },
      onInitialError: (message: string) => {
        events.push(`initial:error:${message}`);
      },
      loadObservedRequests: async () => {
        events.push("load:requests");
        return [{ requestId: "req-010" }];
      },
      onObservedRequests: (requests: readonly { requestId: string }[]) => {
        events.push(`requests:${requests.map((request) => request.requestId).join(",")}`);
      },
      onObservedRequestsError: (message: string) => {
        events.push(`requests:error:${message}`);
      },
    });

    expect(events).toEqual(["load:initial"]);

    expect(resolveInitialLoad).toBeTypeOf("function");
    const settleInitialLoad = resolveInitialLoad;
    if (!settleInitialLoad) {
      throw new Error("Expected configured model bootstrap to defer request evidence.");
    }
    settleInitialLoad();

    await vi.waitFor(() => {
      expect(events).toEqual([
        "load:initial",
        "load:initial:resolved",
        "initial:models-ready",
        "load:requests",
        "requests:req-010",
      ]);
    });
  });

  test("preserves the visible model inventory when deferred request evidence fails", async () => {
    const startDeferredConfiguredModelsBootstrap = (
      controlModelsModule as {
        startDeferredConfiguredModelsBootstrap?: unknown;
      }
    ).startDeferredConfiguredModelsBootstrap;
    expect(startDeferredConfiguredModelsBootstrap).toBeTypeOf("function");
    if (typeof startDeferredConfiguredModelsBootstrap !== "function") {
      return;
    }

    const initialStates: string[] = [];
    const initialErrors: string[] = [];
    const requestErrors: string[] = [];

    startDeferredConfiguredModelsBootstrap({
      loadInitial: async () => "models-ready",
      onInitialData: (value: string) => {
        initialStates.push(value);
      },
      onInitialError: (message: string) => {
        initialErrors.push(message);
      },
      loadObservedRequests: async () => {
        throw new Error("request evidence unavailable");
      },
      onObservedRequests: () => {
        throw new Error("Expected deferred request evidence to fail in this test.");
      },
      onObservedRequestsError: (message: string) => {
        requestErrors.push(message);
      },
    });

    await vi.waitFor(() => {
      expect(initialStates).toEqual(["models-ready"]);
      expect(requestErrors).toEqual(["request evidence unavailable"]);
    });
    expect(initialErrors).toEqual([]);
  });
});

describe("configured model mutation convergence", () => {
  test("reloads canonical endpoint eligibility after saving account role bindings", async () => {
    const events: string[] = [];
    const canonical = {
      snapshot: {
        accounts: [{ ...account, healthStatus: "healthy" }],
        endpoints: [{ endpointId: "endpoint-1", roleIds: ["coder"] }],
        models: [{ modelId: "openai/gpt-4.1-mini-fast" }],
      },
      controller: null,
    };

    await expect(
      saveConfiguredModelRoleEligibility({
        mutate: async () => {
          events.push("mutate");
          return account;
        },
        reloadCanonicalState: async () => {
          events.push("reload");
          return canonical;
        },
      }),
    ).resolves.toBe(canonical);
    expect(events).toEqual(["mutate", "reload"]);
  });

  test("describes the real role-derived task and group impact for an account", () => {
    expect(
      describeSavedModelRoleEligibility({
        displayName: "DeepSeek V4 Flash (High)",
        providerAccountId: "deepseek.personal.primary",
        selectedRoleIds: ["coder", "writer"],
        roleDefinitions: [
          {
            role_id: "coder",
            primaryGroupId: "engineering",
            secondaryGroupIds: ["delivery"],
            task_types_supported: ["code.edit", "code.review"],
          },
          {
            role_id: "writer",
            primaryGroupId: "content",
            secondaryGroupIds: [],
            task_types_supported: ["text.compose"],
          },
        ],
        endpointVariantCount: 4,
      }),
    ).toBe(
      "Saved eligibility for DeepSeek V4 Flash (High) on deepseek.personal.primary: 2 roles derive 3 task types across 3 groups for this endpoint instance.",
    );
  });

  test("converges role binding saves from the returned account without advisory reloads", async () => {
    const convergeSavedRuntimeAccount = (
      controlModelsModule as { convergeSavedRuntimeAccount?: unknown }
    ).convergeSavedRuntimeAccount;
    expect(convergeSavedRuntimeAccount).toBeTypeOf("function");
    if (typeof convergeSavedRuntimeAccount !== "function") {
      return;
    }

    const events: string[] = [];
    const currentSnapshot = {
      accounts: [account],
      endpoints: [{ endpointId: "endpoint-1" }],
      models: [{ modelId: "openai/gpt-4.1-mini-fast" }],
    };
    const updatedAccount = { ...account, healthStatus: "degraded" };
    const result = await (
      convergeSavedRuntimeAccount as (input: {
        currentSnapshot: typeof currentSnapshot;
        mutate: () => Promise<typeof updatedAccount>;
      }) => Promise<typeof currentSnapshot>
    )({
      currentSnapshot,
      mutate: async () => {
        events.push("mutation");
        return updatedAccount;
      },
    });

    expect(events).toEqual(["mutation"]);
    expect(result.accounts).toEqual([updatedAccount]);
    expect(result.endpoints).toBe(currentSnapshot.endpoints);
    expect(result.models).toBe(currentSnapshot.models);
  });

  test("reloads only canonical inventory surfaces after an eject receipt", async () => {
    const loadConfiguredModelsMutationState = (
      controlModelsModule as { loadConfiguredModelsMutationState?: unknown }
    ).loadConfiguredModelsMutationState;
    expect(loadConfiguredModelsMutationState).toBeTypeOf("function");
    if (typeof loadConfiguredModelsMutationState !== "function") {
      return;
    }

    const events: string[] = [];
    const result = await (
      loadConfiguredModelsMutationState as (input: {
        loadAccounts: () => Promise<readonly string[]>;
        loadEndpoints: () => Promise<readonly string[]>;
        loadModels: () => Promise<readonly string[]>;
        loadController: () => Promise<string>;
      }) => Promise<unknown>
    )({
      loadAccounts: async () => {
        events.push("accounts");
        return ["account"];
      },
      loadEndpoints: async () => {
        events.push("endpoints");
        return ["endpoint"];
      },
      loadModels: async () => {
        events.push("models");
        return ["model"];
      },
      loadController: async () => {
        events.push("controller");
        return "controller";
      },
    });

    expect(events.sort()).toEqual(["accounts", "controller", "endpoints", "models"]);
    expect(result).toEqual({
      snapshot: { accounts: ["account"], endpoints: ["endpoint"], models: ["model"] },
      controller: "controller",
    });
  });
});

describe("describeConfiguredModelRequestEvidence", () => {
  test("keeps request-evidence copy truthful while deferred request history is pending or unavailable", () => {
    const describeConfiguredModelRequestEvidence = (
      controlModelsModule as {
        describeConfiguredModelRequestEvidence?: unknown;
      }
    ).describeConfiguredModelRequestEvidence;
    expect(describeConfiguredModelRequestEvidence).toBeTypeOf("function");
    if (typeof describeConfiguredModelRequestEvidence !== "function") {
      return;
    }

    expect(
      (
        describeConfiguredModelRequestEvidence as (
          requestCount: number | null,
          status: "loading" | "ready" | "unavailable",
        ) => string
      )(null, "loading"),
    ).toBe("Request evidence loading");
    expect(
      (
        describeConfiguredModelRequestEvidence as (
          requestCount: number | null,
          status: "loading" | "ready" | "unavailable",
        ) => string
      )(null, "unavailable"),
    ).toBe("Request evidence unavailable");
    expect(
      (
        describeConfiguredModelRequestEvidence as (
          requestCount: number | null,
          status: "loading" | "ready" | "unavailable",
        ) => string
      )(7, "ready"),
    ).toBe("7 requests");
  });
});
