/**
 * L1: runtime discovery.
 *
 * Order and failure classification matter more than the happy path here:
 * trust is enforced *before* any network call, the rich discovery contract is
 * preferred over the compact `/v1/models` fallback, and every failure maps to a
 * stable state with remediation text so `/role-model doctor` can explain it.
 */

import { describe, expect, test } from 'vitest'
import { RoleModelDiscoveryError, discoverRoleModelRuntime } from '../src/runtime-discovery.js'
import { createDiscovery } from './fixtures.js'

/** A recorded fetch call. */
interface RecordedCall {
  readonly url: string
  readonly init: RequestInit | undefined
}

/**
 * Build a fetch that answers from a routing table and records calls.
 * @param routes - url suffix (or exact url) to response body mapping.
 * @returns the fetch function plus its recorded calls.
 */
function recordingFetch(
  routes: Record<string, { status?: number; body?: unknown; hang?: boolean } | 'network-error'>,
): { fetch: typeof fetch; calls: RecordedCall[] } {
  const calls: RecordedCall[] = []
  const impl = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = String(input)
    calls.push({ url, init })
    const key = Object.keys(routes).find(candidate => url.endsWith(candidate)) ?? url
    const route = routes[key]
    if (route === undefined) return new Response('not found', { status: 404 })
    if (route === 'network-error') throw new TypeError('fetch failed')
    if (route.hang === true) {
      return await new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
      })
    }
    const body = typeof route.body === 'string' ? route.body : JSON.stringify(route.body ?? null)
    return new Response(body, { status: route.status ?? 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  return { fetch: impl, calls }
}

const ENDPOINT = 'http://127.0.0.1:3457'

describe('discoverRoleModelRuntime', () => {
  test('prefers rich discovery and reports a ready state', async () => {
    const { fetch, calls } = recordingFetch({
      '/healthz': { body: { status: 'healthy' } },
      '/api/version': { body: { version: '1.2.3', release_version: '1.2.3' } },
      '/api/role-model/downstream/openai': { body: createDiscovery() },
    })
    const result = await discoverRoleModelRuntime({ endpoint: ENDPOINT, env: {}, fetch })
    expect(result.state).toBe('ready')
    expect(result.discovery.displayName).toBe('role-model')
    expect(result.health).toMatchObject({ status: 'healthy' })
    expect(result.version).toMatchObject({ version: '1.2.3' })
    expect(result.warnings).toEqual([])
    expect(calls.map(call => call.url)).toEqual([
      `${ENDPOINT}/healthz`,
      `${ENDPOINT}/api/version`,
      `${ENDPOINT}/api/role-model/downstream/openai`,
    ])
  })

  test('closes the connection on every metadata call', async () => {
    const { fetch, calls } = recordingFetch({
      '/healthz': { body: {} },
      '/api/version': { body: {} },
      '/api/role-model/downstream/openai': { body: createDiscovery() },
    })
    await discoverRoleModelRuntime({ endpoint: ENDPOINT, env: {}, fetch })
    for (const call of calls) {
      const headers = call.init?.headers as Record<string, string> | undefined
      expect(headers?.connection).toBe('close')
      expect(call.init?.keepalive).toBe(false)
    }
  })

  test('tolerates a missing /api/version without failing discovery', async () => {
    const { fetch } = recordingFetch({
      '/healthz': { body: {} },
      '/api/version': { status: 404 },
      '/api/role-model/downstream/openai': { body: createDiscovery() },
    })
    const result = await discoverRoleModelRuntime({ endpoint: ENDPOINT, env: {}, fetch })
    expect(result.state).toBe('ready')
    expect(result.version).toBeUndefined()
  })

  test('falls back to the compact /v1/models listing after a 404 on rich discovery', async () => {
    const { fetch, calls } = recordingFetch({
      '/healthz': { body: {} },
      '/api/version': { body: {} },
      '/api/role-model/downstream/openai': { status: 404 },
      '/v1/models': {
        body: {
          object: 'list',
          data: [{ id: 'baseline.remote-only', object: 'model', owned_by: 'role-model', context_window: 4096, max_tokens: 1024 }],
        },
      },
    })
    const result = await discoverRoleModelRuntime({ endpoint: ENDPOINT, env: {}, fetch })
    expect(result.state).toBe('fallback')
    expect(result.warnings.some(warning => /compact/u.test(warning))).toBe(true)
    expect(result.discovery.models[0]?.id).toBe('baseline.remote-only')
    expect(calls.some(call => call.url.endsWith('/v1/models'))).toBe(true)
  })

  test('refuses a blocked remote endpoint without making any network call', async () => {
    const { fetch, calls } = recordingFetch({})
    // Note the two vocabularies: the trust layer reports 'remote-blocked', the
    // discovery failure state is 'blocked-remote' (Pi's established spelling).
    await expect(
      discoverRoleModelRuntime({ endpoint: 'https://role-model.example.test', env: {}, fetch }),
    ).rejects.toMatchObject({ state: 'blocked-remote' })
    expect(calls).toEqual([])
  })

  test('refuses an unparsable endpoint as invalid, not merely blocked', async () => {
    const { fetch, calls } = recordingFetch({})
    await expect(
      discoverRoleModelRuntime({ endpoint: 'not a url', env: {}, fetch }),
    ).rejects.toMatchObject({ state: 'invalid-endpoint' })
    expect(calls).toEqual([])
  })

  test('refuses an untrusted remote endpoint without making any network call', async () => {
    const { fetch, calls } = recordingFetch({})
    await expect(
      discoverRoleModelRuntime({
        endpoint: 'https://role-model.example.test',
        allowRemote: true,
        isProjectTrusted: () => false,
        env: {},
        fetch,
      }),
    ).rejects.toMatchObject({ state: 'remote-untrusted' })
    expect(calls).toEqual([])
  })

  test('reports an unreachable runtime as unavailable with remediation', async () => {
    const { fetch } = recordingFetch({ '/healthz': 'network-error' })
    const error = await discoverRoleModelRuntime({ endpoint: ENDPOINT, env: {}, fetch }).catch(
      (thrown: unknown) => thrown,
    )
    expect(error).toBeInstanceOf(RoleModelDiscoveryError)
    expect((error as RoleModelDiscoveryError).state).toBe('unavailable')
    expect((error as RoleModelDiscoveryError).remediation.length).toBeGreaterThan(0)
  })

  test('reports a hung runtime as a timeout, not a crash', async () => {
    const { fetch } = recordingFetch({ '/healthz': { hang: true } })
    const error = await discoverRoleModelRuntime({ endpoint: ENDPOINT, env: {}, fetch, timeoutMs: 20 }).catch(
      (thrown: unknown) => thrown,
    )
    expect((error as RoleModelDiscoveryError).state).toBe('timeout')
    expect((error as RoleModelDiscoveryError).remediation).toMatch(/running/u)
  })

  test('reports an incompatible rich contract instead of silently falling back', async () => {
    const { fetch } = recordingFetch({
      '/healthz': { body: {} },
      '/api/version': { body: {} },
      '/api/role-model/downstream/openai': { body: { contractVersion: 'something-else' } },
    })
    const error = await discoverRoleModelRuntime({ endpoint: ENDPOINT, env: {}, fetch }).catch(
      (thrown: unknown) => thrown,
    )
    expect((error as RoleModelDiscoveryError).state).toBe('incompatible')
  })

  test('reports required auth as a distinct, fail-closed state', async () => {
    const { fetch } = recordingFetch({
      '/healthz': { body: {} },
      '/api/version': { body: {} },
      '/api/role-model/downstream/openai': { body: createDiscovery({ authentication: { required: true } }) },
    })
    const error = await discoverRoleModelRuntime({ endpoint: ENDPOINT, env: {}, fetch }).catch(
      (thrown: unknown) => thrown,
    )
    expect((error as RoleModelDiscoveryError).state).toBe('auth-required')
  })

  test('carries the endpoint on every failure', async () => {
    const { fetch } = recordingFetch({ '/healthz': 'network-error' })
    const error = (await discoverRoleModelRuntime({ endpoint: ENDPOINT, env: {}, fetch }).catch(
      (thrown: unknown) => thrown,
    )) as RoleModelDiscoveryError
    expect(error.endpoint).toBe(ENDPOINT)
    expect(error.message.length).toBeGreaterThan(0)
  })
})
