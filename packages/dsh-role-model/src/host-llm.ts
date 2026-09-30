/**
 * Host `@deepseek-ai/dsh-llm` module identity resolution.
 *
 * The plugin installs its own `node_modules`, so a plain
 * `import { LlmError } from '@deepseek-ai/dsh-llm'` yields a **second**
 * `LlmError`/`HarnessError` class identity. The host deliberately refuses to
 * trust foreign error classes:
 *
 *   // DSH packages/llm/llm/src/adapter-failure.ts:104-107
 *   /** Trust only Harness-owned codes; third-party SDK codes are not our taxonomy. *\/
 *   function harnessErrorCode(error: Error): string {
 *     return error instanceof HarnessError ? error.code : 'UNKNOWN'
 *   }
 *
 * `UNKNOWN` is not in `DEFAULT_RETRYABLE_CODES`, so a duplicated error class
 * silently stops `llm-retry` retrying transient failures and erases the failure
 * taxonomy from telemetry. This module therefore:
 *
 *  1. resolves the **host's own** `dsh-llm` module, in a documented order, and
 *  2. independently guarantees correct failure facts via an own `failure`
 *     carrier, which `normalizeLlmFailure` accepts for cross-package copies:
 *
 *       // adapter-failure.ts:20-27
 *       // Cross-package copies preserve own data but not class identity. Trust the
 *       // carried facts only when both own properties agree after validation.
 *       const carried = ownFailureSnapshot(error)
 *       if (carried !== undefined && carried.code === ownErrorCode(error)) return carried
 *
 * @module @try-works/dsh-role-model/host-llm
 */

import { existsSync, statSync } from 'node:fs'
import { dirname, isAbsolute, join, parse, resolve, sep } from 'node:path'

/** Where a candidate host-locates `dsh-llm` module came from. */
export type HostLlmCandidateKind =
  | 'module-override'
  | 'harness-root'
  | 'cwd'
  | 'process-entry'
  | 'package-import'

/** One ordered attempt at locating the host's `dsh-llm` module. */
export type HostLlmCandidate =
  | {
    readonly kind: 'module-override' | 'harness-root' | 'cwd' | 'process-entry'
    /** Absolute path to the host module file. */
    readonly path: string
    /** Why this candidate was produced, for diagnostics. */
    readonly because: string
  }
  | {
    readonly kind: 'package-import'
    /** Bare specifier resolved by the plugin's own module graph. */
    readonly path: string
    readonly because: string
  }

/** Inputs to {@link createHostLlmResolver}; every field is injectable for tests. */
export interface HostLlmResolverOptions {
  /** Absolute path or bare specifier for the host module (highest priority). */
  readonly moduleOverride?: string | undefined
  /** Environment used for `DSH_HARNESS_ROOT`; defaults to `process.env`. */
  readonly env?: Readonly<Record<string, string | undefined>> | undefined
  /**
   * Directory the ancestor walk starts from. Defaults to `process.cwd()`.
   *
   * Deliberately NOT `process.argv[1]`: when a DSH source checkout launches the
   * host, `argv[1]` is a script *inside the plugin*, and the checkout is
   * frequently on a different drive, so an ancestor walk from it can never find
   * the harness. The host process's working directory is the checkout root or a
   * descendant of it, which is the anchor that actually works.
   */
  readonly cwd?: string | undefined
  /** The plugin's own package root, used only for diagnostics. */
  readonly packageRoot?: string | undefined
  /** Specifier used for the last-resort self import. */
  readonly fallbackSpecifier?: string | undefined
}

/** A resolver: the ordered candidates plus the first one that exists. */
export interface HostLlmResolver {
  candidates(): readonly HostLlmCandidate[]
  resolve(): HostLlmCandidate | undefined
}

/** Environment variable naming a DSH source checkout root. */
export const HARNESS_ROOT_ENV = 'DSH_HARNESS_ROOT'

/**
 * Path of the marker file inside a harness checkout that identifies the
 * directory DSH itself resolves `@deepseek-ai/dsh-llm` to.
 * @returns the marker path, relative to a harness root.
 */
