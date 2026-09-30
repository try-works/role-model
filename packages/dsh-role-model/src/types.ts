/**
 * The `role-model.downstream.openai.v1` discovery contract.
 *
 * Field spellings are deliberately permissive: the runtime has historically
 * emitted both camelCase and snake_case for several fields, and the plugin must
 * read either. Nothing here is invented — every optional field mirrors a real
 * spelling observed in `packages/pi-role-model/src/types.ts` and in the live
 * runtime's discovery payload.
 *
 * @module @try-works/dsh-role-model/types
 */

/** One discovered model, alias, or endpoint record. */
export interface DownstreamOpenAIModelRecord {
  id: string
  object: 'model'
  owned_by: 'role-model'
  endpoint_ids?: string[]
  type: 'model' | 'alias' | 'endpoint'
  displayName?: string
  upstreamModelId?: string
  upstream_model_id?: string
  reasoningEffort?: string | null
  reasoning_effort?: string | null
  fixedEffort?: string | null
  fixed_effort?: string | null
  effortSource?: string | null
  effort_source?: string | null
  reasoningEffortLevels?: string[]
  reasoning_effort_levels?: string[]
  endpoint_id?: string
  routingMode?: 'basic' | 'difficulty' | 'intelligent' | 'hybrid'
  targetModelIds?: string[]
  canonicalModelIds?: string[]
  providerIds?: string[]
  limits?: {
    safeContextWindow?: number | null
    safeMaxOutputTokens?: number | null
    maxContextWindow?: number | null
    maxOutputTokens?: number | null
  }
  modalities?: {
    guaranteedInput?: string[]
    availableInput?: string[]
    output?: string[]
  } & Record<string, unknown>
  capabilities?: Record<string, unknown> | boolean
  declared?: { modelIds?: string[]; endpointIds?: string[] }
  routable?: { modelIds?: string[]; endpointIds?: string[] }
  piMapping: {
    contextWindow?: number | null
    maxTokens?: number | null
    compat?: {
      supportsDeveloperRole?: boolean
      sendSessionAffinityHeaders?: boolean
      supportsLongCacheRetention?: boolean
    }
  }
  sources?: string[]
  pricing?: {
    inputPer1M?: number
    outputPer1M?: number
    cacheReadPer1M?: number
    cacheWritePer1M?: number
    input?: number
    output?: number
    cacheRead?: number
    cacheWrite?: number
  } | null
}

/** The full discovery payload. */
export interface DownstreamOpenAIDiscovery {
  contractVersion: 'role-model.downstream.openai.v1'
  kind: 'openai-compatible'
  providerId: 'role-model-runtime'
  displayName: string
  baseUrl: string
  endpoints: {
    health?: string
    models?: string
    chatCompletions?: string
    responses?: string
  }
  authentication: {
    type: 'bearer'
    headerName?: string
    required: boolean
    placeholderToken: string
    note?: string
  }
  models: [DownstreamOpenAIModelRecord, ...DownstreamOpenAIModelRecord[]]
  setup: { recommendedModel: string | null; notes: string[] }
  freshness?: Record<string, unknown>
}

/** One reasoning effort DSH may offer for a model. */
export interface RoleModelReasoningEffort {
  readonly id: string
  readonly name: string
  readonly description?: string
}

/** Declared reasoning capability for one model, in DSH's vocabulary. */
export interface RoleModelReasoning {
  readonly efforts: readonly RoleModelReasoningEffort[]
  readonly defaultEffort?: string
}

/** One selectable model in DSH's main model selector. */
export interface RoleModelCatalogEntry {
  /** Owning provider route; DSH rejects a mismatch with `INVALID_CATALOG`. */
  readonly provider: string
  readonly id: string
  readonly name: string
  readonly inputModalities: readonly string[]
  readonly contextWindow: number
  readonly maxTokens: number
  readonly reasoning?: RoleModelReasoning
}

/** A degraded-mapping diagnostic; never copied into a catalog entry. */
export interface RoleModelModelDiagnostic {
  readonly id: string
  readonly degraded: boolean
  readonly reasons: readonly string[]
}

/** The catalog derived from one discovery payload. */
export interface RoleModelCatalog {
  readonly providerRoute: string
  readonly displayName: string
  /** Discovery base URL with `/v1` appended exactly once. */
  readonly baseUrl: string
  /** Placeholder bearer token; never a real credential. */
  readonly apiKey: string
  readonly recommendedModel: string | null
  readonly entries: readonly RoleModelCatalogEntry[]
  readonly diagnostics: readonly RoleModelModelDiagnostic[]
}
