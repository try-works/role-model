/**
 * Run 101 addendum 03 - one scoped evaluation resume, three meanings.
 *
 * Measured live on `stage-rc-7567799e7105` (`:3457`) with the evaluation plane
 * on `queue`: the first handoff the worker claimed answered
 * `{resumed:0, completed:0, failed:0, outsideRetentionWindow:0, remaining:0}` -
 * the sweep, or an earlier attempt, had already finalized it - and the strict
 * "made no progress is a failure" rule spent all four attempts and left a
 * permanent `failed` row (`evaluation:replay:551757187…`) for work that was
 * already done.
 *
 * RED at the pre-repair revision (`ba88fab9`): `evaluationAttemptOutcome` does
 * not exist, so this file fails to import.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { evaluationAttemptOutcome } from "../src/queue-runtime/evaluation.js";

const here = path.dirname(fileURLToPath(import.meta.url));

function result(overrides: Partial<Record<string, number>> = {}) {
  return {
    resumed: 0,
    completed: 0,
    failed: 0,
    outsideRetentionWindow: 0,
    remaining: 0,
    ...overrides,
  };
}

describe("@recursive:101-effect-mq-queue-rebuild addendum03 evaluation worker outcome", () => {
  it("acks a handoff that has nothing left to resume", () => {
    expect(evaluationAttemptOutcome(result())).toBe("no-op");
  });

  it("retries only while the store still holds work", () => {
    expect(evaluationAttemptOutcome(result({ remaining: 2 }))).toBe("retry");
  });

  it("counts every progressing transition, including the retention verdict", () => {
    expect(evaluationAttemptOutcome(result({ resumed: 1 }))).toBe("progressed");
    expect(evaluationAttemptOutcome(result({ completed: 1, remaining: 3 }))).toBe("progressed");
    expect(evaluationAttemptOutcome(result({ failed: 1 }))).toBe("progressed");
    expect(evaluationAttemptOutcome(result({ outsideRetentionWindow: 1 }))).toBe("progressed");
  });

  it("keeps the host on the helper rather than re-deriving the rule", () => {
    const source = readFileSync(path.join(here, "..", "src", "cli.ts"), "utf8");
    expect(source).toMatch(/evaluationAttemptOutcome\(result\) === "retry"/);
    expect(source).not.toMatch(/result\.resumed \+ result\.completed \+ result\.failed/);
  });
});
