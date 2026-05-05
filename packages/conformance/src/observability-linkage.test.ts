import { describe, expect, test } from "vitest";

import { validateTraceLinkage } from "@role-model-router/trace";
import { summarizeUsageEvents, validateUsageLinkage } from "@role-model-router/usage";

describe("observability linkage helpers", () => {
  test("detects invalid trace-event to trace-span linkage", () => {
    expect(() =>
      validateTraceLinkage(
        [
          {
            trace_id: "trace-1",
            span_id: "span-1",
            request_id: "request-1",
            routing_decision_id: "decision-1",
            span_type: "router.eligibility",
            started_at_ms: 100,
            ended_at_ms: 120,
            status: "ok",
            attributes: {},
          },
        ],
        [
          {
            event_id: "event-1",
            trace_id: "trace-1",
            span_id: "missing-span",
            request_id: "request-1",
            routing_decision_id: "decision-1",
            timestamp_ms: 110,
            event_type: "trace.span.opened",
            payload: {},
          },
        ],
      ),
    ).toThrow(/span/i);
  });

  test("detects invalid usage-event to router-decision linkage and summarizes valid usage events", () => {
    const usageEvents = [
      {
        event_id: "usage-1",
        timestamp_ms: 100,
        app_id: "app-1",
        org_id: "org-1",
        request_id: "request-1",
        routing_decision_id: "decision-1",
        endpoint_id: "endpoint-1",
        model_id: "model-1",
        package_id: "pkg-1",
        provider_kind: "provider-cli",
        tokens_in: 10,
        tokens_out: 20,
        latency_ms: 150,
        cost_estimate: 0.001,
        currency: "USD",
        error_class: "none",
      },
      {
        event_id: "usage-2",
        timestamp_ms: 120,
        app_id: "app-1",
        org_id: "org-1",
        request_id: "request-2",
        routing_decision_id: "decision-2",
        endpoint_id: "endpoint-1",
        model_id: "model-1",
        package_id: "pkg-1",
        provider_kind: "provider-cli",
        tokens_in: 15,
        tokens_out: 30,
        latency_ms: 180,
        cost_estimate: 0.002,
        currency: "USD",
        error_class: "none",
      },
    ];

    expect(() =>
      validateUsageLinkage(usageEvents, {
        request_id: "request-1",
        routing_decision_id: "decision-1",
      }),
    ).toThrow(/request_id/i);

    expect(summarizeUsageEvents(usageEvents)).toEqual(
      expect.objectContaining({
        by_app_id: { "app-1": 2 },
        by_endpoint_id: { "endpoint-1": 2 },
        by_model_id: { "model-1": 2 },
        by_provider_kind: { "provider-cli": 2 },
      }),
    );
  });
});
