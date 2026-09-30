/**
 * L0 acceptance proof — run with tsx, not vitest.
 *
 * This script loads the HOST's own `adapter-failure.ts` from the DSH checkout and
 * proves the two properties Phase 1 exists to guarantee:
 *
 *  1. a foreign error WITHOUT a matching `failure` carrier normalizes to `UNKNOWN`
 *     (the failure mode a duplicated `LlmError` class would silently cause), and
 *  2. our `createLlmFailureError` normalizes to the real code even though it is not
 *     an instance of the host's `HarnessError`.
 *
 * Run:  node --import tsx scripts/prove-host-failure-codes.mts
 */

import { createHostLlmResolver, createLlmFailureError } from '../src/host-llm.js'

/**
 * The DSH checkout to prove against. In-process inside a running DSH host,
 * `process.cwd()` is the checkout root and the resolver's cwd walk finds it;
 * run standalone (as here) the cwd is the plugin, so we point at the checkout
 * explicitly. `DSH_HARNESS_ROOT` overrides it.
 */
const HARNESS_ROOT = process.env.DSH_HARNESS_ROOT ?? 'D:\\deepseek-harness'

/** Load the host's normalization function by absolute path (it has no package export). */
async function loadHostNormalizer(): Promise<(value: unknown) => { code: string; message: string }> {
  const resolver = createHostLlmResolver({
    env: { ...process.env, DSH_HARNESS_ROOT: HARNESS_ROOT },
    cwd: process.cwd(),
  })
  console.log(`resolution candidates: ${resolver.candidates().map(c => `${c.kind}=${c.path}`).join(' | ')}`)
  const resolved = resolver.resolve()
  console.log(`resolved host module: ${resolved === undefined ? 'NONE' : `${resolved.kind} -> ${resolved.path}`}`)
  for (const candidate of resolver.candidates()) {
    if (candidate.kind === 'package-import') continue
    // <root>/packages/llm/llm/lib/index.js -> <root>/packages/llm/llm/src/adapter-failure.ts
    const sourceUrl = new URL('../../../llm/llm/src/adapter-failure.ts', `file:///${candidate.path.replace(/\\/gu, '/')}`)
    try {
      const module = await import(sourceUrl.href) as {
        normalizeLlmFailure: (value: unknown) => { code: string; message: string }
      }
      console.log(`host normalizer loaded from: ${sourceUrl.href}`)
      return module.normalizeLlmFailure
    } catch (error) {
      console.log(`candidate ${candidate.kind} at ${candidate.path} unusable: ${String(error)}`)
    }
  }
  throw new Error('could not load the host normalizeLlmFailure; is the DSH checkout present?')
}

const normalize = await loadHostNormalizer()
let failures = 0

function check(label: string, actual: unknown, expected: unknown): void {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) failures += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}\n        expected ${JSON.stringify(expected)}\n        actual   ${JSON.stringify(actual)}`)
}

// 1. The failure mode: a plain error carrying only a `code` property.
const plainForeign = Object.assign(new Error('foreign failure'), { code: 'AUTH' })
check('plain foreign error with only a code is distrusted', normalize(plainForeign), {
  message: 'foreign failure',
  code: 'UNKNOWN',
})

// 2. A duplicated LlmError (own code, no failure carrier) is also distrusted.
const duplicatedLlmError = Object.assign(new Error('duplicated class failure'), { code: 'RATE_LIMIT', name: 'LlmError' })
check('duplicated class identity without a carrier is distrusted', normalize(duplicatedLlmError), {
  message: 'duplicated class failure',
  code: 'UNKNOWN',
})

// 3. Our carrier-bearing errors keep their code and their facts.
check('AUTH survives with status', normalize(createLlmFailureError('bad credential', 'AUTH', { status: 401 })), {
  message: 'bad credential',
  code: 'AUTH',
  status: 401,
})
check(
  'RATE_LIMIT survives with status and retry delay',
  normalize(createLlmFailureError('slow down', 'RATE_LIMIT', { status: 429, providerRetryAfterMs: 1500 })),
  { message: 'slow down', code: 'RATE_LIMIT', status: 429, providerRetryAfterMs: 1500 },
)
check('INVALID_REQUEST survives', normalize(createLlmFailureError('bad body', 'INVALID_REQUEST', { status: 400 })), {
  message: 'bad body',
  code: 'INVALID_REQUEST',
  status: 400,
})
check('SERVER survives', normalize(createLlmFailureError('upstream exploded', 'SERVER', { status: 500 })), {
  message: 'upstream exploded',
  code: 'SERVER',
  status: 500,
})

// 4. A tampered carrier is rejected, proving the code-agreement guard holds.
const tampered = createLlmFailureError('tampered', 'AUTH')
Object.defineProperty(tampered, 'code', { value: 'SERVER', enumerable: true, writable: false, configurable: false })
check('a carrier whose code disagrees with the error code is rejected', normalize(tampered), {
  message: 'tampered',
  code: 'UNKNOWN',
})

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`)
process.exitCode = failures === 0 ? 0 : 1
