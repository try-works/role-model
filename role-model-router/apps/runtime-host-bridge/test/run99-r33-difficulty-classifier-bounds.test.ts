import { describe, expect, it } from "vitest";

import { buildDifficultyClassifierMessages } from "../src/index.js";

/**
 * Run 99 R33 live finding (stage v145, reported by the operator's DSH agent):
 *
 *   `This turn failed — pi-ai detected context overflow for model "difficulty.remote-only"`
 *   (`CONTEXT_WINDOW_EXCEEDED`)
 *
 * The difficulty classifier serialized the *entire* request transcript into its own prompt
 * (`JSON.stringify({ rubricSignals, messages }, null, 2)`), so a multi-megabyte coding-agent turn
 * overflowed the classifier model's context window and the whole turn failed before routing. The
 * classifier only needs the rubric signals plus a bounded excerpt of the transcript.
 */
describe("run99 R33 difficulty classifier input bounds", () => {
  const signals = {
    promptTokens: 100,
    messageCount: 3,
    toolCount: 0,
    hasImages: false,
    hasCodeFence: true,
    hasAttachments: false,
    conversationTurns: 1,
    requiredCapabilities: [],
  } as never;

  it("keeps a small transcript intact", () => {
    const messages = [
      { role: "system", content: "be terse" },
      { role: "user", content: "add a test for the parser" },
    ] as never;
    const built = buildDifficultyClassifierMessages({ messages, signals });
    expect(built).toHaveLength(2);
    expect(built[1].content).toContain("add a test for the parser");
  });

  it("bounds a multi-megabyte transcript instead of overflowing the classifier", () => {
    const filler = "x".repeat(64 * 1024);
    const messages = Array.from({ length: 40 }, (_, index) => ({
      role: index % 2 === 0 ? "user" : "assistant",
      content: `message-${index}:${filler}`,
    })) as never;

    const built = buildDifficultyClassifierMessages({ messages, signals });
    const bytes = Buffer.byteLength(JSON.stringify(built));

    expect(built).toHaveLength(2);
    expect(bytes).toBeLessThanOrEqual(64 * 1024);
    // The newest turn is what difficulty is judged on, so its tail survives the bound.
    expect(built[1].content).toContain("message-39:");
    // The classifier still receives the rubric signals it is asked to reason about.
    expect(built[1].content).toContain("rubricSignals");
    // Truncation is explicit, never silent.
    expect(built[1].content).toMatch(/truncated|omitted/i);
  });
});
