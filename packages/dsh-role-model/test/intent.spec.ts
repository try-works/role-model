/**
 * L3: intent metadata injection over a harness request.
 *
 * This is the core capability. The specs pin the gating (what must *not* be
 * modified), the field shape the runtime consumes, the two-pass runtime expansion,
 * and the signal extraction that reads a harness request rather than an OpenAI
 * payload.
 */

import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'
import {
  applyRoleModelIntent,
  extractClassificationSignals,
  hasRoleModelIntent,
} from '../src/intent.js'
import type { IntentRequest } from '../src/intent.js'
import { createStagedCompactTaxonomyReader } from '../src/taxonomy/staged-compact-taxonomy.js'
import type { CompactRoleTask } from '../src/taxonomy/compact-data.js'

const dataRoot = join(resolve(dirname(fileURLToPath(import.meta.url)), '..'), 'data', 'taxonomy')

/** The full bundled taxonomy, for cases that need no file reads. */
const taxonomy = createStagedCompactTaxonomyReader({ dataRoot }).loadFullTaxonomy()

/** A minimal harness request carrying one user prompt. */
function request(overrides: Partial<IntentRequest> = {}): IntentRequest {
  return {
    provider: 'role-model',
    model: 'baseline.remote-only',
    messages: [{ role: 'user', content: [{ type: 'text', text: 'Implement a bug fix in the parser.' }] }],
    ...overrides,
  }
}

/** A runtime task-chunk fetcher counting its calls. */
function chunkFetcher(tasks?: readonly CompactRoleTask[]): {
  fetch: (roleId: string) => Promise<readonly CompactRoleTask[]>
  calls: string[]
} {
  const calls: string[] = []
  return {
    calls,
    fetch: async (roleId: string) => {
      calls.push(roleId)
      return tasks ?? taxonomy.roleTaskChunks[roleId] ?? []
    },
  }
}

describe('extractClassificationSignals', () => {
  test('reads the last user message text', () => {
    const signals = extractClassificationSignals(request({
      messages: [
        { role: 'user', content: [{ type: 'text', text: 'first' }] },
        { role: 'assistant', content: [{ type: 'text', text: 'reply' }] },
        { role: 'user', content: [{ type: 'text', text: 'second question' }] },
      ],
    }))
    expect(signals.prompt).toBe('second question')
  })

  test('joins multiple text parts of one message', () => {
    const signals = extractClassificationSignals(request({
      messages: [{ role: 'user', content: [{ type: 'text', text: 'alpha' }, { type: 'text', text: 'beta' }] }],
    }))
    expect(signals.prompt).toBe('alpha\nbeta')
  })

  test('accepts plain string content', () => {
    const signals = extractClassificationSignals(request({
      messages: [{ role: 'user', content: 'plain string prompt' }],
    }))
    expect(signals.prompt).toBe('plain string prompt')
  })

  test('reports tools, tool names, images and files', () => {
    const signals = extractClassificationSignals(request({
      tools: [{ name: 'read' }, { name: 'grep' }],
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: 'look at these' },
          { type: 'image' },
          { type: 'file', filename: 'schema.sql' },
        ],
      }],
    }))
    expect(signals.context.hasTools).toBe(true)
    expect(signals.context.toolNames).toEqual(['read', 'grep'])
    expect(signals.context.hasImages).toBe(true)
    expect(signals.context.hasFiles).toBe(true)
    expect(signals.context.fileExtensions).toEqual(['.sql'])
  })

  test('lower-cases file extensions and ignores implausible ones', () => {
    const signals = extractClassificationSignals(request({
      messages: [{
        role: 'user',
        content: [
          { type: 'file', filename: 'REPORT.PDF' },
          { type: 'file', filename: 'no-extension' },
          { type: 'file', filename: 'archive.verylongextension' },
        ],
      }],
    }))
    expect(signals.context.fileExtensions).toEqual(['.pdf'])
  })

  test('is empty for a request with no messages and no tools', () => {
    const signals = extractClassificationSignals({ provider: 'role-model', model: 'm', messages: [] })
    expect(signals.prompt).toBe('')
    expect(signals.context.hasTools).toBe(false)
    expect(signals.context.hasImages).toBe(false)
    expect(signals.context.hasFiles).toBe(false)
  })
})

describe('hasRoleModelIntent', () => {
  test('is true only for an existing intent object', () => {
    expect(hasRoleModelIntent({ role_model: { intent: { role_hint_id: 'coder' } } })).toBe(true)
    expect(hasRoleModelIntent({ role_model: {} })).toBe(false)
    expect(hasRoleModelIntent({ role_model: 'string' })).toBe(false)
    expect(hasRoleModelIntent({})).toBe(false)
    expect(hasRoleModelIntent(null)).toBe(false)
  })
})

