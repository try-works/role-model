/**
 * L7: the `/role-model` command surface.
 *
 * The command handler is a pure function of its dependencies and an argument
 * line, so the exact text can be pinned without a live host. Two rules matter:
 * every non-help command runs discovery first and reports failure with
 * remediation rather than throwing, and the placeholder credential is never
 * echoed back to the user.
 */

import { describe, expect, test } from 'vitest'
import { formatInvalidRoleModelModelId } from '../src/model-guidance.js'
import { createRoleModelCommandHandler } from '../src/commands.js'
import type { RoleModelCommandContext, RoleModelCommandDependencies } from '../src/commands.js'
import { createDiscovery, createModelRecord } from './fixtures.js'

/** Build a discovery payload with the given model records. */
const discoveryWith = (models: readonly unknown[], recommended?: string) =>
  createDiscovery({ models, ...recommended === undefined ? {} : { setup: { recommendedModel: recommended, notes: [] } } })

/**
 * Build command dependencies over injected fakes.
 * @param overrides - dependency overrides.
 * @returns the dependencies plus their recording surfaces.
 */
function dependencies(overrides: Partial<RoleModelCommandDependencies> = {}): {
  deps: RoleModelCommandDependencies
  written: string[]
} {
  const written: string[] = []
  const deps: RoleModelCommandDependencies = {
    discover: async () => ({
      discovery: createDiscovery(),
      state: 'ready' as const,
      warnings: [],
      health: { status: 'healthy' },
      version: { release_version: '1.2.3', version: '9.9.9' },
    }),
    readSelectedAlias: () => null,
    writeSelectedAlias: (alias: string) => { written.push(alias) },
    listRecentRequests: async () => [],
    inspectRequest: async () => null,
    ...overrides,
  }
  return { deps, written }
}

/** Run the handler with the given arguments. */
async function run(
  args: string,
  deps: RoleModelCommandDependencies,
  context: RoleModelCommandContext = {},
): Promise<{ ok: boolean; text: string }> {
  return createRoleModelCommandHandler(deps)(args, context)
}

describe('help', () => {
  test('lists every subcommand', async () => {
    const { deps } = dependencies()
    const result = await run('help', deps)
    expect(result.ok).toBe(true)
    for (const command of ['setup', 'status', 'doctor', 'requests', 'explain', 'alias']) {
      expect(result.text).toContain(command)
    }
  })

  test('is the default when no argument is given', async () => {
    const { deps } = dependencies()
    const result = await run('', deps)
    expect(result.ok).toBe(true)
    expect(result.text).toContain('/role-model')
  })

  test('never capitalises the product name', async () => {
    const { deps } = dependencies()
    const result = await run('help', deps)
    expect(result.text).not.toMatch(/Role[ -]Model/u)
  })
})

describe('discovery gating', () => {
  test('reports a blocked endpoint with remediation instead of throwing', async () => {
    const { deps } = dependencies({
      discover: async () => {
        throw Object.assign(new Error('Remote role-model endpoint is blocked by default.'), {
          state: 'blocked-remote',
          remediation: 'Set allowRemote only for a runtime you control.',
        })
      },
    })
    const result = await run('status', deps)
    expect(result.ok).toBe(false)
    expect(result.text).toContain('blocked-remote')
    expect(result.text).toContain('Set allowRemote')
  })

  test('every non-help command runs discovery first', async () => {
    let calls = 0
    const { deps } = dependencies({
      discover: async () => {
        calls += 1
        return { discovery: createDiscovery(), state: 'ready' as const, warnings: [] }
      },
    })
    for (const command of ['setup', 'status', 'doctor', 'alias list', 'requests']) {
      await run(command, deps)
    }
    expect(calls).toBe(5)
  })

  test('the failure block names the command that failed', async () => {
    const { deps } = dependencies({
      discover: async () => { throw Object.assign(new Error('down'), { state: 'unavailable', remediation: 'start it' }) },
    })
    expect((await run('doctor', deps)).text).toContain('doctor')
    expect((await run('status', deps)).text).toContain('status')
  })
})

describe('status', () => {
  test('reports the runtime, catalog and selection state', async () => {
    const { deps } = dependencies()
    const result = await run('status', deps)
    expect(result.ok).toBe(true)
    expect(result.text).toContain('endpoint:')
    expect(result.text).toContain('runtime version: 1.2.3')
    expect(result.text).toContain('aliases: 1')
    expect(result.text).toContain('recommended alias: baseline.remote-only')
    expect(result.text).toContain('provider: registered')
  })

  test('never echoes a credential', async () => {
    const { deps } = dependencies()
    const result = await run('status', deps)
    expect(result.text).not.toContain('role-model-local')
  })

  test('prefers the live selection over a stored alias', async () => {
    const { deps } = dependencies({
      readSelectedAlias: () => 'stale.alias',
      getActiveModelId: () => 'baseline.remote-only',
    })
    const result = await run('status', deps)
    expect(result.text).toContain('selected alias: baseline.remote-only')
    expect(result.text).toContain('stored alias: stale.alias')
  })

  test('flags a stored alias the runtime no longer advertises', async () => {
    const { deps } = dependencies({ readSelectedAlias: () => 'gone.alias' })
    const result = await run('status', deps)
    expect(result.text).toContain('selected alias state: removed or no longer discoverable')
  })
})

