import { readFileSync } from "node:fs";

import { describe, expect, test } from "vitest";

import { finaliseRefusalDispositionDetail } from "../src/cli.js";

/**
 * Run 108 addendum-01 A5.3 — a forced finalise refusal must show ITS reason in the disposition.
 *
 * At baseline the refusal detail reached the metric tag only (recordFinaliseRefusal); the capture's
 * replay disposition row stayed "deferred" forever in the queue plane. These RED tests pin the fix:
 * the refusal class is extracted from the thrown error (bounded), written as a named terminal
 * disposition row on the FIRST refusal by the resume completion (which then rethrows so the sweep's
 * attempt accounting and abandoned-entry terminalization are untouched), and the reason travels in
 * the disposition `detail` the operator surface renders.
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

  test("the resume completion writes the refusal reason into the replay disposition and rethrows", () => {
    const source = readFileSync(new URL("../src/cli.ts", import.meta.url), "utf8");
    const start = source.indexOf("complete: async (entry) => {");
    const end = source.indexOf("onAbandoned: async (entry, error) => {", start);
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    const block = source.slice(start, end);
    // The first-refusal write: the bounded refusal class feeds the named disposition row.
    expect(block).toContain("finaliseRefusalDispositionDetail(");
    expect(block).toContain("recordReplayDisposition({");
    expect(block).toContain('refusalCode: "evaluation_finalise_refused"');
    expect(block).toContain('outcome: "refused"');
    // The error is rethrown so the sweep's attempt accounting is unchanged.
    expect(block).toContain("throw error;");
  });
});
