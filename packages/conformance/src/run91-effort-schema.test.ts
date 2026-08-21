import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, test } from "vitest";
import { assertValid, createAjv } from "./schema-test-helpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaDir = path.resolve(__dirname, "..", "..", "..", "protocol", "schemas");

describe("Run 91 effort-instance protocol fields", () => {
  test("accepts endpoint, discovery, router, usage, and trace effort identity fields", async () => {
    const ajv = await createAjv(schemaDir);
    const endpoint = ajv.getSchema("endpoint-identity.schema.json");
    const discovery = ajv.getSchema("downstream-openai-discovery.schema.json");
    const routerDecision = ajv.getSchema("router-decision.schema.json");
    const usage = ajv.getSchema("usage-event.schema.json");
    const traceEvent = ajv.getSchema("trace-event.schema.json");
    const traceSpan = ajv.getSchema("trace-span.schema.json");
    if (!endpoint || !discovery || !routerDecision || !usage || !traceEvent || !traceSpan) {
      throw new Error("Run 91 protocol schemas did not compile");
    }

    assertValid(endpoint, {
      endpoint_id: "deepseek.personal.global.deepseek-v4-pro~effort-v1~bWVkaXVt",
      endpoint_kind: "remote_api",
      provider_kind: "remote_openai_compat",
      serving_source: "cloud",
      model_id: "deepseek/deepseek-v4-pro",
      runtime_version: "run91",
      reasoning_effort: "medium",
    });
    assertValid(discovery, {
      contractVersion: "role-model.downstream.openai.v1",
      kind: "openai-compatible",
      providerId: "role-model-runtime",
      displayName: "Run 91",
      baseUrl: "http://127.0.0.1:3456",
      endpoints: {
        health: "http://127.0.0.1:3456/health",
        models: "http://127.0.0.1:3456/v1/models",
        chatCompletions: "http://127.0.0.1:3456/v1/chat/completions",
        responses: "http://127.0.0.1:3456/v1/responses",
      },
      authentication: {
        type: "bearer",
        headerName: "Authorization",
        required: false,
        placeholderToken: "role-model-local",
        note: "local",
      },
      models: [
        {
          id: "deepseek/deepseek-v4-pro",
          object: "model",
          owned_by: "role-model",
          endpoint_ids: ["deepseek.personal.global.deepseek-v4-pro"],
          type: "model",
          targetModelIds: ["deepseek/deepseek-v4-pro"],
          canonicalModelIds: ["deepseek/deepseek-v4-pro"],
          providerIds: ["deepseek"],
          limits: {
            safeContextWindow: 1,
            safeMaxOutputTokens: 1,
            maxContextWindow: 1,
            maxOutputTokens: 1,
          },
          modalities: {
            guaranteedInput: ["text"],
            availableInput: ["text"],
            conditionalInput: {},
            output: ["text"],
          },
          capabilities: {
            guaranteed: [],
            available: [],
            conditional: {},
            tools: { functionCalling: false },
            reasoning: { supported: true, effortControl: true, effortLevels: ["medium"] },
            structuredOutput: { supported: false },
            caching: { promptRead: null, promptWrite: null, source: "unknown" },
          },
          declared: { modelIds: ["deepseek/deepseek-v4-pro"], endpointIds: [] },
          routable: { modelIds: ["deepseek/deepseek-v4-pro"], endpointIds: [] },
          piMapping: { contextWindow: 1, maxTokens: 1 },
          sources: ["models.dev"],
        },
      ],
      setup: { recommendedModel: null, notes: [] },
      freshness: {
        generatedAt: "2026-08-15T00:00:00.000Z",
        catalogVersion: "1",
        catalogCapturedAt: null,
        runtimeInventoryRevision: "run91",
      },
    });
    assertValid(routerDecision, {
      routing_decision_id: "decision-1",
      request_id: "request-1",
      app_id: "run91",
      org_id: null,
      policy_snapshot: {
        strategy: "balanced",
        compute_preference: "remote",
        required_capabilities: [],
        required_modalities: ["text"],
        require_tools: false,
        deny_endpoints: [],
        allow_endpoints: [],
        deny_provider_kinds: [],
        allow_provider_kinds: [],
        budget: {
          enabled: false,
          currency: "USD",
          max_cost_per_request: 1,
          target_cost_per_request: 1,
        },
        privacy: { allow_remote: true },
        targets: { latency_target_ms: 1, latency_max_ms: 1, throughput_target_tps: 1 },
      },
      eligibility: [{ endpoint_id: "endpoint-1", eligible: true, exclusions: [] }],
      scored_candidates: [
        {
          endpoint_id: "endpoint-1",
          total_score: 1,
          metric_breakdown: {
            quality: { value: 1, source: "default" },
            latency: { value: 1, source: "default" },
            throughput: { value: 1, source: "default" },
            cost: { value: 1, source: "default" },
            reliability: { value: 1, source: "default" },
            preference: { value: 1, source: "default" },
          },
          tie_break: { quality: 1, latency_ms: 1, reliability: 1, endpoint_id: "endpoint-1" },
        },
      ],
      chosen_endpoint_id: "endpoint-1",
      fallback_endpoint_ids: [],
      selection_reasons: ["BEST_TOTAL_SCORE"],
      used_measured: false,
      used_declared: false,
      scoring_version: "run91",
      reasoning_effort: "medium",
      effort_source: "variant",
    });
    assertValid(usage, {
      event_id: "usage-1",
      timestamp_ms: 1,
      app_id: "run91",
      request_id: "request-1",
      routing_decision_id: "decision-1",
      endpoint_id: "endpoint-1",
      model_id: "deepseek/deepseek-v4-pro",
      provider_kind: "remote_openai_compat",
      tokens_in: 1,
      tokens_out: 1,
      latency_ms: 1,
      reasoning_effort: "medium",
      effort_source: "variant",
    });
    assertValid(traceEvent, {
      event_id: "event-1",
      trace_id: "trace-1",
      request_id: "request-1",
      routing_decision_id: "decision-1",
      timestamp_ms: 1,
      event_type: "router.decision.created",
      reasoning_effort: "medium",
      effort_source: "variant",
      payload: {},
    });
    assertValid(traceSpan, {
      trace_id: "trace-1",
      span_id: "span-1",
      request_id: "request-1",
      routing_decision_id: "decision-1",
      span_type: "router.selection",
      started_at_ms: 1,
      ended_at_ms: 2,
      status: "ok",
      reasoning_effort: "medium",
      effort_source: "variant",
    });
  });
});
