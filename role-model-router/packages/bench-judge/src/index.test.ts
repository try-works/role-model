import { describe, expect, test } from "vitest";

import {
  buildCompareGradingPrompt,
  buildJudgeGradingPrompt,
  extractCompareGradingJsonText,
  extractJudgeGradingJsonText,
  parseCompareGradingResponse,
  parseJudgeGradingResponse,
} from "./index.ts";

const P17_BRIEF = {
  questionTranscript: "[user]\nAPI workflow: read_file src/router.ts, apply_patch minimal diff",
  exemplarAnswer: '{"tool_calls":[{"name":"read_file"}]}',
  exemplarQuality: "authored" as const,
  deliverablesChecklist: [
    "[MUST] Must call read_file and apply_patch",
    "[MUST] apply_patch must contain either ---/+++ headers plus an @@ hunk marker and real change content, or a valid Codex patch envelope with real content; line numbers are optional and bare @@ is acceptable",
  ],
  antiPatterns: ["MUST NOT use diff placeholders (----/+++, [file header])"],
};

const P17_LFM_DELIVERABLE = JSON.stringify(
  {
    tool_calls: [
      { name: "read_file", arguments: { path: "src/router.ts" } },
      { name: "apply_patch", arguments: { diff: "----/+++" } },
    ],
    answer: "what schema fields and tests you validated",
  },
  null,
  2,
);

describe("bench-judge grading prompts", () => {
  test("buildJudgeGradingPrompt includes structured briefing sections for p17", () => {
    const prompt = buildJudgeGradingPrompt({
      caseId: "p17-tools-multi-hard",
      expectedResponse: "read_file and apply_patch tool calls plus validation plan",
      gradingCriteria: "Must call read_file and apply_patch",
      actualResponse: P17_LFM_DELIVERABLE,
      formattedDeliverable: P17_LFM_DELIVERABLE,
      briefing: P17_BRIEF,
      answerFormatInstruction: "Emit tools then JSON answer",
      requiredToolNames: ["read_file", "apply_patch"],
      structuredToolNames: ["read_file", "apply_patch"],
    });

    expect(prompt).toContain("## Original question");
    expect(prompt).toContain("## Example expected answer");
    expect(prompt).toContain("## Key deliverables");
    expect(prompt).toContain("bare @@");
    expect(prompt).not.toContain("Prompt summary:");
  });

  test("buildJudgeGradingPrompt treats recorded API tool calls as authoritative even when deliverable repeats tool_calls", () => {
    const deliverable = JSON.stringify(
      {
        tool_calls: [{ name: "run_tests", arguments: { command: "pnpm test benchmark-progress" } }],
        bullets: [
          "BenchmarkRunProgress includes runId, status, completedSteps, and totalSteps.",
          "run_tests was executed with pnpm test benchmark-progress.",
        ],
      },
      null,
      2,
    );

    const prompt = buildJudgeGradingPrompt({
      caseId: "h11-decompose-code-verify",
      expectedResponse: "Milestone bullets, BenchmarkRunProgress interface, run_tests tool call",
      gradingCriteria:
        "Structured phases; includes BenchmarkRunProgress interface fields; run_tests tool emitted.",
      actualResponse: deliverable,
      formattedDeliverable: deliverable,
      answerFormatInstruction:
        'BENCHMARK DELIVERABLE RULES:\nStep 1: emit required API tool calls. Step 2: after tools, output ONLY a ```json fence: {"bullets":["...","..."]}.',
      requiredToolNames: ["run_tests"],
      structuredToolNames: ["run_tests"],
      briefing: {
        questionTranscript:
          "[user]\nPhase 1: bullet milestones. Phase 2: write BenchmarkRunProgress. Phase 3: call run_tests.",
        exemplarAnswer: "Milestone bullets, BenchmarkRunProgress interface, run_tests tool call",
        exemplarQuality: "derived",
        deliverablesChecklist: [
          "[MUST] Structured phases",
          "[MUST] includes BenchmarkRunProgress interface fields",
          "[MUST] run_tests tool emitted.",
        ],
        antiPatterns: ["MUST NOT emit prose-only TOOL_CALL lines without API tool_calls"],
      },
    });

    expect(prompt).toContain("Actual structured tool calls from API: run_tests.");
    expect(prompt).toContain("Treat the recorded API tool-call list above as authoritative");
    expect(prompt).toContain(
      "Do not penalize the deliverable for also containing a tool_calls field",
    );
  });

  test("buildCompareGradingPrompt shares briefing sections with per-case judge", () => {
    const prompt = buildCompareGradingPrompt({
      caseId: "p17-tools-multi-hard",
      briefing: P17_BRIEF,
      gradingCriteria: "Must call read_file and apply_patch",
      models: [
        { endpointId: "lfm", deliverable: P17_LFM_DELIVERABLE, perCaseScore: 1 },
        {
          endpointId: "kimi",
          deliverable: '{"tool_calls":[{"name":"read_file"}]}',
          perCaseScore: 0,
        },
      ],
    });

    expect(prompt).toContain("## Original question");
    expect(prompt).toContain("## Key deliverables");
    expect(prompt).toContain("## Model deliverables");
  });

  test("parseJudgeGradingResponse accepts strict JSON score payloads", () => {
    const parsed = parseJudgeGradingResponse('{"score":0.8,"rationale":"Good patch."}');
    expect(parsed?.score).toBe(0.8);
    expect(parsed?.method).toBe("judge");
  });

  test("extractCompareGradingJsonText pulls compare JSON from reasoning preambles", () => {
    const extracted = extractCompareGradingJsonText(
      'Ranking complete. {"relativeRanking":["moonshot.kimi","local.lfm"],"rationale":"remote wins"}',
    );
    expect(extracted).toContain('"relativeRanking"');
    expect(parseCompareGradingResponse(extracted)?.relativeRanking).toEqual([
      "moonshot.kimi",
      "local.lfm",
    ]);
  });

  test("extractJudgeGradingJsonText pulls JSON from reasoning preambles", () => {
    const extracted = extractJudgeGradingJsonText(
      'The user wants a grade. {"score":0.25,"rationale":"partial deliverable only"}',
    );
    expect(extracted).toContain('"score":0.25');
    expect(parseJudgeGradingResponse(extracted)?.score).toBe(0.25);
  });

  test("parseJudgeGradingResponse sanitizes runaway regex-noise rationale text", () => {
    const parsed = parseJudgeGradingResponse(
      "{\"score\":1,\"rationale\":\"Good answer matching the checklist and the '+','+','+','+','+','+','+' pattern.\"}",
    );
    expect(parsed?.score).toBe(1);
    expect(parsed?.rationale).toContain("Good answer");
    expect(parsed?.rationale).not.toContain("'+','+','+'");
    expect(parsed?.rationale?.length ?? 0).toBeLessThan(200);
  });
});
