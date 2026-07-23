import { describe, expect, test, vi } from "vitest";

import * as providersModule from "./providers";
import {
  buildModelRoleBindings,
  buildModelRoleSelection,
  buildProviderModelRoleCoverageSummary,
} from "./providers";

describe("provider model role assignment helpers", () => {
  const allRoleIds = ["coder", "security", "writer"];
  const rolePolicy = {
    roleDefinitions: [
      {
        role_id: "coder",
        name: "Coder",
        description: "Code implementation",
        primaryGroupId: "engineering",
        role_kind: "runtime",
        default_system_instructions: "",
        task_types_supported: [],
        required_capabilities: [],
        preferred_capabilities: [],
        forbidden_capabilities: [],
        tool_policy: { mode: "allow-all" },
        routing_policy_overrides: {},
        output_contracts: [],
        safety_policy_refs: [],
      },
      {
        role_id: "security",
        name: "Security",
        description: "Security review",
        primaryGroupId: "engineering",
        role_kind: "runtime",
        default_system_instructions: "",
        task_types_supported: [],
        required_capabilities: [],
        preferred_capabilities: [],
        forbidden_capabilities: [],
        tool_policy: { mode: "allow-all" },
        routing_policy_overrides: {},
        output_contracts: [],
        safety_policy_refs: [],
      },
      {
        role_id: "writer",
        name: "Writer",
        description: "Communication",
        primaryGroupId: "communication",
        role_kind: "runtime",
        default_system_instructions: "",
        task_types_supported: [],
        required_capabilities: [],
        preferred_capabilities: [],
        forbidden_capabilities: [],
        tool_policy: { mode: "allow-all" },
        routing_policy_overrides: {},
        output_contracts: [],
        safety_policy_refs: [],
      },
    ],
    taskDefinitions: [],
  } as const;

  test("defaults newly selected provider models to all available roles", () => {
    expect(buildModelRoleSelection(["openai/gpt-4.1"], allRoleIds)).toEqual({
      "openai/gpt-4.1": allRoleIds,
    });
  });

  test("serializes all selected roles as explicit all assignment", () => {
    expect(
      buildModelRoleBindings(["openai/gpt-4.1"], { "openai/gpt-4.1": allRoleIds }, allRoleIds),
    ).toEqual([
      {
        modelId: "openai/gpt-4.1",
        roleIds: [],
        roleAssignmentMode: "all",
        enabledRoleIds: [],
        disabledRoleIds: [],
      },
    ]);
  });

  test("serializes explicit empty provider roles as include-empty assignment", () => {
    expect(
      buildModelRoleBindings(["openai/gpt-4.1"], { "openai/gpt-4.1": [] }, allRoleIds),
    ).toEqual([
      {
        modelId: "openai/gpt-4.1",
        roleIds: [],
        roleAssignmentMode: "include",
        enabledRoleIds: [],
        disabledRoleIds: [],
      },
    ]);
  });

  test("builds grouped provider role coverage summaries instead of dumping raw role chips", () => {
    expect(
      buildProviderModelRoleCoverageSummary({
        selectedRoleIds: ["coder", "security", "writer"],
        allRoleIds,
        rolePolicy,
        previewGroupLimit: 2,
      }),
    ).toEqual({
      totalSelectedCount: 3,
      totalRoleCount: 3,
      allRolesSelected: true,
      groupPreviewLabels: ["Engineering 2/2", "Communication 1/1"],
      hiddenGroupCount: 0,
    });
  });

  test("falls back to compact selected-count copy when role groups are unavailable", () => {
    expect(
      buildProviderModelRoleCoverageSummary({
        selectedRoleIds: ["coder", "writer"],
        allRoleIds,
        rolePolicy: null,
      }),
    ).toEqual({
      totalSelectedCount: 2,
      totalRoleCount: 3,
      allRolesSelected: false,
      groupPreviewLabels: ["2 selected"],
      hiddenGroupCount: 0,
    });
  });
});

describe("existing OAuth account model activation", () => {
  test("builds immediate action feedback for save and OAuth outcomes", () => {
    const buildProviderActionFeedback = (
      providersModule as {
        buildProviderActionFeedback?: unknown;
      }
    ).buildProviderActionFeedback;
    expect(buildProviderActionFeedback).toBeTypeOf("function");
    if (typeof buildProviderActionFeedback !== "function") {
      return;
    }

    expect(
      buildProviderActionFeedback({
        action: "saved",
        modelId: "moonshot/kimi-k3",
        endpointActivated: true,
      }),
    ).toBe("Saved moonshot/kimi-k3 and activated its runtime endpoint.");
    expect(
      buildProviderActionFeedback({
        action: "oauth",
        modelId: "moonshot/kimi-k3",
        providerLabel: "Kimi Code",
        authorizationStatus: "pending",
      }),
    ).toBe("OAuth started for moonshot/kimi-k3. Complete authorization in the Kimi Code window.");
    expect(
      buildProviderActionFeedback({
        action: "oauth",
        modelId: "moonshot/kimi-k3",
        providerLabel: "Kimi Code",
        authorizationStatus: "connected",
      }),
    ).toBe("OAuth is connected and moonshot/kimi-k3 is active.");
  });

  test("treats a healthy persisted OAuth account as ready for endpoint activation", () => {
    const shouldActivateSavedProviderEndpoint = (
      providersModule as {
        shouldActivateSavedProviderEndpoint?: unknown;
      }
    ).shouldActivateSavedProviderEndpoint;
    expect(shouldActivateSavedProviderEndpoint).toBeTypeOf("function");
    if (typeof shouldActivateSavedProviderEndpoint !== "function") {
      return;
    }

    expect(
      shouldActivateSavedProviderEndpoint({
        authMode: "oauth2-device-code",
        oauthConnected: false,
        existingAccount: {
          providerAccountId: "moonshot.personal.kimi-code",
          authMode: "oauth2-device-code",
          status: "active",
          healthStatus: "healthy",
        },
      }),
    ).toBe(true);
  });

  test("activates the selected model when device authorization reuses a connected credential", async () => {
    const syncStartedProviderAuthorization = (
      providersModule as {
        syncStartedProviderAuthorization?: unknown;
      }
    ).syncStartedProviderAuthorization;
    expect(syncStartedProviderAuthorization).toBeTypeOf("function");
    if (typeof syncStartedProviderAuthorization !== "function") {
      return;
    }
    const activateEndpoint = vi.fn(async () => undefined);

    await syncStartedProviderAuthorization({
      session: {
        authRequestId: "auth-kimi-connected",
        providerAccountId: "moonshot.personal.kimi-code",
        providerId: "moonshot",
        variantId: "kimi-code",
        status: "connected",
      },
      selectedModels: ["moonshot/kimi-k3"],
      activateEndpoint,
    });

    expect(activateEndpoint).toHaveBeenCalledOnce();
    expect(activateEndpoint).toHaveBeenCalledWith({
      providerAccountId: "moonshot.personal.kimi-code",
      modelId: "moonshot/kimi-k3",
      region: "global",
    });
  });
});

