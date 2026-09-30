Run: `/.recursive/run/103-agent-strategy-and-scoring-strategy/`
Phase: `03 Implementation` (post-lock addendum 01)
Status: `DRAFT`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/03-implementation-summary.md` (LOCKED)
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/05-manual-qa.md` (LOCKED)
- operator report: "only one role agent strategy is displayed at a time. after i save a new strategy the previous one is no longer displayed."
Outputs:
- `role-model-router/apps/runtime-ui/app/components/posture-entries-page.tsx`
- `role-model-router/apps/runtime-ui/app/lib/agent-strategy.ts`
- `role-model-router/apps/runtime-ui/app/lib/agent-strategy.test.ts`
- the rebuilt `role-model-router/apps/runtime-ui/build/client` served by the live development runtime
Scope note: Records a post-lock defect in the Agent strategy editor, its root cause, the repair and the live
verification, without reopening the locked phase chain.

## Operator Report

The operator added a new agent strategy and the previously saved entries were no longer displayed. The first
hypothesis (a rename in the pre-filled row) explained one path but not the report; the follow-up investigation
found the real defect.

## Root Cause (live, reproduced)

- The editor row key was `` `${form.name}-${index}` ``. Because the key contains the entry name, React
  remounted the whole card after **every keystroke** in the Name field, which dropped focus: typing
  `reviewer-agent` (14 characters) left only `r` in the field, and each further character needed a fresh click.
  Evidence: live accessibility tree, `rows after typing 14 chars: ["…","r"]`.
- Consequently an operator could effectively only enter one (or, with repeated clicks, two) characters, which
  is why the saved entries observed live were named `a`, `op` and `n`.
- The write path replaces the whole `agent_strategies` block keyed by name (by design, so removals are
  expressible), so when the operator continued typing into the row that the page had pre-filled from the saved
  configuration, the save replaced that entry under the new single-character name and the previous entry
  disappeared without an error. The runtime logged exactly that: a startup block with `coder`, then a write
  whose only entry was `op`, then a write whose only entry was `a`.
- Two secondary hazards were confirmed in the same editor: two rows with the same name collapse silently when
  the block is rendered (`Object.fromEntries`), and a save that no longer names a saved entry removes it (a
  rename removes the old name and its `<name>.<scope>` aliases) without any confirmation.

## Repair

- Stable row identity: `PostureForm` carries an `id` created when the row is built (`posture-row-<n>`) and the
  React key is that id, so typing no longer remounts the card.
- `findDuplicateEntryNames` refuses a save whose rows share a name, with a message that says why.
- `listEntriesRemovedBySave` drives a confirmation before any write that would drop or rename a saved entry,
  naming the entries whose `<name>.<scope>` aliases would stop materialising, and reports a cancellation
  message when the operator declines.
- Rows now say `Editing saved entry <name>` or `New entry <name>`, a rename shows an inline warning naming the
  old aliases, the role picker shows the selected role's description from the readback, and the role field
  shows which `<name>.<scope>` aliases the entry will materialise.

## Verification

- `corepack pnpm --filter @role-model-router/runtime-ui test` -> 65 files, 623 tests passed (two new tests pin
  the duplicate and removal helpers).
- `corepack pnpm --filter @role-model-router/runtime-ui build` -> green; the client build was copied into the
  running release directory and the development runtime restarted on `:3458`.
- Live checks on the rebuilt UI: typing `reviewer-agent` lands the full name; adding an entry kept the four
  previous entries (`reviewer`, `a`, `coder`, `n` -> `+ reviewer-agent`); a duplicate name was refused with
  "Duplicate entry name: coder…" and the server block was unchanged; renaming `n` prompted
  "Saving removes the saved entry n: their <name>.<scope> aliases stop materialising. Continue?" and the
  confirmed save wrote `n-renamed` while keeping the other entries.
- `corepack pnpm exec biome check` on the three changed files -> clean.

## Impact on the Locked Phase Chain

- The change is UI-only. `03-implementation-summary.md`, `03.5-code-review.md` and `04-test-summary.md` remain
  locked; this addendum is the post-lock record and the run's `05-manual-qa.md` S10/S11 receipts are unchanged.
- The runtime contract, the config layout and the alias materialisation are untouched, so the rebuild that
  ships this change is a UI asset rebuild rather than a new runtime artifact.
