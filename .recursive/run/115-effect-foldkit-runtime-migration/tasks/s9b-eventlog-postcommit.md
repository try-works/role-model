# S9b EventLog must not mask a post-COMMIT failure (private, R29)

Worktree: D:/DEV/role-model-internal/.worktrees/115-effect-foldkit-runtime-migration
Requirement R29; source analysis below is controller-verified read-only.

## Defect
`extensions/event-log/index.mjs`: append transaction commits at line 179, then the
post-commit conflict branch (180-188, throws at 187), readback (189) and
`#pruneAtWatermark` (190) all run with NO open transaction, yet the catch at 192 runs
`this.database.exec("ROLLBACK")` unconditionally. SQLite rejects ROLLBACK with
"cannot rollback - no transaction is active", so the original cause is replaced by a
rollback error and `throw error` is never reached.

## Required contract
1. A failure raised after COMMIT must surface its OWN message, never a rollback error.
2. Rollback must only be attempted while a transaction is actually open, and a failing
   rollback must not replace the original error.
3. The already-committed row must remain readable (do not delete it to "fix" the error).
4. Preserve all existing append semantics: idempotency pre-check, hash chain, watermark
   prune, degradation receipt reasons in `run()`.

## Files you may write
- `extensions/event-log/index.mjs`
- `tests/track-b/run115-event-log-postcommit-rollback.test.mjs` (new)
- `.recursive/run/115-effect-foldkit-runtime-migration/evidence/logs/s9b-*.log` and
  `evidence/other/s9b-tdd.json` in the PRIVATE repo run directory.

Nothing else: no other extension, no scripts/track-b, no package.json, no lockfile.

## Strict TDD
1. Write the test first. Proposed RED test: in-memory `new EventLog({channel:"development"})`;
   override the instance `log.retain = () => { throw new Error("prune injected"); }`;
   `log.append({channel:"development", type:"t", idempotencyKey:"k", metadata:{}})`;
   assert the thrown message matches `/prune injected/` and does NOT match
   `/no transaction is active/i`; then assert the row is readable exactly once.
   Confirm the test currently fails for the RIGHT reason and capture the log.
2. Then fix `index.mjs` minimally (guard the transaction state; nested rollback in try/catch).
3. GREEN: same test passes. Then run the existing event-log tests (find them with a glob;
   do not invent paths) and capture that log too.
4. Record a tdd json with red/green/existing log paths, exits, and final file sha256.

## Rules
- Do not install anything. If a dependency is missing, stop and report instead of installing.
- Do not run providers, servers or operator ports. In-memory/temp only.
- No commits, no subagents, no goals. Do not ask the user.
- Prefer read/edit/write tools.
Report: exact commands and exits, the RED message observed, the GREEN result, existing-suite counts, sha256 of both files, and anything unverified.