describe('gating: when nothing may be modified', () => {
  /** The route this plugin owns, as the real call site supplies it. */
  const ownedRoutes = new Set(['role-model'])

  test('leaves a request for another provider untouched, by identity', async () => {
    // Model ids are not unique across providers: the model below IS in the owned
    // set, so only the provider gate keeps it from being annotated.
    const input = request({ provider: 'deepseek-official' })
    const result = await applyRoleModelIntent(input, {
      roleModelModelIds: new Set(['baseline.remote-only']),
      providerRoutes: ownedRoutes,
      taxonomy,
    })
    expect(result.request).toBe(input)
    expect(result.injected).toBe(false)
  })

  test('annotates a request on the owned route', async () => {
    const input = request({ provider: 'role-model' })
    const result = await applyRoleModelIntent(input, {
      roleModelModelIds: new Set(['baseline.remote-only']),
      providerRoutes: ownedRoutes,
      taxonomy,
    })
    expect(result.injected).toBe(true)
  })

  test('leaves a request whose model is not a role-model id untouched', async () => {
    const input = request({ model: 'deepseek-flash' })
    const result = await applyRoleModelIntent(input, { roleModelModelIds: new Set(['baseline.remote-only']) })
    expect(result.request).toBe(input)
    expect(result.injected).toBe(false)
  })

  test('accepts a role-model/ qualified model id', async () => {
    const input = request({ model: 'role-model/baseline.remote-only' })
    const result = await applyRoleModelIntent(input, {
      roleModelModelIds: new Set(['baseline.remote-only']),
      taxonomy,
    })
    expect(result.injected).toBe(true)
  })

  test('leaves an auxiliary compaction call untouched', async () => {
    const input = request({ purpose: 'compaction' })
    const result = await applyRoleModelIntent(input, {
      roleModelModelIds: new Set(['baseline.remote-only']),
      taxonomy,
    })
    expect(result.request).toBe(input)
    expect(result.injected).toBe(false)
  })

  test('leaves an auxiliary session-title call untouched', async () => {
    const input = request({ purpose: 'session-title' })
    const result = await applyRoleModelIntent(input, {
      roleModelModelIds: new Set(['baseline.remote-only']),
      taxonomy,
    })
    expect(result.request).toBe(input)
    expect(result.injected).toBe(false)
  })

  test('respects a caller-supplied intent, by identity', async () => {
    const existing = { contract_version: 1, intent: { role_hint_id: 'legal' } }
    const input = { ...request(), role_model: existing }
    const result = await applyRoleModelIntent(input, {
      roleModelModelIds: new Set(['baseline.remote-only']),
      taxonomy,
    })
    expect(result.request).toBe(input)
    expect(result.injected).toBe(false)
    expect((result.request as { role_model: unknown }).role_model).toBe(existing)
  })

  test('does nothing for a blank prompt', async () => {
    const input = request({ messages: [{ role: 'user', content: [{ type: 'text', text: '   ' }] }] })
    const result = await applyRoleModelIntent(input, {
      roleModelModelIds: new Set(['baseline.remote-only']),
      taxonomy,
    })
    expect(result.request).toBe(input)
    expect(result.injected).toBe(false)
  })

  test('does nothing when no request is supplied', async () => {
    const result = await applyRoleModelIntent(null, { roleModelModelIds: new Set(['x']) })
    expect(result.request).toBeNull()
    expect(result.injected).toBe(false)
  })
})

describe('injection', () => {
  test('adds the full role_model object without disturbing the request', async () => {
    const input = request({ temperature: 0.2, maxTokens: 100 })
    const result = await applyRoleModelIntent(input, {
      roleModelModelIds: new Set(['baseline.remote-only']),
      taxonomy,
    })
    expect(result.injected).toBe(true)
    const body = result.request as Record<string, unknown>
    expect(body.role_model).toBeDefined()
    expect(Object.keys(body).sort()).toEqual(['maxTokens', 'messages', 'model', 'provider', 'role_model', 'temperature'])
    const intent = (body.role_model as { intent: Record<string, unknown> }).intent
    expect(intent.role_hint_id).toBe('coder')
    expect(intent.task_type).toBe('coder.edit')
    expect(intent.confidence).toBeGreaterThan(0)
  })

  test('carries the taxonomy version so the runtime can reject staleness', async () => {
    const result = await applyRoleModelIntent(request(), {
      roleModelModelIds: new Set(['baseline.remote-only']),
      taxonomy,
    })
    const intent = ((result.request as Record<string, unknown>).role_model as { intent: Record<string, unknown> }).intent
    expect(intent.taxonomy_version).toBe('1.0.0-alpha.1')
    expect(intent.classification_contract_version).toBe('role-model.classification.v1')
  })

  test('reports the classification alongside the modified request', async () => {
    const result = await applyRoleModelIntent(request(), {
      roleModelModelIds: new Set(['baseline.remote-only']),
      taxonomy,
    })
    expect(result.classification?.role_model.intent.role_hint_id).toBe('coder')
  })
})

