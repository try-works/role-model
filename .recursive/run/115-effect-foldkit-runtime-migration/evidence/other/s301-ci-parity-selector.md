# S301 — CI selector for the parity harness (Lead-owned wiring)

## Landed now

- `package.json`: `runtime:parity-selfcheck` = `node --import tsx scripts/runtime-parity.mjs --selfcheck` (the CI selector for the real capture harness) and `runtime:parity-mutation` = `node scripts/runtime/parity-selfcheck.mjs --mutation` (the §6.4 mutation self-check). Both were exercised: no-CHROME_PATH run of the selector exits 2 with the typed `NOT_RUN` JSON (no-browser-available), including exe identity + tempRoot.

## Workflow step — decision recorded, edit deferred to a reviewed slice

The `.github/workflows/build-binaries.yml` step will mirror the existing R39 rendered-audit step shape exactly:

```yaml
- name: Parity selfcheck lane (R14)
  if: matrix.target == 'win32-x64'
  shell: pwsh
  continue-on-error: ${{ vars.R39_VERIFY_BLOCKING != 'true' }}
  run: |
    corepack pnpm --filter @role-model-router/runtime-ui run build   # React target prerequisite (NOT in CI today)
    node --import tsx scripts/runtime-parity.mjs --selfcheck
    if ($LASTEXITCODE -eq 2) {
      if ("${{ vars.R39_VERIFY_BLOCKING }}" -eq "true") { throw "R14 parity selfcheck did NOT RUN while blocking" }
      Write-Output "NOT RUN: no Chromium-family browser on this runner (set CHROME_PATH)"
      exit 0
    }
    if ($LASTEXITCODE -ne 0) { throw "R14 parity selfcheck failed (exit $LASTEXITCODE)" }
```

Prerequisites that must be resolved BEFORE that edit lands (named, not hidden):
1. The React build (`@role-model-router/runtime-ui`) is not part of any CI job today; adding it costs CI minutes and must be its own reviewed change.
2. The runner's E: temp-drive fail-fast (`DEFAULT_TEMP_DRIVE`) will FAIL on runners without E: — the CI step must pass a runner-appropriate `requiredTempDrive` (or the runner must accept an explicit override env) — a runner-parameter slice, not a predicate weakening.
3. The packaged exe served by the lane on CI must be the just-built candidate (the lane defaults to the worktree dist exe) — pass `--executable`/package-dir explicitly in the step.

Until that slice lands, the selector is the repo command + this decision record; CI continues to run the comparator unit tests only (advisory, as before).
