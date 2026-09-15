import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { appendTrackBRouteAdvisoryObservation } from "../src/track-b-runtime.js";

/**
 * Run 99 R25: the live routing path and the shadow pipeline append to the same ledger from the
 * same process. Observed live on the stage runtime:
 *
 *   [run99] live advisory observation degraded: ENOENT: no such file or directory, rename
 *   '...\advisory-observations.json.23860.tmp' -> '...\advisory-observations.json'
 *
 * Both appends used the same pid-suffixed temp file, so one rename consumed the other's temp and
 * the observation was lost. The append must be safe under concurrency.
 */

const observation = (decisionId: string) => ({
  decisionId,
  routePackage: "route-package:one",
  preferredRoutePackage: "route-package:two",
  advisoryState: "fresh",
  confidence: 0.5,
  mode: "advisory_considered",
  selection: "baseline_retained",
  applied: false,
  fallbackReason: "below_confidence_floor",
  origin: "live",
  observedAtMs: 1_789_447_000_000,
});

describe("run99 R25 advisory ledger concurrency", () => {
  test("concurrent appends keep every observation and the matching totals", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "run99-r25-concurrency-"));
    try {
      const filePath = path.join(root, "advisory-observations.json");
      await Promise.all(
        Array.from({ length: 8 }, (_, index) =>
          appendTrackBRouteAdvisoryObservation({
            filePath,
            observation: observation(`decision-req-concurrent-${index}`),
          }),
        ),
      );
      const ledger = JSON.parse(await readFile(filePath, "utf8"));
      expect(ledger.entries).toHaveLength(8);
      expect(new Set(ledger.entries.map((entry: { decisionId: string }) => entry.decisionId)).size).toBe(8);
      expect(ledger.totals).toMatchObject({ observed: 8, considered: 8, applied: 0 });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
