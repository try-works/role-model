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

/**
 * One runtime channel: a fixed port, the runtime that serves it, and what it is for.
 *
 * These are this repository's conventions, not a guess: production is `role-model` on
 * 3456, stage is `role-model-stage` on 3457, and development is `role-model-dev` on
 * 3458. The settings page offers them by name so a user picks a channel instead of
 * retyping a URL — choosing the wrong channel is otherwise silent, because the route
 * registers against any of them and the only symptom is a runtime that answers
 * differently.
 */
export interface RuntimeChannel {
  /** Loopback port for this channel. */
  readonly port: number;
  /** Channel name, shown in the settings surface. */
  readonly name: string;
  /** Runtime process serving this port. */
  readonly runtime: string;
  /** One line describing the channel. */
  readonly description: string;
}

/** The channels, production first because it is the default. */
export const RUNTIME_CHANNELS: readonly RuntimeChannel[] = [
  {
    port: 3456,
    name: "production",
    runtime: "role-model",
    description: "The production runtime. The default.",
  },
  {
    port: 3457,
    name: "stage",
    runtime: "role-model-stage",
    description: "The stage runtime, for pre-release checks.",
  },
  {
    port: 3458,
    name: "development",
    runtime: "role-model-dev",
    description: "The development runtime, for local work in progress.",
  },
];

/** Port the plugin uses when configuration names no channel. */
export const DEFAULT_RUNTIME_PORT = RUNTIME_CHANNELS[0]?.port ?? 3456;

/**
 * Build the loopback endpoint for a port.
 * @param port - a loopback port.
 * @returns the endpoint, without a trailing slash or `/v1`.
 */
export function endpointForPort(port: number): string {
  return `http://127.0.0.1:${String(port)}`;
}

/**
 * Whether a value can be a TCP port.
 *
 * 0 is accepted here and means "no channel chosen", which is why the schema default is
 * 0 rather than production: a sentinel is the only way to tell an unset field from a
 * deliberate choice of the default channel.
 * @param value - a candidate.
 * @returns whether it is a whole number inside the port range.
 */
function isPort(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 65_535;
}

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

/**
 * A configuration field as it arrives at resolution.
 *
 * The schema marks user-editable fields `.volatile()`, and schemastery types such a
 * field as a live reference rather than a plain value. Widening to `unknown` here is
 * deliberate: it stops that implementation detail leaking into every consumer, and the
 * values are validated at runtime instead. {@link readField} unwraps a reference and
 * each caller narrows with `typeof`, so a wrong type falls back to a default rather
 * than propagating.
 */
export type ConfigField = unknown;

/** Inputs to {@link createRoleModelConfig}. */
export interface RoleModelConfigInput {
  readonly endpoint?: ConfigField;
  /** Chosen runtime channel port; used unless an explicit endpoint overrides it. */
  readonly port?: ConfigField;
  /**
   * Whether `endpoint` was chosen rather than left at its schema default.
   *
   * The schema declares a default endpoint, so a parsed config always presents one and
   * a chosen port would otherwise be silently ignored — the user picks stage and keeps
   * getting production. Callers that read a raw form value pass `true` when the field
   * differs from the endpoint the chosen channel implies.
   */
  readonly endpointExplicit?: ConfigField;
  readonly allowRemote?: ConfigField;
  readonly timeoutMs?: ConfigField;
  readonly requestTimeoutMs?: ConfigField;
  readonly providerRoute?: ConfigField;
  readonly selectedAlias?: ConfigField;
  readonly hostLlmModule?: ConfigField;
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
 * Whether a value is a schemastery live reference.
 *
 * A field marked `.volatile()` parses to a reference whose `get()` reads the current
 * value, rather than to a plain value. The Harness reads such fields as
 * `config.timeoutMs.get()`, and its `plainConfig` unwraps them the same way — that
 * helper lives in `dsh-settings`, which this standalone package does not depend on.
 * @param value - a candidate value.
 * @returns whether the value carries a `get` reader.
 */
function isVolatileRef(value: unknown): value is { get: () => unknown } {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { get?: unknown }).get === "function"
  );
}

/**
 * Read a configuration field, unwrapping a live reference.
 * @param value - a plain value, a live reference, or absent.
 * @returns the current plain value, or undefined when absent or null.
 */
function readField(value: ConfigField): unknown {
  if (value === undefined || value === null) return undefined;
  const inner = value as { get?: unknown };
  if (typeof inner.get === "function") {
    const resolved = (inner.get as () => unknown)();
    return resolved === null ? undefined : resolved;
  }
  return value;
}

/**
 * Resolve plugin configuration from explicit input, the environment, and defaults.
 *
 * Config values may arrive as live references, because the schema marks its
 * user-editable fields `.volatile()`; every field is read through {@link readField}.
 * @param input - raw configuration.
 * @returns the resolved configuration.
 */
export function createRoleModelConfig(input: RoleModelConfigInput = {}): RoleModelConfig {
  const env = input.env ?? {};
  const configuredPort: unknown = readField(input.port);
  // 0 is the "no channel chosen" sentinel. It has to exist: `endpoint` carries a schema
  // default, so without a distinct unset state a deliberate choice of the default channel
  // is indistinguishable from a default.
  const portChoice = isPort(configuredPort) && configuredPort > 0 ? configuredPort : undefined;
  const requested: unknown = readField(input.endpoint);
  const requestedEndpoint =
    typeof requested === "string" && requested.trim().length > 0
      ? normalizeEndpoint(requested)
      : undefined;
  // The chosen channel outranks a stored endpoint, because a profile written before this
  // field existed still carries production in `endpoint`, and honouring that would make
  // the channel selector appear to do nothing. With no channel chosen, the stored
  // endpoint stands, so a remote host or a non-standard port still works unchanged.
  const configuredEndpoint: unknown =
    portChoice !== undefined
      ? endpointForPort(portChoice)
      : (requestedEndpoint ?? env[ENDPOINT_ENV] ?? DEFAULT_ENDPOINT);
  const alias: unknown = readField(input.selectedAlias);
  const hostModule: unknown = readField(input.hostLlmModule);
  const providerRoute: unknown = readField(input.providerRoute);
  const timeoutInput: unknown = readField(input.timeoutMs) ?? readField(input.requestTimeoutMs);
  const allowRemote: unknown = readField(input.allowRemote);
  const timeoutMs: unknown = timeoutInput ?? DEFAULT_REQUEST_TIMEOUT_MS;
  return {
    endpoint: normalizeEndpoint(
      typeof configuredEndpoint === "string" ? configuredEndpoint : DEFAULT_ENDPOINT,
    ),
    allowRemote: resolveAllowRemote(
      typeof allowRemote === "boolean" ? allowRemote : undefined,
      env,
    ),
    requestTimeoutMs:
      typeof timeoutMs === "number" && Number.isFinite(timeoutMs) && timeoutMs > 0
        ? timeoutMs
        : DEFAULT_REQUEST_TIMEOUT_MS,
    providerRoute:
      typeof providerRoute === "string" && providerRoute.trim().length > 0
        ? providerRoute.trim()
        : DEFAULT_PROVIDER_ROUTE,
    selectedAlias: typeof alias === "string" && alias.trim().length > 0 ? alias.trim() : null,
    hostLlmModule:
      typeof hostModule === "string" && hostModule.trim().length > 0 ? hostModule.trim() : null,
  };
}
