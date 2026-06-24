import { describe, expect, test } from "vitest";

import {
  buildModelRoleAssignmentForSelection,
  createAccountMutationPayload,
} from "./control-models";
import type { RuntimeAccount } from "../lib/runtime-api";

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
});
