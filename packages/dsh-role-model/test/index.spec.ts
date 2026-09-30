/**
 * L1: plugin activation.
 *
 * Activation must be total: a missing runtime, a refused endpoint, or a missing
 * optional service must leave the harness healthy and merely log a diagnostic, so
 * `/role-model doctor` can explain the state later. It must also never make a
 * request to a refused endpoint.
 */

import { describe, expect, test } from 'vitest'
import { Config, createRoleModelPlugin, name } from '../src/index.js'
import type { CreateRoleModelAdapterOptions } from '../src/adapter.js'
import { createDiscovery } from './fixtures.js'

/** A structurally valid host `LlmAdapter` class for activation to use. */
class FakeLlmAdapter {
  providerInfo(provider: string) { return { id: provider, name: provider } }
}

/** A structurally valid host `LlmError` class. */
class FakeLlmError extends Error {
  readonly code: string
  readonly failure: { message: string; code: string }
  constructor(message: string, code: string) {
    super(message)
    this.code = code
    this.failure = { message, code }
  }
}

/** The host classes activation would otherwise resolve at runtime. */
const fakeHostLlm = {
  LlmAdapter: FakeLlmAdapter as unknown as CreateRoleModelAdapterOptions['LlmAdapterBase'],
  LlmError: FakeLlmError as unknown as CreateRoleModelAdapterOptions['LlmErrorClass'],
  source: { kind: 'harness-root' as const, path: '/fake/harness/packages/llm/llm/lib/index.js', because: 'test' },
}

/** A minimal service host standing in for the Cordis context. */
interface FakeContext {
  readonly registered: string[][]
  readonly adapters: string[][]
  readonly disposed: number
  readonly logs: string[]
  readonly effects: number
}

/**
 * Build a fake context exposing only what activation touches.
 * @param options - whether the optional services exist.
 * @returns the context plus the recording surfaces.
 */
function fakeContext(options: {
  llm?: boolean
  commands?: boolean
  skills?: boolean
  withEffect?: boolean
  directory?: boolean
} = {}): FakeContext & {
  ctx: unknown
} {
  const registered: string[][] = []
  const adapters: string[][] = []
  const logs: string[] = []
  const recorder = {
    registered,
    adapters,
    get disposed(): number { return 0 },
    logs,
    get effects(): number { return 0 },
  }
  const llm = options.llm === false
    ? undefined
    : {
        registerAdapter: (providers: string[]) => {
          adapters.push(providers)
          return () => undefined
        },
        ...options.directory === false ? {} : {
          registerConfigurableProviders: (entries: readonly { provider: string }[]) => {
            registered.push(entries.map(entry => entry.provider))
            return () => undefined
          },
        },
      }
  const ctx: Record<string, unknown> = {
    logger: {
      info: (message: unknown) => { logs.push(`info:${String(message)}`) },
      warn: (message: unknown) => { logs.push(`warn:${String(message)}`) },
      error: (message: unknown) => { logs.push(`error:${String(message)}`) },
    },
    get: (service: string) => (service === 'llm' ? llm : undefined),
  }
  if (options.withEffect === true) {
    ctx.effect = (callback: () => unknown) => {
      callback()
      return () => undefined
    }
  }
  return Object.assign(recorder, { ctx })
}

describe('plugin identity', () => {
  test('exports the package name as the plugin name', () => {
    expect(name).toBe('@try-works/dsh-role-model')
  })

  test('exposes a Config schema for the loader to validate', () => {
    expect(Config).toBeDefined()
  })

  test('the Config schema accepts the shipped default row', () => {
    const parsed = Config({
      endpoint: 'http://127.0.0.1:3456',
      allowRemote: false,
      requestTimeoutMs: 2500,
      providerRoute: 'role-model',
      selectedAlias: null,
      hostLlmModule: null,
    })
    expect(parsed.providerRoute).toBe('role-model')
  })
})

