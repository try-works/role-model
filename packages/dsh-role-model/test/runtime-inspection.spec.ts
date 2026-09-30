/**
 * L1: runtime request inspection.
 *
 * Backs `/role-model requests` and `/role-model explain`. The runtime emits both
 * snake_case and camelCase spellings and returns 404 for an unknown request, which
 * must read as "absent" rather than as an error.
 */

import { describe, expect, test } from 'vitest'
import { inspectRequest, listRecentRequests } from '../src/runtime-inspection.js'

const ENDPOINT = 'http://127.0.0.1:3457'

/** Build a fetch that answers from a url-suffix table and records calls. */
function recordingFetch(
  routes: Record<string, { status?: number; body?: unknown } | 'network-error'>,
): { fetch: typeof fetch; calls: string[] } {
  const calls: string[] = []
  const impl = (async (input: RequestInfo | URL): Promise<Response> => {
    const url = String(input)
    calls.push(url)
    const key = Object.keys(routes).find(candidate => url.endsWith(candidate)) ?? url
    const route = routes[key]
    if (route === undefined) return new Response('not found', { status: 404 })
    if (route === 'network-error') throw new TypeError('fetch failed')
    return new Response(JSON.stringify(route.body ?? null), {
      status: route.status ?? 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
  return { fetch: impl, calls }
}

describe('listRecentRequests', () => {
  test('reads snake_case request records', async () => {
    const { fetch } = recordingFetch({
      '/api/role-model/requests': {
        body: [
          {
            request_id: 'req-1',
            endpoint_id: 'deepseek.one',
            model_id: 'baseline.remote-only',
            provider_id: 'deepseek',
            status: 'completed',
            created_at_ms: 1_700_000_000_000,
            normalized_intent: { roleId: 'coder', taskType: 'coder.edit' },
          },
        ],
      },
    })
    const requests = await listRecentRequests({ endpoint: ENDPOINT, fetch })
    expect(requests).toHaveLength(1)
    expect(requests[0]).toMatchObject({
      requestId: 'req-1',
      endpointId: 'deepseek.one',
      modelId: 'baseline.remote-only',
      providerId: 'deepseek',
      status: 'completed',
      roleId: 'coder',
      taskType: 'coder.edit',
    })
  })

  test('reads camelCase request records too', async () => {
    const { fetch } = recordingFetch({
      '/api/role-model/requests': {
        body: [{ requestId: 'req-2', endpointId: 'e', modelId: 'm', status: 'failed', createdAtMs: 5 }],
      },
    })
    const requests = await listRecentRequests({ endpoint: ENDPOINT, fetch })
    expect(requests[0]).toMatchObject({ requestId: 'req-2', endpointId: 'e', modelId: 'm', status: 'failed' })
  })

  test('reads the role and task out of the injected role_model intent as a fallback', async () => {
    const { fetch } = recordingFetch({
      '/api/role-model/requests': {
        body: [{ request_id: 'req-3', role_model: { intent: { role_hint_id: 'security', task_type: 'security.audit' } } }],
      },
    })
    const requests = await listRecentRequests({ endpoint: ENDPOINT, fetch })
    expect(requests[0]).toMatchObject({ roleId: 'security', taskType: 'security.audit' })
  })

  test('drops entries with no request id rather than inventing one', async () => {
    const { fetch } = recordingFetch({
      '/api/role-model/requests': { body: [{ endpoint_id: 'e' }, { request_id: 'kept' }] },
    })
    const requests = await listRecentRequests({ endpoint: ENDPOINT, fetch })
    expect(requests.map(request => request.requestId)).toEqual(['kept'])
  })

  test('applies the limit client-side, without a query parameter', async () => {
    const { fetch, calls } = recordingFetch({
      '/api/role-model/requests': { body: [{ request_id: 'a' }, { request_id: 'b' }, { request_id: 'c' }] },
    })
    const requests = await listRecentRequests({ endpoint: ENDPOINT, fetch, limit: 2 })
    expect(requests.map(request => request.requestId)).toEqual(['a', 'b'])
    expect(calls[0]).not.toMatch(/\?/u)
  })

  test('returns an empty list when the runtime reports none', async () => {
    const { fetch } = recordingFetch({ '/api/role-model/requests': { body: [] } })
    expect(await listRecentRequests({ endpoint: ENDPOINT, fetch })).toEqual([])
  })

  test('returns an empty list on a malformed payload rather than throwing', async () => {
    const { fetch } = recordingFetch({ '/api/role-model/requests': { body: { nope: true } } })
    expect(await listRecentRequests({ endpoint: ENDPOINT, fetch })).toEqual([])
  })

  test('returns an empty list when the runtime is unreachable', async () => {
    const { fetch } = recordingFetch({ '/api/role-model/requests': 'network-error' })
    expect(await listRecentRequests({ endpoint: ENDPOINT, fetch })).toEqual([])
  })
})

describe('inspectRequest', () => {
  test('joins the request record with its router decision', async () => {
    const { fetch } = recordingFetch({
      '/api/role-model/requests/req-1': {
        body: { request_id: 'req-1', endpoint_id: 'deepseek.one', model_id: 'm', status: 'completed' },
      },
      '/api/role-model/router/decisions/req-1': {
        body: {
          request_id: 'req-1',
          selected_endpoint_id: 'deepseek.one',
          selected_model_id: 'deepseek-v4-flash',
          strategy_label: 'hybrid',
          decision: { selection_reasons: ['role_match', 'cost'] },
          observe_request_path: '/observe/req-1',
        },
      },
    })
    const inspected = await inspectRequest({ endpoint: ENDPOINT, requestId: 'req-1', fetch })
    expect(inspected).not.toBeNull()
    expect(inspected).toMatchObject({
      requestId: 'req-1',
      endpointId: 'deepseek.one',
      selectedEndpointId: 'deepseek.one',
      selectedModelId: 'deepseek-v4-flash',
      strategyLabel: 'hybrid',
      selectionReasons: ['role_match', 'cost'],
      observeRequestPath: '/observe/req-1',
    })
  })

  test('reads camelCase selection reasons', async () => {
    const { fetch } = recordingFetch({
      '/api/role-model/requests/r': { body: { request_id: 'r' } },
      '/api/role-model/router/decisions/r': { body: { request_id: 'r', decision: { selectionReasons: ['only'] } } },
    })
    const inspected = await inspectRequest({ endpoint: ENDPOINT, requestId: 'r', fetch })
    expect(inspected?.selectionReasons).toEqual(['only'])
  })

  test('returns null for an unknown request id, treating 404 as absent', async () => {
    const { fetch } = recordingFetch({})
    expect(await inspectRequest({ endpoint: ENDPOINT, requestId: 'missing', fetch })).toBeNull()
  })

  test('returns the request even when its decision is absent', async () => {
    const { fetch } = recordingFetch({
      '/api/role-model/requests/r': { body: { request_id: 'r', model_id: 'm' } },
    })
    const inspected = await inspectRequest({ endpoint: ENDPOINT, requestId: 'r', fetch })
    expect(inspected).toMatchObject({ requestId: 'r', modelId: 'm' })
    expect(inspected?.selectedEndpointId).toBeUndefined()
  })

  test('percent-encodes the request id in both paths', async () => {
    const { fetch, calls } = recordingFetch({})
    await inspectRequest({ endpoint: ENDPOINT, requestId: 'a/b c', fetch })
    for (const call of calls) expect(call).not.toContain('a/b c')
    expect(calls.some(call => call.endsWith('/api/role-model/requests/a%2Fb%20c'))).toBe(true)
  })

  test('defaults the endpoint to the configured runtime', async () => {
    const { fetch, calls } = recordingFetch({})
    await inspectRequest({ requestId: 'r', fetch, env: { ROLE_MODEL_ENDPOINT: 'http://127.0.0.1:3458' } })
    expect(calls[0]?.startsWith('http://127.0.0.1:3458/')).toBe(true)
  })
})