export function harnessRootMarker(): string {
  return join('packages', 'llm', 'llm', 'lib', 'index.js')
}

/** True for a non-blank string with non-whitespace content. */
function isNonBlankString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

/** True when the path exists and is a regular file. */
function isFile(path: string): boolean {
  try {
    return existsSync(path) && statSync(path).isFile()
  } catch {
    return false
  }
}

/**
 * Build a `harness-root` candidate from an explicit DSH checkout root.
 * @param root - candidate harness root, absolute or resolvable.
 * @returns the candidate, or `undefined` when the marker is absent.
 */
export function candidateFromHarnessRoot(root: unknown): HostLlmCandidate | undefined {
  if (!isNonBlankString(root)) return undefined
  const marker = join(resolve(root.trim()), harnessRootMarker())
  if (!isFile(marker)) return undefined
  return {
    kind: 'harness-root',
    path: marker,
    because: `${HARNESS_ROOT_ENV}=${root.trim()}`,
  }
}

/**
 * Walk up from a directory looking for the harness marker.
 * @param start - directory to start from (inclusive).
 * @returns the absolute marker path, or `undefined` when no ancestor has it.
 */
export function resolveHostLlmPathFromDirectory(start: unknown): string | undefined {
  if (!isNonBlankString(start)) return undefined
  const markerRelative = harnessRootMarker()
  let current = resolve(start.trim())
  const { root: volumeRoot } = parse(current)
  while (true) {
    const marker = join(current, markerRelative)
    if (isFile(marker)) return marker
    if (current === volumeRoot) return undefined
    const parent = dirname(current)
    if (parent === current) return undefined
    current = parent
  }
}

/**
 * Walk up from a host process entry path looking for the harness marker.
 * @param entry - a host process entry file path (`process.argv[1]`).
 * @returns the absolute marker path, or `undefined` when no ancestor has it.
 */
export function resolveHostLlmPathFromEntry(entry: unknown): string | undefined {
  if (!isNonBlankString(entry)) return undefined
  // An entry path names a file; start the walk at its directory.
  return resolveHostLlmPathFromDirectory(dirname(resolve(entry.trim())))
}

/**
 * Build a `cwd` candidate by walking up from the host working directory.
 * @param cwd - the host process working directory.
 * @returns the candidate, or `undefined` when no ancestor is a harness root.
 */
export function candidateFromCwd(cwd: unknown): HostLlmCandidate | undefined {
  const marker = resolveHostLlmPathFromDirectory(cwd)
  if (marker === undefined) return undefined
  return {
    kind: 'cwd',
    path: marker,
    because: `ancestor of working directory ${String(cwd)}`,
  }
}

/**
 * Build a `process-entry` candidate by walking up from the host entry path.
 * @param entry - the host process entry file path.
 * @returns the candidate, or `undefined` when no ancestor is a harness root.
 */
export function candidateFromProcessEntry(entry: unknown): HostLlmCandidate | undefined {
  const marker = resolveHostLlmPathFromEntry(entry)
  if (marker === undefined) return undefined
  return {
    kind: 'process-entry',
    path: marker,
    because: `ancestor of process entry ${String(entry)}`,
  }
}

/**
 * Create the ordered host-module resolver.
 *
 * Order: explicit override, `DSH_HARNESS_ROOT`, walked-up process entry, then the
 * plugin's own import as a last resort. The last resort is retained because the
 * `failure` carrier keeps failure facts correct even when class identity is lost,
 * so a missing host checkout degrades rather than breaks.
 *
 * @param options - injectable resolution inputs.
 * @returns the resolver.
 */
