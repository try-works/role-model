import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import type { RuntimeRolePolicyRole, RuntimeTaskDefinition } from "./runtime-api";
import { RoleCatalogHierarchy } from "./role-task-hierarchy";

const roleDefinitions: RuntimeRolePolicyRole[] = [
  {
    role_id: "coder.patch",
    name: "Coder Patch",
    description: "Code editing and patch generation tasks.",
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
    expect(markup).not.toContain("Generate or patch code while preserving surrounding behavior.");
    expect(markup).not.toContain(">code.edit<");
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
    expect(markup).toContain(">code.edit<");
    expect(markup).toContain("Hide task detail");
  });
});
