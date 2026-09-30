/**
 * L2: staged taxonomy loading.
 *
 * The laziness is the point: a classification must read the manifest plus exactly
 * one role's task chunk, never the whole data set. These specs observe the file
 * reads directly rather than inferring them.
 */

import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'
import {
  createStagedCompactTaxonomyReader,
  normalizeRoleTaskIndex,
} from '../src/taxonomy/staged-compact-taxonomy.js'

/** The package's taxonomy data root, located from this spec's own path. */
const dataRoot = join(resolve(dirname(fileURLToPath(import.meta.url)), '..'), 'data', 'taxonomy')

/** A reader factory that records every file name requested. */
function recordingReader(): {
  reader: ReturnType<typeof createStagedCompactTaxonomyReader>
  reads: string[]
} {
  const reads: string[] = []
  const reader = createStagedCompactTaxonomyReader({
    dataRoot,
    readJson: <T,>(fileName: string): T => {
      reads.push(fileName)
      return JSON.parse(readFileSync(join(dataRoot, fileName), 'utf8')) as T
    },
  })
  return { reader, reads }
}

describe('normalizeRoleTaskIndex', () => {
  test('accepts tuple entries', () => {
    expect(normalizeRoleTaskIndex({ coder: [['coder.edit', 'Code Edit']] })).toEqual({
      coder: [{ id: 'coder.edit', label: 'Code Edit' }],
    })
  })

  test('accepts object entries', () => {
    expect(normalizeRoleTaskIndex({ coder: [{ id: 'coder.edit', label: 'Code Edit' }] })).toEqual({
      coder: [{ id: 'coder.edit', label: 'Code Edit' }],
    })
  })

  test('accepts a mixture and preserves order', () => {
    expect(
      normalizeRoleTaskIndex({ coder: [['a', 'A'], { id: 'b', label: 'B' }] }),
    ).toEqual({
      coder: [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
      ],
    })
  })
})

describe('staged reader laziness', () => {
  test('does not read anything on construction', () => {
    const { reads } = recordingReader()
    expect(reads).toEqual([])
  })

  test('reading a single role chunk touches only the manifest and that chunk', () => {
    const { reader, reads } = recordingReader()
    const tasks = reader.loadRoleTaskChunk('security')
    expect(tasks.length).toBeGreaterThan(0)
    expect(reads).toEqual(['compact-manifest.json', 'roles/security/tasks.compact.json'])
  })

  test('memoizes the manifest across chunk loads', () => {
    const { reader, reads } = recordingReader()
    reader.loadRoleTaskChunk('coder')
    reader.loadRoleTaskChunk('tester')
    expect(reads.filter(name => name === 'compact-manifest.json')).toHaveLength(1)
  })

  test('deduplicates repeated role ids in a batched load', () => {
    const { reader, reads } = recordingReader()
    const chunks = reader.loadRoleTaskChunks(['coder', 'coder', 'tester'])
    expect(Object.keys(chunks).sort()).toEqual(['coder', 'tester'])
    expect(reads.filter(name => name.includes('coder'))).toHaveLength(1)
  })

  test('loads groups, roles and the index without loading any task chunk', () => {
    const { reader, reads } = recordingReader()
    reader.loadGroups()
    reader.loadRoleSummaries()
    reader.loadRoleTaskIndex()
    expect(reads).toEqual([
      'compact-groups.json',
      'compact-role-summaries.json',
      'compact-role-task-index.json',
    ])
  })
})

describe('full taxonomy load', () => {
  test('reads each shared file once and every role chunk exactly once', () => {
    const { reader, reads } = recordingReader()
    const taxonomy = reader.loadFullTaxonomy()
    expect(reads.filter(name => name === 'compact-manifest.json')).toHaveLength(1)
    expect(reads.filter(name => name === 'compact-groups.json')).toHaveLength(1)
    expect(reads.filter(name => name === 'compact-role-summaries.json')).toHaveLength(1)
    expect(reads.filter(name => name === 'compact-role-task-index.json')).toHaveLength(1)
    const chunkReads = reads.filter(name => name.startsWith('roles/'))
    expect(chunkReads).toHaveLength(taxonomy.roleSummaries.length)
    expect(new Set(chunkReads).size).toBe(chunkReads.length)
  })

  test('keys every role in the returned chunks', () => {
    const taxonomy = createStagedCompactTaxonomyReader({ dataRoot }).loadFullTaxonomy()
    for (const role of taxonomy.roleSummaries) {
      expect(taxonomy.roleTaskChunks[role.id], role.id).toBeDefined()
    }
  })
})
