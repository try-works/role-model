import { describe, expect, test } from "vitest";

import {
  classifyExecutionFailureIfNeeded,
  classifyUpstreamExecutionFailure,
  shouldRetryUpstreamExecutionOnSameEndpoint,
} from "../src/index.js";

/**
 * Run 101 addendum 18 - a raw provider transport error skipped the retry/reroute gate.
 *
 * Measured on `:3457` (stage RC `bb219bfa0224`, 2026-09-27 ~18:20 local): six consecutive requests failed with
 * `terminated` / `fetch failed` after 21.9 s, 72.5 s, 77.5 s, 83.2 s, 91.6 s and 98.2 s, and every one carried
 * `streamTextDeltaCount: 0`, `retryCount: 0` and `rerouteCount: 0` - nothing had been streamed, so the gate had
 * every opportunity to fail over, and it did not. The live loop's catch only retries or reroutes when the thrown
 * value is an `UpstreamExecutionError`; the OpenAI-compatible dispatch rethrows undici's `terminated` raw, so the
 * gate skipped it and the ingress answered a bare `400`.
 */
describe("run 101 addendum 18: a raw transport failure is classified before the retry/reroute gate", () => {
  test("undici's terminated becomes a retryable, fallback-eligible connection error", () => {
    const classified = classifyUpstreamExecutionFailure({
      endpointId: "deepseek.personal.deepseek-api-key.global.deepseek-v4-flash-max",
      message: "terminated",
    });

    expect(classified.errorClass).toBe("upstream_connection_error");
    expect(classified.retryable).toBe(true);
    expect(classified.fallbackEligible).toBe(true);
    // It is a transport fact, so the same-endpoint retry applies before any failover.
    expect(
      shouldRetryUpstreamExecutionOnSameEndpoint({
        retryable: classified.retryable,
        errorClass: classified.errorClass,
        statusCode: classified.statusCode,
        alreadyRetried: false,
        fallbackEligible: classified.fallbackEligible,
        hasOtherEligibleEndpoint: true,
      }),
    ).toBe(true);
  });

  test("fetch failed and a closed-by-peer socket classify the same way", () => {
    for (const message of ["fetch failed", "other side closed", "socket hang up"]) {
      const classified = classifyUpstreamExecutionFailure({ endpointId: "e", message });
      expect(classified.errorClass, message).toBe("upstream_connection_error");
      expect(classified.fallbackEligible, message).toBe(true);
    }
  });

  test("classifyExecutionFailureIfNeeded names an unclassified error and leaves a classified one alone", () => {
    const raw = Object.assign(new TypeError("terminated"), {
      cause: Object.assign(new Error("other side closed"), { code: "UND_ERR_SOCKET" }),
    });
    const fromRaw = classifyExecutionFailureIfNeeded(raw, "deepseek.example.endpoint");
    expect(fromRaw.errorClass).toBe("upstream_connection_error");
    expect(fromRaw.fallbackEligible).toBe(true);

    const original = classifyUpstreamExecutionFailure({
      endpointId: "deepseek.example.endpoint",
      statusCode: 400,
      message: "invalid request",
    });
    expect(classifyExecutionFailureIfNeeded(original, "other.endpoint")).toBe(original);
  });

  test("a genuine provider verdict keeps its status and stays terminal", () => {
    const rejection = Object.assign(new Error("invalid request"), { statusCode: 400 });
    const classified = classifyExecutionFailureIfNeeded(rejection, "deepseek.example.endpoint");
    expect(classified.errorClass).toBe("invalid_request");
    expect(classified.fallbackEligible).toBe(false);
    expect(classified.statusCode).toBe(400);
  });
});
