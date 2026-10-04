import { describe, expect, it } from "vitest";
import { expandReasoningEffortArms } from "../src/effort-instance-identity.js";

describe("run106 reasoning-effort arm expansion", () => {
  const base = { providerAccountId: "deepseek.personal", region: "global", modelId: "deepseek/flash" };

  it("fixed endpoint yields exactly one fixed arm", () => {
    const arms = expandReasoningEffortArms({ ...base, fixedEffort: "max" });
    expect(arms).toHaveLength(1);
    expect(arms[0].source).toBe("fixed");
    expect(arms[0].effectiveEffort).toBe("max");
    expect(arms[0].endpointId).toContain("-max");
  });

  it("provider-default endpoint expands declared levels plus a default arm", () => {
    const arms = expandReasoningEffortArms({ ...base, fixedEffort: null, declaredLevels: ["low", "high", "max"] });
    expect(arms.map((a) => a.source)).toContain("provider-default");
    expect(arms.filter((a) => a.source === "fixed")).toHaveLength(3);
    expect(arms.filter((a) => a.effectiveEffort === null)).toHaveLength(1);
  });

  it("dedupes duplicate declared levels", () => {
    const arms = expandReasoningEffortArms({ ...base, fixedEffort: null, declaredLevels: ["high", "high", "max"] });
    const fixedIds = arms.filter((a) => a.source === "fixed").map((a) => a.endpointId);
    expect(new Set(fixedIds).size).toBe(2);
  });

  it("provider-default with no declared levels yields only the default arm", () => {
    const arms = expandReasoningEffortArms({ ...base, fixedEffort: null });
    expect(arms).toHaveLength(1);
    expect(arms[0].effectiveEffort).toBeNull();
  });
});
