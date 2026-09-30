/**
 * L1: configuration schema.
 *
 * The Harness loader validates a plugin's `config` against its exported schema
 * before activation and reports a schema-less plugin as `absent`. These specs lock
 * the validation and defaulting a user's patch row relies on.
 */

import { describe, expect, test } from 'vitest'
import { Config } from '../src/index.js'
import { createRoleModelConfig } from '../src/config.js'

describe('Config validation', () => {
  test('fills defaults for an empty row', () => {
    const config = Config({})
    expect(config.endpoint).toBe('http://127.0.0.1:3456')
    expect(config.allowRemote).toBe(false)
    expect(config.requestTimeoutMs).toBe(2500)
    expect(config.providerRoute).toBe('role-model')
  })

  test('omits null-defaulted fields rather than materialising them', () => {
    // schemastery treats a declared default as documentable but omissible, so
    // these arrive absent and the plugin resolves them to null itself.
    const config = Config({})
    expect(config.selectedAlias).toBeUndefined()
    expect(config.hostLlmModule).toBeUndefined()
  })

  test('accepts and preserves an explicit configuration', () => {
    const config = Config({
      endpoint: 'http://127.0.0.1:3457',
      allowRemote: true,
      requestTimeoutMs: 5000,
      providerRoute: 'role-model-local',
      selectedAlias: 'baseline.remote-only',
      hostLlmModule: '/host/dsh-llm.js',
    })
    expect(config.endpoint).toBe('http://127.0.0.1:3457')
    expect(config.allowRemote).toBe(true)
    expect(config.requestTimeoutMs).toBe(5000)
    expect(config.providerRoute).toBe('role-model-local')
    expect(config.selectedAlias).toBe('baseline.remote-only')
    expect(config.hostLlmModule).toBe('/host/dsh-llm.js')
  })

  test('exposes a schema the loader can project', () => {
    expect(typeof Config).toBe('function')
    // schemastery attaches `toJSON` for schema projection.
    expect(typeof (Config as unknown as { toJSON?: unknown }).toJSON).toBe('function')
  })

  test('rejects a non-boolean allowRemote', () => {
    expect(() => Config({ allowRemote: 'yes' as unknown as boolean })).toThrow()
  })

  test('rejects a non-positive timeout', () => {
    expect(() => Config({ requestTimeoutMs: 0 })).toThrow()
    expect(() => Config({ requestTimeoutMs: -5 })).toThrow()
  })

  test('normalizes the endpoint during activation resolution, not in the schema', () => {
    // The schema carries the raw value; `createRoleModelConfig` owns normalization,
    // and `apply` always resolves through it so no un-normalized endpoint is used.
    const normalized = createRoleModelConfig(Config({ endpoint: 'http://127.0.0.1:3457/v1/' }))
    expect(normalized.endpoint).toBe('http://127.0.0.1:3457')
  })
})
