# Git Push, Review, and Promotion Workflow

Type: `pattern`
Status: `CURRENT`
Scope: `Repository branch, pull-request, promotion, and hotfix workflow.`
Owns-Paths:
- `/AGENTS.md`
- `/CONTRIBUTING.md`
- `/.github/pull_request_template.md`
- `/docs/operations/02-ci-and-release-flow.md`
Watch-Paths:
- `/.github/workflows/ci.yml`
- `/.recursive/DECISIONS.md`
- `/.recursive/STATE.md`
Source-Runs:
- `78-dev-stage-main-cicd-runtime-channels`
Validated-At-Commit: `0db8a21efe943a902f7ae5a2004aff0fe2ceefea`
Last-Validated: `2026-07-19`
Tags: `git`, `workflow`, `pull-request`, `promotion`, `branch-protection`

## Normal work

1. Fetch `origin/dev` and create a short-lived feature, fix, dependency, or `recursive/*` branch from it.
2. Implement and validate in that branch; never develop directly on a long-lived branch.
3. Push the branch and open a PR to `dev`.
4. Require strict CI, CLA, conversation resolution, and maintainer review; ordinary work normally squash merges.
5. Let GitHub delete the merged short-lived branch.

## Promotions

- Promote only `dev -> stage`, then `stage -> main`, through reviewed PRs and merge commits.
- `stage` is the tested candidate boundary; `main` is production truth.
- Never merge locally and push a long-lived branch, force-push it, or bypass the promotion guard.
- The single-maintainer repository may need a brief, audited review-count maintenance window for an explicitly user-approved merge. Required checks and conversation gates stay active, and the review policy must be restored immediately.

## Hotfixes

- Branch `hotfix/*` from `main`, use a reviewed PR under the explicit guard exception, then forward the resulting change through `stage` and `dev` so branches converge.
- Do not use a hotfix name to bypass normal integration work.

## Agent entry point

- Root `/AGENTS.md` is unconditional guidance for every agent. Recursive-mode sessions additionally follow `/.codex/AGENTS.md` and `/.recursive/RECURSIVE.md`.
