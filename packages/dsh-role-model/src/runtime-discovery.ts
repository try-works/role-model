/**
 * Runtime discovery: find an externally running role-model runtime and read its
 * downstream OpenAI contract.
 *
 * This module never starts, stops, installs, or updates the runtime, and never
 * reads provider secrets. It contacts only the endpoints needed to describe the
 * runtime, and it enforces endpoint trust **before** the first network call, so
 * a refused endpoint produces zero traffic.
 *
 * @module @try-works/dsh-role-model/runtime-discovery
 */

import { assessEndpointTrust, createRoleModelConfig, type EndpointTrustCode, type RoleModelConfigInput } from './config.js'
import {
  CONSERVATIVE_CONTEXT_WINDOW,
  CONSERVATIVE_MAX_TOKENS,
  validateDownstreamOpenAIDiscovery,
} from './downstream-openai.js'
import type { DownstreamOpenAIDiscovery, DownstreamOpenAIModelRecord } from './types.js'

/** Stable failure classification for a discovery attempt. Mirrors the Pi package's vocabulary. */
export type RoleModelDiscoveryFailureState =
  | 'unavailable'
  | 'timeout'
  | 'malformed'
  | 'incompatible'
  | 'blocked-remote'
  | 'remote-untrusted'
  | 'invalid-endpoint'
  | 'auth-required'

/** A discovery failure carrying the endpoint, a classification, and remediation. */
export class RoleModelDiscoveryError extends Error {
  readonly state: RoleModelDiscoveryFailureState
  readonly endpoint: string
  readonly remediation: string

  /**
   * @param input - failure facts.
   */
  constructor(input: {
    state: RoleModelDiscoveryFailureState
    endpoint: string
    message: string
    remediation: string
    cause?: unknown
  }) {
    super(input.message, input.cause === undefined ? undefined : { cause: input.cause })
    this.name = 'RoleModelDiscoveryError'
    this.state = input.state
    this.endpoint = input.endpoint
    this.remediation = input.remediation
  }
}

/** A successful discovery. */
export interface DiscoveryResult {
  readonly discovery: DownstreamOpenAIDiscovery
  readonly version?: Record<string, unknown>
  readonly health?: Record<string, unknown>
  readonly state: 'ready' | 'fallback'
  readonly warnings: readonly string[]
}

/** Inputs to {@link discoverRoleModelRuntime}. */
export interface DiscoverRoleModelRuntimeInput extends RoleModelConfigInput {
  /** Fetch implementation; defaults to the global fetch. */
  readonly fetch?: typeof fetch | undefined
}

/** HTTP status failure used internally to distinguish a 404 fallback. */
class HttpStatusError extends Error {
  constructor(readonly status: number) {
    super(`Request failed with HTTP ${status}`)
    this.name = 'HttpStatusError'
  }
}

/** True for a plain object. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Fetch and decode JSON with a bounded timeout and a closed connection.
 * @param url - absolute URL.
 * @param timeoutMs - request timeout.
 * @param fetchImpl - fetch implementation.
 * @returns the decoded JSON value.
 */
async function fetchJson(url: string, timeoutMs: number, fetchImpl: typeof fetch): Promise<unknown> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetchImpl(url, {
      signal: controller.signal,
      keepalive: false,
      redirect: 'error',
      headers: { connection: 'close' },
    })
    if (!response.ok) throw new HttpStatusError(response.status)
    return await response.json()
  } finally {
    clearTimeout(timer)
  }
}

/** Whether a thrown value is an abort. */
function isAbort(error: unknown): boolean {
  return error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')
}

