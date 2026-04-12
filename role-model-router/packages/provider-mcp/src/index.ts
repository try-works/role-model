import type { EndpointCandidate } from "@role-model-router/core";
export interface DeclaredEndpointConfig {
  endpoint_id: string;
  model_id: string;
  capabilities: string[];
  modalities: string[];
}

export function detectMcpEndpoints(configs: DeclaredEndpointConfig[]): EndpointCandidate[] {
  return configs.map((config) => ({
    identity: {
      endpoint_id: config.endpoint_id,
      endpoint_kind: "mcp-endpoint",
      provider_kind: "provider-mcp",
      serving_source: "remote-service",
      model_id: config.model_id,
      package_id: "provider-mcp",
      variant_id: "default",
      runtime_version: "1.0.0",
      quantization: "none",
      precision: "fp16",
      host_class: "skill-router",
      device_class: "server",
      region: "us-east",
      org_scope: "team",
    },
    declared: {
      endpoint_id: config.endpoint_id,
      capabilities: config.capabilities,
      modalities: config.modalities,
      max_context_tokens: 65536,
      tool_calling: {
        supported: true,
        style: "openai",
      },
      supports_embeddings: true,
      platform_constraints: [],
    },
    status: "active",
  }));
}
