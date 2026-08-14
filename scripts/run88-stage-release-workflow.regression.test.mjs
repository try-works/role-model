import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { runPublicAcceptanceProbe } from "./run88-public-semantic-probes.mjs";

test("public workflow regression refuses production deployment authority", async () => {
  const text = `${await readFile(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8")}\n${await readFile(new URL("../.github/workflows/build-binaries.yml", import.meta.url), "utf8")}`;
  assert.doesNotMatch(text, /wrangler\s+deploy|environment:\s*production/i);
  assert.match(text, /exact private stage revision|exact private paired revision/i);
});

for (const acceptanceId of ["R1-AC03", "R3-AC01", "R11-AC09"]) {
  test(`RUN88-R-PUB-${acceptanceId}`, () => runPublicAcceptanceProbe(acceptanceId, "regression"));
}
