import { describe, expect, test } from "vitest";

import { selectReplayCandidates } from "../src/track-b-replay-policy";

/**
 * Run 98 addendum 33 S3 (the research §3: the comparison graph is a star through one arm, so three of six
 * candidate pairs have never been compared directly; "rotate which candidate serves as the reference
 * across prompts so the graph becomes connected").
 *
 * The live store reproduced the shape: 465 of 465 pair rows passed through one arm. The selection walked
 * the configured list in order and always took the first eligible endpoint, so every capture compared the
 * same two candidates. It now rotates deterministically with the capture, so one source is paired with
 * different counterfactuals across captures.
 */

const configured = ["endpoint:alpha", "endpoint:beta", "endpoint:gamma", "endpoint:delta"];

describe("run98 A33 S3 replay candidate rotation", () => {
  test("different captures select different counterfactuals", () => {
    const selected = new Set(
      Array.from({ length: 12 }, (_, index) =>
        selectReplayCandidates({
          configuredEndpointIds: configured,
          sourceEndpointId: "endpoint:source",
          rotationKey: `capture:${index}`,
          cap: 1,
        })[0],
      ),
    );
    expect(selected.size).toBeGreaterThan(1);
  });

  test("the rotation covers every candidate instead of favouring one", () => {
    const counts = new Map<string, number>();
    for (let index = 0; index < 40; index += 1) {
      const [first] = selectReplayCandidates({
        configuredEndpointIds: configured,
        sourceEndpointId: "endpoint:source",
        rotationKey: `capture:${index}`,
        cap: 1,
      });
      counts.set(first, (counts.get(first) ?? 0) + 1);
    }
    expect([...counts.keys()].sort()).toEqual([...configured].sort());
    const values = [...counts.values()];
    expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(6);
  });

  test("rotation is deterministic per capture and never selects the source or an excluded endpoint", () => {
    const first = selectReplayCandidates({
      configuredEndpointIds: configured,
      sourceEndpointId: "endpoint:alpha",
      excludedEndpointIds: ["endpoint:beta"],
      rotationKey: "capture:stable",
      cap: 2,
    });
    const second = selectReplayCandidates({
      configuredEndpointIds: configured,
      sourceEndpointId: "endpoint:alpha",
      excludedEndpointIds: ["endpoint:beta"],
      rotationKey: "capture:stable",
      cap: 2,
    });
    expect(second).toEqual(first);
    expect(first).not.toContain("endpoint:alpha");
    expect(first).not.toContain("endpoint:beta");
  });
});
