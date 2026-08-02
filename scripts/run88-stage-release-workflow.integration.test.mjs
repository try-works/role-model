import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { runPublicAcceptanceProbe } from "./run88-public-semantic-probes.mjs";

test("public CI and binary workflow remain integrated", async () => {
  const [ci, binaries] = await Promise.all([
    readFile(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8"),
    readFile(new URL("../.github/workflows/build-binaries.yml", import.meta.url), "utf8"),
  ]);
  assert.match(ci, /promotion-guard/);
  assert.match(ci, /run88-stage-release/);
  assert.match(binaries, /PRIVATE_PAIRED_SHA/);
  assert.match(binaries, /private_distribution_sha256/);
});

for (const acceptanceId of ["R1-AC03", "R3-AC01", "R11-AC09"]) {
  test(`RUN88-I-PUB-${acceptanceId}`, () => runPublicAcceptanceProbe(acceptanceId, "integration"));
}
