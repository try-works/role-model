import type { EndpointCandidate } from "@role-model-router/core";

export interface DeclaredEndpointConfig {
  endpoint_id: string;
  model_id: string;
  capabilities: string[];
  modalities: string[];
}

export function detectAcpEndpoints(configs: DeclaredEndpointConfig[]): EndpointCandidate[] {
  return configs.map((config) => ({
    identity: {
      endpoint_id: config.endpoint_id,
      endpoint_kind: "acp-endpoint",
      provider_kind: "provider-acp",
      serving_source: "remote-service",
      model_id: config.model_id,
      package_id: "provider-acp",
      variant_id: "default",
      runtime_version: "1.0.0",
      quantization: "none",
      precision: "fp16",
      host_class: "skill-router",
      device_class: "server",
      region: "us-central",
      org_scope: "team",
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
    status: "active",
  }));
}
