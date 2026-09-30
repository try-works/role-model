/**
 * Test fixtures for the `role-model.downstream.openai.v1` contract.
 *
 * Shapes mirror the live runtime's discovery payload (verified against
 * http://127.0.0.1:3457/api/role-model/downstream/openai) but carry an explicit
 * displayName of `role-model`, matching what the runtime actually reports.
 */

import type { DownstreamOpenAIDiscovery, DownstreamOpenAIModelRecord } from '../src/types.js'

/** Deep-partial overrides for one discovery payload. */
export interface DiscoveryOverrides {
  readonly contractVersion?: unknown
  readonly kind?: unknown
  readonly providerId?: unknown
  readonly displayName?: unknown
  readonly baseUrl?: unknown
  readonly models?: readonly DownstreamOpenAIModelRecord[] | readonly unknown[]
  readonly authentication?: Record<string, unknown>
  readonly setup?: Record<string, unknown>
}

/**
 * Build a discovery payload with the given overrides.
 *
 * Nested `authentication` and `setup` are merged so a spec can flip one field;
 * everything else is replaced. The result is typed as a discovery value so it
 * can be passed straight to the code under test; invalid cases are built for
 * the validator's benefit and are expected to be rejected at runtime.
 *
 * @param overrides - fields to replace.
 * @returns a discovery-shaped value.
 */
export function createDiscovery(overrides: DiscoveryOverrides = {}): DownstreamOpenAIDiscovery {
  const base = {
    contractVersion: 'role-model.downstream.openai.v1',
    kind: 'openai-compatible',
    providerId: 'role-model-runtime',
    displayName: 'role-model',
    baseUrl: 'http://127.0.0.1:3457',
    endpoints: {
      health: 'http://127.0.0.1:3457/healthz',
      models: 'http://127.0.0.1:3457/v1/models',
      chatCompletions: 'http://127.0.0.1:3457/v1/chat/completions',
      responses: 'http://127.0.0.1:3457/v1/responses',
    },
    authentication: {
      type: 'bearer',
      headerName: 'Authorization',
      required: false,
      placeholderToken: 'role-model-local',
      note: '',
    },
    models: [createModelRecord({ id: 'baseline.remote-only' })],
    setup: { recommendedModel: 'baseline.remote-only', notes: [] },
    freshness: {},
  }
  return {
    ...base,
    ...overrides,
    authentication: { ...base.authentication, ...(overrides.authentication ?? {}) },
    setup: { ...base.setup, ...(overrides.setup ?? {}) },
  } as unknown as DownstreamOpenAIDiscovery
}

/** Partial overrides for one model record; `type`, `id` and limits are common knobs. */
export interface ModelRecordOverrides {
  readonly id?: string
  readonly type?: string
  readonly displayName?: string
  readonly upstreamModelId?: string
  readonly upstream_model_id?: string
  readonly reasoningEffort?: string | null
  readonly reasoning_effort?: string | null
  readonly fixedEffort?: string | null
  readonly fixed_effort?: string | null
  readonly reasoningEffortLevels?: readonly string[]
  readonly reasoning_effort_levels?: readonly string[]
  readonly endpoint_id?: string
  readonly modalities?: Record<string, unknown>
  readonly capabilities?: Record<string, unknown>
  readonly limits?: Record<string, unknown>
  readonly piMapping?: Record<string, unknown>
  readonly pricing?: Record<string, unknown> | null
}

/**
 * Build one discovered model record.
 *
 * Nested objects are replaced wholesale, never deep-merged: a spec that passes
 * `piMapping: {}` means "discovery sized nothing", which is exactly the
 * degradation case, and a merge would silently keep the base values.
 *
 * @param overrides - fields to replace.
 * @returns a model record with the contract's required fields.
 */
export function createModelRecord(overrides: ModelRecordOverrides = {}): DownstreamOpenAIModelRecord {
  const base: DownstreamOpenAIModelRecord = {
    id: 'baseline.remote-only',
    object: 'model',
    owned_by: 'role-model',
    endpoint_ids: ['endpoint.one'],
    type: 'alias',
    routingMode: 'basic',
    limits: { safeContextWindow: 1_000_000, safeMaxOutputTokens: 128_000 },
    modalities: { guaranteedInput: ['text'], availableInput: ['text'], output: ['text'] },
    capabilities: {
      guaranteed: ['text.chat'],
      available: ['text.chat'],
      tools: { functionCalling: true },
      reasoning: { supported: true, effortControl: true, effortLevels: ['medium', 'max'] },
      structuredOutput: { supported: true },
    },
    piMapping: {
      contextWindow: 1_000_000,
      maxTokens: 128_000,
      compat: { supportsDeveloperRole: false, sendSessionAffinityHeaders: true },
    },
  }
  return { ...base, ...overrides } as DownstreamOpenAIModelRecord
}

/**
 * Build a model record for contract-rejection specs, where the point is that a
 * required field is missing or has the wrong type.
 * @param overrides - fields to set.
 * @param remove - required field names to delete after construction.
 * @returns a loosely-typed record.
 */
export function malformedModelRecord(
  overrides: ModelRecordOverrides = {},
  remove: readonly string[] = [],
): Record<string, unknown> {
  const record = createModelRecord(overrides) as unknown as Record<string, unknown>
  for (const key of remove) delete record[key]
  return record
}

/** A convenient typed fixture when a spec wants the validated shape. */
export function typedDiscovery(overrides: DiscoveryOverrides = {}): DownstreamOpenAIDiscovery {
  return createDiscovery(overrides)
}
