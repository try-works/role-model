# S19a private storage preservation verification (private repo, R28)

Private worktree: D:/DEV/role-model-internal/.worktrees/115-effect-foldkit-runtime-migration
R28 requires that the existing ArtifactStore / EventLog / capture WAL / retention authority is PRESERVED: immutable hash, generation, blob, key, scope, channel, privacy, hold and recovery semantics stay intact; EventLog remains bounded metadata rather than a complete raw inference journal; and no raw capture is duplicated into jobs.

## Read first
1. The private requirements run artifact for this run, and R28 in the public run's `00-requirements.md` (lines 254-260) for the exact wording.
2. The private modules: `extensions/event-log/index.mjs`, the capture WAL / durable queue modules under `shared/capture/`, and the retention authority code.
3. This run's accepted private slices (EventLog post-commit recovery, capture-queue close, drain/close join) so you do not re-litigate them.

## Required work
1. A preservation characterization: for each of ArtifactStore, EventLog, capture WAL and retention, list the invariant the requirement names, cite the code that implements it, and cite a test that would fail if it were broken. Where no such test exists, WRITE one (private tests are allowed) rather than asserting the invariant in prose.
2. Prove EventLog is bounded metadata, not a raw journal: show what it stores and that raw payloads are referenced, not duplicated. If the code does duplicate anything, report it as a finding instead of fixing it here.
3. Prove no raw capture is duplicated into jobs: cite or test the boundary.
4. State what this run changed in the private repo (the three accepted slices) and prove those changes did not alter the invariants above - ideally by showing the failing test you would get if they had.

## Files you may write
- new private test files under the existing private test layout, and the run's evidence directory for this run
- NO product changes: if you find a real violation, report it with the exact site and stop

## Rules
- Private repo only; do not touch the public worktree except to read requirements.
- No commits, no installs, no subagents. Do not start servers or bind ports. Keep temp files on `E:`.
Report: the invariant table with citations and tests, what you had to write, any violation found (with site), the private test counts and exits, and what remains unproven.