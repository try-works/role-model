import type { EndpointCandidate } from "@role-model-router/core";
export interface DeclaredEndpointConfig {
  endpoint_id: string;
  model_id: string;
  capabilities: string[];
  modalities: string[];
}

export interface DeclaredMcpToolConfig {
  name: string;
  description?: string;
  input_schema: Record<string, unknown>;
}

export interface DeclaredMcpConnectorConfig extends DeclaredEndpointConfig {
  connector_id: string;
  tools: DeclaredMcpToolConfig[];
}

export interface McpConnectorDefinition {
  connectorId: string;
  connectorKind: "mcp";
  endpointId: string;
  modelId: string;
  capabilities: string[];
  tools: Array<{
    name: string;
    description?: string;
    inputSchema: Record<string, unknown>;
  }>;
}

function toNonEmptyList(values: string[], fieldName: string): [string, ...string[]] {
  const [first, ...rest] = values;
  if (!first) {
    throw new Error(`Declared MCP endpoint config must include at least one ${fieldName} value.`);
  }
  return [first, ...rest];
}

export function detectMcpEndpoints(configs: DeclaredEndpointConfig[]): EndpointCandidate[] {
  return configs.map((config) => ({
    identity: {
      endpoint_id: config.endpoint_id,
      endpoint_kind: "remote_api",
      provider_kind: "mcp",
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
      capabilities: toNonEmptyList(config.capabilities, "capability"),
      modalities: toNonEmptyList(config.modalities, "modality"),
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

export function createMcpConnectorDefinitions(
  configs: DeclaredMcpConnectorConfig[],
): McpConnectorDefinition[] {
  return configs.map((config) => ({
    connectorId: config.connector_id,
    connectorKind: "mcp",
    endpointId: config.endpoint_id,
    modelId: config.model_id,
    capabilities: config.capabilities,
    tools: config.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.input_schema,
    })),
  }));
}