describe('two-pass runtime expansion', () => {
  test('fetches candidate role chunks and re-classifies with them', async () => {
    const { fetch, calls } = chunkFetcher()
    const result = await applyRoleModelIntent(request(), {
      roleModelModelIds: new Set(['baseline.remote-only']),
      taxonomy,
      fetchRoleTaskChunk: fetch,
    })
    expect(result.injected).toBe(true)
    expect(calls.length).toBeGreaterThan(0)
    // Every requested role must be a real taxonomy role.
    for (const roleId of calls) {
      expect(taxonomy.roleSummaries.some(role => role.id === roleId), roleId).toBe(true)
    }
  })

  test('expands candidates from runtime role summaries, capped at five roles', async () => {
    const { fetch, calls } = chunkFetcher()
    await applyRoleModelIntent(request(), {
      roleModelModelIds: new Set(['baseline.remote-only']),
      taxonomy,
      fetchRoleTaskChunk: fetch,
      fetchRoleSummaries: async () => taxonomy.roleSummaries,
    })
    expect(calls.length).toBeLessThanOrEqual(5)
    expect(new Set(calls).size).toBe(calls.length)
  })

  test('falls back to the first pass when a chunk fetch rejects', async () => {
    const result = await applyRoleModelIntent(request(), {
      roleModelModelIds: new Set(['baseline.remote-only']),
      taxonomy,
      fetchRoleTaskChunk: async () => { throw new Error('runtime down') },
    })
    expect(result.injected).toBe(true)
    expect(result.classification?.role_model.intent.role_hint_id).toBe('coder')
  })

  test('falls back to the first pass when role summaries reject', async () => {
    const { fetch } = chunkFetcher()
    const result = await applyRoleModelIntent(request(), {
      roleModelModelIds: new Set(['baseline.remote-only']),
      taxonomy,
      fetchRoleTaskChunk: fetch,
      fetchRoleSummaries: async () => { throw new Error('runtime down') },
    })
    expect(result.injected).toBe(true)
  })

  test('does not perform the expansion when no chunk fetcher is provided', async () => {
    const result = await applyRoleModelIntent(request(), {
      roleModelModelIds: new Set(['baseline.remote-only']),
      taxonomy,
    })
    expect(result.injected).toBe(true)
    expect(result.classification?.role_model.intent.role_hint_id).toBe('coder')
  })
})

describe('signal-driven classification', () => {
  test('uses tool presence and names', async () => {
    const result = await applyRoleModelIntent(
      request({
        messages: [{ role: 'user', content: [{ type: 'text', text: 'Handle this task.' }] }],
        tools: [{ name: 'grep' }],
      }),
      { roleModelModelIds: new Set(['baseline.remote-only']), taxonomy },
    )
    const intent = result.classification!.role_model.intent
    expect(['coder', 'architect', 'security', 'data']).toContain(intent.role_hint_id)
  })

  test('uses file extensions from attachment filenames', async () => {
    const result = await applyRoleModelIntent(
      request({
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: 'Clean this dataset up.' },
            { type: 'file', filename: 'events.sql' },
          ],
        }],
      }),
      { roleModelModelIds: new Set(['baseline.remote-only']), taxonomy },
    )
    const intent = result.classification!.role_model.intent
    expect(intent.role_hint_id.length).toBeGreaterThan(0)
    expect(intent.required_modalities).toEqual(['text'])
  })
})

describe('custom model id sets', () => {
  test('honours an explicitly provided alias set', async () => {
    const input = request({ model: 'my-custom-alias' })
    const refused = await applyRoleModelIntent(input, { roleModelModelIds: new Set(['other']) })
    expect(refused.injected).toBe(false)
    const accepted = await applyRoleModelIntent(input, {
      roleModelModelIds: new Set(['my-custom-alias']),
      taxonomy,
    })
    expect(accepted.injected).toBe(true)
  })
})

describe('determinism', () => {
  test('the same request classifies identically twice', async () => {
    const options = { roleModelModelIds: new Set(['baseline.remote-only']), taxonomy }
    const first = await applyRoleModelIntent(request(), options)
    const second = await applyRoleModelIntent(request(), options)
    expect(JSON.stringify(first.request)).toBe(JSON.stringify(second.request))
  })
})

describe('taxonomy data is read from the package, not a fixture', () => {
  test('reads real bundled data when no taxonomy is supplied', async () => {
    // Guards against the injector silently depending on an injected taxonomy.
    const manifest = JSON.parse(readFileSync(join(dataRoot, 'compact-manifest.json'), 'utf8')) as {
      taxonomyVersion: string
    }
    const result = await applyRoleModelIntent(request(), {
      roleModelModelIds: new Set(['baseline.remote-only']),
      reader: createStagedCompactTaxonomyReader({ dataRoot }),
    })
    const intent = result.classification!.role_model.intent
    expect(intent.taxonomy_version).toBe(manifest.taxonomyVersion)
  })
})
