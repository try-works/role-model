import assert from "node:assert/strict";
import { test } from "node:test";

import { REVIEW_ACCOUNTS, REVIEW_ENDPOINT_REQUESTS } from "./seed-review-benchmark-endpoints.mjs";

test("review benchmark seed defines three accounts and three endpoints", () => {
  assert.equal(REVIEW_ACCOUNTS.length, 3);
  assert.equal(REVIEW_ENDPOINT_REQUESTS.length, 3);
  assert.deepEqual(
    REVIEW_ACCOUNTS.map((entry) => entry.providerAccountId),
    ["review.subject.alpha", "review.subject.beta", "review.judge"],
  );
  assert.deepEqual(
    REVIEW_ENDPOINT_REQUESTS.map((entry) => entry.modelId),
    ["chatgpt/gpt-5.4", "chatgpt/gpt-5.4-mini", "chatgpt/gpt-5.5"],
  );
});

test("the judge endpoint is distinct from both subject endpoints", () => {
  const ids = REVIEW_ENDPOINT_REQUESTS.map((entry) => entry.providerAccountId);
  assert.notEqual(ids[2], ids[0]);
  assert.notEqual(ids[2], ids[1]);
  assert.notDeepEqual(REVIEW_ENDPOINT_REQUESTS[2], REVIEW_ENDPOINT_REQUESTS[0]);
});
