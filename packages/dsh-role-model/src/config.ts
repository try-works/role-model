/**
 * Plugin configuration, endpoint normalization, and endpoint trust.
 *
 * Trust is decided synchronously and **before any network call**: a remote
 * (non-loopback) endpoint is refused unless explicitly allowed, and a runtime
 * that reports `authentication.required` fails closed elsewhere rather than
 * being contacted with a placeholder token.
 *
 * @module @try-works/dsh-role-model/config
 */

/** Production role-model runtime endpoint. */
export const DEFAULT_ENDPOINT = "http://127.0.0.1:3456";

/** Default per-request timeout for runtime metadata calls. */
export const DEFAULT_REQUEST_TIMEOUT_MS = 2500;

/** The provider route this plugin owns. Lower-case; never title-cased. */
export const DEFAULT_PROVIDER_ROUTE = "role-model";

/** Environment variable naming an endpoint, honoured only as a fallback. */
export const ENDPOINT_ENV = "ROLE_MODEL_ENDPOINT";

/** Environment variable opting into remote endpoints, honoured only as a fallback. */
export const ALLOW_REMOTE_ENV = "ROLE_MODEL_ALLOW_REMOTE";

/** Why an endpoint was trusted or refused. */
export type EndpointTrustCode =
  | "local"
  | "remote-allowed"
  | "remote-blocked"
  | "remote-untrusted"
  | "invalid-endpoint";

/** The outcome of one endpoint trust decision. */
export interface EndpointTrust {
  /** Whether requests to this endpoint may be made at all. */
  readonly allowed: boolean;
  /** Whether the endpoint is outside loopback. */
  readonly remote: boolean;
  /** Stable machine-routable reason. */
  readonly code: EndpointTrustCode;
  /** Human-readable summary. */
  readonly message: string;
  /** What the operator can do about a refusal. */
  readonly remediation: string;
}

/** Context for one trust decision. */
export interface EndpointTrustOptions {
  /** Explicit opt-in for a non-loopback endpoint. */
  readonly allowRemote?: boolean | undefined;
  /**
   * Whether the surrounding project is trusted. Absent means "not stated", which
   * does **not** block a loopback endpoint and does not by itself permit a remote
   * one; it only tightens the `allowRemote` path.
   */
  readonly isProjectTrusted?: (() => boolean) | undefined;
}

/** Fully resolved plugin configuration. */
export interface RoleModelConfig {
  /** Normalized runtime endpoint, without a trailing slash and without `/v1`. */
  readonly endpoint: string;
  /** Whether non-loopback endpoints are permitted. */
  readonly allowRemote: boolean;
  /** Timeout for runtime metadata calls. */
  readonly requestTimeoutMs: number;
  /** Provider route key this plugin owns. */
  readonly providerRoute: string;
  /** Alias persisted by `/role-model alias use`, or null when none is selected. */
  readonly selectedAlias: string | null;
  /** Explicit host `dsh-llm` module path, or null to auto-resolve. */
  readonly hostLlmModule: string | null;
}

/** Inputs to {@link createRoleModelConfig}. */
export interface RoleModelConfigInput {
  readonly endpoint?: string | undefined;
  readonly allowRemote?: boolean | undefined;
  readonly timeoutMs?: number | undefined;
  readonly requestTimeoutMs?: number | undefined;
  readonly providerRoute?: string | undefined;
  readonly selectedAlias?: string | undefined | null;
  readonly hostLlmModule?: string | undefined | null;
  readonly isProjectTrusted?: (() => boolean) | undefined;
  /** Environment consulted for the `ROLE_MODEL_*` fallbacks. */
  readonly env?: Readonly<Record<string, string | undefined>> | undefined;
}

/**
 * Normalize a runtime endpoint: strip trailing slashes and a trailing `/v1`,
 * so the plugin can append `/v1` exactly once.
 * @param endpoint - configured endpoint.
 * @returns the normalized endpoint.
 */
