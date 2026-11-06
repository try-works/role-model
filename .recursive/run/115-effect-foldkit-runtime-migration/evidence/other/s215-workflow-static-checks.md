# S215 The CI-only path now has a static check (and two findings)

The R39 steps run **only in CI**. A flag the script does not accept is therefore invisible locally, and
a `NOT RUN` guard that silently stops guarding is invisible too. `scripts/r39-workflow-flags.test.mjs`
reads the workflow, extracts every `--flag` passed to each runtime script, and requires the script to
accept it.

## Finding 1: CI runs the pieces, not the composite gate

`verify-packaged-candidate.mjs` is invoked **nowhere** in the workflow. CI runs
`compare-release`, `verify-client-journeys` and `audit-rendered-ui` separately. That is defensible -
the composite starts its own host and would contend for the same ports - but nothing recorded it, so
"the gate passes" and "CI passes" were two different claims. Both are now asserted explicitly:

    test: CI runs the individual R39 checks, not the local composite gate

## Finding 2: the blocking variable is PowerShell interpolation, not an env var

    if ("${{ vars.R39_VERIFY_BLOCKING }}" -eq "true") { throw "... did NOT RUN ..." }

So the **scripts themselves never see `R39_VERIFY_BLOCKING` in CI**. Their own skip-to-exit-0 path is
guarded only by the workflow wrapper. That is fine for the audits, which have the wrapper - but it
means the gate's `--require-rendered` behaviour is a local-only guarantee.

## The tests (6/6)

| Test | Guards |
|---|---|
| every workflow flag exists in the script | a flag added to a script cannot drift out of CI silently |
| R39 steps use distinct ports | the S198 port-collision class |
| advisory flag flips to blocking | three `continue-on-error` sites share one variable |
| both audits refuse to skip while blocking | two `did NOT RUN` guards |
| CI runs the pieces, not the composite | the documented difference |

## My error in this round

My first guard regex required `audit .* did NOT RUN`, which needs **two** spaces when `.*` is empty.
It matched the 390px message (which has `(390x844)` in between) and missed the 1440 one - a false
negative that I initially read as a real missing guard. Counted the messages before believing the
regex.