import { describe, expect, test } from "vitest";

import routingCapabilitySuite from "../data/routing-capability-suite.json" with { type: "json" };
import {
  buildJudgeDeliverablesChecklist,
  buildJudgeGradingBrief,
  formatQuestionTranscript,
  resolveExemplarAnswer,
} from "../src/judge-brief.js";
import { selectBenchmarkCases } from "../src/index.js";

const QUICK_CASE_IDS = selectBenchmarkCases(routingCapabilitySuite, { mode: "quick" }).map(
  (caseItem) => caseItem.case_id,
);

describe("judge-brief contract", () => {
  test("quick suite cases populate every grading brief contract field", () => {
    const quickCases = selectBenchmarkCases(routingCapabilitySuite, { mode: "quick" });
    expect(quickCases.length).toBeGreaterThan(0);

    for (const caseItem of quickCases) {
      const brief = buildJudgeGradingBrief(caseItem);
      expect(brief.questionTranscript).toBe(formatQuestionTranscript(caseItem));
      expect(brief.questionTranscript.length).toBeGreaterThan(10);
      expect(brief.exemplarAnswer.trim().length).toBeGreaterThan(0);
      expect(["authored", "derived"]).toContain(brief.exemplarQuality);
      expect(brief.deliverablesChecklist.length).toBeGreaterThan(0);
      expect(brief.antiPatterns.length).toBeGreaterThan(0);
      expect(brief.answerFormatInstruction.trim().length).toBeGreaterThan(0);
      expect(brief.gradingCriteria).toBe(caseItem.grading_criteria);
    }
  });

  test("tool-heavy quick cases include tool checklist items", () => {
    const toolCase = selectBenchmarkCases(routingCapabilitySuite, { mode: "quick" }).find(
      (caseItem) => caseItem.expected_tool_names?.includes("grep_search"),
    );
    expect(toolCase).toBeDefined();
    if (!toolCase) {
      return;
    }

    const checklist = buildJudgeDeliverablesChecklist(toolCase);
    expect(checklist.some((item) => item.includes("grep_search"))).toBe(true);
    expect(checklist.some((item) => item.startsWith("[MUST]"))).toBe(true);
  });

  test("code implementation quick cases include code deliverable checklist", () => {
    const codeCase = selectBenchmarkCases(routingCapabilitySuite, { mode: "quick" }).find(
      (caseItem) => caseItem.category === "code-implementation",
    );
    expect(codeCase).toBeDefined();
    if (!codeCase) {
      return;
    }

    const checklist = buildJudgeDeliverablesChecklist(codeCase);
    expect(
      checklist.some((item) => item.toLowerCase().includes("typescript")),
    ).toBe(true);
  });

  test("representative quick case ids remain covered", () => {
    expect(QUICK_CASE_IDS).toEqual(
      expect.arrayContaining([
        "h04-tool-read-router",
        "h05-tool-grep-eligibility",
        "h01-implement-two-sum",
      ]),
    );
  });

  test("resolveExemplarAnswer prefers authored deliverables when present", () => {
    const caseItem = selectBenchmarkCases(routingCapabilitySuite, { mode: "quick" }).find(
      (item) => item.example_deliverable?.trim(),
    );
    if (!caseItem) {
      return;
    }
    const exemplar = resolveExemplarAnswer(caseItem);
    expect(exemplar.quality).toBe("authored");
    expect(exemplar.answer).toBe(caseItem.example_deliverable?.trim());
  });
});
