/**
 * `role_model` intent metadata injection.
 *
 * This is the plugin's core capability: every ordinary conversation request the
 * plugin serves carries a top-level `role_model.intent` object computed from the
 * request itself, so the runtime can route on role, task, capability, modality and
 * tool needs instead of guessing from prompt text alone.
 *
 * Ported from `packages/pi-role-model/src/request-intent.ts`, with the signal
 * source changed from a serialized OpenAI payload to the Harness's own request
 * (`GenerateOptions`). The gating, idempotence and two-pass runtime expansion are
 * unchanged.
 *
 * @module @try-works/dsh-role-model/intent
 */

import {
  classifyWithProgressiveDisclosure,
  type ClassificationContext,
  type ProgressiveClassification,
} from './taxonomy/classify-with-progressive-disclosure.js'
import type { CompactRoleTask, CompactTaxonomy } from './taxonomy/compact-data.js'
import {
  createStagedCompactTaxonomyReader,
  type StagedCompactTaxonomyReader,
} from './taxonomy/staged-compact-taxonomy.js'

/**
 * The structural view of a Harness request this module needs.
 *
 * Deliberately structural rather than an import of `GenerateOptions`: the fields
 * read here are stable, a structural type keeps the plugin resilient to unrelated
 * changes in the LLM package, and it lets the specs build requests literally.
 * `GenerateOptions` satisfies this shape.
 */
export interface IntentRequest {
  readonly provider?: string | undefined
  readonly model?: string | undefined
  readonly messages?: readonly IntentMessage[] | undefined
  readonly tools?: readonly { readonly name?: string | undefined }[] | undefined
  /** Auxiliary-call classification; ordinary conversation requests leave it unset. */
  readonly purpose?: string | undefined
  /** Set when the caller already supplied intent metadata; never overwritten. */
  readonly role_model?: unknown
  readonly [key: string]: unknown
}

/** One message in a request. */
export interface IntentMessage {
  readonly role?: string | undefined
  readonly content?: string | readonly IntentContentPart[] | undefined
}

/** One content part of a message. */
export interface IntentContentPart {
  readonly type?: string | undefined
  readonly text?: string | undefined
  readonly filename?: string | undefined
}

/** Options for {@link applyRoleModelIntent}. */
export interface ApplyRoleModelIntentOptions {
  /** Model ids this plugin's routes own (bare ids; a `role-model/` prefix is accepted). */
  readonly roleModelModelIds: ReadonlySet<string>
  /**
   * Provider routes this plugin owns. When supplied, a request must also name one
   * of these before metadata is added: model ids alone are not unique across
   * providers, so a same-named model on a foreign route must not be annotated.
   */
  readonly providerRoutes?: ReadonlySet<string> | undefined
  /** Pre-built taxonomy; when absent the staged reader loads the bundled data. */
  readonly taxonomy?: CompactTaxonomy | undefined
  /** Reader used when no taxonomy is supplied. */
  readonly reader?: StagedCompactTaxonomyReader | undefined
  /** Optional per-role runtime task-chunk fetcher, enabling the second pass. */
  readonly fetchRoleTaskChunk?: ((roleId: string) => Promise<readonly CompactRoleTask[]>) | undefined
  /** Optional runtime role-summary fetcher, enabling candidate expansion. */
  readonly fetchRoleSummaries?: (() => Promise<CompactTaxonomy['roleSummaries']>) | undefined
}

/** The outcome of one injection attempt. */
export interface ApplyRoleModelIntentResult {
  /** The original request when nothing was injected, else a new object. */
  readonly request: unknown
  /** Whether metadata was added. */
  readonly injected: boolean
  /** The classification, when one was performed. */
  readonly classification?: ProgressiveClassification | undefined
}

/** The plugin's provider route prefix accepted on a qualified model id. */
const QUALIFIED_PREFIX = 'role-model/'

/** True for a plain object. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Text of one message, joining text parts with newlines. */
function textFromContent(content: unknown): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content
    .map(part => {
      if (typeof part === 'string') return part
      if (isRecord(part) && typeof part.text === 'string') return part.text
      return ''
    })
    .filter(Boolean)
    .join('\n')
}

/** The most recent user message's text. */
function promptFromMessages(messages: unknown): string {
  if (!Array.isArray(messages)) return ''
  for (const message of [...messages].reverse()) {
    if (!isRecord(message) || message.role !== 'user') continue
    const text = textFromContent(message.content)
    if (text.trim()) return text
  }
  return ''
}

/**
 * Whether a request already carries intent metadata.
 * @param request - candidate request.
 * @returns whether `role_model.intent` is an object already.
 */
export function hasRoleModelIntent(request: unknown): boolean {
  if (!isRecord(request)) return false
  return isRecord(request.role_model) && isRecord(request.role_model.intent)
}

/**
 * Extract the classification signals from a Harness request.
 * @param request - the request to read.
 * @returns the prompt plus tool, image and file signals.
 */
export function extractClassificationSignals(request: IntentRequest): {
  readonly prompt: string
  readonly context: ClassificationContext
} {
  const prompt = promptFromMessages(request.messages)

  const tools = Array.isArray(request.tools) ? request.tools : []
  const toolNames = tools
    .map(tool => (typeof tool?.name === 'string' ? tool.name : ''))
    .filter(name => name.length > 0)

  let hasImages = false
  let hasFiles = false
  const fileExtensions: string[] = []
  const messages = Array.isArray(request.messages) ? request.messages : []
  for (const message of messages) {
    if (!isRecord(message)) continue
    const content = message.content
    if (!Array.isArray(content)) continue
    for (const part of content) {
      if (!isRecord(part)) continue
      if (part.type === 'image' || part.type === 'image_url') hasImages = true
      if (part.type === 'file') {
        hasFiles = true
        const filename = typeof part.filename === 'string'
          ? part.filename
          : isRecord(part.file) && typeof part.file.filename === 'string'
            ? part.file.filename
            : undefined
        if (filename !== undefined && filename.includes('.')) {
          const extension = filename.slice(filename.lastIndexOf('.')).toLowerCase()
          if (extension.length > 1 && extension.length <= 10) fileExtensions.push(extension)
        }
      }
    }
  }

  return {
    prompt,
    context: {
      hasTools: tools.length > 0,
      toolNames,
      hasImages,
      hasFiles,
      fileExtensions,
    },
  }
}

