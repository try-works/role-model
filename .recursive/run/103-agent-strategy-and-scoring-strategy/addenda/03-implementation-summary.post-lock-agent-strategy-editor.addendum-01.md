Run: `/.recursive/run/103-agent-strategy-and-scoring-strategy/`
Phase: `03 Implementation` (post-lock addendum 01)
Status: `LOCKED`
LockedAt: `2026-09-30T20:17:58Z`
LockHash: `79fe33f03165bb0428c85296d01c95cdedfd7286bb8ef4af2ef871851daf7459`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/03-implementation-summary.md` (LOCKED)
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/04-test-summary.md` (LOCKED)
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/05-manual-qa.md` (LOCKED)
- operator report (2026-10-01): "only one role agent strategy is displayed at a time. after i save a new
  strategy the previous one is no longer displayed" / "i added a new agent strategy and the previous ones
  disappeared"
- operator decisions (2026-10-01): the name-keyed config blocks merge per entry, including `model_aliases`;
  deletion happens only when the operator presses Remove on an entry displayed in the UI; a rename must not
  delete the entry behind it.
Outputs:
- `role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
- `role-model-router/apps/runtime-host-bridge/test/runtime-config-named-block-merge.test.ts`
- `role-model-router/apps/runtime-ui/app/components/posture-entries-page.tsx`
- `role-model-router/apps/runtime-ui/app/lib/agent-strategy.ts`
- `role-model-router/apps/runtime-ui/app/lib/agent-strategy.test.ts`
- `role-model-router/apps/runtime-ui/app/routes/agent-strategy.test.tsx`
- `role-model-router/apps/runtime-ui/app/routes/control-runtime-config.tsx`
- the rebuilt `role-model-router/apps/runtime-ui/build/client` served by the live development runtime
Scope note: Records the two post-lock defects behind the operator report, the repair of the config write path
and the Agent strategy editor, and the live verification on the packaged development runtime, without
reopening the locked phase chain.

## TODO

- [x] Record the operator report and the decisions that shape the repair
- [x] Root-cause the disappearing entries against the live runtime
- [x] Repair the config write path with a RED/GREEN regression suite
- [x] Repair the Agent strategy editor so a save only ever upserts the rows it edits
- [x] Verify the repaired behaviour on the packaged development runtime over HTTP and the UI
- [x] Reconcile the locked phase records and this addendum with the post-lock product diff
- [x] Complete the Coverage Gate checklist
- [x] Complete the Approval Gate checklist

## Operator Report

The operator added a new agent strategy and the previously saved entries were no longer displayed, and the
saved configuration lost them as well. The operator rejected a UI-only explanation: the fix had to make the
writing logic stop removing entries, and deletion had to become an explicit operator action.

## Root Cause (live, reproduced)

- `mergeUnifiedRuntimeConfigDocuments` merged a patch into the saved document with a shallow
  `{ ...current, ...patch }`, so any patch that mentioned `agent_strategies`, `workloads` or `model_aliases`
  replaced the whole block. A page that owned one section had to echo every entry back; one stale row was
  enough to drop the entries the patch did not name, with no error.
- The Agent strategy editor's row key was `` `${form.name}-${index}` ``. Because the key embedded the entry
  name, React remounted the card after every keystroke and the Name field lost focus: typing
  `reviewer-agent` left only `r` in the field and every further character needed a fresh click. The page then
  saved a block whose only entry was the truncated name, which the whole-block replace above turned into a
  silent deletion of the saved entries. The live runtime logged exactly that sequence (`coder`, then `op`,
  then `a`).
- Two further hazards sat in the same editor: two rows sharing a name collapsed silently on render
  (`Object.fromEntries`), and renaming a saved row emitted an implicit deletion of the old name and its
  `<name>.<scope>` aliases even though the operator never asked for a removal.

## Repair

### Config write path (`mergeUnifiedRuntimeConfigDocuments`)

- The name-keyed blocks `agent_strategies`, `workloads` and `model_aliases` now merge per entry and, inside
  an entry, per field (`mergeNamedEntryBlock`). A patch upserts only the entries it names; omitting an entry
  never removes it. Deletion is explicit: `null` as an entry value removes exactly that entry, and `null` as
  a field value clears exactly that field.
- A row the runtime itself derived from an entry (the `posture` marker on the materialised `<name>.<scope>`
  aliases) always replaces rather than merges when a patch names it without the marker, so an operator alias
  that collides with the derived namespace is reported as a write error instead of silently absorbing the
  derived row.
- `replace_blocks: true` is the explicit opt-in for a caller that really does hand over the complete
  document. Only the free-form JSON editor (`control-runtime-config.tsx`) uses it; every other client gets
  the per-entry merge. The control key is never persisted.
