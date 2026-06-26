import { describe, expect, test } from "vitest";

import { buildModelRoleBindings, buildModelRoleSelection } from "./providers";

describe("provider model role assignment helpers", () => {
  const allRoleIds = ["coder", "security", "writer"];

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
});