/**
 * Apply `role_model` intent metadata to one request.
 *
 * Returns the **original object by identity** whenever nothing may be injected:
 * a non-object request, a model this plugin does not own, an auxiliary call
 * (`purpose` set), a request that already carries an intent, or a blank prompt.
 * A caller-supplied intent therefore always wins.
 *
 * @param request - the request about to be sent.
 * @param options - owned model ids and optional runtime fetchers.
 * @returns the request to send, whether it was modified, and the classification.
 */
export async function applyRoleModelIntent(
  request: unknown,
  options: ApplyRoleModelIntentOptions,
): Promise<ApplyRoleModelIntentResult> {
  if (!isRecord(request)) return { request, injected: false }

  const model = typeof request.model === 'string' ? request.model : ''
  const normalizedModel = model.startsWith(QUALIFIED_PREFIX) ? model.slice(QUALIFIED_PREFIX.length) : model
  if (!options.roleModelModelIds.has(normalizedModel)) return { request, injected: false }

  // Model ids are not unique across providers, so a same-named model on a foreign
  // route must never be annotated with this runtime's routing metadata.
  const providerRoutes = options.providerRoutes
  if (providerRoutes !== undefined) {
    const provider = typeof request.provider === 'string' ? request.provider : ''
    if (!providerRoutes.has(provider)) return { request, injected: false }
  }

  if (hasRoleModelIntent(request)) return { request, injected: false }

  // Auxiliary model calls are housekeeping, not user work: injecting routing
  // intent into them would route a summarization call as if it were the task.
  if (request.purpose !== undefined) return { request, injected: false }

  const signals = extractClassificationSignals(request as IntentRequest)
  if (!signals.prompt.trim()) return { request, injected: false }

  const baseTaxonomy = options.taxonomy
  const firstPass = classifyWithProgressiveDisclosure({
    prompt: signals.prompt,
    ...baseTaxonomy === undefined ? {} : { taxonomy: baseTaxonomy },
    ...options.reader === undefined || baseTaxonomy !== undefined ? {} : { reader: options.reader },
    context: signals.context,
  })

  const classification = await expandWithRuntimeTasks(firstPass, signals, options)
  return {
    request: { ...request, role_model: classification.role_model },
    injected: true,
    classification,
  }
}

/**
 * Second pass: expand the candidate roles from runtime data and re-classify.
 *
 * Any failure returns the first pass unchanged, so a degraded runtime never costs
 * the request its (still useful) advisory metadata.
 */
async function expandWithRuntimeTasks(
  firstPass: ProgressiveClassification,
  signals: { readonly prompt: string; readonly context: ClassificationContext },
  options: ApplyRoleModelIntentOptions,
): Promise<ProgressiveClassification> {
  const fetchChunk = options.fetchRoleTaskChunk
  if (fetchChunk === undefined || firstPass.candidateRoleIds.length === 0) return firstPass

  try {
    let candidateRoleIds = [...firstPass.candidateRoleIds]

    const fetchSummaries = options.fetchRoleSummaries
    if (fetchSummaries !== undefined) {
      try {
        const runtimeRoleSummaries = await fetchSummaries()
        if (runtimeRoleSummaries.length > 0) {
          const reader = options.reader ?? createStagedCompactTaxonomyReader()
          const baseGroups = options.taxonomy?.groups ?? reader.loadGroups()
          const candidateGroupIds = firstPass.candidateGroupIds.length > 0
            ? firstPass.candidateGroupIds
            : baseGroups.slice(0, 3).map(group => group.id)
          const additionalRoles = runtimeRoleSummaries
            .filter(role =>
              candidateGroupIds.includes(role.primaryGroupId)
              || role.secondaryGroupIds.some(groupId => candidateGroupIds.includes(groupId)),
            )
            .filter(role => !candidateRoleIds.includes(role.id))
            .map(role => role.id)
          candidateRoleIds = [...new Set([...candidateRoleIds, ...additionalRoles])].slice(0, 5)
        }
      } catch {
        // Runtime role summaries unavailable; proceed with the first-pass candidates.
      }
    }

    const taskEntries = await Promise.all(
      candidateRoleIds.map(async roleId => [roleId, await fetchChunk(roleId)] as const),
    )
    const reader = options.reader ?? createStagedCompactTaxonomyReader()
    const baseTaxonomy: CompactTaxonomy = options.taxonomy ?? {
      manifest: reader.loadManifest(),
      groups: reader.loadGroups(),
      roleSummaries: reader.loadRoleSummaries(),
      roleTaskIndex: reader.loadRoleTaskIndex(),
      roleTaskChunks: {},
    }
    const runtimeTaxonomy: CompactTaxonomy = {
      ...baseTaxonomy,
      roleTaskChunks: {
        ...baseTaxonomy.roleTaskChunks,
        ...Object.fromEntries(taskEntries),
      },
    }
    return classifyWithProgressiveDisclosure({
      prompt: signals.prompt,
      taxonomy: runtimeTaxonomy,
      context: signals.context,
    })
  } catch {
    return firstPass
  }
}
