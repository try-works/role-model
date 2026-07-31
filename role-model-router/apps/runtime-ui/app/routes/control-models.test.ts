import { describe, expect, test, vi } from "vitest";

import type { RuntimeAccount } from "../lib/runtime-api";
import * as controlModelsModule from "./control-models";
import {
  buildConfiguredModelInventoryPills,
  buildModelRoleAssignmentForSelection,
  buildSelectedModelEvidencePills,
  buildSelectedModelPreviewPayload,
  createAccountMutationPayload,
  resolveConfiguredModelEjectLabel,
  resolveConfiguredModelStatusTone,
  resolveDefaultSelectedModelId,
} from "./control-models";

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
      { label: "score 0.93", tone: "advisory" },
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