export function createHostLlmResolver(options: HostLlmResolverOptions = {}): HostLlmResolver {
  const env = options.env ?? process.env
  const cwd = options.cwd === undefined ? process.cwd() : options.cwd
  const fallbackSpecifier = options.fallbackSpecifier ?? '@deepseek-ai/dsh-llm'

  const candidates = (): readonly HostLlmCandidate[] => {
    const ordered: HostLlmCandidate[] = []

    const override = options.moduleOverride
    if (isNonBlankString(override)) {
      const trimmed = override.trim()
      ordered.push({
        kind: 'module-override',
        path: trimmed,
        because: 'configured hostLlmModule',
      })
    }

    const fromRoot = candidateFromHarnessRoot(env[HARNESS_ROOT_ENV])
    if (fromRoot !== undefined) ordered.push(fromRoot)

    const fromCwd = candidateFromCwd(cwd)
    if (fromCwd !== undefined) ordered.push(fromCwd)

    ordered.push({
      kind: 'package-import',
      path: fallbackSpecifier,
      because: 'last resort: the plugin\'s own module graph',
    })

    return ordered
  }

  return {
    candidates,
    resolve(): HostLlmCandidate | undefined {
      // Only a candidate that actually exists can be resolved; `package-import`
      // is reported by candidates() as the last resort but is not a resolution
      // until the loader has actually tried to import it.
      for (const candidate of candidates()) {
        if (candidate.kind === 'package-import') continue
        if (isFile(candidate.path)) return candidate
      }
      return undefined
    },
  }
}

/** Serializable provider facts carried beside a failure. */
export interface LlmFailureFacts {
  readonly message: string
  readonly code: string
  readonly status?: number
  readonly providerRetryAfterMs?: number
  readonly requestId?: string
}

/** Options for {@link createLlmFailureError}. */
export interface LlmFailureErrorOptions {
  readonly status?: number
  readonly providerRetryAfterMs?: number
  readonly requestId?: string
  readonly cause?: unknown
}

/**
 * A structurally compatible `LlmError`.
 *
 * Used when the host's own class could not be loaded. It mirrors the host
 * class's two load-bearing properties: an own data `code` (a `HarnessError`
 * field) and an own frozen `failure` carrier whose `code` agrees with it, which
 * is exactly the cross-package contract `normalizeLlmFailure` documents.
 */
export interface LlmFailureError extends Error {
  readonly code: string
  readonly failure: LlmFailureFacts
}

/**
 * Build an error carrying provider-neutral failure facts.
 * @param message - non-empty human-readable summary.
 * @param code - non-empty stable machine-routable code.
 * @param options - optional status, retry delay, request id, and cause.
 * @returns the error.
 */
export function createLlmFailureError(
  message: string,
  code: string,
  options: LlmFailureErrorOptions = {},
): LlmFailureError {
  if (typeof message !== 'string' || message.length === 0) {
    throw new TypeError('LlmError message must be a non-empty string')
  }
  if (typeof code !== 'string' || code.length === 0) {
    throw new TypeError('LlmError code must be a non-empty string')
  }
  if (options.status !== undefined
    && (!Number.isInteger(options.status) || options.status < 100 || options.status > 599)) {
    throw new TypeError('LlmError status must be an integer from 100 through 599')
  }
  if (options.providerRetryAfterMs !== undefined
    && (!Number.isFinite(options.providerRetryAfterMs) || options.providerRetryAfterMs <= 0)) {
    throw new TypeError('LlmError providerRetryAfterMs must be a positive finite number')
  }
  if (options.requestId !== undefined
    && (typeof options.requestId !== 'string' || options.requestId.length === 0)) {
    throw new TypeError('LlmError requestId must be a non-empty string')
  }

  const error = new Error(message, options.cause === undefined ? undefined : { cause: options.cause }) as
    Error & { code: string; failure: LlmFailureFacts }
  // `normalizeLlmFailure` reads `code` through a property descriptor, so it must
  // be an own data property rather than an accessor on a prototype. It stays
  // configurable because the host's cross-package guard reads the *current*
  // value: if something rewrites `code` without rewriting `failure`, the two
  // disagree and the carried facts are correctly distrusted.
  Object.defineProperty(error, 'code', {
    value: code,
    enumerable: true,
    writable: false,
    configurable: true,
  })
  const failure: LlmFailureFacts = Object.freeze({
    message,
    code,
    ...options.status === undefined ? {} : { status: options.status },
    ...options.providerRetryAfterMs === undefined ? {} : { providerRetryAfterMs: options.providerRetryAfterMs },
    ...options.requestId === undefined ? {} : { requestId: options.requestId },
  })
  Object.defineProperty(error, 'failure', {
    value: failure,
    enumerable: true,
    writable: false,
    configurable: false,
  })
  error.name = 'LlmError'
  return error as LlmFailureError
}

