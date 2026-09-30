/**
 * Differential check: our classifier vs the Pi package's classifier.
 *
 * The taxonomy data is a verbatim copy and the algorithm is a port, so for any
 * input using only the signals both share, the two implementations must emit
 * byte-identical `role_model` objects. This is the strongest available evidence
 * that the port introduced no behavioural drift — far stronger than asserting
 * hand-written expectations.
 *
 * The one deliberate divergence is the extended tool-name hint table (DeepSeek
 * Harness tool names), so this check uses contexts restricted to the tool names
 * the Pi table already knew.
 *
 * Run:  node --import tsx scripts/check-classifier-parity.mts
 */

import { classifyWithProgressiveDisclosure as ours } from '../src/taxonomy/classify-with-progressive-disclosure.js'
import { classifyWithProgressiveDisclosure as theirs } from '../../pi-role-model/src/taxonomy/classify-with-progressive-disclosure.js'
import type { ClassificationContext } from '../src/taxonomy/classify-with-progressive-disclosure.js'

/** Prompts spanning every group, plus degenerate and ambiguous cases. */
const PROMPTS: readonly string[] = [
  'Implement a small bug fix and add a regression test.',
  'Debug the root cause of the startup crash in the parser.',
  'Refactor this module and remove the duplicate database query.',
  'Review this diff for security risks and likely regressions.',
  'Audit the authentication permissions and threat model.',
  'Plan the schema migration and api design for the database.',
  'Design the service endpoint and container deployment pipeline.',
  'Write the product requirements and acceptance criteria for this workflow.',
  'Compare these options and score them in a decision matrix.',
  'Design a responsive interface and evaluate the visual layout.',
  'Find the current public documentation and cite the sources.',
  'Summarize the literature and the experimental method used.',
  'Solve this math proof and derive the formula.',
  'Explain in simple terms and build a lesson curriculum.',
  'Draft a customer reply for this support ticket.',
  'Write a release notes blog post and summarize the changelog.',
  'Translate the release notes into German and localize the tone.',
  'Brainstorm a tagline and creative brand story.',
  'Summarize the quarterly sales strategy and forecast revenue.',
  'Write the cold email sequence and landing page copy.',
  'Prepare the RFP response and vendor negotiation proposal.',
  'Review the legal terms, compliance and privacy policy.',
  'Draft the job description and interview scorecard for this candidate.',
  'Summarize these symptoms, medication and wellness appointment notes.',
  'Coordinate the meeting agenda and handoff status update.',
  'Organize notes into a knowledge base and archive the context brief.',
  'zzzz qqqq wwww',
  'Handle this task.',
  '',
  'product',
  'coder',
  'fix',
]

/** Contexts restricted to tool names the Pi hint table already knew. */
const CONTEXTS: readonly (ClassificationContext | undefined)[] = [
  undefined,
  { hasTools: false, toolNames: [], hasImages: false, hasFiles: false, fileExtensions: [] },
  {
    hasTools: true,
    toolNames: ['read_file', 'write_file', 'execute_command'],
    hasImages: false,
    hasFiles: false,
    fileExtensions: [],
  },
  {
    hasTools: true,
    toolNames: ['web_search', 'web_fetch'],
    hasImages: false,
    hasFiles: false,
    fileExtensions: [],
  },
  { hasTools: false, toolNames: [], hasImages: true, hasFiles: false, fileExtensions: [] },
  { hasTools: false, toolNames: [], hasImages: false, hasFiles: true, fileExtensions: ['.sql'] },
  { hasTools: false, toolNames: [], hasImages: false, hasFiles: true, fileExtensions: ['.pdf'] },
  {
    hasTools: true,
    toolNames: ['db_query', 'db_schema', 'git_diff', 'run_tests'],
    hasImages: false,
    hasFiles: true,
    fileExtensions: ['.csv', '.json'],
  },
]

let compared = 0
let mismatches = 0

for (const prompt of PROMPTS) {
  for (const context of CONTEXTS) {
    compared += 1
    const mine = ours(context === undefined ? { prompt } : { prompt, context })
    const reference = theirs(context === undefined ? { prompt } : { prompt, context })
    const same = JSON.stringify(mine.role_model) === JSON.stringify(reference.role_model)
    if (!same) {
      mismatches += 1
      console.log(`MISMATCH  prompt=${JSON.stringify(prompt)}`)
      console.log(`          context=${JSON.stringify(context)}`)
      console.log(`          ours      ${JSON.stringify(mine.role_model.intent)}`)
      console.log(`          reference ${JSON.stringify(reference.role_model.intent)}`)
    }
    // The local diagnostics are part of the contract too.
    const diagnosticsMatch = JSON.stringify({
      candidateGroupIds: mine.candidateGroupIds,
      candidateRoleIds: mine.candidateRoleIds,
      hiddenModelCallUsed: mine.hiddenModelCallUsed,
    }) === JSON.stringify({
      candidateGroupIds: reference.candidateGroupIds,
      candidateRoleIds: reference.candidateRoleIds,
      hiddenModelCallUsed: reference.hiddenModelCallUsed,
    })
    if (!diagnosticsMatch) {
      mismatches += 1
      console.log(`DIAGNOSTIC MISMATCH  prompt=${JSON.stringify(prompt)}`)
      console.log(`          ours      ${JSON.stringify(mine.candidateGroupIds)} / ${JSON.stringify(mine.candidateRoleIds)}`)
      console.log(`          reference ${JSON.stringify(reference.candidateGroupIds)} / ${JSON.stringify(reference.candidateRoleIds)}`)
    }
  }
}

console.log(`\ncompared ${compared} (prompt, context) pairs across ${PROMPTS.length} prompts`)
console.log(mismatches === 0
  ? 'ALL PAIRS BYTE-IDENTICAL — no behavioural drift from the Pi implementation'
  : `${mismatches} MISMATCH(ES) FOUND`)
process.exitCode = mismatches === 0 ? 0 : 1
