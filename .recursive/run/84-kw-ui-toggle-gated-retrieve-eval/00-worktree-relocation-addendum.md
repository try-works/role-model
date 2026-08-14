# Addendum: Private worktree relocation (in-parent)

Run: `/.recursive/run/84-kw-ui-toggle-gated-retrieve-eval/`
Status: `ACTIVE` (does not reopen Phase 0 lock)
CapturedAt: `2026-07-26T06:55:00+08:00`
Inputs:
- Locked `00-worktree.md` (historical path `D:/DEV/.wt/84-kw`)
- User directive: worktrees must always live inside the parent repository

## Effective path (authoritative)

| Role | Path |
|---|---|
| Private controller (current) | `D:/DEV/role-model-internal/.worktrees/84-kw-ui-toggle-gated-retrieve-eval` |
| Public implementation (unchanged) | `D:/DEV/role-model/.worktrees/84-kw-ui-toggle-gated-retrieve-eval` |

## Relocation record

- Prior private path (Phase 0 creation): `D:/DEV/.wt/84-kw` — rejected as outside the parent repo.
- Relocated via filesystem move + `git` worktree `gitdir` repair after process locks blocked `git worktree move`.
- Old external path removed after sync.
- `git worktree list` now shows only the in-parent private path for branch `recursive/84-kw-ui-toggle-gated-retrieve-eval`.
- Re-ran `corepack pnpm install` in the relocated private worktree; `node --test tests/track-b/tb10.test.mjs` → PASS (35/35).

## Policy correction

- Private parent already gitignores `.worktrees/`; private worktrees use that directory (same convention as public).
- Do **not** place run worktrees under `D:/DEV/.wt/` (or any path outside the parent checkout) for this repository going forward.
- Historical mentions of `D:/DEV/.wt/84-kw` in locked Phase 0–5 artifacts and older evidence logs remain as creation-time / run-time receipts; **effective** private root for subsequent work is the in-parent path above.
- `evidence/binder.json` `privateWorktree` updated to the effective path.

## Diff basis

Unchanged: private baseline `7a85d560a30a49b33fe309d5a88f4fbbe86a14c0`, public baseline `f52f8e301f8e84b04f7103403207e4ebcf29271e`. Only the filesystem location of the private working tree moved.
