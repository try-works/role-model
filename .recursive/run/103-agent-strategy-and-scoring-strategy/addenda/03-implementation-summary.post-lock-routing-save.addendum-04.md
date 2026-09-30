Run: `/.recursive/run/103-agent-strategy-and-scoring-strategy/`
Phase: `03 Implementation` (post-lock addendum 04)
Status: `LOCKED`
LockedAt: `2026-09-30T22:11:04Z`
LockHash: `757ffd011425a60a66000bcf5ee8fc1cc21cfd3ac56a414d8e8f2bd9975842a8`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/03-implementation-summary.md` (LOCKED)
- operator report (2026-10-01): "the weights should only be exposed when the user chooses custom strategy, but
  the custom strategy isn't even exposed, and instead you just display the weights always. also save and
  apply strategy seems to not work at all, it just stays baseline"
Outputs:
- `role-model-router/apps/runtime-ui/app/lib/routing-mode.ts`
- `role-model-router/apps/runtime-ui/app/lib/routing-mode.test.ts`
- `role-model-router/apps/runtime-ui/app/routes/control-routing-strategy.tsx`
- `role-model-router/apps/runtime-ui/app/routes/control-routing-strategy.test.tsx`
- the rebuilt `role-model-router/apps/runtime-ui/build/client` served by the live development runtime
Scope note: Post-lock UI repair of two operator-visible defects on the Routing strategy page; the config
contract, the runtime and the stored posture shape are unchanged.

## TODO

- [x] Reproduce both defects against the live development runtime
- [x] Write the selected routing mode into the saved patch
- [x] Show the six-weight editor only for the custom scoring strategy
- [x] Verify both on the rebuilt runtime and restore the operator's saved posture
- [x] Complete the Coverage Gate checklist
- [x] Complete the Approval Gate checklist

## Root cause

- **A mode change was never written.** `buildRoutingPatchDocument` derived `mode` from `input.routing` -
  the *saved* readback - and the page never passed the operator's selection. Every save therefore wrote the
  mode that was already stored; with `baseline` saved, selecting Difficulty, Hybrid or Intelligent and
  saving reported success and changed nothing. Reproduced live: selecting Intelligent + Custom and pressing
  Save left `routing.mode = baseline` (while `scoring_strategy` did change, which is why the failure looked
  like "it just stays baseline").
- **The weight editor was unconditional.** The `Custom weights` block (six inputs, sum caption, reset
  buttons) rendered whatever the scoring strategy was, captioned "Enabled when the scoring strategy is
  Custom", so the page read as if hand-tuned weights were always in force. `custom` *was* selectable in the
  listbox (verified live: options Balanced, Quality, Latency, Cost, Custom), but nothing tied the editor to
  that selection.

## Repair

- `buildRoutingPatchDocument` now takes `mode` as an explicit input, normalizes it against the run-103 mode
  vocabulary and refuses an unknown value (`unknown routing mode "turbo"`) instead of silently writing
  `baseline`. The page passes its `mode` state, so the selected mode is what the patch document carries.
- `showsCustomWeightEditor(scoringStrategy)` is the single predicate for the weight editor: the block renders
  only when the normalized strategy is `custom`, and the inputs/reset buttons are enabled whenever the block
  is on screen (the previous `!weightsAreCustom` guards are gone because they cannot be false there any
  more).

## Live verification (rebuilt UI on the running packaged runtime)

Client build `manifest-d6a70ab5.js`, runtime `127.0.0.1:3458` pid 65764.

- Baseline + Balanced: the `Custom weights` block is **absent**; selecting Custom makes it appear, and
  switching back removes it (`weightsBlock=false/true` measured from the rendered page).
- Mode change: selecting Intelligent with Custom and pressing `Save and apply strategy` persisted
  `mode=intelligent`, `scoring_strategy=custom`; the Active posture rail showed Intelligent with the alias
  `controller.remote-only`. Previously the same interaction persisted `mode=baseline`.
- The operator's saved posture was restored after the checks: `mode=baseline`, `scoring_strategy=quality`,
  `pin_weights=false`, `execution_mode=remote_only` (alias `baseline.remote-only`).

## Evidence

- `.../evidence/logs/red/postlock-routing-mode-save-red.log` (4 failing assertions before the repair)
- `.../evidence/logs/green/postlock-routing-mode-save-green.log` (2 files, 21 tests)
- `.../evidence/logs/green/postlock-routing-mode-save-ui-suites-green.log` (65 files, 633 tests)
- `.../evidence/logs/green/postlock-routing-mode-save-ui-build-green.log` (client build)
- Live receipts quoted above (config readback before/after each save)

## Coverage Gate

- [x] Both defects are reproduced on the live runtime before the repair and re-checked after it
- [x] The mode path is covered per mode (`difficulty`, `hybrid`, `intelligent`) and for an unknown spelling
- [x] The weight editor's visibility is a tested predicate, and the page is asserted to use it

Coverage: PASS

## Approval Gate

- [x] Operator report and directive (2026-10-01, this thread) to fix both behaviours

Approval: PASS
