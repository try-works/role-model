Run: `/.recursive/run/103-agent-strategy-and-scoring-strategy/`
Phase: `03 Implementation` (post-lock addendum 03)
Status: `LOCKED`
LockedAt: `2026-09-30T22:01:19Z`
LockHash: `80f49ae71b464e32e83f6aee5ee5746f7296ae8ce307098ad388db0bc1c0079b`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/03-implementation-summary.md` (LOCKED)
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/03.5-code-review.md` (LOCKED)
- operator directive (2026-10-01): "this should only be a checkbox but you gave it an entire ui component"
  (the Measured-latency override card on the Routing strategy page)
Outputs:
- `role-model-router/apps/runtime-ui/app/routes/control-routing-strategy.tsx`
- `role-model-router/apps/runtime-ui/app/lib/latency-override.ts`
- `role-model-router/apps/runtime-ui/app/lib/latency-override.test.ts`
- `role-model-router/apps/runtime-ui/app/routes/control-routing-strategy.test.tsx`
- `role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
- the rebuilt `role-model-router/apps/runtime-ui/build/client` served by the live development runtime
Scope note: Post-lock UI correction. The override's persistence, the learning-policy API and every
policy field are unchanged; the page stops re-exposing them.

## TODO

- [x] Reduce the card to the single enable switch
- [x] Keep the policy fields on the surface that owns them (Learning -> Configuration)
- [x] Prove the checkbox reads and writes the policy flag on the rebuilt runtime
- [x] Complete the Coverage Gate checklist
- [x] Complete the Approval Gate checklist

## What changed

- The card is now one checkbox: `latencySelectionEnabled`. It reads the flag from the learning-policy
  readback (`buildLatencyOverrideToggle`) and writes exactly that field through `saveLearningPolicy` with
  the policy version for concurrency; a refused or stale write restores the saved value and says why.
- Removed from this page: the minimum stage, window, sample floor, threshold, bucket bounds and max
  candidates inputs, the telemetry evidence strip, the Save/Reset buttons and the always-visible operator
  receipt. Those fields are ordinary learning-policy fields with a schema-driven editor on
  Learning -> Configuration, and the run's own decision already fixes the comparison metric
  (`p50 + 0.25 × (p95 − p50)`).
- The operator token field is revealed only when a write is refused (a client that is not the machine
  owner, or a runtime exposed beyond loopback). On the machine that owns the runtime the switch works
  without one, which is what makes "just a checkbox" honest rather than decorative.
- `validateLatencyOverrideDraft`, `summarizeLatencyOverrideEvidence`, the draft/bounds view model and the
  telemetry fetch that fed the evidence strip are deleted, with their tests replaced by the toggle unit
  tests. `lib/design-system.test.ts` now asserts the inventory-style evidence strip is gone from this page.

## Live verification (rebuilt UI on the running packaged runtime)

Client build `manifest-81945e14.js`, runtime `127.0.0.1:3458` pid 54716.

- The page renders one checkbox for the override (`aria-label="Measured-latency override"`,
  `aria-checked=false`) and one sentence of help; no policy knobs, no evidence strip, no receipt form.
- Clicking it wrote the policy: `policyVersion` 1 -> 2 with `latencySelectionEnabled=true`; a reload showed
  the checkbox still checked, so the write and the readback agree.
- Clicking it again restored the operator state: `policyVersion` 3 with `latencySelectionEnabled=false`
  (the shipped default), verified through `GET /api/role-model/operator/learning/policy`.
- No token was required on loopback; the token field stays hidden unless the runtime refuses the write.

## Evidence

- `.../evidence/logs/red/postlock-latency-checkbox-red.log` (4 failing assertions before the rewrite)
- `.../evidence/logs/green/postlock-latency-checkbox-green.log` (2 files, 8 tests)
- `.../evidence/logs/green/postlock-latency-checkbox-ui-suites-green.log` (65 files, 629 tests)
- `.../evidence/logs/green/postlock-latency-checkbox-ui-build-green.log` (client build)
- Live page/API receipts quoted above (policy versions 1 -> 2 -> 3 on `:3458`)

## Carried commitment (unchanged by this addendum)

- The effective threshold still comes from the learning policy file. This deployment reports the private
  registry's `latencySelectionMaxDeltaMs` value 2000 while the public read side declares 10 000, which is
  the release dependency already recorded in `06-decisions-update.md`; hiding the field from this page must
  not be read as resolving it. `R7`'s paired-registry change remains the release requirement.

## Coverage Gate

- [x] The checkbox is the only control, and it writes the field it claims to write (verified live)
- [x] The removed surface is covered by negative assertions in the page and design-system tests
- [x] The policy fields keep exactly one editor (Learning -> Configuration)

Coverage: PASS

## Approval Gate

- [x] Operator directive (2026-10-01, this thread) to reduce the component to a checkbox

Approval: PASS
