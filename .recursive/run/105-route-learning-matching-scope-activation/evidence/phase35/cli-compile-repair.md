# Phase 3.5 repair — CLI compile (bounded)

Task: `phase35-repair-tasks.md` § "CLI compile" — *"Public cli.ts startAutoReplayLoop block and
pending track-b-learning-pass helper only. envelopeFor is out of scope; use correct local envelopes.
Decode RouteLadderRow rather than returning unknown. Capture typecheck RED/GREEN and focused
regression tests. No private writes or aggregation caller (controller owns that)."*

## Status: my bounded repair is COMPLETE and GREEN; one external blocker remains

### RED (captured BEFORE any repair)
`evidence/phase35/cli-compile.red.txt` — exactly 4 diagnostics, all in my bounded area:
```
src/cli.ts(7139,17): error TS2304: Cannot find name 'envelopeFor'.
src/cli.ts(7180,9):  error TS2322: Promise<unknown> not assignable to RouteLadderRow
src/cli.ts(7187,17): error TS2304: Cannot find name 'envelopeFor'.
src/cli.ts(7210,17): error TS2304: Cannot find name 'envelopeFor'.
```
Root cause: the learner sweep declares `envelopeFor` inside its own closure (cli.ts:5635, indent 10);
the auto-replay loop block sits at indent 6, so the helper was never in scope. The readRouteLadder
provider also returned `ladder as unknown`, which the typed provider signature refuses.

`evidence/phase35/cli-decode.red.txt` — focused assertion RED, 4 failed:
`TypeError: (0 , decodeRouteLadderRow) is not a function`.

### GREEN
A. Added `decodeRouteLadderRow(value): RouteLadderRow | null` in `track-b-auto-replay-runtime.ts`.
   It decodes only the fields the tick consumes and NEVER throws: a malformed/absent answer is `null`
   ("no ladder known"), and a rung whose status is outside the contract is DROPPED rather than
   coerced, so an unknown status can never be walked as if it were `available`.
B. Added a LOCAL `routeLadderEnvelopeFor(capability, value)` inside the auto-replay loop block and
   pointed the three ladder invokes at it. The learner sweep's own `envelopeFor` is untouched for its
   own callers.
C. `readRouteLadder` now returns `decodeRouteLadderRow(ladder)` instead of `ladder as unknown`.

- `evidence/phase35/cli-decode.green.txt` — focused suite 4/4 pass.
- `evidence/phase35/cli-focused-regression.green.txt` — 6 files, 27/27 pass
  (decode 4, r08-focus 3, r08-idle 4, r09 5, r10 4, r11 7).

### BLOCKER (NOT mine — outside the bounded scope)
`evidence/phase35/cli-compile.green.txt` shows the ONLY remaining diagnostic is:
```
src/cli.ts(3812,1): error TS1128: Declaration or statement expected.
```
It is a stray closing brace at cli.ts:3793 inside `startDurableRouteAdvisoryRefresh` — a region the
repair doc explicitly assigns to the CONTROLLER ("controller owns cli.ts" / "Advisory safety and
exact scope ... controller owns cli.ts").

Proof it is not my change:
- The RED capture taken BEFORE any of my edits contains exactly 4 diagnostics and NO TS1128.
- `git diff -U0` attributes line 3793 to an ADDED `    }` immediately after the ADDED line
  `const published = \`scope=${options.scopeId} pairs=${rows.length} stage=${stage}\`;` and the
  ADDED `console.error(\`[run105] durable task advisory refresh: ...\`)` — all belonging to the
  concurrent rewrite of that function (new `knowledge:list-route-ladders` refresh path).
- My bounded region (cli.ts:100 import, :7123 helper, :7166/:7214/:7237 invokes, :7225 decoder call)
  produces zero diagnostics.

I did not touch that region (no files outside my assignment; no private writes; no commits/stash/reset).

## Model identity
Unknown. I cannot state which model I am running as; the harness exposed no model identifier to me.
Reporting "unknown" rather than claiming a specific model.