describe('doctor', () => {
  test('reports each checked fact', async () => {
    const { deps } = dependencies()
    const result = await run('doctor', deps)
    expect(result.ok).toBe(true)
    for (const fact of ['health:', 'downstream discovery:', 'provider:', 'aliases:', 'models:']) {
      expect(result.text).toContain(fact)
    }
  })

  test('reports degraded models when discovery sized one conservatively', async () => {
    const { deps } = dependencies({
      discover: async () => ({
        discovery: discoveryWith([createModelRecord({ id: 'x', piMapping: {}, limits: {} })]),
        state: 'ready' as const,
        warnings: [],
      }),
    })
    const result = await run('doctor', deps)
    expect(result.text).toContain('degraded models: x')
  })

  test('reports the fallback state and its warning', async () => {
    const { deps } = dependencies({
      discover: async () => ({
        discovery: createDiscovery(),
        state: 'fallback' as const,
        warnings: ['Using compact /v1/models fallback.'],
      }),
    })
    const result = await run('doctor', deps)
    expect(result.text).toContain('fallback: yes')
    expect(result.text).toContain('compact /v1/models fallback')
  })
})

describe('alias', () => {
  test('lists every alias with a recommended marker', async () => {
    const models = [
      createModelRecord({ id: 'baseline.remote-only', type: 'alias' }),
      createModelRecord({ id: 'baseline.hybrid', type: 'alias' }),
      createModelRecord({ id: 'endpoint.one', type: 'endpoint' }),
    ]
    const { deps } = dependencies({
      discover: async () => ({
        discovery: discoveryWith(models, 'baseline.remote-only'),
        state: 'ready' as const,
        warnings: [],
      }),
    })
    const result = await run('alias list', deps)
    expect(result.ok).toBe(true)
    expect(result.text).toContain('baseline.remote-only')
    expect(result.text).toContain('baseline.hybrid')
    expect(result.text).toContain('(recommended)')
    // Endpoints are selectable but are not aliases.
    expect(result.text).not.toContain('endpoint.one')
  })

  test('reports the recommendation', async () => {
    const { deps } = dependencies()
    const result = await run('alias recommended', deps)
    expect(result.text).toContain('recommended alias: baseline.remote-only')
  })

  test('records a selection by alias id', async () => {
    const { deps, written } = dependencies()
    const result = await run('alias use baseline.remote-only', deps)
    expect(result.ok).toBe(true)
    expect(written).toEqual(['baseline.remote-only'])
    expect(result.text).toContain('selected alias: baseline.remote-only')
  })

  test('accepts a role-model/-qualified id and stores the bare id', async () => {
    const { deps, written } = dependencies()
    const result = await run('alias use role-model/baseline.remote-only', deps)
    expect(result.ok).toBe(true)
    expect(written).toEqual(['baseline.remote-only'])
  })

  test('refuses an unknown alias with the recovery text', async () => {
    const { deps, written } = dependencies()
    const result = await run('alias use nope', deps)
    expect(result.ok).toBe(false)
    expect(written).toEqual([])
    expect(result.text).toContain('invalid role-model alias')
    expect(result.text).toContain('/role-model alias list')
  })

  test('explains a foreign provider model id', async () => {
    const { deps } = dependencies()
    const result = await run('alias use gpt-4o', deps)
    expect(result.ok).toBe(false)
    expect(result.text).toContain('foreign-provider-model')
  })

  test('requires an argument', async () => {
    const { deps } = dependencies()
    const result = await run('alias use', deps)
    expect(result.ok).toBe(false)
    expect(result.text).toContain('Usage: /role-model alias')
  })

  test('reports the current selection', async () => {
    const { deps } = dependencies({ readSelectedAlias: () => 'baseline.hybrid' })
    expect((await run('alias current', deps)).text).toContain('Current role-model alias: baseline.hybrid')
  })

  test('an unknown alias subcommand lists usage', async () => {
    const { deps } = dependencies()
    const result = await run('alias bogus', deps)
    expect(result.ok).toBe(false)
    expect(result.text).toContain('alias list')
  })
})

