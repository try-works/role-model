import { describe, expect, test } from "vitest";

import { BENCHMARK_SUBJECT_SYSTEM_PROMPT, augmentCaseMessages } from "../src/index.ts";

describe("subject prompt", () => {
  test("augmentCaseMessages uses model-agnostic JSON-only subject system prompt", () => {
    const messages = augmentCaseMessages({
      case_id: "h01-implement-two-sum",
      category: "code-implementation",
      messages: [{ role: "user", content: "Implement two sum." }],
    });
    const system = messages[0];
    expect(system?.role).toBe("system");
    expect(String(system?.content)).toContain(BENCHMARK_SUBJECT_SYSTEM_PROMPT);
    expect(String(system?.content)).toContain("No chain-of-thought");
    expect(String(system?.content)).not.toMatch(/moonshot|kimi|lfm/i);
  });
});
