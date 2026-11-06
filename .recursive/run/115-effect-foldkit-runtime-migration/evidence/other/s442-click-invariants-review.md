# S442 — independent review of S440 click-invariant repair

Verdict: **HOLD** (one blocking command-argument fidelity defect; two bounded coverage notes).
Reviewer: s10-reviewer; model **deepseek-flash** verified via `list_agents`.
Reviewed freeze: s397 `6D2F11AEC31A846E4CFA21C01DDF13C6F19FD48DE6B839EFB448D04715F1D146`,
s425 `DEF6E964613F36426FCC6BD1CBE0A738B4A72626AC18F298DE0A2F80F613AC5A`;
s247 unchanged `958F3DD7C04808766EE5E67CE5180B5412C22D120E92339B866F5B6F81971352`.
No source/test writes by this review. No packaged/DOM/full-UI proof is claimed.

## Blocking finding — replayed poll result is not from the generated args

The scene asserts the generated poll command args exactly, but the replayed result is executed with different
args, and `Command.resolve` matches the pending command by definition, not by args
(`packages/foldkit/dist/chunks/chunk-AD2UBRRC.js:641-644`). Thus the result can be consumed by a command whose
`delayMs`/`intervalMs` differ, and the test does not prove the actual generated command.effect/client result.

- s425:302-304 executes `commands.poll({ delayMs: 0, intervalMs: 1_000, token: 2 })`; generated command at
  :320 is `{ authRequestId: "auth-pending", delayMs: 5_000, intervalMs: 5_000, token: 2 }`.
- s425:341-343 executes delayMs 0/intervalMs 1_000; generated commands at :354/:358 are delayMs 1_000/
  intervalMs 1_000; :371-373 executes delayMs 0/intervalMs 1_000 against generated 5_000/5_000 at :382.
- The test comment claims "same args the scene asserted"; that is false for delay/interval. `expectHas` pins the
  pending args separately but does not bind the replayed `DeviceAuthPolled` result to them.

Concrete failing input/mutation: make `commands.poll`'s result depend on `delayMs`/`intervalMs` (or return a
different result for the 5s/5s schedule); the test still replays the 0/1s result and passes because resolve is
definition-based. Fix: capture the generated authRequestId/token/interval/delay from the pending command and
execute `commands.poll(capturedArgs).effect` with a virtual/test clock so the sleep does not run; then replay that
exact result. If the harness cannot do that without weakening the contract, STOP/propose the design rather than
accepting the independent pre-executed effect.

## Bounded coverage notes (not the primary blocker)

- Old s425 mounted test asserted `expect(link.tabIndex).toBe(0)` (d6043768:360); the scene replacement asserts
  href/target/rel only. A product change removing explicit keyboard focusability would still pass. Add a scene
  focusability assertion or record the deliberate limitation.
- Old s425's `startDeviceAuth` filled draft inputs and clicked "Add model" (d6043768:334-339); the scene starts
  from `given(...draft...)` (:312, :349, :376). Start/retry wiring is proven, but the form-input -> draft path is
  no longer exercised by these two suites. Confirm it is covered elsewhere or record the limitation.

## Checks that passed

- Real scene click wiring: `click(role(...))` dispatches the rendered handler; no `.click()`, dispatchEvent,
  MouseEvent, bracket-click or helper disguise in either file; s247 counts zero for both.
- s247 ratchet 3/3, total 20 node invariants 20/20; s397+s425 31/31; UI tsc exit 0; anti_slop_lint on both files
  `filesScanned=1`, 0 findings. s247 BUDGET unchanged.
- Author probe `evidence/logs/s440-probe.log` uses disposable copies; start-disconnected and retry-disconnected
  scenes fail with "no click handler". That mutation evidence is real and satisfies the start/retry sensitivity
  requirement.
- s397's read results use the same token args before resolve and assert the two exact GETs; no issue found there.
- No S440 product/source writes; the modified commands/update files are other owners' work and were not part of
  this slice.

Basis for HOLD is the explicit S440 acceptance rule: do not accept an independent pre-executed fetch when the
returned command is not the same args. If the Lead explicitly accepts the delay0 clock seam plus separate exact
schedule assertion, the request path/body and view wiring otherwise pass; the two coverage notes remain.

## S442 final re-review — PASS (supersedes the earlier HOLD after repair)

Final reviewed freeze: s397 `6B2B0266E3DF3B92E677103294E1D2DB16EDF7C31DCA853D081EF90AF01A9398`,
s425 `6A07CE5D115B40713D31080BEBFE93228F3B4574E8B1BEDA684B9161699AC6A3`.
Reviewer model **deepseek-flash** verified via `list_agents`. Read-only; no source or test writes by the reviewer.

- The earlier blocking args mismatch is repaired. Each replay uses ONE shared exact args object for both the
  production Command effect and the scene assertion: s425 readArgs/pollArgs (:306, :342, :383-384, :415,
  :442), s397 startReadArgs/retryReadArgs (:277-278). The production effect is executed with those same
  objects (s425 :343-344, :385-387, :416-417; s397 :279-280), including real 5s/1s `Effect.sleep`; there is
  no delay override.
- The new typed scene tap `captureCommand` (:313-317) reads the pending command by name and deep-equals its
  `args` to the same object; `Command.expectHas` follows (:355-356, :362-363, etc.). This binds the replayed
  result to the actual generated command args, not merely the command definition.
- Input/Add-model integration is restored and scoped: `draftSteps` uses `inside(selector('[data-route="device-authorization"]'), type(label("Provider")), ...)` (:318-331) and is used in all three pending scenarios (:353, :391, :421); no provider-account field can satisfy those locators.
- The keyboard/safe-link assertion is restored against SSR output with `tabIndex === 0` (:470-494).
- Positive request checks: test 1 asserts exact GET/POST paths and the poll body (:345-349); s397 asserts two
  exact GETs (:284-287); the two-poll scenario drives two real poll effects and the second resolves only
  through the same exact args (:383-404); s397 retry asserts two reads (:304-311). Multiplicity is covered by
  the scene's pending-command resolution (extra duplicate poll/read commands would make resolution ambiguous
  or fail the tap deep equality). Test 2 does not repeat the path/body assertion; the shared production client
  path is already pinned by test 1, so this is a bounded limitation, not a hidden bypass.
- No hidden equivalent click: no `.click()`, dispatchEvent, MouseEvent, bracket/helper click in either file;
  s247 counts zero for both. s247 3/3, all 20 node invariants 20/20, auth 32/32 (s397 15 + s425 17), UI tsc 0,
  anti_slop_lint both files `filesScanned=1`, 0 findings; s247 BUDGET unchanged.
- Mutation evidence: `evidence/logs/s440-probe.log` uses disposable copies; start-disconnected (4 scene tests
  fail) and retry-disconnected (1 fail) prove the rendered OnClick wiring is load-bearing. The probe predates
  the final text edit but targets the same start/retry handlers; no new probe was claimed.
- Honest split remains: scene proves view -> update -> command args; the effect run proves those args -> real
  client result. This is not a browser/mount/packaged-DOM proof, and no full-UI claim is made.

Verdict: **PASS (bounded) at the final hashes above; no remaining blocking issue found.**
