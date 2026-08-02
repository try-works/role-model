import { describe, expect, it } from "vitest";
import { validateRun88PrivateDistributionIdentity } from "../src/kw-private-loader.js";
import { normalizeRun88RuntimeCorrelation } from "../src/track-b-runtime.js";
import { runPublicRuntimeAcceptanceProbe } from "./run88-public-runtime-probes.js";

const ids = [
  "R4-AC06",
  "R5-AC01",
  "R7-AC03",
  "R8-AC03",
  "R10-AC01",
  "R10-AC03",
  "R10-AC04",
  "R10-AC05",
  "R11-AC05",
];
const releaseId = `sha256:${"a".repeat(64)}`;
const envelope = {
  schemaVersion: "run88-correlation.v1",
  eventId: "event",
  correlationId: "correlation",
  traceId: "1".repeat(32),
  spanId: "2".repeat(16),
  causalParentId: "root",
  service: "runtime-host-bridge",
  operation: "private.invoke",
  runtimeChannel: "staging",
  scopeHash: `sha256:${"3".repeat(64)}`,
  cohort: "stage-1pct",
  releaseId,
  sourceId: "4".repeat(40),
  deploymentId: "local-stage",
  attempt: 1,
  outcome: "accepted",
  timestamp: "2026-08-02T00:00:00.000Z",
  durationMs: 1,
};

describe("Run 88 public runtime regressions", () => {
  for (const acceptanceId of ids) {
    it(`RUN88-R-PUB-${acceptanceId}`, () =>
      runPublicRuntimeAcceptanceProbe(acceptanceId, "regression"));
  }
});
