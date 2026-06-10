import { describe, expect, test } from "vitest";

import {
  looksLikeReasoningPreamble,
  needsFinalAnswerFollowUp,
  readBenchmarkContentText,
  readCompareGradingText,
  readJudgeGradingText,
  readJudgeResponseText,
} from "./benchmark-reasoning.js";

describe("benchmark-reasoning", () => {
  test("detects reasoning-only responses that need a follow-up turn", () => {
    const result = {
      outputText: "",
      reasoningText: "The user wants a TypeScript guard function.",
    };
    expect(readBenchmarkContentText(result)).toBe("");
    expect(needsFinalAnswerFollowUp(result)).toBe(true);
  });

  test("accepts final code answers without follow-up", () => {
    const result = {
      contentText: "```ts\nexport function guard() { return true; }\n```",
    };
    expect(needsFinalAnswerFollowUp(result)).toBe(false);
  });

  test("readJudgeResponseText merges reasoning and content for judge parsing", () => {
    const text = readJudgeResponseText({
      reasoningText: "Analysis before grading.",
      contentText: '{"score":1,"rationale":"ok"}',
    });
    expect(text).toContain("Analysis before grading.");
    expect(text).toContain('"score":1');
  });

  test("readCompareGradingText extracts parseable compare JSON from content channel", () => {
    expect(
      readCompareGradingText({
        contentText:
          '{"relativeRanking":["moonshot.kimi","local.lfm"],"rationale":"Remote answer is stronger."}',
      }),
    ).toContain('"relativeRanking"');
  });

  test("readJudgeGradingText extracts parseable judge JSON from reasoning channel", () => {
    expect(
      readJudgeGradingText({
        reasoningText:
          'Analysis complete. {"score":0.25,"rationale":"partial tool call only"}',
      }),
    ).toContain('"score":0.25');
  });

  test("flags long reasoning preambles in content", () => {
    const text =
      "The user wants me to fix this async counter bug and return only the corrected TypeScript in one fenced code block. I should look for a mutex or serialized increment pattern because parallel awaits can race.";
    expect(looksLikeReasoningPreamble(text)).toBe(true);
  });
});
