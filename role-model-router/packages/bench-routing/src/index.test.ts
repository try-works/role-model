import { describe, expect, test } from "vitest";

import {
  buildHeuristicCompareRanking,
  buildJudgeRequestMessages,
  gradeBenchmarkCase,
  selectBenchmarkCases,
} from "./index.ts";

describe("bench-routing", () => {
  test("selects quick benchmark cases only in quick mode", () => {
    const suite = {
      suite_id: "test",
      suite_version: "1",
      description: "test",
      task_type: "routing_capability",
      capability_targets: ["instruction_following"],
      cases: [
        {
          case_id: "a",
          category: "easy-short",
          difficulty_bucket: "easy",
          benchmark_eligible: true,
          capability_targets: ["instruction_following"],
          messages: [{ role: "user", content: "hi" }],
          max_tokens: 8,
          expected_response: "hello",
          grading_criteria: "greet",
          quick_benchmark: true,
        },
        {
          case_id: "b",
          category: "max-signal",
          difficulty_bucket: "hard",
          benchmark_eligible: true,
          capability_targets: ["planning"],
          messages: [{ role: "user", content: "plan" }],
          max_tokens: 32,
          expected_response: "plan",
          grading_criteria: "plan",
          quick_benchmark: false,
        },
      ],
    } as const;

    expect(selectBenchmarkCases(suite, { mode: "quick" }).map((item) => item.case_id)).toEqual(["a"]);
    expect(selectBenchmarkCases(suite, { mode: "full" }).map((item) => item.case_id)).toEqual([
      "a",
      "b",
    ]);
  });

  test("requires judge grade when requireJudge is enabled", () => {
    const caseItem = {
      case_id: "h01",
      category: "code-implementation",
      difficulty_bucket: "hard",
      benchmark_eligible: true,
      capability_targets: ["code_generation"],
      messages: [{ role: "user", content: "two sum" }],
      max_tokens: 128,
      expected_response: "function twoSum",
      grading_criteria: "correct code",
    } as const;

    const grade = gradeBenchmarkCase({
      caseItem,
      actualResponse: "function twoSum(nums) {}",
      requireJudge: true,
      judgeGrade: {
        score: 0.8,
        rationale: "Good implementation.",
        method: "judge",
      },
    });
    expect(grade.method).toBe("judge");
    expect(grade.score).toBe(0.8);
  });

  test("caps partial heuristic credit when judge is unavailable", () => {
    const caseItem = {
      case_id: "h05-tool-grep-eligibility",
      category: "tools-heavy",
      difficulty_bucket: "hard",
      benchmark_eligible: true,
      capability_targets: ["tool_calling"],
      messages: [{ role: "user", content: "grep" }],
      max_tokens: 128,
      expected_response: "grep_search",
      grading_criteria: "grep tool",
      accept_patterns: ["evaluateEligibility|eligib"],
      required_tool_call: true,
      expected_tool_names: ["grep_search"],
    } as const;

    const grade = gradeBenchmarkCase({
      caseItem,
      actualResponse: '{"tool_calls":[{"name":"grep_search"}]}',
      structuredToolNames: ["grep_search"],
      judgeUnavailable: true,
    });
    expect(grade.method).toBe("heuristic");
    expect(grade.score).toBe(0.25);
    expect(grade.rationale).toContain("[judge_unavailable]");
  });

  test("falls back to heuristic when judge is unavailable", () => {
    const caseItem = {
      case_id: "p02-easy-math",
      category: "easy-short",
      difficulty_bucket: "easy",
      benchmark_eligible: true,
      capability_targets: ["instruction_following"],
      messages: [{ role: "user", content: "2+2" }],
      max_tokens: 8,
      expected_response: "4",
      grading_criteria: "number only",
      accept_patterns: ["^4$"],
    } as const;

    const grade = gradeBenchmarkCase({
      caseItem,
      actualResponse: "4",
      judgeUnavailable: true,
    });
    expect(grade.method).toBe("heuristic");
    expect(grade.score).toBe(1);
    expect(grade.rationale).toContain("[judge_unavailable]");
  });

  test("allows judge endpoint to overlap benchmark subjects without guard errors", () => {
    const caseItem = {
      case_id: "h01-implement-two-sum",
      category: "code-implementation",
      difficulty_bucket: "hard",
      benchmark_eligible: true,
      capability_targets: ["code_generation"],
      messages: [{ role: "user", content: "two sum" }],
      max_tokens: 128,
      expected_response: "function twoSum",
      grading_criteria: "correct code",
    } as const;
    const endpointIds = ["moonshot.kimi", "local.lfm"];
    const judgeEndpointId = "moonshot.kimi";
    expect(endpointIds.includes(judgeEndpointId)).toBe(true);
    expect(() =>
      buildJudgeRequestMessages(caseItem, '{"code":"function twoSum() {}"}', []),
    ).not.toThrow();
  });

  test("buildHeuristicCompareRanking orders endpoints by per-case score", () => {
    const ranking = buildHeuristicCompareRanking([
      { endpointId: "local.lfm", perCaseScore: 0.3 },
      { endpointId: "remote.kimi", perCaseScore: 0.8 },
    ]);
    expect(ranking.relativeRanking).toEqual(["remote.kimi", "local.lfm"]);
    expect(ranking.rationale).toContain("[compare_unavailable]");
  });

  test("grades exact expected responses with heuristic score 1", () => {
    const caseItem = {
      case_id: "p02-easy-math",
      category: "easy-short",
      difficulty_bucket: "easy",
      benchmark_eligible: true,
      capability_targets: ["instruction_following"],
      messages: [{ role: "user", content: "2+2" }],
      max_tokens: 8,
      expected_response: "4",
      grading_criteria: "number only",
      accept_patterns: ["^4$"],
    } as const;

    const grade = gradeBenchmarkCase({
      caseItem,
      actualResponse: "4",
    });
    expect(grade.score).toBe(1);
    expect(grade.method).toBe("heuristic");
  });
});