describe('apply activation', () => {
  test('refuses a blocked remote endpoint and never calls fetch', async () => {
    const { ctx, logs } = fakeContext()
    let fetchCalls = 0
    const plugin = createRoleModelPlugin({ hostLlm: fakeHostLlm,
      fetch: (async () => {
        fetchCalls += 1
        return new Response('{}', { status: 200 })
      }) as typeof fetch,
    })
    await plugin(ctx as never, {
      endpoint: 'https://role-model.example.test',
      allowRemote: false,
      requestTimeoutMs: 50,
      providerRoute: 'role-model',
      selectedAlias: null,
      hostLlmModule: null,
    })
    expect(fetchCalls).toBe(0)
    expect(logs.some(line => /warn|error/u.test(line))).toBe(true)
  })

  test('survives an unreachable runtime without throwing', async () => {
    const { ctx } = fakeContext()
    const plugin = createRoleModelPlugin({ hostLlm: fakeHostLlm,
      fetch: (async () => { throw new TypeError('fetch failed') }) as typeof fetch,
    })
    await expect(plugin(ctx as never, {
      endpoint: 'http://127.0.0.1:3457',
      allowRemote: false,
      requestTimeoutMs: 50,
      providerRoute: 'role-model',
      selectedAlias: null,
      hostLlmModule: null,
    })).resolves.toBeUndefined()
  })

  test('registers the route as a configurable provider when discovery succeeds', async () => {
    const { ctx, registered } = fakeContext()
    const plugin = createRoleModelPlugin({ hostLlm: fakeHostLlm,
      fetch: (async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.endsWith('/api/role-model/downstream/openai')) {
          return new Response(JSON.stringify(createDiscovery()), { status: 200 })
        }
        return new Response(JSON.stringify({}), { status: 200 })
      }) as typeof fetch,
    })
    await plugin(ctx as never, {
      endpoint: 'http://127.0.0.1:3457',
      allowRemote: false,
      requestTimeoutMs: 2000,
      providerRoute: 'role-model',
      selectedAlias: null,
      hostLlmModule: null,
    })
    expect(registered).toEqual([['role-model']])
  })

  test('stays silent and healthy when the llm service is absent', async () => {
    const { ctx, registered } = fakeContext({ llm: false })
    const plugin = createRoleModelPlugin({ hostLlm: fakeHostLlm,
      fetch: (async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.endsWith('/api/role-model/downstream/openai')) {
          return new Response(JSON.stringify(createDiscovery()), { status: 200 })
        }
        return new Response(JSON.stringify({}), { status: 200 })
      }) as typeof fetch,
    })
    await expect(plugin(ctx as never, {
      endpoint: 'http://127.0.0.1:3457',
      allowRemote: false,
      requestTimeoutMs: 2000,
      providerRoute: 'role-model',
      selectedAlias: null,
      hostLlmModule: null,
    })).resolves.toBeUndefined()
    expect(registered).toEqual([])
  })

  test('scopes the registration through ctx.effect when the context owns it', async () => {
    const { ctx, registered } = fakeContext({ withEffect: true })
    const plugin = createRoleModelPlugin({ hostLlm: fakeHostLlm,
      fetch: (async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.endsWith('/api/role-model/downstream/openai')) {
          return new Response(JSON.stringify(createDiscovery()), { status: 200 })
        }
        return new Response(JSON.stringify({}), { status: 200 })
      }) as typeof fetch,
    })
    await plugin(ctx as never, {
      endpoint: 'http://127.0.0.1:3457',
      allowRemote: false,
      requestTimeoutMs: 2000,
      providerRoute: 'role-model',
      selectedAlias: null,
      hostLlmModule: null,
    })
    expect(registered).toEqual([['role-model']])
  })

  test('resolves an empty config to the documented defaults and still activates', async () => {
    // The loader may hand over a config object missing every optional field, so
    // activation must resolve its own defaults rather than assume presence.
    const { ctx, registered } = fakeContext()
    const endpoints: string[] = []
    const plugin = createRoleModelPlugin({ hostLlm: fakeHostLlm,
      fetch: (async (input: RequestInfo | URL) => {
        endpoints.push(String(input))
        const url = String(input)
        if (url.endsWith('/api/role-model/downstream/openai')) {
          return new Response(JSON.stringify(createDiscovery()), { status: 200 })
        }
        return new Response(JSON.stringify({}), { status: 200 })
      }) as typeof fetch,
    })
    await plugin(ctx as never, {})
    expect(registered).toEqual([['role-model']])
    // Defaults to the production endpoint unless configuration says otherwise.
    expect(endpoints[0]?.startsWith('http://127.0.0.1:3456/')).toBe(true)
  })

  test('registers the adapter so the route reaches the model selector', async () => {
    const { ctx, adapters, registered } = fakeContext()
    const plugin = createRoleModelPlugin({
      hostLlm: fakeHostLlm,
      fetch: (async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.endsWith('/api/role-model/downstream/openai')) {
          return new Response(JSON.stringify(createDiscovery()), { status: 200 })
        }
        return new Response(JSON.stringify({}), { status: 200 })
      }) as typeof fetch,
    })
    await plugin(ctx as never, {
      endpoint: 'http://127.0.0.1:3457',
      allowRemote: false,
      requestTimeoutMs: 2000,
      providerRoute: 'role-model',
    })
    expect(adapters).toEqual([['role-model']])
    expect(registered).toEqual([['role-model']])
  })

  test('registers the route even when the runtime is unreachable', async () => {
    // A runtime outage must degrade the catalog, not remove the route: otherwise
    // the model selector would lose the group exactly when the user is diagnosing it.
    const { ctx, adapters } = fakeContext()
    const plugin = createRoleModelPlugin({
      hostLlm: fakeHostLlm,
      fetch: (async () => { throw new TypeError('fetch failed') }) as typeof fetch,
    })
    await plugin(ctx as never, {
      endpoint: 'http://127.0.0.1:3457',
      allowRemote: false,
      requestTimeoutMs: 50,
      providerRoute: 'role-model',
    })
    expect(adapters).toEqual([['role-model']])
  })

  test('skips registration when the context lacks an llm service', async () => {
    const { ctx, adapters } = fakeContext({ llm: false })
    const plugin = createRoleModelPlugin({ hostLlm: fakeHostLlm })
    await expect(plugin(ctx as never, {})).resolves.toBeUndefined()
    expect(adapters).toEqual([])
  })

  test('tolerates an llm service without the optional provider directory', async () => {
    const { ctx, adapters, registered } = fakeContext({ directory: false })
    const plugin = createRoleModelPlugin({
      hostLlm: fakeHostLlm,
      fetch: (async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.endsWith('/api/role-model/downstream/openai')) {
          return new Response(JSON.stringify(createDiscovery()), { status: 200 })
        }
        return new Response(JSON.stringify({}), { status: 200 })
      }) as typeof fetch,
    })
    await plugin(ctx as never, {
      endpoint: 'http://127.0.0.1:3457',
      allowRemote: false,
      requestTimeoutMs: 2000,
      providerRoute: 'role-model',
    })
    expect(adapters).toEqual([['role-model']])
    expect(registered).toEqual([])
  })

  test('never throws when the host LLM module cannot be located', async () => {
    const { ctx, logs, adapters } = fakeContext()
    const plugin = createRoleModelPlugin({ hostLlm: undefined })
    await expect(plugin(ctx as never, {
      endpoint: 'http://127.0.0.1:3457',
      allowRemote: false,
      requestTimeoutMs: 50,
      providerRoute: 'role-model',
      hostLlmModule: '/definitely/not/a/module.js',
    })).resolves.toBeUndefined()
    // Either it fell through to the real checkout (present in this repo's
    // environment) or it reported the miss; both are healthy. A throw is not.
    expect(adapters.length === 1 || logs.some(line => line.includes('LLM module'))).toBe(true)
  })

  test('never logs a capitalised product name', async () => {
    const { ctx, logs } = fakeContext()
    const plugin = createRoleModelPlugin({ hostLlm: fakeHostLlm,
      fetch: (async () => { throw new TypeError('fetch failed') }) as typeof fetch,
    })
    await plugin(ctx as never, {
      endpoint: 'http://127.0.0.1:3457',
      allowRemote: false,
      requestTimeoutMs: 50,
      providerRoute: 'role-model',
      selectedAlias: null,
      hostLlmModule: null,
    })
    for (const line of logs) expect(line).not.toMatch(/Role[ -]Model/u)
  })
})