export function normalizeEndpoint(endpoint: string): string {
  let normalized = endpoint.trim();
  normalized = normalized.replace(/\/+$/u, "");
  normalized = normalized.replace(/\/v1$/u, "");
  return normalized.replace(/\/+$/u, "");
}

/**
 * Interpret a flag string the way the runtime's own documentation spells it.
 * @param value - raw value.
 * @returns whether it means "on". `1`, `true`, and `yes` (any case) only.
 */
export function isTruthyFlag(value: string | undefined | null): boolean {
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

/**
 * Resolve the remote-endpoint opt-in, preferring an explicit value.
 * @param explicit - explicitly configured value, when present.
 * @param env - environment to fall back to.
 * @returns whether remote endpoints are permitted.
 */
export function resolveAllowRemote(
  explicit: boolean | undefined,
  env: Readonly<Record<string, string | undefined>>,
): boolean {
  if (explicit !== undefined) return explicit;
  return isTruthyFlag(env[ALLOW_REMOTE_ENV]);
}

/** True when a hostname is loopback in any of its accepted spellings. */
function isLoopbackHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/^\[/u, "").replace(/\]$/u, "");
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

/**
 * Decide whether an endpoint may be contacted — synchronously, before any fetch.
 * @param endpoint - endpoint to assess.
 * @param options - explicit opt-in and optional project trust.
 * @returns the trust decision, always carrying a message and remediation.
 */
export function assessEndpointTrust(
  endpoint: string,
  options: EndpointTrustOptions = {},
): EndpointTrust {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return {
      allowed: false,
      remote: true,
      code: "invalid-endpoint",
      message: `Role-model endpoint is not a valid URL: ${endpoint}`,
      remediation: "Configure endpoint as an absolute URL, for example http://127.0.0.1:3456.",
    };
  }

  if (isLoopbackHost(url.hostname)) {
    return {
      allowed: true,
      remote: false,
      code: "local",
      message: "Local loopback endpoint is trusted by default.",
      remediation: "",
    };
  }

  if (options.allowRemote !== true) {
    return {
      allowed: false,
      remote: true,
      code: "remote-blocked",
      message: `Remote role-model endpoint ${endpoint} is blocked by default.`,
      remediation: "Set allowRemote only for a role-model runtime you control.",
    };
  }

  if (options.isProjectTrusted?.() === false) {
    return {
      allowed: false,
      remote: true,
      code: "remote-untrusted",
      message: `Remote role-model endpoint ${endpoint} requires a trusted project context.`,
      remediation: "Trust this project, or point endpoint at a loopback runtime.",
    };
  }

  return {
    allowed: true,
    remote: true,
    code: "remote-allowed",
    message: `Remote role-model endpoint ${endpoint} is allowed by explicit configuration.`,
    remediation: "",
  };
}

/**
 * Resolve plugin configuration from explicit input, the environment, and defaults.
 * @param input - raw configuration.
 * @returns the resolved configuration.
 */
export function createRoleModelConfig(input: RoleModelConfigInput = {}): RoleModelConfig {
  const env = input.env ?? {};
  const configuredEndpoint = input.endpoint ?? env[ENDPOINT_ENV] ?? DEFAULT_ENDPOINT;
  const alias = input.selectedAlias;
  const hostModule = input.hostLlmModule;
  const timeoutMs = input.timeoutMs ?? input.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  return {
    endpoint: normalizeEndpoint(configuredEndpoint),
    allowRemote: resolveAllowRemote(input.allowRemote, env),
    requestTimeoutMs:
      typeof timeoutMs === "number" && Number.isFinite(timeoutMs) && timeoutMs > 0
        ? timeoutMs
        : DEFAULT_REQUEST_TIMEOUT_MS,
    providerRoute: input.providerRoute?.trim() || DEFAULT_PROVIDER_ROUTE,
    selectedAlias: typeof alias === "string" && alias.trim().length > 0 ? alias.trim() : null,
    hostLlmModule:
      typeof hostModule === "string" && hostModule.trim().length > 0 ? hostModule.trim() : null,
  };
}
