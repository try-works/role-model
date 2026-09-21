import { describe, expect, it } from "vitest";

import { selectFinalizeBinding } from "../src/track-b-runtime.js";

/**
 * Run 99 R33 live finding (stage v167): with the durable scores reused, every resumed comparison
 * stopped at the extension's finalize guard
 *
 *   `submitted trials with matching durable comparability and holdout evidence required`
 *
 * because the resumed run passed the comparability and holdout it re-derived, while the durable trial
 * rows were written against the job's immutable tuple. For a durable job that tuple is the authority.
 */

describe("run99 R33 durable finalize binding", () => {
  it("prefers the stored job's comparability and holdout", () => {
    const stored = {
      comparability: { taskRef: "artifact:stored-task", inputRef: "artifact:stored-input" },
      holdout: {
        holdoutId: "sha256:stored",
        membershipDigest: "sha256:stored-membership",
        partition: "holdout",
        caseIds: ["replay:job:0", "replay:job:1"],
      },
    };
    const derivedComparability = { taskRef: "artifact:derived-task" };
    const derivedHoldout = { holdoutId: "sha256:derived", caseIds: ["replay:job:0"] };
    const binding = selectFinalizeBinding({
      storedJob: stored,
      comparability: derivedComparability,
      holdout: derivedHoldout,
    });
    expect(binding.comparability).toEqual(stored.comparability);
    expect(binding.holdout).toEqual(stored.holdout);
  });

  it("falls back to the derived binding when the durable job carries none", () => {
    const derivedComparability = { taskRef: "artifact:derived-task" };
    const derivedHoldout = { holdoutId: "sha256:derived", caseIds: ["replay:job:0"] };
    for (const storedJob of [null, undefined, {}, { comparability: "nope", holdout: 42 }]) {
      const binding = selectFinalizeBinding({
        storedJob,
        comparability: derivedComparability,
        holdout: derivedHoldout,
      });
      expect(binding.comparability).toEqual(derivedComparability);
      expect(binding.holdout).toEqual(derivedHoldout);
    }
  });
});
