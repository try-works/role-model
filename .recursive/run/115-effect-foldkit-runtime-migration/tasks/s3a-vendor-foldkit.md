# S3a vendor Foldkit source and prove the pin (public, R6)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
Requirement R6. Disk is available again (C about 986 MB, D about 1.9 GB).

## Goal
Add Foldkit to the existing vendoring tool the same way Effect is handled, so the client port has an auditable in-repo source drop rather than a floating dependency.

Target: repository https://github.com/foldkit/foldkit, tag `v0.169.0`, commit `7ee214268c602967937b80f6f20d1e831f2e8ab6`, MIT licence. Verify the tag resolves to exactly that commit with `git ls-remote` BEFORE trusting it; if it does not, stop and report the actual commit.

## Required work
1. Add a `foldkit` entry to `UPSTREAMS` in `scripts/vendor-upstream.mjs`: url, tag, commit, dir `vendor/foldkit`, licence, a payload that includes the packages source and the licence/readme, excludes for the usual noise, and a reason string in the same style as the existing entries. Do not change the Effect or effect-mq entries.
2. Set TMP and TEMP under E: for the run so the clone and archive stay off C:.
3. Sync with the exact tag and commit, then run `--verify` and record file count, byte count and content digest.
4. Add `scripts/foldkit-vendored.test.mjs` (node:test) asserting: the manifest tag, commit, licence and payload root; that the vendored `packages/*/package.json` version fields report 0.169.0; that the digest recomputation path the tool uses is stable; and that the vendored tree contains no `node_modules` or `.git`.
5. Do not add wrapper packages, do not touch package.json or the lockfile, do not wire anything into a build. This slice is source acquisition plus a pin proof only.

## Files you may write
- `scripts/vendor-upstream.mjs` (add the entry only)
- the new `scripts/foldkit-vendored.test.mjs`
- `vendor/foldkit/**` produced by the tool
- run evidence `evidence/logs/s3a-*` and `evidence/other/s3a-tdd.json`

Nothing else.

## Strict TDD
The pin test must exist and fail before the vendored tree exists (missing manifest or wrong version), then pass after the sync. Capture both logs. Byte acquisition itself uses the reviewed characterisation exception; the behavioural gate is the pin test.

## Rules
- No installs, no commits, no subagents, no providers, no operator ports.
- If the repository or tag does not exist under that name, report it instead of guessing an alternative.
Report: the verified remote commit, the manifest, file/byte counts and digest, test counts and exits, the exact file list you changed, and any licence or payload surprise you found.
