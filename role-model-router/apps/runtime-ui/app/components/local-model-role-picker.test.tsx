import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, test } from "vitest";

import type { BenchmarkCapability, RuntimeRolePolicy } from "../lib/runtime-api";
import {
  LocalModelRolePicker,
  getNextRoleSelectionForGroup,
  getLocalModelRolePickerGroupState,
  getLocalModelRolePickerState,
} from "./local-model-role-picker";

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

const benchmarkCapabilityFixture = {
  overallScore: 0.91,
  benchmarkSamples: 4,
  sampleCount: 4,
  measuredAtMs: null,
  freshnessScore: null,
  lastRunId: null,
  lastRunCompletedAtMs: null,
  judgeEndpointId: null,
  eligibleRoleScores: { coder: 0.91 },
  roleScores: { coder: 0.91, security: 0.88 },
  coverage: {
    overallCases: 4,
    roleCases: { coder: 3, security: 1 },
    groupCases: { engineering: 4 },
    lowCoverageRoleIds: ["security"],
    lowCoverageGroupIds: [],
  },
} satisfies BenchmarkCapability;

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

  test("shows benchmark-backed assignment evidence without auto-selecting unassigned roles", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <LocalModelRolePicker
          rolePolicy={rolePolicy}
          selectedRoleIds={["coder"]}
          onChange={() => {}}
          defaultAllRoles={false}
          benchmarkCapability={benchmarkCapabilityFixture}
        />
      </MemoryRouter>,
    );

    expect(markup).toContain("Benchmarked 91%");
    expect(markup).toContain("Unassigned evidence 88%");
    expect(markup).toContain("Low coverage");
    expect(markup).toContain("bg-[var(--rm-pill-warning-bg)]");
    expect(markup).toContain("bg-[var(--rm-pill-accent-bg)]");
    expect(markup).toContain("bg-[var(--rm-pill-neutral-bg)]");
    expect(markup).not.toContain("border-[var(--rm-warning)]");
    expect(markup).not.toContain("border-[var(--rm-accent)]");
    expect(markup).not.toContain(
      'rounded-[var(--rm-radius-pill)] border border-[var(--rm-border)] px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-[var(--rm-secondary)]',
    );
    expect(markup).not.toContain('value="security" checked=""');
  });

  test("renders grouped roles as collapsible sections and only pre-opens explicitly selected groups", () => {
    const collapsedMarkup = renderToStaticMarkup(
      <MemoryRouter>
        <LocalModelRolePicker rolePolicy={rolePolicy} selectedRoleIds={[]} onChange={() => {}} />
      </MemoryRouter>,
    );

    expect(collapsedMarkup).toContain("<details");
    expect(collapsedMarkup).toContain("<summary");
    expect(collapsedMarkup).toContain("Engineering");
    expect(collapsedMarkup).toContain("Communication");
    expect(collapsedMarkup).not.toContain('open=""');

    const expandedMarkup = renderToStaticMarkup(
      <MemoryRouter>
        <LocalModelRolePicker
          rolePolicy={rolePolicy}
          selectedRoleIds={["writer"]}
          onChange={() => {}}
          defaultAllRoles={false}
        />
      </MemoryRouter>,
    );

    expect(expandedMarkup).toContain('open=""');
    expect(expandedMarkup).toContain("1 selected");
  });

  test("can keep selected groups collapsed by default when a route requests it", () => {
    const collapsedSelectedMarkup = renderToStaticMarkup(
      <MemoryRouter>
        <LocalModelRolePicker
          rolePolicy={rolePolicy}
          selectedRoleIds={["coder", "security", "writer"]}
          onChange={() => {}}
          expandSelectedGroupsByDefault={false}
        />
      </MemoryRouter>,
    );

    expect(collapsedSelectedMarkup).not.toContain('open=""');
  });

  test("renders category-level checkboxes that default to selected and expose partial state", () => {
    const defaultMarkup = renderToStaticMarkup(
      <MemoryRouter>
        <LocalModelRolePicker rolePolicy={rolePolicy} selectedRoleIds={[]} onChange={() => {}} />
      </MemoryRouter>,
    );

    expect(defaultMarkup).toContain('aria-label="Select Engineering roles"');
    expect(defaultMarkup).toContain('aria-label="Select Communication roles"');
    expect(defaultMarkup).toContain('aria-checked="true"');

    expect(
      getLocalModelRolePickerGroupState({
        roleIds: ["coder", "security"],
        selectedRoleIds: ["coder"],
      }),
    ).toMatchObject({
      selectedRoleIds: ["coder"],
      allSelected: false,
      noneSelected: false,
      partiallySelected: true,
    });
  });

  test("derives explicit role assignment states without treating empty as all", () => {
    expect(
      getLocalModelRolePickerState({
        roleIds: ["coder", "writer"],
        selectedRoleIds: [],
        defaultAllRoles: true,
      }),
    ).toMatchObject({
      selectedRoleIds: ["coder", "writer"],
      allSelected: true,
      noneSelected: false,
    });

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

  test("toggles a single group without mutating neighboring groups", () => {
    expect(
      getNextRoleSelectionForGroup({
        allRoleIds: ["writer", "coordinator", "analyst", "designer"],
        groupRoleIds: ["writer", "coordinator"],
        selectedRoleIds: ["analyst", "designer"],
        defaultAllRoles: false,
      }),
    ).toEqual(["writer", "coordinator", "analyst", "designer"]);

    expect(
      getNextRoleSelectionForGroup({
        allRoleIds: ["writer", "coordinator", "analyst", "designer"],
        groupRoleIds: ["writer", "coordinator"],
        selectedRoleIds: [],
        defaultAllRoles: true,
      }),
    ).toEqual(["analyst", "designer"]);
  });
});
