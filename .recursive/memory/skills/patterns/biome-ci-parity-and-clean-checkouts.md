Type: `pattern`
Status: `CURRENT`
Scope: `How to reproduce and fix Biome-based CI parity failures for this repo without being misled by nested worktrees or Windows-only line-ending noise.`
Owns-Paths:
Watch-Paths:
- `/.github/workflows/ci.yml`
- `/biome.json`
- `/package.json`
- `/packages/**`
- `/protocol/**`
- `/role-model-router/**`
- `/testdata/**`
- `/.recursive/run/**`
Source-Runs:
- `01-protocol-routing-obs`
Validated-At-Commit: `working-tree`
Last-Validated: `2026-04-12T21:46:55Z`
Tags:
- `skills`
- `biome`
- `ci`
- `formatter`
- `windows`

# Biome CI Parity And Clean Checkouts

Use this guidance when GitHub Actions fails in `pnpm run ci:check` because `biome check .` reports formatter drift that is hard to reproduce locally.

## Failure Signature

- GitHub Actions fails in the `CI parity` step
- The failed job log shows `Formatter would have printed the following content`
- Local repo-root `biome check .` on Windows reports more files than the Linux CI log, especially when recursive worktrees exist under `.worktrees/`

## Durable Repro Rules

- Treat the Linux GitHub Actions log as the authoritative failure list
- Reproduce formatter failures against the specific tracked files named in the failed CI log before widening scope
- If local repo-root checks are noisy, prefer one of:
  - a clean exported checkout of `HEAD`
  - tracked-file-targeted `biome check` or `biome format`
- Do not treat nested `.worktrees/` content as part of CI parity unless those files are actually tracked in the current checkout

## Repair Rules

- Format the exact tracked files reported by CI first
- If the Linux log keeps surfacing new formatter files in waves, run Biome across the tracked TypeScript and JSON set rather than continuing one file at a time
- Recheck the repaired file set with Biome before pushing
- Preserve existing repo validation flow after formatter repair; do not replace `ci:check` with an ad hoc shortcut

## Windows-Specific Caution

- After formatting on Windows, `git status` may show CRLF-only worktree churn beyond the real content diff
- Use `git diff --name-only` and the actual diff hunks, not status noise alone, to decide what belongs in the formatter fix commit
- After the CI fix is pushed, restore any remaining CRLF-only local noise so local `main` matches `origin/main`
