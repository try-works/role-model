# S670 - remaining owner-gated items: exact unblock checklist

Every implementable run-115 clause is done and verified (see s661/s667/s669). The rows below are
genuinely external and blocked only on the following owner actions; each has its exact unblock.

## R15 (ordinary DSH/pi client lane)
Status: real DeepSeek + Kimi inference verified through the packaged runtime's OpenAI-compatible
surface (curl). Blocked on: the strict "ordinary DSH or pi CLI" client.
Unblock: (a) point me at a runnable dsh/pi CLI binary (path), plus the client config/base-url, and I
run it against :3480; OR (b) accept the OpenAI-compatible client (curl) as the ordinary client and
record R15 as verified-with-caveat.

## R17 J5/J6 (graph/payload join + private replay root)
Blocked on: the private repo (role-model-internal) capture->queue->projection graph + the replay root.
Unblock: provide the private worktree path / grant access, and confirm which replay root to use.

## R38 (approved fixed-workload budget matrix)
Draft thresholds in s662. Blocked on: approval.
Unblock: reply "approve s662" (or edit the thresholds), then I run the burst/degraded/rollback legs.

## R39 (CI verification blocking + one dispatch)
Blocked on: GitHub repo variable + dispatch authorization.
Unblock: set vars.R39_VERIFY_BLOCKING=true in the GitHub repo (or authorize me to via gh), then say
"dispatch" and I trigger one current-HEAD run.

## Packaged single exe (S664-S668 UI fixes baked in)
Blocked on: the paired private distribution (package-sea refuses without it).
Unblock: provide the private lockstep build inputs (as the earlier r5-lockstep-pub pattern) or accept
serving the worktree client as-is.

## Out of scope (owner-deferred, unchanged)
R34/R35 (E1/E2) — not implemented by owner instruction.

Answering any of these closes its row; answering all lets me finalize the ledger and mark the goal complete.
