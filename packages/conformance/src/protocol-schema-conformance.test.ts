import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, test } from "vitest";
import { assertValid, createAjv } from "./schema-test-helpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const schemaDir = path.join(repoRoot, "protocol", "schemas");

describe("run01 protocol schema conformance", () => {
  test("endpoint identity permits run01 optional metadata fields to be absent", async () => {
    const ajv = await createAjv(schemaDir);
    const validate = ajv.getSchema("endpoint-identity.schema.json");
    if (!validate) {
      throw new Error("endpoint-identity.schema.json did not compile");
    }

    assertValid(validate, {
      endpoint_id: "local-cli",
      endpoint_kind: "local_engine",
      provider_kind: "cli",
      serving_source: "local-process",
      model_id: "gpt-5.4",
      runtime_version: "1.0.0",
    });
  });

  test("declared capability profile accepts tool_calling as the required object", async () => {
    const ajv = await createAjv(schemaDir);
    const validate = ajv.getSchema("declared-capability-profile.schema.json");
    if (!validate) {
      throw new Error("declared-capability-profile.schema.json did not compile");
    }

    assertValid(validate, {
      endpoint_id: "local-cli",
      capabilities: ["code.edit", "reasoning.multi_step"],
      modalities: ["text"],
      max_context_tokens: 32768,
      tool_calling: {
        supported: true,
        style: "openai",
      },
      supports_embeddings: false,
    });
  });

  test("routing policy accepts the run01 compute, budget, privacy, and target fields", async () => {
    const ajv = await createAjv(schemaDir);
    const validate = ajv.getSchema("routing-policy.schema.json");
    if (!validate) {
      throw new Error("routing-policy.schema.json did not compile");
    }

    assertValid(validate, {
      strategy: "balanced",
      compute_preference: "local",
      required_capabilities: ["code.edit"],
      required_modalities: ["text"],
      require_tools: true,
      deny_endpoints: [],
      allow_endpoints: [],
      deny_provider_kinds: [],
      allow_provider_kinds: ["cli"],
      budget: {
        enabled: true,
        currency: "USD",
        max_cost_per_request: 0.01,
        target_cost_per_request: 0.005,
      },
      privacy: {
        allow_remote: false,
      },
      targets: {
        latency_target_ms: 150,
        latency_max_ms: 300,
        throughput_target_tps: 40,
      },
    });
  });

  test("observed performance accepts measurement_window, endpoint_version, and aggregate source counts", async () => {
    const ajv = await createAjv(schemaDir);
    const validate = ajv.getSchema("observed-performance-profile.schema.json");
    if (!validate) {
      throw new Error("observed-performance-profile.schema.json did not compile");
    }

    assertValid(validate, {
      endpoint_id: "local-cli",
      endpoint_version: "gpt-5.4@2026-04",
      measured_at_ms: 1_700_000_000_000,
      measurement_window: {
        started_at_ms: 1_699_999_999_000,
        ended_at_ms: 1_700_000_000_000,
      },
      sample_size: 6,
      sources: {
        live_request_samples: 4,
        benchmark_samples: 2,
      },
      latency_ms_p50: 120,
      latency_ms_p95: 200,
      failure_rate: 0.01,
      freshness_score: 0.9,
      confidence_score: 0.8,
      quality_score: 0.85,
      tokens_per_sec: 42,
    });
  });

  test("trace event accepts payload and request routing linkage for router decision creation", async () => {
    const ajv = await createAjv(schemaDir);
    const validate = ajv.getSchema("trace-event.schema.json");
    if (!validate) {
      throw new Error("trace-event.schema.json did not compile");
    }

    assertValid(validate, {
      event_id: "evt-1",
      trace_id: "trace-1",
      request_id: "req-1",
      routing_decision_id: "decision-1",
      timestamp_ms: 1_700_000_000_001,
      event_type: "router.decision.created",
      payload: {
        chosen_endpoint_id: "local-cli",
      },
    });
  });

  test("trace span accepts request linkage and canonical span_type", async () => {
    const ajv = await createAjv(schemaDir);
    const validate = ajv.getSchema("trace-span.schema.json");
    if (!validate) {
      throw new Error("trace-span.schema.json did not compile");
    }

    assertValid(validate, {
      trace_id: "trace-1",
      span_id: "span-1",
      request_id: "req-1",
      routing_decision_id: "decision-1",
      span_type: "router.selection",
      started_at_ms: 1_700_000_000_000,
      ended_at_ms: 1_700_000_000_010,
      status: "ok",
    });
  });

  test("usage event accepts sample_source while leaving org model and package optional", async () => {
    const ajv = await createAjv(schemaDir);
    const validate = ajv.getSchema("usage-event.schema.json");
    if (!validate) {
      throw new Error("usage-event.schema.json did not compile");
    }

    assertValid(validate, {
      event_id: "usage-1",
      timestamp_ms: 1_700_000_000_002,
      app_id: "gateway-smoke",
      request_id: "req-1",
      routing_decision_id: "decision-1",
      endpoint_id: "local-cli",
      provider_kind: "cli",
      tokens_in: 32,
      tokens_out: 64,
      latency_ms: 120,
      sample_source: "live_request",
    });
  });

  test("role binding accepts the active inactive disabled status vocabulary", async () => {
    const ajv = await createAjv(schemaDir);
    const validate = ajv.getSchema("role-binding.schema.json");
    if (!validate) {
      throw new Error("role-binding.schema.json did not compile");
    }

    assertValid(validate, {
      binding_id: "binding-1",
      role_id: "developer",
      endpoint_id: "local-cli",
      status: "inactive",
      policy_overrides: {},
      effective_capabilities: ["code.edit"],
      effective_task_types: ["code.edit"],
    });
  });

  test("task execution profile requires role_id and routing_policy_patch", async () => {
    const ajv = await createAjv(schemaDir);
    const validate = ajv.getSchema("task-execution-profile.schema.json");
    if (!validate) {
      throw new Error("task-execution-profile.schema.json did not compile");
    }

    assertValid(validate, {
      task_type: "code.edit",
      role_id: "developer",
      required_capabilities: ["code.edit"],
      preferred_capabilities: ["reasoning.multi_step"],
      routing_policy_patch: {
        strategy: "balanced",
        compute_preference: "local",
        required_capabilities: ["code.edit"],
        required_modalities: ["text"],
        require_tools: true,
        deny_endpoints: [],
        allow_endpoints: [],
        deny_provider_kinds: [],
        allow_provider_kinds: ["cli"],
        budget: {
          enabled: true,
          currency: "USD",
          max_cost_per_request: 0.01,
          target_cost_per_request: 0.005,
        },
        privacy: {
          allow_remote: false,
        },
        targets: {
          latency_target_ms: 150,
          latency_max_ms: 300,
          throughput_target_tps: 40,
        },
      },
    });
  });
});
