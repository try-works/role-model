import { describe, expect, test } from "vitest";

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
