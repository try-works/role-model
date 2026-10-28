# S343c — independent review: S342c CI-prerequisite runner override

Reviewer: `s9-private-readonly`, actual model **deepseek-flash** (live). Read-only on product files; no source edit, no commit. I verified the hashes, diffed the dispatcher, ran the test file and anti-slop.

## Verified frozen artifacts

| File | sha256 | bytes |
| --- | --- | --- |
| `scripts/runtime/parity-selfcheck.mjs` | `4FA0C423FD8F2A07BFB7BFFE81AD38861C787510B10073337A7A72FD89264038` | 29113 |
| `scripts/runtime/parity-selfcheck.test.mjs` | `F4E0F8BB1E7E0645B3D0D529240C45B2134E0B12C9FB1B8FB8FA13682A8BA023` | 20443 |

Both match. `git diff scripts/runtime-parity.mjs` is empty and the file is clean: the dispatcher `--selfcheck` path is byte-unchanged.

## Findings

- **Override wiring:** `main` defaults `requiredTempDrive` to `process.env.PARITY_SELFCHECK_TEMP_DRIVE ?? DEFAULT_TEMP_DRIVE` (`:540`) and `enforceTempRoot` still rejects a temp root outside the selected drive (`:169-174`). The D:-override and Z:-unavailable tests pass; the default-E test is correct for a D: temp.
- **Fail-fast hole on empty env:** `PARITY_SELFCHECK_TEMP_DRIVE=""` is not `undefined`, so `requiredTempDrive` becomes the empty string. `enforceTempRoot` normalizes it to `""`, and every `root.startsWith("")` is true (`:170-172`), so the drive guard is disabled. The env can therefore weaken the fail-fast when set empty. Required: trim/fallback `process.env.PARITY_SELFCHECK_TEMP_DRIVE?.trim() || DEFAULT_TEMP_DRIVE` and add an empty-env rejection test.
- **Test file is not green in this workspace:** `node --test scripts/runtime/parity-selfcheck.test.mjs` exits 1. The S295 test at `test:282-299` passes an explicit `requiredTempDrive: "E:"` while `os.tmpdir()` is `D:\\DEV\\dsh-temp`, so `main` returns `temp-root: ... is not on the required drive E:` before the launch failure the test expects. This hardcoded E makes the suite non-hermetic and still fails a CI runner without E:, which defeats the S342c prerequisite. Required: derive the test drive from `os.tmpdir()` (or inject a tempRoot) for this test; keep the new default-E test explicit.
- **Lint:** `anti_slop_lint` reports no findings for either file. `DEFAULT_TEMP_DRIVE` remains `"E:"`; the dispatcher stays untouched.

## VERDICT: HOLD (2 repairs)

1. **Harden the env parsing** so an empty/blank `PARITY_SELFCHECK_TEMP_DRIVE` falls back to `E:` (fail-fast intact); add the empty-env test. The override must only re-select the required drive, never disable the guard.
2. **Make the test file hermetic:** fix `test:282-299` to use the actual temp root drive (or inject a controlled tempRoot) instead of hardcoding `requiredTempDrive: "E:"`; the current suite fails on a D:-temp runner and does not satisfy the CI prerequisite.

No product file was modified; no commit made.

## Final re-review after empty-env/hermetic-test fixes — PASS

Verified final hashes: parity-selfcheck.mjs 04782C502506C2EDFD3F12B270BB5A422488A7BBF4ADBB1896DC97B20C698814 (29382 B); parity-selfcheck.test.mjs 6081BFD4DD955F8416E47C44DB2C435FCA3900CDF7DB6082862477ECCC5C9D1C (21503 B). Dispatcher scripts/runtime-parity.mjs diff is empty and the file is clean.

- **Blank env cannot disable the guard:** resolveRequiredTempDrive trims and falls back to DEFAULT E: for "" and whitespace, preserves " z: " for the explicit rejection path, and the test asserts all three cases. The empty-env test also asserts main still fails on the default E: guard when the ambient temp is not E: (it is D: here). PASS.
- **Hermetic tests:** the S295 launch-failure test now derives requiredTempDrive from path.parse(os.tmpdir()).root; the S342c override test uses the ambient temp drive; the unavailable test chooses a different drive (Z:/Y:). I ran node --test on THIS D:-temp workspace: 31/31 pass, exit 0. The dispatcher remains byte-unchanged.
- **Lint:** anti_slop_lint reports zero findings in both files.
- **Behavior preserved:** explicit D:-override accepted with D: TMP; unavailable override fail-fast exit1/reason; no-env default E:; blank-env default E:. The env only re-selects the required drive.

No residual items.

## FINAL VERDICT: PASS

Both S343c HOLD items are closed: blank/whitespace env falls back to E:, the suite is hermetic on this D:-temp runner and passes 31/31, the dispatcher is untouched, and lint is clean. No remaining numbered items. No product file was modified; no commit made.