describe("startDeferredProvidersBootstrap", () => {
  test("waits for the initial providers load to settle before fetching the latest request ids", async () => {
    const startDeferredProvidersBootstrap = (
      providersModule as {
        startDeferredProvidersBootstrap?: unknown;
      }
    ).startDeferredProvidersBootstrap;
    expect(startDeferredProvidersBootstrap).toBeTypeOf("function");
    if (typeof startDeferredProvidersBootstrap !== "function") {
      return;
    }

    const events: string[] = [];
    let resolveInitialLoad: VoidFunction | undefined;
    startDeferredProvidersBootstrap({
      loadInitial: async () => {
        events.push("load:initial");
        return await new Promise<string>((resolve) => {
          resolveInitialLoad = () => {
            events.push("load:initial:resolved");
            resolve("providers-loaded");
          };
        });
      },
      onInitialData: (value: string) => {
        events.push(`initial:${value}`);
      },
      onInitialError: (message: string) => {
        events.push(`initial:error:${message}`);
      },
      loadRecentRequestIds: async () => {
        events.push("load:recent-request-ids");
        return ["req-010", "req-009"];
      },
      onRecentRequestIds: (requestIds: readonly string[]) => {
        events.push(`recent:${requestIds.join(",")}`);
      },
      onRecentRequestIdsError: (message: string) => {
        events.push(`recent:error:${message}`);
      },
    });

    expect(events).toEqual(["load:initial"]);

    expect(resolveInitialLoad).toBeTypeOf("function");
    const settleInitialLoad = resolveInitialLoad;
    if (!settleInitialLoad) {
      throw new Error("Expected the initial providers load to be deferrable.");
    }
    settleInitialLoad();

    await vi.waitFor(() => {
      expect(events).toEqual([
        "load:initial",
        "load:initial:resolved",
        "initial:providers-loaded",
        "load:recent-request-ids",
        "recent:req-010,req-009",
      ]);
    });
  });

  test("preserves the loaded providers state when the deferred latest-id follow-up fails", async () => {
    const startDeferredProvidersBootstrap = (
      providersModule as {
        startDeferredProvidersBootstrap?: unknown;
      }
    ).startDeferredProvidersBootstrap;
    expect(startDeferredProvidersBootstrap).toBeTypeOf("function");
    if (typeof startDeferredProvidersBootstrap !== "function") {
      return;
    }

    const initialStates: string[] = [];
    const initialErrors: string[] = [];
    const recentErrors: string[] = [];

    startDeferredProvidersBootstrap({
      loadInitial: async () => "providers-loaded",
      onInitialData: (value: string) => {
        initialStates.push(value);
      },
      onInitialError: (message: string) => {
        initialErrors.push(message);
      },
      loadRecentRequestIds: async () => {
        throw new Error("latest ids unavailable");
      },
      onRecentRequestIds: () => {
        throw new Error("Expected the deferred follow-up to fail in this test.");
      },
      onRecentRequestIdsError: (message: string) => {
        recentErrors.push(message);
      },
    });

    await vi.waitFor(() => {
      expect(initialStates).toEqual(["providers-loaded"]);
      expect(recentErrors).toEqual(["latest ids unavailable"]);
    });
    expect(initialErrors).toEqual([]);
  });
});

describe("Kimi OAuth verification URL open regression", () => {
  test("providers route mounts DeviceAuthorizationCard for live oauthState", async () => {
    // Source-contract guard: pending non-Codex OAuth previously had toast-only UX and no URL card.
    // Bound by addenda/05-manual-qa.kimi-oauth-verification-url-open.addendum-02.md
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("./providers.tsx", import.meta.url), "utf8"),
    );
    expect(source).toContain('from "../components/device-authorization-card"');
    expect(source).toContain("{oauthState ? (");
    expect(source).toContain("<DeviceAuthorizationCard");
    expect(source).toContain("onOpenVerificationUrl={() => void openVerificationUrl(oauthState)}");
    expect(source).toContain('const opened = window.open(verificationUrl, "_blank", "noopener,noreferrer")');
    expect(source).toContain("Use the Verification URL link below");
  });
});
