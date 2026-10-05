import { describe, expect, it } from "vitest";

import { resolvePostObservationReleaseId } from "../src/cli.js";
import { normalizeRun88RuntimeCorrelation } from "../src/track-b-runtime.js";

/**
 * Run 99 R33 live finding (stage release swap, `:3457`).
 *
 * Deploying the rebuilt stage runtime failed its whole backend initialization with
 *
 *   `runtime backend initialization failed Error: Run 88 correlation release identity mismatch`
 *
 * because the durable post-observation outbox still held observations recorded by the *previous*
 * release: the drain validated each stored correlation against the currently packaged release id,
 * so a legitimate backlog row from release N-1 blocked release N from starting at all (the runtime
 * then had to be rolled back to the previous release to keep serving traffic).
 *
 * A backlog row's correlation is provenance of the release that produced it, so the drain validates
 * it against its own release identity while live observations keep using the packaged release. The
 * correlation is never rewritten: the receipt keeps naming the release that actually served the
 * request.
 */

const olderRelease = `sha256:${"a".repeat(64)}`;
const packagedRelease = `sha256:${"b".repeat(64)}`;

describe("run99 R33 post-observation release identity", () => {
  it("validates a durable backlog observation against the release that produced it", () => {
    expect(
      resolvePostObservationReleaseId({
        packagedReleaseId: packagedRelease,
        correlationReleaseId: olderRelease,
      }),
    ).toBe(olderRelease);
  });

  it("keeps the packaged release for a live observation with no recorded correlation", () => {
    expect(
      resolvePostObservationReleaseId({
        packagedReleaseId: packagedRelease,
        correlationReleaseId: undefined,
      }),
    ).toBe(packagedRelease);
  });

  it("keeps the packaged release when the recorded release identity is malformed", () => {
    for (const malformed of ["", "nope", `sha256:${"c".repeat(8)}`, 42]) {
      expect(
        resolvePostObservationReleaseId({
          packagedReleaseId: packagedRelease,
          correlationReleaseId: malformed,
        }),
      ).toBe(packagedRelease);
    }
  });

  it("accepts an earlier release's backlog row and still refuses a foreign correlation", () => {
    const backlogCorrelation = {
      schemaVersion: "run88-correlation.v1",
      eventId: "evt-1",
      correlationId: `corr-${"1".repeat(24)}`,
      traceId: "1".repeat(32),
      spanId: "1".repeat(16),
      causalParentId: "decision:backlog",
      service: "role-model-stage",
      operation: "route:forward",
      runtimeChannel: "staging",
      scopeHash: `sha256:${"d".repeat(64)}`,
      cohort: "stage",
      releaseId: olderRelease,
      sourceId: "e".repeat(40),
      deploymentId: "local-stage:executable",
      attempt: 1,
      outcome: "success",
      timestamp: new Date(0).toISOString(),
      durationMs: 1,
    };
    const resolved = resolvePostObservationReleaseId({
      packagedReleaseId: packagedRelease,
      correlationReleaseId: backlogCorrelation.releaseId,
    });
    expect(() =>
      normalizeRun88RuntimeCorrelation(backlogCorrelation, resolved as string),
    ).not.toThrow();
    expect(() => normalizeRun88RuntimeCorrelation(backlogCorrelation, packagedRelease)).toThrow(
      /release identity mismatch/i,
    );
  });
});
