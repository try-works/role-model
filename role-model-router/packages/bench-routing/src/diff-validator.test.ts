import { describe, expect, test } from "vitest";

import {
  capJudgeScoreForInvalidDeliverable,
  deliverableHasInvalidPatch,
  isPlaceholderUnifiedDiff,
} from "./diff-validator.ts";

const P17_LFM_DELIVERABLE = JSON.stringify(
  {
    tool_calls: [
      { name: "read_file", arguments: { path: "src/router.ts" } },
      { name: "apply_patch", arguments: { patch: "----/+++" } },
    ],
    answer: "what schema fields and tests you validated",
  },
  null,
  2,
);

describe("diff-validator", () => {
  test("rejects placeholder unified diff markers", () => {
    expect(isPlaceholderUnifiedDiff("----/+++")).toBe(true);
    expect(isPlaceholderUnifiedDiff("[file header]")).toBe(true);
    expect(
      isPlaceholderUnifiedDiff(
        "--- a/src/router.ts\n+++ b/src/router.ts\n@@ -1,3 +1,3 @@\n-MODE=fast\n+MODE=difficulty\n",
      ),
    ).toBe(false);
  });

  test("detects invalid patch arguments inside deliverable JSON", () => {
    expect(deliverableHasInvalidPatch(P17_LFM_DELIVERABLE)).toBe(true);
  });

  test("caps p17 LFM judge score below 0.5 when placeholder diff present", () => {
    const capped = capJudgeScoreForInvalidDeliverable({
      score: 1,
      rationale: "Tools present.",
      deliverable: P17_LFM_DELIVERABLE,
    });
    expect(capped.score).toBeLessThan(0.5);
    expect(capped.rationale).toContain("capped");
  });
});
