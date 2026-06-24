import { describe, expect, test } from "vitest";

import { defaultRoles } from "../src/index.js";

describe("default runtime roles", () => {
  test("use the taxonomy V1 role catalog", () => {
    expect(defaultRoles).toHaveLength(28);
    expect(defaultRoles.map((role) => role.role_id)).toEqual(
      expect.arrayContaining(["coder", "architect", "security", "researcher", "health"]),
    );
    expect(defaultRoles.some((role) => role.role_id === "coder.patch")).toBe(false);

    for (const role of defaultRoles) {
      expect(role.task_types_supported.length, role.role_id).toBeGreaterThanOrEqual(10);
      expect(role.task_types_supported.every((taskId) => taskId.startsWith(`${role.role_id}.`))).toBe(
        true,
      );
    }
  });
});