/** Build the fallback discovery from a compact `/v1/models` listing. */
function createDiscoveryFromCompactModels(baseUrl: string, payload: unknown): DownstreamOpenAIDiscovery {
  if (!isRecord(payload) || !Array.isArray(payload.data)) {
    throw new Error('role-model compact /v1/models response is invalid.')
  }
  const models = payload.data
    .map((entry): DownstreamOpenAIModelRecord | undefined => {
      if (!isRecord(entry) || typeof entry.id !== 'string') return undefined
      if (entry.object !== 'model' || entry.owned_by !== 'role-model') return undefined
      const nested = isRecord(entry.role_model) ? entry.role_model : {}
      const contextWindow = readPositiveNumber(entry.context_window)
        ?? readPositiveNumber(nested.context_window)
      const maxTokens = readPositiveNumber(entry.max_tokens) ?? readPositiveNumber(nested.max_tokens)
      const input = Array.isArray(entry.input)
        ? entry.input.filter((value): value is string => typeof value === 'string')
        : ['text']
      const type = nested.type === 'endpoint' ? 'endpoint' : nested.type === 'model' ? 'model' : 'alias'
      const effort = readNonBlankString(entry.reasoning_effort)
        ?? readNonBlankString(nested.reasoning_effort)
        ?? readNonBlankString(nested.fixed_effort)
      const upstream = readNonBlankString(entry.upstream_model_id) ?? readNonBlankString(nested.upstream_model_id)
      return {
        id: entry.id,
        object: 'model',
        owned_by: 'role-model',
        type,
        ...(readNonBlankString(nested.display_name) === undefined ? {} : { displayName: readNonBlankString(nested.display_name)! }),
        ...(upstream === undefined ? {} : { upstreamModelId: upstream }),
        ...(effort === undefined ? {} : { reasoningEffort: effort }),
        modalities: { guaranteedInput: ['text'], availableInput: input, output: ['text'] },
        piMapping: {
          contextWindow: contextWindow ?? CONSERVATIVE_CONTEXT_WINDOW,
          maxTokens: maxTokens ?? CONSERVATIVE_MAX_TOKENS,
        },
      }
    })
    .filter((record): record is DownstreamOpenAIModelRecord => record !== undefined)

  if (models.length === 0) {
    throw new Error('role-model compact /v1/models response did not include usable models.')
  }
  const recommended = models.find(model => model.type === 'alias')?.id ?? models[0]?.id ?? null
  return {
    contractVersion: 'role-model.downstream.openai.v1',
    kind: 'openai-compatible',
    providerId: 'role-model-runtime',
    displayName: 'role-model',
    baseUrl,
    endpoints: {
      health: `${baseUrl}/healthz`,
      models: `${baseUrl}/v1/models`,
      chatCompletions: `${baseUrl}/v1/chat/completions`,
      responses: `${baseUrl}/v1/responses`,
    },
    models: models as [DownstreamOpenAIModelRecord, ...DownstreamOpenAIModelRecord[]],
    authentication: { type: 'bearer', required: false, placeholderToken: 'role-model-local' },
    setup: { recommendedModel: recommended, notes: [] },
  }
}

/** Read a positive finite number, or undefined. */
function readPositiveNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined
}

/** Read a non-blank string, or undefined. */
function readNonBlankString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

/**
 * Discover the runtime described by `input`.
 *
 * @param input - endpoint, trust options, timeout, and an optional fetch.
 * @returns the discovery result.
 * @throws {RoleModelDiscoveryError} classified, with remediation text.
 */
