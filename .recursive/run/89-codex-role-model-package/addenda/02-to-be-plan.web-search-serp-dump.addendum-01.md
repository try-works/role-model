Run: `/.recursive/run/89-codex-role-model-package/`
Phase: `02 TO-BE Plan`
Addendum: `01` (`web-search-serp-dump`)
Status: `DRAFT`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/89-codex-role-model-package/addenda/01.5-root-cause.web-search-serp-dump.addendum-01.md`
- `packages/codex-role-model/src/forwarder.ts`
- `packages/codex-role-model/src/codex-tool-bridge.ts`
Outputs:
- `/.recursive/run/89-codex-role-model-package/addenda/02-to-be-plan.web-search-serp-dump.addendum-01.md`
- TDD evidence under `/.recursive/run/89-codex-role-model-package/evidence/logs/addendum-web-search-serp-dump/`
Scope note: Adapter-only plan to stop raw SERP dumps, harden fulfill/continue, and tighten live-fact query coaching. Worktree: `D:\DEV\role-model\.worktrees\89-codex-role-model-package`.

## TODO

- [x] R-A1: Never present raw SERP as final assistant answer
- [x] R-A2: Harden fulfill/continue loop (budget + duplicate query force-synthesize)
- [x] R-A3: Strengthen live-fact tool/query coaching
- [x] R-A4: Strict TDD + Desktop live-fact smoke evidence

## Objective

Desktop users on `baseline.remote-only` through `@try-works/codex-role-model` must never see raw ChatGPT `[wordlim:` SERP blobs as the assistant answer when web_search fulfill continues are exhausted. The adapter must force a text synthesis hop or a short structured failure message, keep message-only responses to Codex (no `web_search_call` restore), and coach ticker-oriented queries.

## Requirements

### R-A1 — Never present raw SERP as the final assistant answer
- After continue exhaustion (or unparseable continue), attempt one final upstream hop with `web_search` removed from `tools` (and `tool_choice: "none"` when safe) whose input includes collected search outputs + an explicit “answer in plain text now” system/user nudge.
- If that hop still fails or returns only tool calls, return a **structured** assistant message: queries tried, source, truncated snippets (cap ~800 chars total), and “could not synthesize a live quote” — **must not** contain `[wordlim:`.
- Preserve Desktop stall fix: never restore client `web_search_call`.

### R-A2 — Harden the fulfill/continue loop
- Raise continue budget to allow more search **batches** (default 6).
- Track normalized queries already searched; on duplicate/near-duplicate (casefold trim), do not re-hit alpha/search — inject a refuse output and force synthesize path.
- Collect all search outputs for fallback (not only last).

### R-A3 — Strengthen live-fact tool/query coaching
- Update `WEB_SEARCH_TOOL_DESCRIPTION` + `WEB_SEARCH_PREFERENCE_GUIDANCE` with ticker examples (`SNDK stock price today`, `NET Cloudflare share price USD`).
- Strengthen `function_call_output` preamble: extract last/range/volume when present; if SERP lacks a quote, say so; do not re-search the same query.

### R-A4 — Strict TDD + live proof
- RED then GREEN in `packages/codex-role-model/test/forwarder.test.ts`.
- Rebuild adapter; smoke Desktop or adapter HTTP probe for SNDK+NET style answer without `[wordlim:`.

## Implementation Plan

1. **RED tests** (write first):
   - Exhausted continues with SERP containing `[wordlim: 200]` → assistant text must **not** include `[wordlim:`; must include structured failure or synthesized answer.
   - Duplicate query on second model hop → no second alpha/search for same query; force synthesize / structured path.
   - Happy path: model returns message after one search → still works; no `web_search_call`.
2. **GREEN production** in `forwarder.ts`:
   - Refactor `finalizeSearchOnlyAnswer` → `buildStructuredSearchFallback` + `forceSynthesizeAfterSearch`.
   - Update `continueRoleModelAfterWebSearch` loop budget, dedupe, collect outputs, call synthesize hop before structured fallback.
3. **Coaching** in `codex-tool-bridge.ts` + fulfill preamble strings.
4. **README** one-line failure-mode note.
5. Rebuild/restart `:3460`; record evidence logs.

## TDD Verification

```text
# RED then GREEN
corepack pnpm --filter @try-works/codex-role-model exec vitest run test/forwarder.test.ts test/codex-tool-bridge.test.ts
corepack pnpm --filter @try-works/codex-role-model build
```

Evidence paths:
- `evidence/logs/addendum-web-search-serp-dump/red.log`
- `evidence/logs/addendum-web-search-serp-dump/green.log`
- `evidence/logs/addendum-web-search-serp-dump/desktop-or-probe.md`

## Live Verification

1. Adapter on `127.0.0.1:3460` with rebuilt package; runtime `:3458`.
2. Prompt (short): ask SNDK and NET last prices via web_search; require one short answer (no shell curl).
3. Expect: synthesized prices or honest “not in results”; **no** `[wordlim:` paste; no empty abort solely from SERP dump.

## Out of Scope

- New recursive run; `role-model-router`; native reasoning traces; Desktop reconnect transport; ChatGPT index quality guarantees.

## Audit

- Subagent Capability Probe: available; plan authored as controller self-audit from locked root-cause addendum.
- Delegation Decision Basis: self-audit — small adapter surface, root cause already confirmed.
- Audit Execution Mode: self-audit
- Audit: PASS
