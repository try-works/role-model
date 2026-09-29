export type ReasoningEffortValue = string | null | undefined;

const STANDARD_EFFORT_LABELS: Readonly<Record<string, string>> = {
  none: "None",
  off: "Off",
  minimal: "Minimal",
  low: "Low",
  medium: "Medium",
  high: "High",
  xhigh: "XHigh",
  max: "Max",
};

const EFFORT_IDENTITY_V1_PREFIX = "~effort-v1~";

function normalizeEffort(value: ReasoningEffortValue): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

/** Stable operator-facing label for known and future provider effort tokens. */
export function formatReasoningEffortLabel(value: ReasoningEffortValue): string | null {
  const normalized = normalizeEffort(value);
  if (!normalized) {
    return null;
  }
  const standard = STANDARD_EFFORT_LABELS[normalized.toLowerCase()];
  if (standard) {
    return standard;
  }
  return normalized
    .replace(/[_-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** One shared display rule for every endpoint/model/telemetry surface. */
export function formatEndpointDisplayName(input: {
  readonly base: string;
  readonly reasoningEffort?: ReasoningEffortValue;
}): string {
  const base = input.base.trim();
  const effort = formatReasoningEffortLabel(input.reasoningEffort);
  if (!effort) {
    return base;
  }
  const suffix = ` (${effort})`;
  return base.endsWith(suffix) ? base : `${base}${suffix}`;
}

function encodeUtf8Base64Url(value: string): string {
  const bytes = new TextEncoder().encode(value.normalize("NFC"));
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

/** True only when the selected endpoint itself owns the effective effort. */
export function endpointIdentityOwnsReasoningEffort(input: {
  readonly endpointId: string;
  readonly reasoningEffort?: ReasoningEffortValue;
  readonly effortSource?: string | null;
}): boolean {
  const effort = normalizeEffort(input.reasoningEffort);
  if (!effort) {
    return false;
  }
  if (input.effortSource === "variant" || input.effortSource === "variant_coerced") {
    return true;
  }
  const endpointId = input.endpointId.trim();
  return (
    endpointId.endsWith(`-${encodeURIComponent(effort)}`) ||
    endpointId.endsWith(`${EFFORT_IDENTITY_V1_PREFIX}${encodeUtf8Base64Url(effort)}`)
  );
}

/**
 * Human-readable path for summary surfaces. The effort comes exclusively from
 * the structured field; the encoded suffix is only verified before it is
 * replaced. A mismatch fails closed to the canonical endpoint id.
 */
export function formatEndpointDisplayPath(input: {
  readonly endpointId: string;
  readonly reasoningEffort?: ReasoningEffortValue;
}): string {
  const endpointId = input.endpointId.trim();
  const reasoningEffort = normalizeEffort(input.reasoningEffort);
  if (!reasoningEffort) {
    return endpointId;
  }
  const readableSuffix = `-${encodeURIComponent(reasoningEffort)}`;
  if (endpointId.endsWith(readableSuffix)) {
    return endpointId;
  }
  const legacySuffix = `${EFFORT_IDENTITY_V1_PREFIX}${encodeUtf8Base64Url(reasoningEffort)}`;
  if (endpointId.endsWith(legacySuffix)) {
    return `${endpointId.slice(0, -legacySuffix.length)}${readableSuffix}`;
  }
  return endpointId;
}

/** Compact labels retain the effort suffix so sibling endpoint instances remain distinguishable. */
export function formatCompactEndpointDisplayName(input: {
  readonly base: string;
  readonly reasoningEffort?: ReasoningEffortValue;
  readonly maxLength?: number;
}): string {
  const maxLength =
    typeof input.maxLength === "number" && Number.isFinite(input.maxLength) && input.maxLength > 0
      ? Math.floor(input.maxLength)
      : 26;
  const full = formatEndpointDisplayName(input);
  if (full.length <= maxLength || !formatReasoningEffortLabel(input.reasoningEffort)) {
    return full;
  }
  const suffix = ` (${formatReasoningEffortLabel(input.reasoningEffort)})`;
  const availableBaseLength = maxLength - suffix.length;
  if (availableBaseLength <= 1) {
    return full;
  }
  return `${input.base.trim().slice(0, availableBaseLength - 1)}…${suffix}`;
}

/**
 * Run 101 addendum 49 `A49-R3`: the model an endpoint id routes with. An endpoint id's namespace is dotted
 * (`openai.personal.openai-codex-subscription.global.gpt-5.5`) while the model id it names may contain dots of its
 * own (`gpt-5.6-sol-low`), so the namespace is cut after the id's scope segment when it carries one and only
 * otherwise at the last dot. An id that is not a dotted path - a bare model id such as `gpt-5.5` - is returned as
 * recorded, because a single dot there belongs to the model, not to a namespace.
 */
export function readEndpointModelLeaf(endpointId: string): string {
  const text = endpointId.trim();
  if (!text) {
    return "";
  }
  const segments = text.split(".");
  if (segments.length < 3) {
    return text;
  }
  const scopeMarker = ".global.";
  const markerIndex = text.lastIndexOf(scopeMarker);
  if (markerIndex >= 0 && markerIndex + scopeMarker.length < text.length) {
    return text.slice(markerIndex + scopeMarker.length);
  }
  return segments.at(-1) ?? text;
}

/**
 * The compact operator label for an endpoint id: its leaf model, never a truncated endpoint path. A leaf that
 * still exceeds `maxLength` drops whole `-`-separated tokens from the front, so the label ends on a whole token
 * (`…flash-max`) and the effort suffix survives rather than being cut in half; a leaf with no token boundary to
 * elide at stays whole.
 */
export function formatEndpointModelLabel(endpointId: string, maxLength = 26): string {
  const leaf = readEndpointModelLeaf(endpointId);
  const limit =
    typeof maxLength === "number" && Number.isFinite(maxLength) && maxLength > 1
      ? Math.floor(maxLength)
      : 26;
  if (leaf.length <= limit) {
    return leaf;
  }
  const tokens = leaf.split("-").filter((token) => token.length > 0);
  if (tokens.length <= 1) {
    return leaf;
  }
  const kept: string[] = [];
  let length = 0;
  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    const token = tokens[index] as string;
    const nextLength = length === 0 ? token.length : length + 1 + token.length;
    if (kept.length > 0 && nextLength + 1 > limit) {
      break;
    }
    kept.unshift(token);
    length = nextLength;
  }
  const tail = kept.join("-");
  return tail === leaf ? leaf : `…${tail}`;
}

export function readReasoningEffort(value: unknown): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  const candidate =
    record.reasoningEffort ??
    record.reasoning_effort ??
    record.fixedEffort ??
    record.fixed_effort ??
    null;
  return normalizeEffort(typeof candidate === "string" ? candidate : null);
}

export function readUpstreamModelId(value: unknown): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  const candidate = record.upstreamModelId ?? record.upstream_model_id;
  return typeof candidate === "string" && candidate.trim().length > 0 ? candidate.trim() : null;
}

/**
 * Shared identity formatter for every Paper Effort surface.  The effort is part
 * of the model/endpoint name; callers must not render it as a separate adornment.
 */
export function formatModelIdentity(value: unknown, fallbackId = "Unknown model"): string {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const upstreamModelId = readUpstreamModelId(value);
  const rawBase =
    (typeof record.displayName === "string" && record.displayName.trim()) ||
    upstreamModelId ||
    (typeof record.modelId === "string" && record.modelId.trim()) ||
    (typeof record.id === "string" && record.id.trim()) ||
    fallbackId;
  const leaf = rawBase.includes("/") ? (rawBase.split("/").at(-1) ?? rawBase) : rawBase;
  const base = leaf
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
  return formatEndpointDisplayName({ base, reasoningEffort: readReasoningEffort(value) });
}

/** Read catalog-advertised effort tokens without assuming a fixed provider enum. */
export function readReasoningEffortLevels(value: unknown): string[] {
  if (!value || typeof value !== "object") {
    return [];
  }
  const record = value as Record<string, unknown>;
  const nestedReasoning =
    record.reasoning && typeof record.reasoning === "object"
      ? (record.reasoning as Record<string, unknown>)
      : null;
  const candidates =
    record.reasoningEffortLevels ??
    record.reasoning_effort_levels ??
    nestedReasoning?.effortLevels ??
    nestedReasoning?.effort_levels;
  if (!Array.isArray(candidates)) {
    return [];
  }
  return [...new Set(candidates.filter((entry): entry is string => typeof entry === "string"))]
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function hasReasoningEffort(value: unknown): boolean {
  return readReasoningEffort(value) !== null;
}
