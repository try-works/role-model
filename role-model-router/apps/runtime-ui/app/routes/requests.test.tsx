import { readFileSync } from "node:fs";

import { describe, expect, test } from "vitest";

const source = readFileSync(new URL("./requests.tsx", import.meta.url), "utf8");

describe("run 106 R11 request surface truthfulness", () => {
  test("shows the endpoint's effective reasoning effort, not just its label", () => {
    expect(source).toContain("formatEffectiveEffortDisclosure");
    expect(source).not.toContain("formatReasoningEffortLabel(request.reasoningEffort)");
  });
});
