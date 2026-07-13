import { describe, expect, test } from "vitest";

import routingCapabilitySuite from "../data/routing-capability-suite.json" with { type: "json" };

import {
  buildJudgeDeliverablesChecklist,
  buildJudgeGradingBrief,
  formatQuestionTranscript,
} from "./judge-brief.ts";

describe("judge-brief", () => {
  test("formatQuestionTranscript includes full messages without truncation", () => {
    const caseItem = routingCapabilitySuite.cases.find(
      (item) => item.case_id === "h07-multi-turn-sla-guard",
    );
    expect(caseItem).toBeTruthy();
    if (!caseItem) {
      throw new Error("Expected benchmark case h07-multi-turn-sla-guard.");
    }
    const transcript = formatQuestionTranscript(caseItem);
    expect(transcript).toContain("[user]");
    expect(transcript).toContain("[assistant]");
    expect(transcript.length).toBeGreaterThan(240);
  });

  test("p17 checklist includes unified diff or Codex patch requirement for apply_patch", () => {
    const caseItem = routingCapabilitySuite.cases.find(
      (item) => item.case_id === "p17-tools-multi-hard",
    );
    expect(caseItem).toBeTruthy();
    if (!caseItem) {
      throw new Error("Expected benchmark case p17-tools-multi-hard.");
    }
    const checklist = buildJudgeDeliverablesChecklist(caseItem);
    expect(checklist.some((line) => line.includes("Codex patch envelope"))).toBe(true);
    expect(checklist.some((line) => line.includes("line numbers are optional"))).toBe(true);
  });

  test("quick suite cases expose authored example_deliverable at suite 3.4", () => {
    expect(routingCapabilitySuite.suite_version).toBe("3.4");
    const quickCases = routingCapabilitySuite.cases.filter((item) => item.quick_benchmark);
    expect(quickCases.length).toBe(12);
    for (const caseItem of quickCases) {
      expect(caseItem.example_deliverable?.length).toBeGreaterThan(20);
    }
  });

  test("buildJudgeGradingBrief marks exemplar quality authored when suite field present", () => {
    const caseItem = routingCapabilitySuite.cases.find(
      (item) => item.case_id === "h02-fix-async-counter",
    );
    expect(caseItem).toBeTruthy();
    if (!caseItem) {
      throw new Error("Expected benchmark case h02-fix-async-counter.");
    }
    const brief = buildJudgeGradingBrief(caseItem);
    expect(brief.exemplarQuality).toBe("authored");
    expect(brief.exemplarAnswer).toContain("```typescript");
    expect(brief.exemplarAnswer).toContain("withLock");
  });

  test("rejects contradictory authored exemplars for code-fence benchmark cases", () => {
    expect(() =>
      buildJudgeGradingBrief({
        case_id: "h01-implement-two-sum",
        category: "code-implementation",
        messages: [{ role: "user", content: "return one fenced code block" }],
        expected_response: "function twoSum",
        grading_criteria: "Must define twoSum",
        example_deliverable: '{\n  "code": "function twoSum() {}"\n}',
      }),
    ).toThrow(/code_fence|example_deliverable|contradict/i);
  });

  test("h15 uses one coherent structured-json deliverable contract", () => {
    const caseItem = routingCapabilitySuite.cases.find(
      (item) => item.case_id === "h15-max-signal-v3",
    );
    expect(caseItem).toBeTruthy();
    if (!caseItem) {
      throw new Error("Expected benchmark case h15-max-signal-v3.");
    }
    const brief = buildJudgeGradingBrief(caseItem);
    expect(brief.deliverablesChecklist.some((line) => line.includes("A/B/C/D"))).toBe(false);
    expect(brief.exemplarAnswer).toContain('"patch_summary"');
    expect(brief.exemplarAnswer).toContain('"test_snippet"');
  });

  test("omits trivial regex accept patterns from judge checklist prose", () => {
    const caseItem = routingCapabilitySuite.cases.find((item) => item.case_id === "e06-timezone");
    expect(caseItem).toBeTruthy();
    if (!caseItem) {
      throw new Error("Expected benchmark case e06-timezone.");
    }
    const checklist = buildJudgeDeliverablesChecklist(caseItem);
    expect(checklist.some((line) => line.includes(".+"))).toBe(false);
    expect(checklist.some((line) => line.includes("Match patterns"))).toBe(false);
  });
});
