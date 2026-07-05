import { describe, expect, test } from "vitest";

import type { RuntimeAccount } from "../lib/runtime-api";
import {
  buildConfiguredModelInventoryPills,
  buildSelectedModelPreviewPayload,
  buildSelectedModelEvidencePills,
  buildModelRoleAssignmentForSelection,
  createAccountMutationPayload,
  resolveDefaultSelectedModelId,
  resolveConfiguredModelEjectLabel,
  resolveConfiguredModelStatusTone,
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
          status: "active",
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

  test("returns null when no configured model cards exist", () => {
    expect(resolveDefaultSelectedModelId([])).toBeNull();
  });

  test("maps configured model card status pills to the paper-aligned tones", () => {
    expect(resolveConfiguredModelStatusTone("active", "active")).toBe("accent");
    expect(resolveConfiguredModelStatusTone("eligible", "active")).toBe("success");
    expect(resolveConfiguredModelStatusTone("inactive", "inactive")).toBe("neutral");
    expect(resolveConfiguredModelStatusTone("eligible", "degraded")).toBe("warning");
  });

  test("builds configured model inventory pills with paper-aligned chip grammar", () => {
    expect(
      buildConfiguredModelInventoryPills({
        toolCallingSupported: true,
        endpointCount: 2,
        capabilityScore: 0.93,
      }),
    ).toEqual([
      { label: "tool calling", tone: "info" },
      { label: "2 endpoints", tone: "neutral" },
      { label: "93% capability", tone: "advisory" },
    ]);

    expect(
      buildConfiguredModelInventoryPills({
        toolCallingSupported: false,
        endpointCount: 1,
        capabilityScore: null,
      }),
    ).toEqual([
      { label: "no tool calling", tone: "neutral" },
      { label: "1 endpoint", tone: "neutral" },
    ]);
  });

  test("builds selected-model evidence pills using the paper token hierarchy", () => {
    expect(
      buildSelectedModelEvidencePills({
        assignedRoleRows: [{ roleId: "writer", label: "Writer", score: 0.94 }],
        groupRows: [{ groupId: "group.primary", score: 0.91, lowCoverage: false }],
        suggestedRoleRows: [{ roleId: "code-hard", label: "Code hard", score: 0.73, lowCoverage: true }],
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
      endpointIds: [
        "openai.personal.default/gpt-4o-mini",
        "openai.personal.fallback/gpt-4o-mini",
      ],
    });
  });
});
