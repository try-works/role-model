import { readFileSync } from "node:fs";

import { describe, expect, test } from "vitest";

/**
 * Run 108 addendum-01 A5.1 — per-stage span coverage across the four chains.
 *
 * At baseline only TWO span sites existed (eval.finalise_refusal, config.judge_placement), so the
 * REPLAY and LEARNER chains carried no span stage. These RED tests pin the two new sync wraps:
 * the replay admission decision (cli.ts, the decideReplayAdmission funnel) and the learner sweep
 * summary point (track-b-auto-replay-runtime.ts, the runLivenessSweeps return). The ROUTER chain's
 * decision recording lives in track-b-runtime.ts (outside this package slice's write scope) and is
 * reported separately to the Lead.
 *
 * The wraps must stay SYNC (withStageSpan is sync-only), so the pinned blocks must not contain an
 * await between the span open and the wrapped stage.
 */
const cliSource = (): string => readFileSync(new URL("../src/cli.ts", import.meta.url), "utf8");
const autoReplaySource = (): string =>
  readFileSync(new URL("../src/track-b-auto-replay-runtime.ts", import.meta.url), "utf8");

describe("run108 A5.1 span coverage", () => {
  test("the replay admission decision runs under one sync replay.admission span", () => {
    const source = cliSource();
    const spanAt = source.indexOf('withStageSpan("replay.admission"');
    expect(spanAt).toBeGreaterThan(0);
    // The span wraps the admission decision AND its metric record in one sync block: the decision
    // call sits inside the wrap and the counter update follows it with no await between.
    const recordAt = source.indexOf('recordReplayAdmission("replay"', spanAt);
    expect(recordAt).toBeGreaterThan(spanAt);
    const block = source.slice(spanAt, recordAt);
    expect(block).toContain("decideReplayAdmission({");
    expect(block).not.toMatch(/\bawait\b/);
  });

  test("the learner sweep summary runs under one sync learner.sweep_summary span", () => {
    const source = autoReplaySource();
    // The wrap is multi-line, so locate the stage name and the span helper that owns it.
    const stageAt = source.indexOf('"learner.sweep_summary"');
    expect(stageAt).toBeGreaterThan(0);
    const spanAt = source.lastIndexOf("withStageSpan(", stageAt);
    expect(spanAt).toBeGreaterThan(0);
    const recordAt = source.indexOf("recordLearnerDerivation(", stageAt);
    expect(recordAt).toBeGreaterThan(spanAt);
    expect(source.slice(spanAt, recordAt)).not.toMatch(/\bawait\b/);
  });

  test("the auto-replay runtime imports the span helper from the observability spine", () => {
    const source = autoReplaySource();
    expect(source).toMatch(
      /import \{ recordLearnerDerivation, withStageSpan \} from "\.\/run108-observability\.js";/,
    );
  });

  test("the existing eval.finalise_refusal site stays in place (EVAL chain coverage)", () => {
    const source = cliSource();
    expect(source).toContain('withStageSpan("eval.finalise_refusal", { guard: "finalise" }');
  });
});
