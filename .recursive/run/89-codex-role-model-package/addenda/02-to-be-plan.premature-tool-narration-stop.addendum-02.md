Run: `/.recursive/run/89-codex-role-model-package/`
Phase: `02 TO-BE Plan`
Addendum: `02` (`premature-tool-narration-stop`)
Status: `DRAFT`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `addenda/01.5-root-cause.premature-tool-narration-stop.addendum-02.md`
- `packages/codex-role-model/src/forwarder.ts`
- `packages/codex-role-model/src/codex-tool-bridge.ts`
Outputs:
- `addenda/02-to-be-plan.premature-tool-narration-stop.addendum-02.md`
- Evidence under `evidence/logs/addendum-premature-tool-narration-stop/`
Scope note: Adapter-only. Worktree `D:\DEV\role-model\.worktrees\89-codex-role-model-package`. `TDD Mode: strict`. Live gate = real Codex CLI + runtime `:3458` + adapter `:3460`.

## TODO

- [x] R-B1: Detect tool-narration premature stops
- [x] R-B2: Bounded auto-continue forcing a tool hop
- [x] R-B3: Anti-narration guidance inject
- [x] R-B4: Strict TDD + Codex CLI live verification

## Objective

When a role-model hop returns message-only assistant text that narrates an imminent tool action (write/shell/patch) while tools were offered, the adapter must auto-continue (bounded) so the model emits a real tool call instead of ending the Codex turn.

## Requirements

### R-B1 — Detect tool-narration premature stops
- Export `isToolNarrationPrematureStop(payload, { hasCallableTools })`.
- True only when: callable tools were available; output has no function/custom/tool_search/web_search calls; assistant text matches narration patterns from audits.
- False for normal finals containing `STRESS_TEST_COMPLETE` or pure answers without next-tool intent.

### R-B2 — Bounded auto-continue
- `continueRoleModelAfterToolNarrationStop`: default max 2 (`ROLE_MODEL_CODEX_TOOL_NARRATION_CONTINUES`).
- Continue with system nudge to emit tool immediately; keep tools; do not set `tool_choice: none`.
- If continue yields tool calls → return that payload for restore.
- If still narration/message-only after budget → return last message (optionally append one-line adapter note).

### R-B3 — Anti-narration guidance
- Inject idempotent system guidance when outbound tools include shell/apply_patch/functions.
- Wire beside web_search preference inject on role-model hops.

### R-B4 — Strict TDD + Codex CLI proof
- RED/GREEN vitest for detector + continue + guidance.
- Live: doctor green; real Codex CLI against `http://127.0.0.1:3460/v1`; multi-step file-write prompt; proof files on disk; evidence logs + runtime request ids.

## Implementation Plan

1. RED tests for R-B1/R-B2/R-B3.
2. Implement detector + continue in `forwarder.ts`; call from `finalizePayloadForCodex` after web_search fulfill path.
3. Implement guidance in `codex-tool-bridge.ts`; inject from forwarder hop start.
4. GREEN tests; build; restart adapter.
5. Codex CLI live proof + evidence + `03-implementation-summary`.

## TDD Commands

```text
corepack pnpm --filter @try-works/codex-role-model exec vitest run test/forwarder.test.ts test/codex-tool-bridge.test.ts
corepack pnpm --filter @try-works/codex-role-model build
```

Evidence:
- `evidence/logs/addendum-premature-tool-narration-stop/red.log`
- `evidence/logs/addendum-premature-tool-narration-stop/green.log`
- `evidence/logs/addendum-premature-tool-narration-stop/cli-proof.log`
- `evidence/logs/addendum-premature-tool-narration-stop/cli-proof-meta.json`

## Codex CLI Live Procedure

1. `ROLE_MODEL_ENDPOINT=http://127.0.0.1:3458` adapter start on `:3460`.
2. `node packages/codex-role-model/bin/codex-role-model.js doctor`
3. In a temp dir, run real Codex CLI with model `baseline.remote-only` / configured `openai_base_url` pointing at adapter, prompt roughly:
   - Create `cli-premature-stop-proof.txt` containing `PROOF_MARKER_A` using a tool (not description).
   - Then create `cli-premature-stop-proof-2.txt` containing `PROOF_MARKER_B`.
   - Do not only narrate; first action must be a tool call. End with `CLI_PROOF_COMPLETE`.
4. Assert both files exist with markers; save CLI transcript; sample `:3458` recent requests for any narration `stop` followed by `tool_calls` recovery (or note files prove end-to-end success).

## Out of Scope

Quote quality; Desktop reconnect; router intent; reasoning UI.

## Audit

- Audit Execution Mode: self-audit
- Audit: PASS
