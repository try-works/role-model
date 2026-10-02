Run: `/.recursive/run/103-agent-strategy-and-scoring-strategy/`
Phase: `09 Closeout` (post-lock release addendum 01)
Status: `LOCKED`
LockedAt: `2026-09-30T23:52:48Z`
LockHash: `7a0646af8c63520354ad9a6fc8c1df59d6e439392186d9cd0e2700e2afb3bded`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/07-state-update.md` (LOCKED)
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/08-memory-impact.md` (LOCKED)
- operator instruction (2026-10-01): "close out this run and promote to stage and generate a stage rc",
  including "other agents have committed and pushed prs, some need review, so we can override that and merge"
Outputs:
- `/.recursive/DECISIONS.md`
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/addenda/09-closeout.post-lock-release.addendum-01.md`
Scope note: Records the delivery facts of the run after the phase chain closed: the merged pull requests,
the paired private promotion, the stage candidate and its verification on the stage channel. No product
file changes are part of this addendum.

## TODO

- [x] Merge the run's pull request and the operator-authorized peer pull requests into `dev`
- [x] Repair the two CI blockers the pull request exposed (BOM'd evidence JSON, vendored `effect` build)
- [x] Promote the paired private change to `role-model-internal/stage` and record the SHA
- [x] Merge public `dev -> stage` and publish the stage candidate
- [x] Install and verify the exact stage package on `:3457`
- [x] Complete the Coverage Gate checklist
- [x] Complete the Approval Gate checklist

## Delivery facts

| Step | Result |
| --- | --- |
| Public PR #291 (this run) | merged to `dev`, squash commit `de4089c2`; every check green except `cla`, which the operator authorized skipping |
| Peer PRs merged on the operator's instruction | #286 catalog refresh, #288 design document, #292 dsh-role-model alias persistence (all `--admin`, review requirement overridden) |
| Public `dev` after merges | `a35b676aa203f32bafa60dfd105f658157094abc` |
| Private PR #121 (`R7` latency-selection bounds) | merged to private `dev` `5df90b6d`, squash; registry now `min_samples` 5..30 and `max_delta_ms` default 10 000 with the effective-latency description |
| Private `dev -> stage` (#122) | merge commit, private `stage` = `96450a4030c6ef98ea6606c38547e39a184fe0f5` |
| `ROLE_MODEL_PAIRED_PRIVATE_SHA` | set to `96450a40...` before the public promotion |
| Public `dev -> stage` (#293) | merge commit `14fce6cffcd17d290d6e562d207fac7ebc6f26af`, all checks green |
| Stage candidate | prerelease `stage-rc-14fce6cffcd1` published by `build-binaries.yml` run 36792127577 (four platforms + `SHA256SUMS.txt`), win32-x64 zip sha256 `aac6d635af5b8f9f55fbe986e6d37a2ce1b4c6a4254852f932d64a587f257301` |

## CI repairs made during closeout

- `packages/schema-tools` requires every tracked recursive JSON evidence file to parse. Fifteen phase-5
  evidence files carried a UTF-8 BOM and four of them were zero-byte harness byproducts nothing cites;
  the eleven with content were re-encoded without the BOM and the four empty ones removed.
- The bridge `test`, `test:critical` and `test:router` scripts now build the vendored `effect` package
  first, so the lanes resolve it on a clean checkout exactly as the Phase 0 dependency-closure note
  requires. Verified locally with the gitignored `effect/dist` moved aside: `runtime:test-critical` and
  `runtime:test-router` both pass end to end from that state.

## Stage verification (`:3457`)

The exact candidate win32-x64 zip was downloaded from the prerelease, its checksum matched
`SHA256SUMS.txt`, and its executable matched the bundled `.sha256`
(`4e3ae715128b64e3019799738dba96263425b364a9b40641ae19e685300e965a`).

- Started on `:3457` beside the development runtime on `:3458` with the stage state root and channel flags;
  `healthz` reports `healthy` / `ready: true` with the session bootstrap complete.
- The run-103 readback is present (`agentStrategies`, `workloads`, `workloadExamples`,
  `postureDiagnostics`), and the shipped `embedding` example reports the repointed
  `knowledge.retrieval` capability, so the candidate carries the post-lock repairs.
- A downstream request through `baseline.remote-only` answered `200` (routed to
  `deepseek/deepseek-v4-pro`).
- Restart verified: the process was stopped and relaunched with the same flags; it returned to
  `ready: true`, the persisted posture readback was byte-identical
  (`{"strategy":"baseline","executionMode":"remote_only"}`) and the stored decision history survived
  (50 decisions before and after).
- The previous candidate (`rc-f0fbea1def1e-win32-x64`) remains on disk untouched as the rollback path.

Candidate acceptance (`accept-release-candidate`) is the operator's explicit act and has **not** been
run; the stage channel is running the candidate awaiting that decision.

## Why the run-scoped lint reports diff-audit failures on the merged tree

`lint-recursive-run.py` diffs the working tree against the run's recorded baseline
(`ca5c2126`, the `dev` commit the run branched from). On the run branch that diff was exactly run 103's
product surface and the lint was clean. On a branch cut from the merged `dev` the same diff also contains
every peer pull request that landed afterwards (#286 catalog refresh, #288 design document, #292
dsh-role-model and their evidence), so the locked phase records report those paths as unaccounted for.
That is the tool's diff basis behaving as designed, not drift in run 103's records: the locked phases were
verified clean against their own basis before the merge, `verify-locks` passes here, and the merged `dev`
CI (including `ci/circleci: full-contract`) is green. This addendum is the delivery record; the phase
documents are not rewritten to claim other runs' files.

## Coverage Gate

- [x] Every delivery step names its exact commit/tag and the check evidence behind it
- [x] The two CI repairs are reproduced from clean state locally and fixed with evidence
- [x] The stage candidate is verified from the published artifact, not from a local rebuild

Coverage: PASS

## Approval Gate

- [x] Operator authorized closing the run, overriding reviews to merge, promoting to stage, and generating
      the stage candidate (2026-10-01, this thread)

Approval: PASS
