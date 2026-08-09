export interface RoleModelPackageConfig {
  endpoint: string;
  requestTimeoutMs: number;
  allowRemote: boolean;
  adapterPort: number;
  fetch?: typeof fetch;
  isProjectTrusted?: () => boolean;
}

export const DEFAULT_ROLE_MODEL_ENDPOINT = "http://127.0.0.1:3456";
export const DEFAULT_CODEX_ADAPTER_PORT = 3460;

export interface EndpointTrustOptions {
  allowRemote?: boolean;
  isProjectTrusted?: () => boolean;
}

export interface EndpointTrustResult {
  allowed: boolean;
  remote: boolean;
  code: "local" | "remote-allowed" | "remote-blocked" | "remote-untrusted" | "invalid-endpoint";
  message: string;
}

export function normalizeEndpoint(endpoint: string): string {
  return endpoint.replace(/\/+$/, "");
}

function isTruthy(value: string | undefined): boolean {
  return value === "1" || value?.toLowerCase() === "true" || value?.toLowerCase() === "yes";
}

function isLoopbackHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "[::1]"
  );
}

export function assessEndpointTrust(
  endpoint: string,
  options: EndpointTrustOptions = {},
): EndpointTrustResult {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return {
      allowed: false,
      remote: true,
      code: "invalid-endpoint",
      message: `Invalid Role-Model endpoint: ${endpoint}`,
    };
  }

  if (isLoopbackHostname(url.hostname)) {
    return {
      allowed: true,
      remote: false,
      code: "local",
      message: "Local loopback endpoint is trusted by default.",
    };
  }

  if (!options.allowRemote) {
    return {
      allowed: false,
      remote: true,
      code: "remote-blocked",
      message:
        "Remote Role-Model endpoints are blocked by default. Set allowRemote only for trusted runtimes.",
    };
  }

  if (options.isProjectTrusted && !options.isProjectTrusted()) {
    return {
      allowed: false,
      remote: true,
      code: "remote-untrusted",
      message: "Remote Role-Model endpoint requires a trusted project context.",
    };
  }

  return {
    allowed: true,
    remote: true,
    code: "remote-allowed",
    message: "Remote Role-Model endpoint explicitly allowed.",
  };
}

function parseAdapterPort(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error(`Invalid ROLE_MODEL_CODEX_ADAPTER_PORT: ${value}`);
  }
  return parsed;
}

export function createRoleModelConfig(
  input: Partial<RoleModelPackageConfig> = {},
  environment: Partial<Record<string, string | undefined>> = process.env,
): RoleModelPackageConfig {
  const endpoint = input.endpoint ?? environment.ROLE_MODEL_ENDPOINT ?? DEFAULT_ROLE_MODEL_ENDPOINT;
  return {
    endpoint: normalizeEndpoint(endpoint),
    requestTimeoutMs: input.requestTimeoutMs ?? 2500,
    allowRemote: input.allowRemote ?? isTruthy(environment.ROLE_MODEL_ALLOW_REMOTE),
    adapterPort:
      input.adapterPort ??
      parseAdapterPort(environment.ROLE_MODEL_CODEX_ADAPTER_PORT) ??
      DEFAULT_CODEX_ADAPTER_PORT,
    fetch: input.fetch,
    isProjectTrusted: input.isProjectTrusted,
  };
}

export function adapterBaseUrl(port: number = DEFAULT_CODEX_ADAPTER_PORT): string {
  return `http://127.0.0.1:${port}/v1`;
}
