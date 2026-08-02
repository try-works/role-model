import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { runPublicAcceptanceProbe } from "./run88-public-semantic-probes.mjs";

test("public workflow surfaces retain their Run 88 promotion and package gates", async () => {
  const ci = await readFile(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");
  const binaries = await readFile(
    new URL("../.github/workflows/build-binaries.yml", import.meta.url),
    "utf8",
  );
  assert.match(ci, /run88-stage-release\.test\.mjs/);
  assert.match(ci, /promotion-guard/);
  assert.match(binaries, /manifest\.json/);
  assert.match(binaries, /PRIVATE_PAIRED_SHA/);
  assert.match(binaries, /manifest_sha256|private_distribution_sha256|run88/i);
  assert.doesNotMatch(`${ci}\n${binaries}`, /wrangler\s+deploy|environment:\s*production/i);
});

for (const acceptanceId of ["R1-AC03", "R3-AC01", "R11-AC09"]) {
  test(`RUN88-U-PUB-${acceptanceId}`, () => runPublicAcceptanceProbe(acceptanceId, "unit"));
}

test("stage package workflow requires and always binds the canonical Run 88 release identity", async () => {
  const binaries = await readFile(
    new URL("../.github/workflows/build-binaries.yml", import.meta.url),
    "utf8",
  );
  assert.match(
    binaries,
    /Validate Run 88 stage identity inputs[\s\S]*?RUN88_RELEASE_ID[\s\S]*?sha256:/,
  );
  assert.doesNotMatch(binaries, /Bind canonical Run 88 identity[\s\S]*?RUN88_RELEASE_ID\s*!=\s*''/);
  assert.match(
    binaries,
    /if \(\$env:ROLE_MODEL_BUILD_CHANNEL -eq "stage"\)[\s\S]*?release_id[\s\S]*?private_distribution_sha256/,
  );
});
