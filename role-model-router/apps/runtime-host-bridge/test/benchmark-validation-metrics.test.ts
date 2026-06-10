import { describe, expect, test } from "vitest";

import {
  computeBenchmarkValidationMetrics,
  deriveWorkflowVerdict,
  evaluateBenchmarkAccuracyGates,
} from "../src/benchmark-validation-metrics.js";

describe("benchmark-validation-metrics", () => {
  test("marks cd0c30a6-style metrics INVALID on empty raw and rationale gates", () => {
    const metrics = computeBenchmarkValidationMetrics({
      caseGrades: Array.from({ length: 24 }, (_, index) => ({
        parseSuccess: index < 18,
        judgeUnavailable: index >= 18,
        gradingMethod: index < 18 ? "judge" : "heuristic",
        rationale:
          index < 11
            ? "Cites deliverables checklist: includes required JSON keys and tool calls."
            : "short",
      })),
      artifactStats: {
        attempts: 50,
        emptyRaw: 32,
        gradingBrief: 50,
        compare: 12,
      },
    });

    const gates = evaluateBenchmarkAccuracyGates(metrics, "quick");
    expect(gates.judge_parse_gte75_pct).toBe("PASS");
    expect(gates.heuristic_fallback_lte25_pct).toBe("PASS");
    expect(gates.empty_raw_lt20_pct).toBe("FAIL");
    expect(gates.non_trivial_rationale_gte80_pct).toBe("FAIL");
    expect(deriveWorkflowVerdict(gates)).toBe("INVALID");
  });

  test("marks healthy fixture metrics VALID", () => {
    const metrics = computeBenchmarkValidationMetrics({
      caseGrades: Array.from({ length: 24 }, () => ({
        parseSuccess: true,
        judgeUnavailable: false,
        gradingMethod: "judge",
        rationale:
          "Meets [MUST] grep tool call and cites grading criteria for structured JSON output.",
      })),
      artifactStats: {
        attempts: 30,
        emptyRaw: 2,
        gradingBrief: 30,
        compare: 12,
      },
    });

    const gates = evaluateBenchmarkAccuracyGates(metrics, "quick");
    expect(deriveWorkflowVerdict(gates)).toBe("VALID");
  });
});
