import { describe, expect, test } from "vitest";

import { defaultTasks } from "../src/index.js";

describe("default runtime tasks", () => {
  test("use the taxonomy V1 task catalog", () => {
    expect(defaultTasks.length).toBeGreaterThanOrEqual(280);
    expect(defaultTasks).toEqual(expect.arrayContaining(["coder.edit", "coder.review"]));
    expect(defaultTasks).toEqual(
      expect.arrayContaining(["health.info.general", "health.info.safety"]),
    );
    expect(defaultTasks).not.toContain("code.edit");
  });
});
