import { expect, test } from "vitest";

import {
  classifyReplayExecutorFailure,
  retryableReplayRefusalCodes,
} from "../src/track-b-auto-replay.js";
import { REPLAY_REFUSAL_CODES } from "../src/track-b-replay-policy.js";

/**
 * Run 100 addendum 16 item 8a, measured on the live stage store 2026-09-25. Two 409s the executor surfaces
 * were arriving as the generic `replay_failed`, which names nothing:
 *
 * - `route capture skipped: boundary unavailable until <ts>` — 9 captures in flight, newest 06:46:11Z, and
 *   the tick's behaviour (defer, retry next tick) is already correct. The class only had to be named.
 * - `route capture idempotency key was reused with different immutable bytes` — deterministic by
 *   construction (24 refused / 3 deferred lifetime), so it was spending the deferral budget and then
 *   landing in `replay_failed` wearing a code that says nothing. Named terminal.
 *
 * Everything else keeps the generic code and the previous deferral behaviour.
 */

test("run154 item 8a a boundary-unavailable skip is named and stays retryable", () => {
  const classification = classifyReplayExecutorFailure(
    'replay endpoint HTTP 409: {"error":"route capture skipped: boundary unavailable until 2026-09-25T06:50:00.000Z"}',
  );
  expect(classification).toEqual({ code: "replay_boundary_unavailable", terminal: false });
  expect(retryableReplayRefusalCodes().has("replay_boundary_unavailable")).toBe(true);
  expect(REPLAY_REFUSAL_CODES).toContain("replay_boundary_unavailable");
});

test("run154 item 8a a reused capture idempotency key is named terminal", () => {
  const classification = classifyReplayExecutorFailure(
    'replay endpoint HTTP 409: {"error":"route capture idempotency key was reused with different immutable bytes"}',
  );
  expect(classification).toEqual({ code: "replay_capture_idempotency_conflict", terminal: true });
  expect(retryableReplayRefusalCodes().has("replay_capture_idempotency_conflict")).toBe(false);
  expect(REPLAY_REFUSAL_CODES).toContain("replay_capture_idempotency_conflict");
});

test("run154 item 8a every other executor failure keeps the generic retryable code", () => {
  expect(classifyReplayExecutorFailure("private Track B operation timed out after 10000ms")).toEqual({
    code: "replay_failed",
    terminal: false,
  });
  expect(
    classifyReplayExecutorFailure("durable replay branch append has no host dispatch receipt"),
  ).toEqual({ code: "replay_failed", terminal: false });
});
