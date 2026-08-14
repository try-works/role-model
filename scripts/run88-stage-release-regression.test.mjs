import assert from "node:assert/strict";
import { test } from "node:test";
import { runPublicAcceptanceProbe } from "./run88-public-semantic-probes.mjs";

const packageRegressionIds = [
  "R2-AC02",
  "R2-AC03",
  "R2-AC04",
  "R4-AC05",
  "R6-AC06",
  "R8-AC05",
  "R9-AC01",
  "R9-AC02",
  "R9-AC03",
  "R9-AC04",
  "R9-AC05",
  "R9-AC06",
  "R10-AC02",
  "R11-AC04",
  "R14-AC06",
];

for (const acceptanceId of packageRegressionIds) {
  test(`RUN88-R-PUB-${acceptanceId}`, () => runPublicAcceptanceProbe(acceptanceId, "regression"));
}