export async function discoverRoleModelRuntime(input: DiscoverRoleModelRuntimeInput = {}): Promise<DiscoveryResult> {
  const config = createRoleModelConfig(input)
  const trust = assessEndpointTrust(config.endpoint, {
    allowRemote: config.allowRemote,
    isProjectTrusted: input.isProjectTrusted,
  })
  if (!trust.allowed) {
    // Every refusing trust code maps onto a discovery failure state. The two
    // permitting codes are unreachable here (they only arise when allowed), and
    // are mapped defensively rather than asserted away.
    const refusedStates: Record<EndpointTrustCode, RoleModelDiscoveryFailureState> = {
      'local': 'blocked-remote',
      'remote-allowed': 'blocked-remote',
      'remote-blocked': 'blocked-remote',
      'remote-untrusted': 'remote-untrusted',
      'invalid-endpoint': 'invalid-endpoint',
    }
    throw new RoleModelDiscoveryError({
      state: refusedStates[trust.code],
      endpoint: config.endpoint,
      message: trust.message,
      remediation: trust.remediation,
    })
  }

  const fetchImpl = input.fetch ?? fetch
  const timeoutMs = input.timeoutMs ?? config.requestTimeoutMs
  const healthUrl = `${config.endpoint}/healthz`
  const versionUrl = `${config.endpoint}/api/version`
  const discoveryUrl = `${config.endpoint}/api/role-model/downstream/openai`

  let health: Record<string, unknown> | undefined
  let version: Record<string, unknown> | undefined
  try {
    const healthPayload = await fetchJson(healthUrl, timeoutMs, fetchImpl)
    health = isRecord(healthPayload) ? healthPayload : undefined
    const versionPayload = await fetchJson(versionUrl, timeoutMs, fetchImpl).catch(() => undefined)
    version = isRecord(versionPayload) ? versionPayload : undefined
  } catch (error) {
    if (isAbort(error)) {
      throw new RoleModelDiscoveryError({
        state: 'timeout',
        endpoint: config.endpoint,
        message: `Timed out while reading role-model endpoint ${config.endpoint}.`,
        remediation: 'Confirm the role-model runtime is running and responsive.',
        cause: error,
      })
    }
    throw new RoleModelDiscoveryError({
      state: 'unavailable',
      endpoint: config.endpoint,
      message: `role-model runtime unavailable: ${error instanceof Error ? error.message : String(error)}`,
      remediation: 'Start the role-model runtime and confirm /healthz responds.',
      cause: error,
    })
  }

  try {
    const payload = await fetchJson(discoveryUrl, timeoutMs, fetchImpl)
    return {
      discovery: validateDownstreamOpenAIDiscovery(payload),
      health,
      ...(version === undefined ? {} : { version }),
      state: 'ready',
      warnings: [],
    }
  } catch (error) {
    if (isAbort(error)) {
      throw new RoleModelDiscoveryError({
        state: 'timeout',
        endpoint: config.endpoint,
        message: `Timed out while reading role-model discovery at ${discoveryUrl}.`,
        remediation: 'Confirm the role-model runtime is running and responsive.',
        cause: error,
      })
    }
    if (error instanceof RoleModelDiscoveryError) throw error
    if (!(error instanceof HttpStatusError) || error.status !== 404) {
      const authRequired = error instanceof Error && /auth is required/iu.test(error.message)
      throw new RoleModelDiscoveryError({
        state: authRequired ? 'auth-required' : 'incompatible',
        endpoint: config.endpoint,
        message: authRequired
          ? error.message
          : 'role-model downstream OpenAI discovery response is incompatible.',
        remediation: authRequired
          ? 'Use a runtime that does not require inbound auth, or add a supported token source.'
          : 'Upgrade role-model, or verify that /api/role-model/downstream/openai returns the current contract.',
        cause: error,
      })
    }
  }

  try {
    const compact = await fetchJson(`${config.endpoint}/v1/models`, timeoutMs, fetchImpl)
    return {
      discovery: createDiscoveryFromCompactModels(config.endpoint, compact),
      health,
      ...(version === undefined ? {} : { version }),
      state: 'fallback',
      warnings: ['Using compact /v1/models fallback because rich downstream discovery was unavailable.'],
    }
  } catch (error) {
    throw new RoleModelDiscoveryError({
      state: 'unavailable',
      endpoint: config.endpoint,
      message: `role-model fallback discovery unavailable: ${error instanceof Error ? error.message : String(error)}`,
      remediation: 'Confirm /api/role-model/downstream/openai or /v1/models is exposed by the runtime.',
      cause: error,
    })
  }
}
