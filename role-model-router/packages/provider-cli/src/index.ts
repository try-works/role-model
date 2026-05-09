import type { EndpointCandidate } from "@role-model-router/core";
export interface DeclaredEndpointConfig {
  endpoint_id: string;
  model_id: string;
  capabilities: [string, ...string[]];
  modalities: [string, ...string[]];
}

export function detectCliEndpoints(configs: DeclaredEndpointConfig[]): EndpointCandidate[] {
  return configs.map((config) => ({
    identity: {
      endpoint_id: config.endpoint_id,
      endpoint_kind: "local_engine",
      provider_kind: "cli",
      serving_source: "local-process",
      model_id: config.model_id,
      package_id: "provider-cli",
      variant_id: "default",
      runtime_version: "1.0.0",
      quantization: "none",
      precision: "fp16",
      host_class: "skill-router",
      device_class: "developer-workstation",
      region: "local",
      org_scope: "personal",
    },
    declared: {
      endpoint_id: config.endpoint_id,
      capabilities: config.capabilities,
      modalities: config.modalities,
      max_context_tokens: 32768,
      tool_calling: {
        supported: true,
        style: "openai",
      },
      supports_embeddings: false,
      platform_constraints: [],
    },
    observed: {
      endpoint_id: config.endpoint_id,
      endpoint_version: "1.0.0",
      measured_at_ms: Date.now(),
      measurement_window: {
        started_at_ms: Date.now() - 3600000,
        ended_at_ms: Date.now(),
      },
      sample_size: 100,
      sources: {
        benchmark_samples: 50,
        live_request_samples: 50,
      },
      judge_score: 0.9,
      latency_ms_p50: 100,
      latency_ms_p95: 150,
      tokens_per_sec: 60,
      cold_start_ms: 25,
      failure_rate: 0,
      cost_per_1k_tokens_est: 0,
      freshness_score: 0.9,
      confidence_score: 0.85,
    },
    status: "active",
  }));
}