- The runtime's own materialisation write-back was already safe (`preservedCustomAliases` keeps every
  non-primary, non-derived alias), and the wiring is unchanged; the live checks below confirm it still holds
  with the new merge.

### Agent strategy editor

- Stable row identity (`posture-row-<n>` created when a row is built) so typing in the Name field no longer
  remounts the card, plus focus on the row the operator just added.
- The page sends a per-entry patch (`buildPostureNamedBlockPatch`): one upsert per edited row, an explicit
  `null` **only** for entries the operator removed with the **Remove entry** button (confirmed by a dialog),
  and explicit `null` fields for values the row no longer sets, so clearing a field cannot resurrect the
  saved value.
- A rename upserts the new name and leaves the saved entry in place; the page says so before the save
  (`Saving adds …; the saved entry … stays in place`) and after it (`Kept: …`), and the renamed-away entry
  remains visible with its own Remove entry button. Nothing but the Remove action deletes an entry.
- Duplicate names are refused before any write, because the block is keyed by name.

## Live Verification

All checks below ran against the packaged development runtime on `127.0.0.1:3458`
(`role-model-dev.exe`, sha256 `d97dabb0035191389c2d8fe9d0eddff6567d20b83addfbd3d71ba2afec6e545c`, restarted after
the UI client rebuild) with the operator config `E:\tmp\run103-evidence\runtime-config.yaml`.

- HTTP `PUT /api/role-model/runtime/config`:
  - adding `agent_strategies.mergechecka` kept `tester` and all 24 saved `model_aliases`, and materialised
    the new entry's three scope aliases plus the new `run103.mergecheck` alias (24 -> 28);
  - updating one field of `mergechecka` (`scoring_strategy`) kept its `role_id`, and a patch that omits
    `model_aliases` left the block untouched;
  - `{"mergechecka": null, "run103.mergecheck": null}` removed exactly those two entries and restored the
    original 24 aliases with no extras and no losses.
- Agent strategy page (in-app browser, live): adding `uicheck` (role `coder`) saved with
  `Added: uicheck` and kept `tester`; renaming the row to `uicheck2` saved with
  `Added: uicheck2. Kept: uicheck — a rename adds the new entry, so the saved one stays until you press
  Remove entry on it.` and both `uicheck` and `uicheck2` were listed afterwards; **Remove entry** on
  `uicheck` (confirm dialog accepted) saved with `Removed: uicheck` and the server then held
  `tester, uicheck2`; removing `uicheck2` the same way restored the operator's `tester`-only block and the
  24-alias set.
- Suites: `@role-model-router/runtime-host-bridge` 319 files passed / 3 skipped, 1944 tests passed /
  5 skipped; `@role-model-router/runtime-ui` 65 files, 627 tests passed; `biome check` clean on every changed
  file.

## Evidence

- `.../evidence/logs/red/postlock-named-block-merge-red.log`, `.../green/postlock-named-block-merge-green.log`
- `.../evidence/logs/red/postlock-rename-keeps-origin-red.log`,
  `.../green/postlock-rename-keeps-origin-green.log`
- `.../evidence/logs/green/postlock-named-block-merge-full-bridge-green.log`,
  `.../green/postlock-rename-ui-suites-green.log`, `.../green/postlock-rename-ui-build-green.log`
- `E:\tmp\run103-evidence\mergecheck-live.log` (HTTP merge/delete readback), UI session receipts quoted above
- `E:\tmp\run103-evidence\snapshots\runtime-config.pre-mergecheck-20261001-035300.yaml` (pre-check config snapshot)

## Impact on the Locked Phase Chain

- The change is a product change after the phase-8 lock. `03-implementation-summary.md`,
  `03.5-code-review.md`, `04-test-summary.md`, `05-manual-qa.md`, `06-decisions-update.md`,
  `07-state-update.md` and `08-memory-impact.md` keep their locked decisions; this addendum is the post-lock
  record, and the locked phase records are reopened only to account for the post-lock product paths
  (`runtime-config-named-block-merge.test.ts` and the rebuilt editor files) in their diff audits.
- The config layout is unchanged: a per-entry patch writes the same document the whole-block write produced,
  so no migration is required and the runtime contract, alias materialisation and decision receipts are
  untouched.

## Coverage Gate

- [x] Both defects are root-caused with live evidence, not just the UI symptom
- [x] The write-path repair has RED/GREEN regression evidence and covers `agent_strategies`, `workloads` and
      `model_aliases`, upserts, field-level clears and explicit deletes
- [x] The editor repair is verified end-to-end on the packaged runtime (add, rename, Remove, restore)
- [x] The operator's rule (deletion only via the Remove action) is enforced in code and covered by tests

Coverage: PASS

## Approval Gate

- [x] The operator chose the per-entry merge, required `model_aliases` to be included, and required deletion
      to stay an explicit UI action (this thread, 2026-10-01)

Approval: PASS
