import { describe, expect, it } from "vitest";

import {
  SELFCHECK_ENTRIES,
  SELFCHECK_ROUTE,
  evaluateSelfcheckSurfaceRuns,
  selfcheckMarker,
} from "../src/selfcheck-surface.js";

/**
 * R14 selfcheck surface contract. The surface is a served, deterministic marker both clients must
 * expose; the marker is a checksum over an ordered semantic specimen, not a copied constant.
 */
describe("selfcheck surface", () => {
  it("publishes the fixed route and a deterministic checksum over the specimen", () => {
    expect(SELFCHECK_ROUTE).toBe("/selfcheck");
    const marker = selfcheckMarker(SELFCHECK_ENTRIES);
    expect(marker).toMatch(/^[0-9a-f]{8}$/);
    expect(selfcheckMarker(SELFCHECK_ENTRIES)).toBe(marker);
    expect(selfcheckMarker([...SELFCHECK_ENTRIES].reverse())).toBe(marker);
    expect(selfcheckMarker([...SELFCHECK_ENTRIES, { key: "extra", value: "changed" }])).not.toBe(
      marker,
    );
  });

  it("reports 0DIFF only when both clients expose the same marker and every specimen entry twice", () => {
    const marker = selfcheckMarker(SELFCHECK_ENTRIES);
    const capture = (targetId) => ({ entries: SELFCHECK_ENTRIES, marker, targetId });
    const result = evaluateSelfcheckSurfaceRuns({
      chromeAvailable: true,
      runs: [
        [capture("react"), capture("foldkit")],
        [capture("react"), capture("foldkit")],
      ],
    });
    expect(result.status).toBe("PASSED");
    expect(result.verdict).toBe("0DIFF");
    expect(result.route).toBe("/selfcheck");
    expect(result.comparisons.reactVsFoldkit).toMatchObject({ equal: true, marker });
    expect(result.comparisons.deterministic).toMatchObject({ equal: true });
  });

  it("fails on a marker or specimen divergence instead of forcing a pass", () => {
    const marker = selfcheckMarker(SELFCHECK_ENTRIES);
    const react = { entries: SELFCHECK_ENTRIES, marker, targetId: "react" };
    const foldkit = {
      entries: SELFCHECK_ENTRIES.map((entry) =>
        entry.key === "badge" ? { ...entry, value: "LIGHT" } : entry,
      ),
      marker,
      targetId: "foldkit",
    };
    const result = evaluateSelfcheckSurfaceRuns({
      chromeAvailable: true,
      runs: [
        [react, foldkit],
        [react, foldkit],
      ],
    });
    expect(result.status).toBe("FAILED");
    expect(result.reason).toMatch(/entry-mismatch|marker-mismatch/);
  });

  it("reports NOT_RUN without a browser or a capture, never a fabricated 0DIFF", () => {
    const noBrowser = evaluateSelfcheckSurfaceRuns({ chromeAvailable: false, runs: [] });
    expect(noBrowser.status).toBe("NOT_RUN");
    expect(noBrowser.reason).toBe("no-browser-available");
    const noCapture = evaluateSelfcheckSurfaceRuns({ chromeAvailable: true, runs: [] });
    expect(noCapture.status).toBe("NOT_RUN");
    expect(noCapture.reason).toBe("no-capture");
  });
});
