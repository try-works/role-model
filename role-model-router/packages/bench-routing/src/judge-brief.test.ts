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

  test("p17 checklist includes @@ hunk requirement for apply_patch", () => {
    const caseItem = routingCapabilitySuite.cases.find(
      (item) => item.case_id === "p17-tools-multi-hard",
    );
    expect(caseItem).toBeTruthy();
    if (!caseItem) {
      throw new Error("Expected benchmark case p17-tools-multi-hard.");
    }
    const checklist = buildJudgeDeliverablesChecklist(caseItem);
    expect(checklist.some((line) => line.includes("@@ hunk"))).toBe(true);
  });

  test("quick suite cases expose authored example_deliverable at suite 3.2", () => {
    expect(routingCapabilitySuite.suite_version).toBe("3.2");
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
    expect(brief.exemplarAnswer).toContain("withLock");
  });
});
