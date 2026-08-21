import { describe, expect, test } from "vitest";

import routingCapabilitySuite from "../data/routing-capability-suite.json" with { type: "json" };

import {
  buildHeuristicCompareRanking,
  buildJudgeRequestMessages,
  buildScaffoldFollowUp,
  capJudgeScoreForGroundedTruthMismatch,
  extractFormattedAnswer,
  gradeBenchmarkCase,
  selectBenchmarkCases,
  summarizeEndpointGrade,
} from "./index.ts";

describe("bench-routing", () => {
  test("defines overall as the equal-weight arithmetic mean of executed case scores", () => {
    const grade = summarizeEndpointGrade("endpoint.high", "model.flash", "remote", [
      {
        caseId: "easy-1",
        difficultyBucket: "easy",
        score: 1,
        rationale: "pass",
        gradingMethod: "judge",
        latencyMs: 10,
        actualPreview: "ok",
      },
      {
        caseId: "hard-1",
        difficultyBucket: "hard",
        score: 0.5,
        rationale: "partial",
        gradingMethod: "judge",
        latencyMs: 20,
        actualPreview: "partial",
      },
      {
        caseId: "hard-2",
        difficultyBucket: "hard",
        score: 0,
        rationale: "fail",
        gradingMethod: "judge",
        latencyMs: 30,
        actualPreview: "bad",
      },
    ]);

    expect(grade.overallScore).toBe(0.5);
    expect(grade.byDifficulty.easy).toEqual({ score: 1, cases: 1 });
    expect(grade.byDifficulty.medium).toEqual({ score: 0, cases: 0 });
    expect(grade.byDifficulty.hard).toEqual({ score: 0.25, cases: 2 });
  });

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

    expect(selectBenchmarkCases(suite, { mode: "quick" }).map((item) => item.case_id)).toEqual([
      "a",
    ]);
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

  test("normalizes binary exact answers when judge rejects casing only", () => {
    const caseItem = {
      case_id: "e01-yes-no",
      category: "easy-trivial",
      difficulty_bucket: "easy",
      benchmark_eligible: true,
      capability_targets: ["instruction_following"],
      messages: [{ role: "user", content: "Is water wet? Answer yes or no only." }],
      max_tokens: 8,
      expected_response: "yes",
      grading_criteria: "Must answer yes or no only.",
      accept_patterns: ["^yes$", "^no$"],
    } as const;

    const grade = gradeBenchmarkCase({
      caseItem,
      actualResponse: '{"answer":"Yes"}',
      requireJudge: true,
      judgeGrade: {
        score: 0,
        rationale: "Judge rejected casing.",
        method: "judge",
      },
    });

    expect(grade.method).toBe("judge");
    expect(grade.score).toBe(1);
    expect(grade.rationale).toContain("case_normalized_exact_match");
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

  test("tool workflow benchmark cases declare explicit tool requirements and answer formats", () => {
    for (const caseId of [
      "t01-tools-list-dir",
      "p16-tools-search",
      "p18-tools-agent",
      "t03-tools-agent-plan",
      "h08-multi-turn-tool-refine",
    ]) {
      const caseItem = routingCapabilitySuite.cases.find((item) => item.case_id === caseId);
      expect(caseItem?.expected_tool_names?.length).toBeGreaterThan(0);
      expect(caseItem?.answer_format).toBeTruthy();
    }
  });

  test("p15 names the grounded runtime config path directly in the prompt", () => {
    const caseItem = routingCapabilitySuite.cases.find(
      (item) => item.case_id === "p15-tools-read-one",
    );
    expect(caseItem).toBeTruthy();
    const combinedMessages = (caseItem?.messages ?? [])
      .map((message) => (typeof message.content === "string" ? message.content : ""))
      .join("\n");
    expect(combinedMessages).toContain("state/runtime-config.yaml");
  });

  test("p18 encodes repeated get_metrics calls in its expected tool contract", () => {
    const caseItem = routingCapabilitySuite.cases.find(
      (item) => item.case_id === "p18-tools-agent",
    );
    expect(caseItem).toBeTruthy();
    expect(caseItem?.expected_tool_names).toEqual(["list_endpoints", "get_metrics", "get_metrics"]);
  });

  test("e08 declares the top-level json schema it already grades against", () => {
    const caseItem = routingCapabilitySuite.cases.find(
      (item) => item.case_id === "e08-format-json",
    );
    expect(caseItem).toBeTruthy();
    expect(caseItem?.answer_format).toEqual({
      kind: "json",
      instruction:
        'Return ONLY a ```json fence: {"name":"...","value":"..."}. Do not wrap it in an `answer` field.',
      schema: {
        type: "object",
        required: ["name", "value"],
        properties: {
          name: { type: "string" },
          value: { type: "string" },
        },
        additionalProperties: false,
      },
    });
  });

  test("t03 declares explicit tool and structured summary requirements", () => {
    const caseItem = routingCapabilitySuite.cases.find(
      (item) => item.case_id === "t03-tools-agent-plan",
    );
    expect(caseItem).toBeTruthy();
    expect(caseItem?.expected_tool_names).toEqual(["read_file", "validate_schema", "apply_patch"]);
    expect(caseItem?.answer_format).toEqual({
      kind: "tool_calls_with_summary",
      instruction:
        'Step 1: emit the required API tool calls. Step 2: after tools, output ONLY a ```json fence: {"plan":["..."],"patch_summary":"...","strategy_improvements":["..."]}.',
      schema: {
        type: "object",
        required: ["plan", "patch_summary", "strategy_improvements"],
        properties: {
          plan: {
            type: "array",
            items: {
              type: "string",
            },
            minItems: 3,
          },
          patch_summary: {
            type: "string",
            minLength: 12,
          },
          strategy_improvements: {
            type: "array",
            items: {
              type: "string",
            },
            minItems: 2,
          },
        },
        additionalProperties: false,
      },
    });
  });

  test("p17 explicitly asks the final validation note to mention MODE and throughput SLA clues", () => {
    const caseItem = routingCapabilitySuite.cases.find(
      (item) => item.case_id === "p17-tools-multi-hard",
    );
    expect(caseItem).toBeTruthy();
    if (!caseItem) {
      throw new Error("Expected benchmark case p17-tools-multi-hard.");
    }

    const combinedInstruction = [
      ...(caseItem.messages ?? []).map((message) =>
        typeof message.content === "string" ? message.content : "",
      ),
      caseItem.answer_format?.instruction ?? "",
    ].join("\n");

    expect(combinedInstruction).toContain("MODE");
    expect(combinedInstruction).toContain("throughput SLA");
  });

  test("under-specified code-edit benchmark prompts include inline source context", () => {
    for (const caseId of ["p12-code-patch", "p14-schema-validate", "c01-full-refactor"]) {
      const caseItem = routingCapabilitySuite.cases.find((item) => item.case_id === caseId);
      expect(caseItem).toBeTruthy();
      const combinedMessages = (caseItem?.messages ?? [])
        .map((message) => (typeof message.content === "string" ? message.content : ""))
        .join("\n");
      expect(combinedMessages).toContain("```");
    }
  });

  test("h08 scaffold follow-up returns runtime-config content aligned to routing.strategy prompt", () => {
    const caseItem = routingCapabilitySuite.cases.find(
      (item) => item.case_id === "h08-multi-turn-tool-refine",
    );
    expect(caseItem).toBeTruthy();
    if (!caseItem) {
      throw new Error("Expected benchmark case h08-multi-turn-tool-refine.");
    }

    const extracted = extractFormattedAnswer({
      caseItem,
      rawContent: '```json {"answer":"controller"} ```',
      structuredToolNames: ["read_file"],
      toolCalls: [
        {
          function: {
            name: "read_file",
            arguments: '{"path":"state/runtime-config.yaml"}',
          },
        },
      ],
    });

    const followUp = buildScaffoldFollowUp(
      caseItem,
      caseItem.messages as Record<string, unknown>[],
      '{"answer":"controller"}',
      ["read_file"],
      extracted,
      [
        {
          function: {
            name: "read_file",
            arguments: '{"path":"state/runtime-config.yaml"}',
          },
        },
      ],
    );

    const toolMessage = followUp.find((message) => message.role === "tool");
    expect(typeof toolMessage?.content).toBe("string");
    expect(String(toolMessage?.content)).toContain("routing:");
    expect(String(toolMessage?.content)).toContain("strategy: controller");
  });

  test("caps grounded tool-case score when p15 uses the wrong path and answer", () => {
    const caseItem = routingCapabilitySuite.cases.find(
      (item) => item.case_id === "p15-tools-read-one",
    );
    expect(caseItem).toBeTruthy();
    if (!caseItem) {
      throw new Error("Expected benchmark case p15-tools-read-one.");
    }

    const capped = capJudgeScoreForGroundedTruthMismatch({
      caseItem,
      score: 1,
      rationale: "Tool call and JSON answer were present.",
      deliverable: JSON.stringify({
        tool_calls: [
          {
            name: "read_file",
            arguments: { path: "runtime_config.json" },
          },
        ],
        answer: "round_robin",
      }),
    });

    expect(capped.score).toBeLessThan(1);
    expect(capped.rationale).toContain("grounded_truth_mismatch");
  });

  test("does not cap p15 when any repeated read_file call hits the grounded path", () => {
    const caseItem = routingCapabilitySuite.cases.find(
      (item) => item.case_id === "p15-tools-read-one",
    );
    expect(caseItem).toBeTruthy();
    if (!caseItem) {
      throw new Error("Expected benchmark case p15-tools-read-one.");
    }

    const capped = capJudgeScoreForGroundedTruthMismatch({
      caseItem,
      score: 1,
      rationale: "Tool call and JSON answer were present.",
      deliverable: JSON.stringify({
        tool_calls: [
          {
            name: "read_file",
            arguments: { path: "runtime_config.json" },
          },
          {
            name: "read_file",
            arguments: { path: "state/runtime-config.yaml" },
          },
        ],
        answer: "controller",
      }),
    });

    expect(capped.score).toBe(1);
  });

  test("does not cap p15 when the grounded runtime config path is absolute", () => {
    const caseItem = routingCapabilitySuite.cases.find(
      (item) => item.case_id === "p15-tools-read-one",
    );
    expect(caseItem).toBeTruthy();
    if (!caseItem) {
      throw new Error("Expected benchmark case p15-tools-read-one.");
    }

    const capped = capJudgeScoreForGroundedTruthMismatch({
      caseItem,
      score: 1,
      rationale: "Tool call and JSON answer were present.",
      deliverable: JSON.stringify({
        tool_calls: [
          {
            name: "read_file",
            arguments: {
              path: "C:\\Users\\erikb\\AppData\\Local\\RMCS\\ws\\run\\state\\runtime-config.yaml",
            },
          },
        ],
        answer: "controller",
      }),
    });

    expect(capped.score).toBe(1);
  });

  test("caps grounded tool-case score when t01 invents filenames not present in the scaffold listing", () => {
    const caseItem = routingCapabilitySuite.cases.find(
      (item) => item.case_id === "t01-tools-list-dir",
    );
    expect(caseItem).toBeTruthy();
    if (!caseItem) {
      throw new Error("Expected benchmark case t01-tools-list-dir.");
    }

    const capped = capJudgeScoreForGroundedTruthMismatch({
      caseItem,
      score: 1,
      rationale: "Tool call and JSON answer were present.",
      deliverable: JSON.stringify({
        tool_calls: [
          {
            name: "list_dir",
            arguments: { path: "config" },
          },
        ],
        answer: "In config, the routing-related filename is routes.rb.",
      }),
    });

    expect(capped.score).toBeLessThan(1);
    expect(capped.rationale).toContain("grounded_truth_mismatch");
  });

  test("does not cap t01 when any repeated list_dir call inspects config", () => {
    const caseItem = routingCapabilitySuite.cases.find(
      (item) => item.case_id === "t01-tools-list-dir",
    );
    expect(caseItem).toBeTruthy();
    if (!caseItem) {
      throw new Error("Expected benchmark case t01-tools-list-dir.");
    }

    const capped = capJudgeScoreForGroundedTruthMismatch({
      caseItem,
      score: 1,
      rationale: "Tool call and JSON answer were present.",
      deliverable: JSON.stringify({
        tool_calls: [
          {
            name: "list_dir",
            arguments: { path: "." },
          },
          {
            name: "list_dir",
            arguments: { path: "config" },
          },
        ],
        answer: "router.yaml and routing-policy.json are the routing-related filenames.",
      }),
    });

    expect(capped.score).toBe(1);
  });

  test("does not cap t01 when list_dir inspects an absolute config path", () => {
    const caseItem = routingCapabilitySuite.cases.find(
      (item) => item.case_id === "t01-tools-list-dir",
    );
    expect(caseItem).toBeTruthy();
    if (!caseItem) {
      throw new Error("Expected benchmark case t01-tools-list-dir.");
    }

    const capped = capJudgeScoreForGroundedTruthMismatch({
      caseItem,
      score: 1,
      rationale: "Tool call and JSON answer were present.",
      deliverable: JSON.stringify({
        tool_calls: [
          {
            name: "list_dir",
            arguments: { path: "C:\\Users\\erikb\\AppData\\Local\\RMCS\\ws\\run\\config" },
          },
        ],
        answer: "router.yaml and routing-policy.json are the routing-related filenames.",
      }),
    });

    expect(capped.score).toBe(1);
  });

  test("caps p18 when routing advice cites comparison data without fetching both metric sets", () => {
    const caseItem = routingCapabilitySuite.cases.find(
      (item) => item.case_id === "p18-tools-agent",
    );
    expect(caseItem).toBeTruthy();
    if (!caseItem) {
      throw new Error("Expected benchmark case p18-tools-agent.");
    }

    const capped = capJudgeScoreForGroundedTruthMismatch({
      caseItem,
      score: 1,
      rationale: "Tool calls and recommendation were present.",
      deliverable: JSON.stringify({
        tool_calls: [
          { name: "list_endpoints", arguments: {} },
          { name: "get_metrics", arguments: { endpoint_id: "remote.deepseek-v4-flash" } },
        ],
        answer:
          "Route latency-sensitive traffic to local.lfm2.5-8b-a1b because its p95 latency is 62 ms versus 245 ms for remote.deepseek-v4-flash.",
      }),
    });

    expect(capped.score).toBe(0);
    expect(capped.rationale).toContain("grounded_truth_mismatch");
  });

  test("does not cap p18 when both metric calls are present", () => {
    const caseItem = routingCapabilitySuite.cases.find(
      (item) => item.case_id === "p18-tools-agent",
    );
    expect(caseItem).toBeTruthy();
    if (!caseItem) {
      throw new Error("Expected benchmark case p18-tools-agent.");
    }

    const capped = capJudgeScoreForGroundedTruthMismatch({
      caseItem,
      score: 1,
      rationale: "Tool calls and recommendation were present.",
      deliverable: JSON.stringify({
        tool_calls: [
          { name: "list_endpoints", arguments: {} },
          { name: "get_metrics", arguments: { endpoint_id: "local.lfm2.5-8b-a1b" } },
          { name: "get_metrics", arguments: { endpoint_id: "remote.deepseek-v4-flash" } },
        ],
        answer:
          "Keep local as default for latency-sensitive traffic and retain remote.deepseek-v4-flash as a fallback for harder requests.",
      }),
    });

    expect(capped.score).toBe(1);
  });

  test("caps h09 when the answer does not compare local and remote latency", () => {
    const caseItem = routingCapabilitySuite.cases.find(
      (item) => item.case_id === "h09-agent-metrics-chain",
    );
    expect(caseItem).toBeTruthy();
    if (!caseItem) {
      throw new Error("Expected benchmark case h09-agent-metrics-chain.");
    }

    const capped = capJudgeScoreForGroundedTruthMismatch({
      caseItem,
      score: 1,
      rationale: "Tool calls and latency sentence were present.",
      deliverable: JSON.stringify({
        tool_calls: [
          { name: "list_endpoints", arguments: {} },
          { name: "get_metrics", arguments: { endpoint_id: "local.lfm2.5-8b-a1b" } },
          { name: "get_metrics", arguments: { endpoint_id: "remote.deepseek-v4-flash" } },
        ],
        answer: "The remote endpoint p95 latency is 245 ms; local latency data was not available.",
      }),
    });

    expect(capped.score).toBe(0);
    expect(capped.rationale).toContain("grounded_truth_mismatch");
  });

  test("caps h09 when one side of the latency comparison was never fetched", () => {
    const caseItem = routingCapabilitySuite.cases.find(
      (item) => item.case_id === "h09-agent-metrics-chain",
    );
    expect(caseItem).toBeTruthy();
    if (!caseItem) {
      throw new Error("Expected benchmark case h09-agent-metrics-chain.");
    }

    const capped = capJudgeScoreForGroundedTruthMismatch({
      caseItem,
      score: 1,
      rationale: "Tool calls and comparison were present.",
      deliverable: JSON.stringify({
        tool_calls: [
          { name: "list_endpoints", arguments: {} },
          { name: "get_metrics", arguments: { endpoint_id: "remote.deepseek-v4-flash" } },
        ],
        answer:
          "The local.lfm2.5-8b-a1b endpoint has lower p95 latency than remote.deepseek-v4-flash.",
      }),
    });

    expect(capped.score).toBe(0);
    expect(capped.rationale).toContain("grounded_truth_mismatch");
  });

  test("does not cap h09 when both endpoint metrics support the grounded comparison", () => {
    const caseItem = routingCapabilitySuite.cases.find(
      (item) => item.case_id === "h09-agent-metrics-chain",
    );
    expect(caseItem).toBeTruthy();
    if (!caseItem) {
      throw new Error("Expected benchmark case h09-agent-metrics-chain.");
    }

    const capped = capJudgeScoreForGroundedTruthMismatch({
      caseItem,
      score: 1,
      rationale: "Tool calls and comparison were present.",
      deliverable: JSON.stringify({
        tool_calls: [
          { name: "list_endpoints", arguments: {} },
          { name: "get_metrics", arguments: { endpoint_id: "local.lfm2.5-8b-a1b" } },
          { name: "get_metrics", arguments: { endpoint_id: "remote.deepseek-v4-flash" } },
        ],
        answer:
          "local.lfm2.5-8b-a1b has lower p95 latency than remote.deepseek-v4-flash for this workload.",
      }),
    });

    expect(capped.score).toBe(1);
  });

  test("h09 encodes both compared get_metrics calls in its contract", () => {
    const caseItem = routingCapabilitySuite.cases.find(
      (item) => item.case_id === "h09-agent-metrics-chain",
    );
    expect(caseItem).toBeTruthy();
    if (!caseItem) {
      throw new Error("Expected benchmark case h09-agent-metrics-chain.");
    }

    expect(caseItem.expected_tool_names).toEqual(["list_endpoints", "get_metrics", "get_metrics"]);
    const combinedMessages = caseItem.messages.map((message) => message.content).join("\n");
    expect(combinedMessages).toContain("both the local and remote endpoint_ids");
    expect(caseItem.answer_format?.instruction).toContain("both compared endpoints");
  });
});
