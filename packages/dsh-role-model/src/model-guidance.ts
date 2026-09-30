/**
 * Model id normalization and invalid-id diagnostics.
 *
 * When a user selects a model id that no role-model route owns, the failure must
 * say which kind of mistake it was and how to recover. The product name is always
 * lower-case `role-model`.
 *
 * @module @try-works/dsh-role-model/model-guidance
 */

import type { DownstreamOpenAIDiscovery, DownstreamOpenAIModelRecord } from './types.js'

/** Why a model id does not resolve to a role-model route. */
export type RoleModelModelIdClassification = 'known' | 'foreign-provider-model' | 'unknown-model-id'

/** Provider prefixes that identify another provider's model id. */
const FOREIGN_ID_PATTERNS: readonly RegExp[] = [
  /^[a-z0-9_-]+\/[a-z0-9._-]+$/iu,
  /^gpt-/iu,
  /^o\d/iu,
  /^claude-/iu,
  /^gemini-/iu,
  /^deepseek-/iu,
  /^kimi-/iu,
  /^qwen-/iu,
  /^llama-/iu,
  /^mistral-/iu,
  /^grok-/iu,
]

/**
 * Strip a `role-model/` qualification from a model id.
 * @param modelId - model id as the user supplied it.
 * @returns the bare id.
 */
export function normalizeRoleModelModelId(modelId: string): string {
  return modelId.startsWith('role-model/') ? modelId.slice('role-model/'.length) : modelId
}

/**
 * Find a discovered record by bare or qualified id.
 * @param discovery - validated discovery.
 * @param modelId - model id as the user supplied it.
 * @returns the record, or undefined when unknown.
 */
export function findRoleModelModel(
  discovery: DownstreamOpenAIDiscovery,
  modelId: string,
): DownstreamOpenAIModelRecord | undefined {
  const normalized = normalizeRoleModelModelId(modelId)
  return discovery.models.find(model => model.id === normalized || model.id === modelId)
}

/**
 * The alias to recommend: the runtime's own choice, else the first model.
 * @param discovery - validated discovery.
 * @returns the recommended id, or null when the catalog is empty.
 */
export function recommendedRoleModelModelId(discovery: DownstreamOpenAIDiscovery): string | null {
  return discovery.setup?.recommendedModel ?? discovery.models[0]?.id ?? null
}

/**
 * Classify a model id against the current discovery.
 * @param modelId - model id as the user supplied it.
 * @param discovery - validated discovery.
 * @returns the classification.
 */
export function classifyRoleModelModelId(
  modelId: string,
  discovery: DownstreamOpenAIDiscovery,
): RoleModelModelIdClassification {
  if (findRoleModelModel(discovery, modelId) !== undefined) return 'known'
  return FOREIGN_ID_PATTERNS.some(pattern => pattern.test(modelId))
    ? 'foreign-provider-model'
    : 'unknown-model-id'
}

/** Every alias id the runtime advertises, in discovery order. */
function aliasIds(discovery: DownstreamOpenAIDiscovery): string[] {
  return discovery.models.filter(model => model.type === 'alias').map(model => model.id)
}

/**
 * Render the recovery text for a model id that does not resolve.
 * @param discovery - validated discovery.
 * @param modelId - the offending id.
 * @param runtimeReached - whether the runtime answered during discovery.
 * @returns the diagnostic text.
 */
export function formatInvalidRoleModelModelId(
  discovery: DownstreamOpenAIDiscovery,
  modelId: string,
  runtimeReached: boolean,
): string {
  const classification = classifyRoleModelModelId(modelId, discovery)
  const recommended = recommendedRoleModelModelId(discovery)
  const aliases = aliasIds(discovery)
  const lines = [
    `invalid role-model model id: ${modelId}`,
    `classification: ${classification}`,
    'provider: role-model',
    `runtime reached: ${runtimeReached ? 'yes' : 'no'}`,
  ]
  if (classification === 'foreign-provider-model') {
    lines.push('reason: this id belongs to another provider, not to the role-model runtime.')
  } else {
    lines.push('reason: the role-model runtime does not advertise this id.')
  }
  if (recommended !== null) lines.push(`recommended alias: ${recommended}`)
  if (aliases.length > 0) lines.push(`available aliases: ${aliases.join(', ')}`)
  lines.push('Run /role-model alias list to see every alias.')
  lines.push('Run /role-model alias recommended to see the runtime recommendation.')
  lines.push('Then select the alias in the model selector.')
  return lines.join('\n')
}
