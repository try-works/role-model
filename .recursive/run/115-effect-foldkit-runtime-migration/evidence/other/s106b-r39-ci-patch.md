# S106b R39 CI wiring - the patch, written but NOT applied

Applying this requires a real CI run on a branch, and CI has never run on this branch. So the
patch is recorded verbatim, with its anchors, for a reviewed application rather than being
committed blind into a release workflow.

## Where it goes

`.github/workflows/build-binaries.yml`, job `build-runtime` (`runs-on: ${{ matrix.runner }}`).
Insert the first step **between** "Assert release package has no bundled secret material"
(ends at line 491) and "Archive standalone package (Unix)" (starts at line 493).

```yaml
      # R39: run the maintained client-journey verifier against the package this job just
      # produced. Advisory until the variable is set, so an unproven run cannot block a release.
      - name: Verify packaged client journeys (R39)
        if: matrix.target == 'win32-x64'
        shell: pwsh
        continue-on-error: ${{ vars.R39_VERIFY_BLOCKING != 'true' }}
        env:
          R39_HEALTH_TIMEOUT_MS: "120000"
        run: |
          $packageDir = "role-model-router/dist/release/${{ matrix.target }}"
          $stateRoot = Join-Path $env:RUNNER_TEMP "r39-state"
          if (Test-Path $stateRoot) { Remove-Item -Recurse -Force $stateRoot }
          node scripts/runtime/verify-client-journeys.mjs `
            --manifest "$packageDir/manifest.json" `
            --executable "$packageDir/role-model-dev.exe" `
            --repo-root "$packageDir" `
            --static-root "role-model-router/apps/runtime-ui-next/dist/client" `
            --port 5940 `
            --state-root $stateRoot `
            --fixture-root "testdata/router-runtime/fixtures"
          if ($LASTEXITCODE -eq 2 -and $env:GITHUB_ACTIONS -eq "true") {
            # One clean retry for an environmental NOT RUN (fresh port + state); an invalid
            # input exits 2 immediately because the retry would fail identically.
            Remove-Item -Recurse -Force $stateRoot -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 5
            node scripts/runtime/verify-client-journeys.mjs `
              --manifest "$packageDir/manifest.json" `
              --executable "$packageDir/role-model-dev.exe" `
              --repo-root "$packageDir" `
              --static-root "role-model-router/apps/runtime-ui-next/dist/client" `
              --port 5941 `
              --state-root $stateRoot `
              --fixture-root "testdata/router-runtime/fixtures"
          }
          if ($LASTEXITCODE -ne 0) { throw "R39 client journeys did not pass (exit $LASTEXITCODE)" }
```

Then, in the **production** channel only, immediately after "Verify complete production pair matches
the tested stage candidate" (line 425), add:

```yaml
      - name: Compare accepted stage package against the production candidate (R39)
        if: env.ROLE_MODEL_BUILD_CHANNEL == 'production'
        shell: pwsh
        continue-on-error: ${{ vars.R39_VERIFY_BLOCKING != 'true' }}
        run: |
          $stagePackage = Join-Path $env:RUNNER_TEMP "stage-package"
          node scripts/runtime/compare-release.mjs --left $stagePackage --right "" `
            --right-exe "role-model-router/dist/release/${{ matrix.target }}/role-model-dev.exe" `
            --right-port 5942 `
            --right-state (Join-Path $env:RUNNER_TEMP "r39-compare-state")
```

> The `--left` form above still needs the stage side started as a URL; the accepted-stage package
> is already extracted at `$RUNNER_TEMP/stage-package`, so the step must start it the same way
> `compare-release --right-exe` does. **This asymmetry is why the patch is not applied:** it needs
> a real run to settle the argument shapes, and guessing them in a release workflow is exactly the
> failure mode this run exists to avoid.

## Gating

- `vars.R39_VERIFY_BLOCKING` unset/false -> `continue-on-error: true`, so the step reports without
  blocking; set it to `true` to make a failure block `publish-stage-prerelease`/`publish-release`
  (both `needs: build-runtime`).
- Exit 1 and exit 2 both block when blocking is on: a typed NOT RUN is not evidence of parity.
- No permanent `continue-on-error`; the variable is the switch so flipping to blocking needs no
  further workflow edit.

## Why not applied

1. CI has never run on this branch; an unvalidated release-gate edit can break a release job.
2. The `compare-release` half needs its two argument shapes settled against a real extraction.
3. The repo convention requires promotion-path changes to be reviewed; a lead applying them
   blind would bypass that review.