/**
 * The `role-model.downstream.openai.v1` contract and the mapping from discovery
 * to DSH's model catalog.
 *
 * @module @try-works/dsh-role-model/downstream-openai
 */

import type {
  DownstreamOpenAIDiscovery,
  DownstreamOpenAIModelRecord,
  RoleModelCatalog,
  RoleModelCatalogEntry,
  RoleModelModelDiagnostic,
  RoleModelReasoning,
  RoleModelReasoningEffort,
} from "./types.js";

/** Context window assumed when discovery sizes a model at all. */
export const CONSERVATIVE_CONTEXT_WINDOW = 8192;

/** Output cap assumed when discovery sizes a model at all. */
export const CONSERVATIVE_MAX_TOKENS = 2048;

/** Default bearer placeholder for a local runtime. */
export const DEFAULT_PLACEHOLDER_TOKEN = "role-model-local";

/** The effort and level tokens DSH can express as a reasoning effort. */
const KNOWN_EFFORT_TOKENS = new Set(["off", "minimal", "low", "medium", "high", "xhigh", "max"]);

/** True for a non-empty string. */
function hasString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/** True for a plain object. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Append `/v1` to a runtime base URL exactly once.
 * @param baseUrl - discovery base URL.
 * @returns the OpenAI-compatible base URL.
 */
export function appendOpenAIPath(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/u, "");
  return trimmed.endsWith("/v1") ? trimmed : `${trimmed}/v1`;
}

/** Whether one record satisfies the contract's required fields. */
function isModelRecord(value: unknown): value is DownstreamOpenAIModelRecord {
  if (!isRecord(value)) return false;
  return (
    hasString(value.id) &&
    value.object === "model" &&
    value.owned_by === "role-model" &&
    (value.type === "model" || value.type === "alias" || value.type === "endpoint") &&
    isRecord(value.piMapping)
  );
}

/**
 * Validate a discovery payload against the contract.
 *
 * Fails closed on `authentication.required === true`: there is no supported
 * inbound token source, so contacting the runtime could only produce an
 * unexplained 401.
 *
 * @param value - decoded discovery response.
 * @returns the validated discovery.
 * @throws when the payload is malformed or requires unsupported authentication.
 */
export function validateDownstreamOpenAIDiscovery(value: unknown): DownstreamOpenAIDiscovery {
  if (!isRecord(value)) {
    throw new Error("Role-model downstream OpenAI discovery response is invalid.");
  }
  const discovery = value as Partial<DownstreamOpenAIDiscovery>;
  const authentication = isRecord(discovery.authentication) ? discovery.authentication : undefined;

  if (authentication?.required === true) {
    throw new Error(
      "Role-model downstream OpenAI discovery says auth is required; no supported DSH token source is configured.",
    );
  }
  if (
    discovery.contractVersion !== "role-model.downstream.openai.v1" ||
    discovery.kind !== "openai-compatible" ||
    discovery.providerId !== "role-model-runtime" ||
    !hasString(discovery.displayName) ||
    !hasString(discovery.baseUrl) ||
    !Array.isArray(discovery.models) ||
    discovery.models.length === 0 ||
    !discovery.models.every(isModelRecord) ||
    authentication === undefined ||
    authentication.type !== "bearer" ||
    !hasString(authentication.placeholderToken)
  ) {
    throw new Error("Role-model downstream OpenAI discovery response is invalid.");
  }
  return discovery as DownstreamOpenAIDiscovery;
}

/**
 * Read the fixed/advertised effort token for a record.
 * @param model - discovered record.
 * @returns a lower-cased token, or null when the record pins no effort.
 */
export function readEffortToken(model: DownstreamOpenAIModelRecord): string | null {
  const value =
    model.reasoningEffort ??
    model.reasoning_effort ??
    model.fixedEffort ??
    model.fixed_effort ??
    null;
  return typeof value === "string" && value.trim().length > 0 ? value.trim().toLowerCase() : null;
}

/**
 * Read every effort level a record advertises.
 * @param model - discovered record.
 * @returns lower-cased level tokens, in advertised order.
 */
export function readEffortLevels(model: DownstreamOpenAIModelRecord): string[] {
  const reasoning = isRecord(model.capabilities) ? model.capabilities.reasoning : undefined;
  const nested = isRecord(reasoning) ? reasoning : undefined;
  const values =
    model.reasoningEffortLevels ??
    model.reasoning_effort_levels ??
    (Array.isArray(nested?.effortLevels) ? nested.effortLevels : undefined) ??
    (Array.isArray(nested?.effort_levels) ? nested.effort_levels : undefined);
  if (!Array.isArray(values)) return [];
  return values
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0);
}

/**
 * Normalize a provider effort token to DSH's vocabulary.
 * @param token - provider token.
 * @returns the DSH effort id, or null when DSH cannot express it.
 */
export function effortTokenToId(token: string): string | null {
  const normalized = token === "none" ? "off" : token;
  return KNOWN_EFFORT_TOKENS.has(normalized) ? normalized : null;
}

/**
 * Derive the reasoning control for one record, if any.
 *
 * A record that pins an effort yields exactly that effort as the default, so the
 * offered set cannot drift from what the endpoint accepts. A record whose only
 * token DSH cannot express yields nothing at all, rather than a control that
 * silently does something else.
 *
 * @param model - discovered record.
 * @returns the declared reasoning, or undefined when no control should be offered.
 */
