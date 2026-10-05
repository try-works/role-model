import { expect, test } from "vitest";

import { PRIVATE_OPERATIONS_TRANSPORT_RETRY_DELAYS_MS } from "../src/track-b-operations.js";

/**
 * Run 100 addendum `replay-dispatch-lifecycle.addendum-04` S8 follow-on (measured on the real-traffic root):
 * the auto-replay endpoint answered `replay endpoint HTTP 409: {"error":"fetch failed"}` while the sidecar
 * was serving the same traffic at ~40% of a core - a connection-level failure, not a refusal. The transport
 * already retries those (a timeout is deliberately not retried, because the work may still be running on the
 * far side), but two attempts 250 ms and 1 000 ms apart were shorter than a saturated-but-alive sidecar
 * needs, so a legitimately busy runtime looked like a failed replay.
 *
 * The budget stays bounded: four waits with jitter-friendly spacing, still far below the operations timeout.
 */
test("run100m the private-operations transport rides out a saturated-but-alive sidecar", () => {
  expect(PRIVATE_OPERATIONS_TRANSPORT_RETRY_DELAYS_MS).toEqual([250, 1_000, 2_500, 5_000]);
  const totalWaitMs = PRIVATE_OPERATIONS_TRANSPORT_RETRY_DELAYS_MS.reduce(
    (sum, delay) => sum + delay,
    0,
  );
  expect(totalWaitMs).toBeLessThanOrEqual(15_000);
});
