import { describe, expect, it } from "vitest";

import { isEvaluationJobIdempotencyConflict } from "../src/track-b-runtime.js";

/**
 * Run 99 R33 live finding (stage v161): a resumed supervised-replay completion re-presents the
 * durable evaluation job and the extension answers `evaluation job idempotency conflict` because a
 * re-derived attestation or proof changes the canonical bytes. The durable job is the authority for
 * that comparison, so the pipeline continues with the stored job — while every other failure (a
 * storage fault, a scope mismatch, an unsupported build) still fails closed.
 */
describe("run99 R33 evaluation job idempotency tolerance", () => {
  it("recognizes the durable-job conflict and nothing else", () => {
    expect(isEvaluationJobIdempotencyConflict(new Error("evaluation job idempotency conflict"))).toBe(
      true,
    );
    expect(
      isEvaluationJobIdempotencyConflict(
        new Error("extension evaluation-core failed: evaluation job idempotency conflict"),
      ),
    ).toBe(true);
    expect(isEvaluationJobIdempotencyConflict(new Error("evaluation job not found"))).toBe(false);
    expect(
      isEvaluationJobIdempotencyConflict(
        new Error("durable evaluation holdout membership mismatch"),
      ),
    ).toBe(false);
    expect(isEvaluationJobIdempotencyConflict("idempotency conflict")).toBe(true);
    expect(isEvaluationJobIdempotencyConflict(undefined)).toBe(false);
  });
});