export function readReasoningEfforts(
  model: DownstreamOpenAIModelRecord,
): RoleModelReasoning | undefined {
  const fixed = readEffortToken(model);
  const advertised = readEffortLevels(model);

  if (fixed !== null) {
    const id = effortTokenToId(fixed);
    return id === null ? undefined : { efforts: [{ id, name: id }], defaultEffort: id };
  }

  // An endpoint record with no pinned effort is a configured *default instance*,
  // not a dynamic selector, so it advertises no effort control.
  if (model.type === "endpoint") return undefined;
  if (advertised.length === 0) return undefined;

  const efforts: RoleModelReasoningEffort[] = [];
  for (const token of advertised) {
    const id = effortTokenToId(token);
    if (id !== null && !efforts.some((effort) => effort.id === id)) efforts.push({ id, name: id });
  }
  return efforts.length === 0 ? undefined : { efforts };
}

/**
 * Human-readable label for one effort token.
 * @param token - lower-cased effort token.
 * @returns the display label.
 */
function effortLabel(token: string): string {
  return effortTokenToId(token) ?? token;
}

/**
 * Derive a model's display name, appending its effort when it pins one.
 * @param model - discovered record.
 * @returns the display name.
 */
export function modelDisplayName(model: DownstreamOpenAIModelRecord): string {
  const base = model.displayName ?? model.upstreamModelId ?? model.upstream_model_id ?? model.id;
  const token = readEffortToken(model);
  if (token === null) return base;
  const label = effortLabel(token);
  return base.endsWith(` (${label})`) ? base : `${base} (${label})`;
}

/**
 * Map a record's declared input modalities.
 * @param model - discovered record.
 * @returns `['text','image']` when image input is advertised, else `['text']`.
 */
export function readInputModalities(model: DownstreamOpenAIModelRecord): string[] {
  const available = model.modalities?.availableInput;
  if (Array.isArray(available) && available.includes("image")) return ["text", "image"];
  return ["text"];
}

/** Resolved limit plus the reasons it is degraded. */
interface ResolvedLimit {
  readonly value: number;
  readonly reasons: readonly string[];
}

/**
 * Resolve one limit, preferring the runtime's own Pi mapping.
 * @param model - discovered record.
 * @param kind - which limit to resolve.
 * @returns the value and any degradation reasons.
 */
function resolveLimit(
  model: DownstreamOpenAIModelRecord,
  kind: "contextWindow" | "maxTokens",
): ResolvedLimit {
  const mapped = model.piMapping?.[kind];
  if (typeof mapped === "number" && Number.isFinite(mapped) && mapped > 0) {
    return { value: mapped, reasons: [] };
  }
  const safe =
    kind === "contextWindow" ? model.limits?.safeContextWindow : model.limits?.safeMaxOutputTokens;
  const reasons: string[] = [`missing piMapping.${kind}`];
  if (typeof safe === "number" && Number.isFinite(safe) && safe > 0) {
    return { value: safe, reasons };
  }
  reasons.push(
    kind === "contextWindow"
      ? "using conservative context window default"
      : "using conservative max tokens default",
  );
  return {
    value: kind === "contextWindow" ? CONSERVATIVE_CONTEXT_WINDOW : CONSERVATIVE_MAX_TOKENS,
    reasons,
  };
}

/** Rank a record for catalog ordering: recommended first, then aliases, then the rest. */
function orderRank(model: DownstreamOpenAIModelRecord, recommendedModel: string | null): number {
  if (model.id === recommendedModel) return 0;
  if (model.type === "alias") return 1;
  if (model.type === "model") return 2;
  return 3;
}

/**
 * Build the DSH model catalog from one discovery payload.
 *
 * Every entry names `providerRoute` exactly, because DSH validates that and
 * turns a mismatch into a whole-group failure. Diagnostics are returned
 * separately so a degraded mapping can be surfaced without polluting the model
 * metadata DSH consumes.
 *
 * @param discovery - validated discovery payload.
 * @param providerRoute - the route key this plugin owns.
 * @returns the catalog.
 */
export function createRoleModelCatalog(
  discovery: DownstreamOpenAIDiscovery,
  providerRoute: string,
): RoleModelCatalog {
  const recommendedModel = discovery.setup?.recommendedModel ?? null;
  const diagnostics: RoleModelModelDiagnostic[] = [];

  const ordered = [...discovery.models].sort(
    (left, right) => orderRank(left, recommendedModel) - orderRank(right, recommendedModel),
  );

  const entries: RoleModelCatalogEntry[] = ordered.map((model) => {
    const contextWindow = resolveLimit(model, "contextWindow");
    const maxTokens = resolveLimit(model, "maxTokens");
    const reasons = [...contextWindow.reasons, ...maxTokens.reasons];
    if (reasons.length > 0) diagnostics.push({ id: model.id, degraded: true, reasons });
    const reasoning = readReasoningEfforts(model);
    return {
      provider: providerRoute,
      id: model.id,
      name: modelDisplayName(model),
      inputModalities: readInputModalities(model),
      contextWindow: contextWindow.value,
      maxTokens: maxTokens.value,
      ...(reasoning === undefined ? {} : { reasoning }),
    };
  });

  return {
    providerRoute,
    displayName: discovery.displayName,
    baseUrl: appendOpenAIPath(discovery.baseUrl),
    apiKey: discovery.authentication.placeholderToken,
    recommendedModel,
    entries,
    diagnostics,
  };
}
