# S16b packaged artifact from a content-identical scratch snapshot (public, R33)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
The packaging gate requires a clean tree; this worktree has thousands of uncommitted run changes and the shared worktree must not be committed. The controller authorises ONE narrow procedure to get an honest artifact without touching the shared worktree or pushing anything.

## Authorised procedure (controller decision, to be flagged for owner review)
1. Create a SCRATCH repository under `E:/role-model-run115/s16-scratch` (not the shared worktree).
2. Copy this worktree's tracked+untracked content into it (excluding `node_modules`, `dist`, `.turbo`, any state root). Record the content tree hash of the source worktree with a temporary index (`git add -A` into a temp index, `git write-tree`) BEFORE copying, and the same for the scratch copy AFTER committing.
3. In the scratch copy only: `git init`, add everything, and make ONE local commit. NEVER push, never add a remote that could receive it, and state the synthetic commit SHA and its tree hash.
4. Prove the two tree hashes are IDENTICAL. If they differ, stop: the scratch copy is not the same content and nothing built from it may be called this tree's artifact.
5. Build the packaged artifact in the scratch copy with the repository's own command. Record wall time, exit, artifact path, size, sha256.
6. Start the artifact in an isolated state root under `E:/role-model-run115/` on a port that is NOT 3456/3457/3458, bounded readiness wait, capture the identity it reports, then stop it and prove the process exited.
7. Report the identity strings alongside BOTH tree hashes and the synthetic commit, so a reader can see exactly what content the artifact represents and that its commit is not a deliverable.

## Rules
- The shared worktree is read-only for this slice: do not commit, stash, reset or checkout anything in it.
- No push, no remote, no force operations, no touching operator state roots or operator ports.
- If any step cannot be done without leaving the shared worktree dirty in a new way, stop and report.

## Files you may write
- `evidence/logs/s16b-*` and `evidence/other/s16b-tdd.json`
- the scratch copy under `E:/role-model-run115/s16-scratch` (not a deliverable)

## Report
The two tree hashes and the proof they match, the synthetic commit, the build command/wall time/exit, the artifact size and sha256, the identity the artifact reports, how you proved start and clean exit, and every gap - including that this artifact represents content, not a reviewable commit.