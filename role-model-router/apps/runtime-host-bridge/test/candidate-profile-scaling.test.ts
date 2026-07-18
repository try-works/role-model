import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "vitest";

test("builds router candidates from batched profiles without per-endpoint sample history", async () => {
  const testDir = path.dirname(fileURLToPath(import.meta.url));
  const source = await readFile(path.join(testDir, "..", "src", "index.ts"), "utf8");
  const start = source.indexOf("const readCandidateProfileDataByEndpointId");
  const end = source.indexOf("const listRouterDecisionData", start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  const candidateSlice = source.slice(start, end);

  expect(candidateSlice).toContain("readLatestObservedProfilesByEndpointIds");
  expect(candidateSlice).not.toContain("readEndpointProfileData(");
  expect(candidateSlice).not.toContain("readObservedPerformanceSamples(");
  expect(candidateSlice).not.toContain("recentSamples.filter(");
});
