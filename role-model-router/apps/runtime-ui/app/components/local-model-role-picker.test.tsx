import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, test } from "vitest";

import { getLocalModelRolePickerState, LocalModelRolePicker } from "./local-model-role-picker";
import type { RuntimeRolePolicy } from "../lib/runtime-api";

const rolePolicy = {
  roleDefinitions: [
    {
      role_id: "coder",
      name: "Coder",
      description: "Code work.",
      primaryGroupId: "engineering",
      secondaryGroupIds: [],
      role_kind: "assistant",
      default_system_instructions: "",
      task_types_supported: ["coder.edit"],
      required_capabilities: [],
      preferred_capabilities: [],
      forbidden_capabilities: [],
      tool_policy: { mode: "allowed" },
      routing_policy_overrides: {},
      output_contracts: [],
      safety_policy_refs: [],
    },
    {
      role_id: "security",
      name: "Security",
      description: "Security-sensitive review work.",
      primaryGroupId: "engineering",
      secondaryGroupIds: ["governance_safety"],
      riskLevel: "high",
      role_kind: "assistant",
      default_system_instructions: "",
      task_types_supported: ["security.audit"],
      required_capabilities: [],
      preferred_capabilities: [],
      forbidden_capabilities: [],
      tool_policy: { mode: "allowed" },
      routing_policy_overrides: {},
      output_contracts: [],
      safety_policy_refs: [],
    },
    {
      role_id: "writer",
      name: "Writer",
      description: "Writing work.",
      primaryGroupId: "communication",
      secondaryGroupIds: [],
      role_kind: "assistant",
      default_system_instructions: "",
      task_types_supported: ["writer.docs.write"],
      required_capabilities: [],
      preferred_capabilities: [],
      forbidden_capabilities: [],
      tool_policy: { mode: "allowed" },
      routing_policy_overrides: {},
      output_contracts: [],
      safety_policy_refs: [],
    },
  ],
  taskDefinitions: [],
} satisfies RuntimeRolePolicy;

describe("LocalModelRolePicker", () => {
  test("shows grouped roles with an all-roles default checkbox", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <LocalModelRolePicker rolePolicy={rolePolicy} selectedRoleIds={[]} onChange={() => {}} />
      </MemoryRouter>,
    );

    expect(markup).toContain("All roles");
    expect(markup).toContain("Engineering");
    expect(markup).toContain("Communication");
    expect(markup).toContain('checked=""');
    expect(markup).toContain("Coder");
    expect(markup).toContain("Security");
    expect(markup).toContain("High risk");
    expect(markup).toContain("Governance Safety");
    expect(markup).toContain("Writer");
  });

  test("derives explicit role assignment states without treating empty as all", () => {
    expect(
      getLocalModelRolePickerState({
        roleIds: ["coder", "writer"],
        selectedRoleIds: [],
        defaultAllRoles: true,
      }),
    ).toMatchObject({ selectedRoleIds: ["coder", "writer"], allSelected: true, noneSelected: false });

    expect(
      getLocalModelRolePickerState({
        roleIds: ["coder", "writer"],
        selectedRoleIds: [],
        defaultAllRoles: false,
      }),
    ).toMatchObject({ selectedRoleIds: [], allSelected: false, noneSelected: true });

    expect(
      getLocalModelRolePickerState({
        roleIds: ["coder", "writer"],
        selectedRoleIds: ["coder"],
        defaultAllRoles: false,
      }),
    ).toMatchObject({ allSelected: false, noneSelected: false, partiallySelected: true });
  });
});
