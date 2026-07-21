import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const contract = JSON.parse(await readFile(new URL("../generated/product-contracts.json", import.meta.url), "utf8"));

test("TB00-TEST-INTEGRATION keeps non-production contribution and sensitive permissions fail-closed", () => {
  assert.equal(contract.defaults.production.aggregateContribution, "advanced_aggregate_only_after_disclosure");
  for (const channel of ["stage", "development", "unknown"])
    assert.equal(contract.defaults[channel].aggregateContribution, "disabled");
  assert.equal(contract.permissions.trainingExport, "independent_authorization_required");
  assert.equal(contract.permissions.richCapture, "independent_authorization_required");
});
