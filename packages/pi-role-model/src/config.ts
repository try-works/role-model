export interface RoleModelPackageConfig {
  endpoint: string;
  requestTimeoutMs: number;
}

export const DEFAULT_ROLE_MODEL_ENDPOINT = "http://127.0.0.1:3456";

export function normalizeEndpoint(endpoint: string): string {
  return endpoint.replace(/\/+$/, "");
}

export function createRoleModelConfig(input: Partial<RoleModelPackageConfig> = {}): RoleModelPackageConfig {
  return {
    endpoint: normalizeEndpoint(input.endpoint ?? DEFAULT_ROLE_MODEL_ENDPOINT),
    requestTimeoutMs: input.requestTimeoutMs ?? 2500,
  };
}
