import type { DownstreamOpenAIDiscovery, DownstreamOpenAIModelRecord } from "./types.js";

const LIKELY_FOREIGN_PROVIDER_MODEL_PATTERNS = [
  /^[a-z0-9_-]+\/[a-z0-9._-]+$/i,
  /^gpt-/i,
  /^o\d/i,
  /^claude-/i,
  /^gemini-/i,
  /^deepseek-/i,
  /^kimi-/i,
  /^qwen-/i,
  /^llama-/i,
  /^mistral-/i,
  /^grok-/i,
] as const;

export type InvalidRoleModelModelClassification = "foreign-provider-model" | "unknown-model-id";

export interface InvalidRoleModelModelDiagnostic {
  classification: InvalidRoleModelModelClassification;
  requestedModelId: string;
  normalizedModelId: string;
  recommendedModelId: string | null;
  reason: string;
}

export function normalizeRoleModelModelId(modelId: string): string {
  return modelId.startsWith("role-model/") ? modelId.slice("role-model/".length) : modelId;
}

export function findRoleModelDiscoveryModel(
  discovery: DownstreamOpenAIDiscovery,
  requestedModelId: string,
): DownstreamOpenAIModelRecord | undefined {
  const normalizedModelId = normalizeRoleModelModelId(requestedModelId);
  return discovery.models.find(
    (model) => model.id === requestedModelId || model.id === normalizedModelId,
  );
}

export function recommendedRoleModelModelId(discovery: DownstreamOpenAIDiscovery): string | null {
  return discovery.setup.recommendedModel ?? discovery.models[0]?.id ?? null;
}

export function formatSupportedRoleModelPromptPath(modelId: string | null): string {
  const displayModelId = modelId ?? "<role-model-alias>";
  return `pi --no-session --provider role-model --model ${displayModelId} -p "<prompt>"`;
}

export function formatRoleModelInvocationGuidance(modelId: string | null): readonly string[] {
  return [
    `recommended alias: ${modelId ?? "none"}`,
    `canonical provider model id: ${modelId ?? "none"}`,
    `supported prompt path: ${formatSupportedRoleModelPromptPath(modelId)}`,
    "command invocation: interactive slash commands only",
    'unsupported noninteractive path: pi -p "/role-model ..."',
  ];
}

function isLikelyForeignProviderModelId(modelId: string): boolean {
  return LIKELY_FOREIGN_PROVIDER_MODEL_PATTERNS.some((pattern) => pattern.test(modelId));
}

export function classifyInvalidRoleModelModelId(
  discovery: DownstreamOpenAIDiscovery,
  requestedModelId: string,
): InvalidRoleModelModelDiagnostic {
  const normalizedModelId = normalizeRoleModelModelId(requestedModelId);
  const classification: InvalidRoleModelModelClassification = isLikelyForeignProviderModelId(
    requestedModelId,
  )
    ? "foreign-provider-model"
    : "unknown-model-id";
  const reason =
    classification === "foreign-provider-model"
      ? "foreign provider ids are not valid under provider role-model unless they appear in the discovered Role-Model alias catalog."
      : "the requested model id is not present in the discovered Role-Model alias catalog.";
  return {
    classification,
    requestedModelId,
    normalizedModelId,
    recommendedModelId: recommendedRoleModelModelId(discovery),
    reason,
  };
}

export function formatInvalidRoleModelModelId(
  discovery: DownstreamOpenAIDiscovery,
  requestedModelId: string,
  runtimeReached: "yes" | "no" = "yes",
): string {
  const diagnostic = classifyInvalidRoleModelModelId(discovery, requestedModelId);
  return [
    `invalid Role-Model model id: ${diagnostic.requestedModelId}`,
    `classification: ${diagnostic.classification}`,
    "provider: role-model",
    `runtime reached: ${runtimeReached}`,
    `reason: ${diagnostic.reason}`,
    diagnostic.recommendedModelId
      ? `Recommended Role-Model alias: ${diagnostic.recommendedModelId}`
      : "Recommended Role-Model alias: none",
    "Run /role-model alias list to inspect valid aliases.",
    "Run /role-model alias recommended to inspect the current default.",
    diagnostic.recommendedModelId
      ? `Use --provider role-model --model ${diagnostic.recommendedModelId}`
      : null,
    "Compatibility note: role-model/<alias> is accepted only when a Pi API explicitly requires a qualified id.",
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}
