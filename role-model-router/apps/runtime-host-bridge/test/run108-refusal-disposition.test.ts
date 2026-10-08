import { readFileSync } from "node:fs";

import { describe, expect, test } from "vitest";

import { finaliseRefusalDispositionDetail } from "../src/cli.js";

/**
 * Run 108 addendum-01 A5.3 — a forced finalise refusal must show ITS reason in the disposition, and
 * must NOT retire the capture before the deferral budget has run.
 *
 * At baseline the refusal detail reached the metric tag only (recordFinaliseRefusal) while the
 * capture's replay disposition row stayed "deferred" for ever in the queue plane. The first fix wrote
 * the row as `refused` — but `refused` is TERMINAL in the disposition store
 * (`shared/capture/replay-disposition.mjs` TERMINAL_OUTCOMES = {replayed, refused}, and `pending()`
 * skips terminal rows), so a FIRST refusal retired the capture immediately and nulled the row's
 * counters, contradicting the claim that the sweep's attempt accounting was unchanged (run 108 03.5
 * review MJ-2). These RED tests pin the repair: the refusal class is extracted from the thrown error
 * (bounded) and recorded through the non-terminal writer, and the sweep still rethrows so its attempt
 * accounting and abandoned-entry terminalization are untouched. The behavioural half of the pin (the
 * capture stays pending, the reason stays operator-readable, and the store's own deferral budget still
 * retires it with the reason preserved) lives in run108-addendum01-a53-refusal-nonterminal.test.ts.
 */
describe("run108 A5.3 finalise refusal disposition", () => {
  test("finaliseRefusalDispositionDetail returns the bounded detail for the refusal class", () => {
    const message =
      "durable replay evaluation did not finalize a valid comparison: state=completed outcome=absent group=absent keys=comparison,evaluation";
    expect(finaliseRefusalDispositionDetail(new Error(message))).toBe(message);
  });

  test("finaliseRefusalDispositionDetail returns null for every other failure class", () => {
    expect(
      finaliseRefusalDispositionDetail(new Error("resumed handoff evidence is unreadable: x")),
    ).toBeNull();
    expect(
      finaliseRefusalDispositionDetail(
        "durable replay evaluation is missing branch capture for arm-1",
      ),
    ).toBeNull();
    expect(finaliseRefusalDispositionDetail(null)).toBeNull();
    expect(finaliseRefusalDispositionDetail(undefined)).toBeNull();
  });

  test("finaliseRefusalDispositionDetail bounds the detail to the disposition text budget", () => {
    const long = `durable replay evaluation did not finalize a valid comparison: ${"x".repeat(2000)}`;
    const detail = finaliseRefusalDispositionDetail(new Error(long));
    expect(detail).not.toBeNull();
    expect((detail as string).length).toBeLessThanOrEqual(360);
    expect((detail as string).startsWith("durable replay evaluation did not finalize")).toBe(true);
  });

  test("the resume completion records the refusal through the NON-TERMINAL writer and rethrows", () => {
    const source = readFileSync(new URL("../src/cli.ts", import.meta.url), "utf8");
    const start = source.indexOf("complete: async (entry) => {");
    const end = source.indexOf("onAbandoned: async (entry, error) => {", start);
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    const block = source.slice(start, end);
    // The first-refusal write: the bounded refusal class feeds the named disposition row.
    expect(block).toContain("finaliseRefusalDispositionDetail(");
    expect(block).toContain("recordReplayDisposition(");
    expect(block).toContain("finaliseRefusalDispositionWrite(");
    // MJ-2: `refused` is terminal, so a first refusal must not spell one here. The store's own deferral
    // budget (applyReplayDeferralBudget, applied by the operations service on every deferred write) owns
    // the moment the capture is retired.
    expect(block).not.toContain('outcome: "refused"');
    // The error is rethrown so the sweep's attempt accounting is unchanged.
    expect(block).toContain("throw error;");
  });
});
