import { describe, expect, it } from "vitest";
import { shouldShortcutToHard } from "../src/index.js";

describe("run106 turn-aware hard shortcut", () => {
  it("does NOT shortcut a trivial tool-bearing follow-up", () => {
    expect(shouldShortcutToHard({ toolCount: 2, codeOrSchemaBurden: true, instructionConstraintCount: 1, decompositionKeywordCount: 1 })).toBe(false);
  });
  it("shortcuts a genuinely complex tool-bearing request", () => {
    expect(shouldShortcutToHard({ toolCount: 2, codeOrSchemaBurden: true, instructionConstraintCount: 5, decompositionKeywordCount: 1 })).toBe(true);
  });
  it("shortcuts a heavy decomposition request", () => {
    expect(shouldShortcutToHard({ toolCount: 1, codeOrSchemaBurden: true, instructionConstraintCount: 0, decompositionKeywordCount: 4 })).toBe(true);
  });
  it("never shortcuts a tool-free ask", () => {
    expect(shouldShortcutToHard({ toolCount: 0, codeOrSchemaBurden: true, instructionConstraintCount: 9, decompositionKeywordCount: 9 })).toBe(false);
  });
});
