import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

describe("Run 96 operator controls route", () => {
  test("exposes bounded replay, evaluation, and shadow-learning controls without persisting an operator credential", () => {
    const routeSource = readFileSync(new URL("./operator-controls.tsx", import.meta.url), "utf8");
    const routeConfig = readFileSync(new URL("../routes.ts", import.meta.url), "utf8");
    const navigation = readFileSync(new URL("../lib/design-system.ts", import.meta.url), "utf8");

    expect(routeConfig).toContain('route("system/operator", "routes/operator-controls.tsx"');
    expect(navigation).toContain('to: "/app/system/operator"');
    for (const token of [
      "fetchOperatorStatus",
      "listReplayJobs",
      "listEvaluationJobs",
      "fetchLearningState",
      "cancelReplayJob",
      "cancelEvaluationJob",
      "retryEvaluationJob",
      "updateLearningMode",
      "rollbackLearning",
      "Operator access token",
      'autoComplete="off"',
      "confirm(",
      'aria-live="polite"',
      "focus-visible:ring",
      "shadow-only",
    ]) {
      expect(routeSource).toContain(token);
    }
    expect(routeSource).not.toContain("localStorage");
    expect(routeSource).not.toContain("sessionStorage");
  });
});
