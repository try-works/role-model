/**
 * Run 101 addendum 13 - a candidate's 5xx must not become the request's status.
 *
 * Operator report: "a lot of random 503 requests that must be caused by the router rather than the endpoints."
 * Verified in the source: the Codex-subscription dispatch path classifies an upstream failure with
 * `fallbackStatusCode: 503`, and the classifier's last branch marked every unclassified failure
 * `fallbackEligible: false` - so the reroute loop threw it and the single vendor's failure became the request's
 * status.
 *
 * RED at the pre-repair revision (`ba5bbac4`): the 503 case below answers `fallbackEligible: false`.
 */
import { describe, expect, it } from "vitest";

import { classifyUpstreamExecutionFailure } from "../src/index.js";

function classify(statusCode?: number, message?: string) {
  return classifyUpstreamExecutionFailure({
    endpointId: "openai.personal.openai-codex-subscription.global.gpt-5.6-terra",
    ...(statusCode === undefined ? {} : { statusCode }),
    ...(message === undefined ? {} : { message }),
    fallbackStatusCode: 503,
    providerId: "openai",
    vendorId: "chatgpt-codex-responses",
    executionFamily: "responses",
    adapterFamily: "ai-sdk-openai",
  });
}

describe("@recursive:101-effect-mq-queue-rebuild addendum13 candidate failover", () => {
  it("keeps a 5xx candidate failure eligible for failover", () => {
    expect(classify(503).fallbackEligible).toBe(true);
    expect(classify(500).fallbackEligible).toBe(true);
    expect(classify(undefined).fallbackEligible).toBe(true);
  });

  it("keeps a 4xx on the request itself terminal", () => {
    expect(classify(400, "invalid request").fallbackEligible).toBe(false);
  });
});
