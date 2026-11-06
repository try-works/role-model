import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  SELFCHECK_ENTRIES,
  SELFCHECK_MARKER,
  selfcheckMarker,
} from "../src/selfcheck-surface-core.js";

/**
 * R14 guard: the specimen and checksum have ONE owner. Both clients must import the shared
 * ui-parity contract and the runner must import its evaluation, never carry a hand-written copy.
 */
const repoRoot = path.resolve(import.meta.dirname, "../../../..");
const read = (relative: string) => readFileSync(path.join(repoRoot, relative), "utf8");

const appSources = [
  "role-model-router/apps/runtime-ui/app/routes/not-found.tsx",
  "role-model-router/apps/runtime-ui-next/src/view.ts",
];
const runnerSource = "scripts/runtime/parity-selfcheck-surface.mjs";

describe("selfcheck shared-source guard", () => {
  it("has one marker derived from the single specimen", () => {
    expect(SELFCHECK_MARKER).toBe(selfcheckMarker(SELFCHECK_ENTRIES));
    expect(SELFCHECK_ENTRIES.length).toBeGreaterThan(0);
  });

  for (const relative of appSources) {
    it(`${relative} imports the shared contract instead of copying it`, () => {
      const source = read(relative);
      expect(source).toContain("selfcheck-surface-core.js");
      expect(source).not.toContain("const SELFCHECK_ENTRIES = [");
      expect(source).not.toContain("0x811c9dc5");
      expect(source).not.toContain('"RM3 selfcheck surface"');
      expect(source).not.toContain('"06b996f0"');
    });
  }

  it("runner imports the shared evaluator instead of reimplementing it", () => {
    const source = read(runnerSource);
    expect(source).toContain("selfcheck-surface-core.js");
    expect(source).toContain("evaluateSelfcheckSurfaceRuns");
    expect(source).not.toContain("export const evaluateSelfcheckSurfaceRuns = ");
    expect(source).not.toContain("const SELFCHECK_ENTRIES = [");
    expect(source).not.toContain("0x811c9dc5");
  });
});