/** Exported for diagnostics: the platform path separator, re-exported deliberately. */
export const PATH_SEPARATOR = sep

/** The shape of one provider-route descriptor. */
export interface HostProviderInfo {
  readonly id: string
  readonly name: string
}

/** The minimal contract the host requires of an adapter it will register. */
export interface HostLlmAdapterShape {
  providerInfo(provider: string): HostProviderInfo
  providerRetryPolicy?(provider: string): unknown
  listModels(provider: string): Promise<readonly { provider: string; id: string; name: string }[]>
  resolveModel(provider: string, model: string, signal?: AbortSignal): Promise<unknown>
  stream(options: unknown): AsyncIterable<unknown>
}

/** The constructor the host's registry accepts. */
export type HostLlmAdapterConstructor = new () => HostLlmAdapterShape

/** Options accepted by the host's `LlmError` constructor. */
export interface HostLlmErrorOptions {
  readonly status?: number
  readonly providerRetryAfterMs?: number
  readonly requestId?: string
  readonly cause?: unknown
}

/** The constructor shape of the host's `LlmError`. */
export type HostLlmErrorConstructor = new (
  message: string,
  code: string,
  options?: HostLlmErrorOptions,
) => Error & { readonly code: string; readonly failure?: unknown }

/** The host classes this plugin must use rather than its own copies. */
export interface HostLlmClasses {
  readonly LlmAdapter: HostLlmAdapterConstructor
  readonly LlmError: HostLlmErrorConstructor
  /** Where the classes came from, for diagnostics. */
  readonly source: HostLlmCandidate
}

/** Convert an absolute path to a file URL for dynamic import. */
function pathToFileUrl(path: string): URL {
  const normalized = path.replace(/\\/gu, '/')
  return new URL(normalized.startsWith('/') ? `file://${normalized}` : `file:///${normalized}`)
}

/**
 * Load the host's `LlmAdapter` and `LlmError` classes, trying each candidate in
 * resolution order.
 *
 * Class identity is why this exists: the host normalizes adapter failures with
 * `error instanceof HarnessError`, and a foreign class identity collapses every
 * failure to the unroutable `UNKNOWN` (see the module comment). When no host
 * checkout can be loaded the caller falls back to `createLlmFailureError`, whose
 * `failure` carrier the host accepts for cross-package copies.
 *
 * @param options - the same resolution inputs {@link createHostLlmResolver} takes.
 * @returns the host classes and their source, or undefined when none loaded.
 */
export async function loadHostLlmClasses(
  options: HostLlmResolverOptions = {},
): Promise<HostLlmClasses | undefined> {
  const resolver = createHostLlmResolver(options)
  for (const candidate of resolver.candidates()) {
    try {
      const imported: unknown = candidate.kind === 'package-import'
        ? await import(/* @vite-ignore */ candidate.path)
        : await import(/* @vite-ignore */ pathToFileUrl(candidate.path).href)
      if (typeof imported !== 'object' || imported === null) continue
      const module = imported as Record<string, unknown>
      const LlmAdapter = module.LlmAdapter
      const LlmError = module.LlmError
      if (typeof LlmAdapter === 'function' && typeof LlmError === 'function') {
        return {
          LlmAdapter: LlmAdapter as HostLlmAdapterConstructor,
          LlmError: LlmError as HostLlmErrorConstructor,
          source: candidate,
        }
      }
    } catch {
      // A wrong path or an unloadable module is exactly what the ordered
      // candidate list exists to absorb; try the next one.
    }
  }
  return undefined
}
