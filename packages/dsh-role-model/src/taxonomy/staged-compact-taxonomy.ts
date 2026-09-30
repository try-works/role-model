/**
 * Staged, lazy loading of the bundled compact taxonomy.
 *
 * Only the manifest, groups, role summaries and the role-task index are read
 * eagerly; a role's task chunk is read only when that role has been chosen. That
 * laziness is load-bearing: it is what keeps a classification cheap enough to run
 * inside a request, and `taxonomy-staged-loader.spec.ts` pins it.
 *
 * The data root is injectable because the built bundle lives in `lib/` while the
 * sources live in `src/taxonomy/`, and because specs need to point at fixtures.
 *
 * @module @try-works/dsh-role-model/taxonomy/staged-compact-taxonomy
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { CompactTaxonomy } from './compact-data.js'

/** Raw on-disk role-task index: tuples or objects, both accepted. */
export type RawRoleTaskIndex = Record<
  string,
  readonly (
    | readonly [id: string, label: string]
    | { readonly id: string; readonly label: string }
  )[]
>

/** Reads and decodes one file from the taxonomy data root. */
export type CompactTaxonomyFileReader = <T>(fileName: string) => T

/** A staged reader: each method loads only what it names. */
export interface StagedCompactTaxonomyReader {
  loadManifest(): CompactTaxonomy['manifest']
  loadGroups(): CompactTaxonomy['groups']
  loadRoleSummaries(): CompactTaxonomy['roleSummaries']
  loadRoleTaskIndex(): CompactTaxonomy['roleTaskIndex']
  loadRoleTaskChunk(roleId: string): CompactTaxonomy['roleTaskChunks'][string]
  loadRoleTaskChunks(roleIds: readonly string[]): CompactTaxonomy['roleTaskChunks']
  loadFullTaxonomy(): CompactTaxonomy
}

/** Options for {@link createStagedCompactTaxonomyReader}. */
export interface CreateStagedCompactTaxonomyReaderOptions {
  /** Override the data root directory. */
  readonly dataRoot?: string | undefined
  /** Override the file reader entirely (used to observe laziness). */
  readonly readJson?: CompactTaxonomyFileReader | undefined
}

/**
 * Resolve the packaged taxonomy data root.
 *
 * The package is loaded from two layouts, so both are probed:
 *  - the built bundle at `lib/index.js`, one directory below the package root;
 *  - the sources at `src/taxonomy/*.ts`, three directories below it (which is also
 *    how the specs load them).
 *
 * The first candidate whose manifest exists wins; if neither does, the
 * bundle-relative candidate is returned so a missing-data failure names the path
 * that was expected rather than throwing here.
 *
 * @param fromDirectory - directory of the module doing the resolving.
 * @returns the absolute data root path.
 */
export function resolveTaxonomyDataRoot(fromDirectory: string): string {
  const candidates = [
    // The built bundle: `lib/index.js` -> `<pkg>/data/taxonomy`.
    join(fromDirectory, '../data/taxonomy'),
    // The sources: `src/taxonomy/*.ts` -> `<pkg>/data/taxonomy`.
    join(fromDirectory, '../../data/taxonomy'),
    // The sources when the bundler has inlined them into `lib/index.js`, where
    // `import.meta.url` still points at the original file's location.
    join(fromDirectory, '../../../data/taxonomy'),
  ]
  return candidates.find(candidate => existsSync(join(candidate, 'compact-manifest.json'))) ?? candidates[0]!
}

/** The data root for the module doing the loading. */
function defaultDataRoot(): string {
  return resolveTaxonomyDataRoot(dirname(fileURLToPath(import.meta.url)))
}

/** True for a tuple form of one index entry. */
function isRoleTaskTuple(
  task: RawRoleTaskIndex[string][number],
): task is readonly [id: string, label: string] {
  return Array.isArray(task)
}

/**
 * Normalize the role-task index to object entries.
 * @param index - raw index, tuples or objects.
 * @returns the normalized index.
 */
export function normalizeRoleTaskIndex(index: RawRoleTaskIndex): CompactTaxonomy['roleTaskIndex'] {
  return Object.fromEntries(
    Object.entries(index).map(([roleId, tasks]) => [
      roleId,
      tasks.map(task =>
        isRoleTaskTuple(task) ? { id: task[0], label: task[1] } : { id: task.id, label: task.label },
      ),
    ]),
  )
}

/**
 * Create a staged reader over the taxonomy data.
 * @param options - data root or a fully custom reader.
 * @returns the reader.
 */
export function createStagedCompactTaxonomyReader(
  options: CreateStagedCompactTaxonomyReaderOptions = {},
): StagedCompactTaxonomyReader {
  const dataRoot = options.dataRoot ?? defaultDataRoot()
  const defaultReader: CompactTaxonomyFileReader = <T,>(fileName: string): T =>
    JSON.parse(readFileSync(join(dataRoot, fileName), 'utf8')) as T
  const readJson = options.readJson ?? defaultReader
  let manifest: CompactTaxonomy['manifest'] | undefined

  const loadManifest = (): CompactTaxonomy['manifest'] => {
    manifest ??= readJson<CompactTaxonomy['manifest']>('compact-manifest.json')
    return manifest
  }

  const chunkFileName = (roleId: string): string =>
    loadManifest().roleTaskChunkFiles?.[roleId] ?? `roles/${roleId}/tasks.compact.json`

  const reader: StagedCompactTaxonomyReader = {
    loadManifest,
    loadGroups: () => readJson<CompactTaxonomy['groups']>('compact-groups.json'),
    loadRoleSummaries: () => readJson<CompactTaxonomy['roleSummaries']>('compact-role-summaries.json'),
    loadRoleTaskIndex: () => normalizeRoleTaskIndex(readJson<RawRoleTaskIndex>('compact-role-task-index.json')),
    loadRoleTaskChunk: (roleId: string) =>
      readJson<CompactTaxonomy['roleTaskChunks'][string]>(chunkFileName(roleId)),
    loadRoleTaskChunks: (roleIds: readonly string[]) =>
      Object.fromEntries(
        [...new Set(roleIds)].map(roleId => [
          roleId,
          readJson<CompactTaxonomy['roleTaskChunks'][string]>(chunkFileName(roleId)),
        ]),
      ),
    loadFullTaxonomy(): CompactTaxonomy {
      const roleSummaries = reader.loadRoleSummaries()
      return {
        manifest: loadManifest(),
        groups: reader.loadGroups(),
        roleSummaries,
        roleTaskIndex: reader.loadRoleTaskIndex(),
        roleTaskChunks: reader.loadRoleTaskChunks(roleSummaries.map(role => role.id)),
      }
    },
  }
  return reader
}

/**
 * Load the entire bundled taxonomy eagerly.
 * @param options - data root override.
 * @returns the full taxonomy.
 */
export function loadCompactTaxonomy(
  options: CreateStagedCompactTaxonomyReaderOptions = {},
): CompactTaxonomy {
  return createStagedCompactTaxonomyReader(options).loadFullTaxonomy()
}