describe('requests', () => {
  test('renders one line per recent request', async () => {
    const { deps } = dependencies({
      listRecentRequests: async () => [
        { requestId: 'req-1', status: 'completed', endpointId: 'e.one', modelId: 'm.one', roleId: 'coder', taskType: 'coder.edit' },
        { requestId: 'req-2', status: 'failed' },
      ],
    })
    const result = await run('requests', deps)
    expect(result.ok).toBe(true)
    expect(result.text).toContain('req-1')
    expect(result.text).toContain('endpoint=e.one')
    expect(result.text).toContain('role=coder')
    expect(result.text).toContain('task=coder.edit')
    expect(result.text).toContain('req-2')
  })

  test('honours an explicit limit', async () => {
    let seen: number | undefined
    const { deps } = dependencies({
      listRecentRequests: async (limit?: number) => {
        seen = limit
        return []
      },
    })
    await run('requests 3', deps)
    expect(seen).toBe(3)
  })

  test('defaults the limit when the argument is not a number', async () => {
    let seen: number | undefined
    const { deps } = dependencies({
      listRecentRequests: async (limit?: number) => { seen = limit; return [] },
    })
    await run('requests abc', deps)
    expect(seen).toBe(10)
  })

  test('says so when there are none', async () => {
    const { deps } = dependencies()
    expect((await run('requests', deps)).text).toContain('No recent role-model runtime requests')
  })

  test('reports when inspection is unavailable in this context', async () => {
    const { deps } = dependencies({ listRecentRequests: undefined })
    const result = await run('requests', deps)
    expect(result.ok).toBe(false)
    expect(result.text).toContain('unavailable')
  })
})

describe('explain', () => {
  test('renders the joined decision', async () => {
    const { deps } = dependencies({
      listRecentRequests: async () => [{ requestId: 'req-1' }],
      inspectRequest: async () => ({
        requestId: 'req-1',
        status: 'completed',
        endpointId: 'e.one',
        modelId: 'm.one',
        providerId: 'deepseek',
        roleId: 'coder',
        taskType: 'coder.edit',
        selectedEndpointId: 'e.one',
        selectedModelId: 'deepseek-v4-flash',
        strategyLabel: 'baseline',
        selectionReasons: ['role_match', 'cost'],
        observeRequestPath: '/observe/req-1',
      }),
    })
    const result = await run('explain latest', deps)
    expect(result.ok).toBe(true)
    expect(result.text).toContain('request: req-1')
    expect(result.text).toContain('strategy: baseline')
    expect(result.text).toContain('selection reasons: role_match, cost')
    expect(result.text).toContain('observe:')
  })

  test('resolves latest through the request list', async () => {
    let explained: string | undefined
    const { deps } = dependencies({
      listRecentRequests: async () => [{ requestId: 'req-newest' }],
      inspectRequest: async (requestId: string) => {
        explained = requestId
        return null
      },
    })
    await run('explain latest', deps)
    expect(explained).toBe('req-newest')
  })

  test('reports an unknown request id', async () => {
    const { deps } = dependencies({ inspectRequest: async () => null })
    const result = await run('explain req-missing', deps)
    expect(result.ok).toBe(false)
    expect(result.text).toContain('not found')
  })

  test('reports when there is nothing to explain', async () => {
    const { deps } = dependencies()
    expect((await run('explain latest', deps)).text).toContain('No recent role-model runtime request')
  })

  test('says when no request id was given', async () => {
    const { deps } = dependencies()
    const result = await run('explain', deps)
    expect(result.ok).toBe(false)
    expect(result.text).toContain('Usage: /role-model explain')
  })
})

describe('setup and ui', () => {
  test('setup re-registers the provider and names the recommendation', async () => {
    let refreshed = 0
    const { deps } = dependencies({
      refreshProvider: async () => { refreshed += 1 },
    })
    const result = await run('setup', deps)
    expect(result.ok).toBe(true)
    expect(refreshed).toBe(1)
    expect(result.text).toContain('recommended alias: baseline.remote-only')
  })

  test('ui prints the runtime URL, not the /v1 provider base', async () => {
    const { deps } = dependencies()
    const result = await run('ui', deps)
    expect(result.ok).toBe(true)
    expect(result.text).toContain('http://127.0.0.1:3457')
    expect(result.text).not.toContain('/v1')
  })
})

describe('unknown commands', () => {
  test('reports the unknown command and shows help', async () => {
    const { deps } = dependencies()
    const result = await run('bogus', deps)
    expect(result.ok).toBe(false)
    expect(result.text).toContain('Unknown /role-model command: bogus')
    expect(result.text).toContain('setup')
  })
})

describe('guidance text shared with model-guidance', () => {
  test('the invalid-alias text matches the model-guidance formatter', async () => {
    const { deps } = dependencies()
    const result = await run('alias use nope', deps)
    const expected = formatInvalidRoleModelModelId(createDiscovery(), 'nope', true).replace(
      'invalid role-model model id:',
      'invalid role-model alias:',
    )
    expect(result.text).toContain('invalid role-model alias:')
    expect(expected).toContain('invalid role-model alias:')
  })
})
