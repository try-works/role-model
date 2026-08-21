import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { ModelRoleBindingTree, RoleCatalogHierarchy } from "./role-task-hierarchy";
import type { RuntimeRolePolicyRole, RuntimeTaskDefinition } from "./runtime-api";

const roleDefinitions: RuntimeRolePolicyRole[] = [
  {
    role_id: "coder.patch",
    name: "Coder Patch",
    description: "Code editing and patch generation tasks.",
    primaryGroupId: "engineering",
    secondaryGroupIds: [],
    role_kind: "assistant",
    default_system_instructions: "Operate as Coder Patch.",
    task_types_supported: ["code.edit"],
    required_capabilities: [],
    preferred_capabilities: ["reasoning.multi_step"],
    forbidden_capabilities: [],
    tool_policy: { mode: "allowed", allowed_tools: [] },
    routing_policy_overrides: {},
    output_contracts: [],
    safety_policy_refs: [],
  },
];

const taskDefinitions: RuntimeTaskDefinition[] = [
  {
    task_type: "code.edit",
    description: "Generate or patch code while preserving surrounding behavior.",
    required_inputs: [],
    required_capabilities: ["code.edit"],
    preferred_capabilities: ["reasoning.multi_step"],
    quality_metrics: [],
    allowed_roles: ["coder.patch"],
    default_benchmark_suites: [],
  },
];

describe("role task hierarchy", () => {
  test("disables role eligibility controls while the account mutation is in flight", () => {
    const markup = renderToStaticMarkup(
      <ModelRoleBindingTree
        roleDefinitions={roleDefinitions}
        taskDefinitions={taskDefinitions}
        selectedRoleIds={["coder.patch"]}
        expandedRoleId="coder.patch"
        disabled
        onToggleRole={() => undefined}
        onToggleExpandedRole={() => undefined}
      />,
    );

    expect(markup).toContain('aria-label="Bind role coder.patch"');
    expect(markup).toContain("disabled");
  });

  test("keeps task content hidden until the role task detail view is expanded", () => {
    const markup = renderToStaticMarkup(
      <RoleCatalogHierarchy
        roleDefinitions={roleDefinitions}
        taskDefinitions={taskDefinitions}
        expandedRoleId={null}
        onToggleTaskDetail={() => undefined}
        selectedRoleId="coder.patch"
        onSelectRole={() => undefined}
      />,
    );

    expect(markup).toContain("Task detail");
    expect(markup).toContain("1 task");
    expect(markup).toContain("engineering · tools allowed");
    expect(markup).toContain("border-l-[var(--rm-accent)]");
    expect(markup).not.toContain("Generate or patch code while preserving surrounding behavior.");
    expect(markup).not.toContain("Select role");
    expect(markup).not.toContain("xl:grid-cols-2");
  });

  test("reveals grouped task detail only for the expanded role", () => {
    const markup = renderToStaticMarkup(
      <RoleCatalogHierarchy
        roleDefinitions={roleDefinitions}
        taskDefinitions={taskDefinitions}
        expandedRoleId="coder.patch"
        onToggleTaskDetail={() => undefined}
        selectedRoleId="coder.patch"
        onSelectRole={() => undefined}
      />,
    );

    expect(markup).toContain("Generate or patch code while preserving surrounding behavior.");
    expect(markup).toContain("code.edit");
    expect(markup).toContain("Hide task detail");
  });

  test("renders a Paper list-select catalog with high-risk badge and no card grid", () => {
    const markup = renderToStaticMarkup(
      <RoleCatalogHierarchy
        roleDefinitions={[
          ...roleDefinitions,
          {
            role_id: "security",
            name: "Security",
            description: "Policy-sensitive security review.",
            primaryGroupId: "engineering",
            secondaryGroupIds: ["governance_safety"],
            riskLevel: "high",
            role_kind: "assistant",
            default_system_instructions: "Operate as Security.",
            task_types_supported: ["security.audit"],
            required_capabilities: [],
            preferred_capabilities: ["security.analysis"],
            forbidden_capabilities: [],
            tool_policy: { mode: "limited", allowed_tools: [] },
            routing_policy_overrides: {},
            output_contracts: [],
            safety_policy_refs: [],
          },
        ]}
        taskDefinitions={taskDefinitions}
        expandedRoleId={null}
        onToggleTaskDetail={() => undefined}
        selectedRoleId={null}
        onSelectRole={() => undefined}
      />,
    );

    expect(markup).toContain("High risk");
    expect(markup).toContain('data-tone="error"');
    expect(markup).not.toContain("bg-[var(--rm-error)]");
    expect(markup).toContain("tools limited");
    expect(markup).not.toContain("Secondary: Governance Safety");
    expect(markup).not.toContain("StatusPill");
    expect(markup).not.toContain("xl:grid-cols-2");
  });
});
