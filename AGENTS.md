# role-model agent instructions

These instructions apply to all work in this repository.

## Git and delivery workflow

- Start ordinary feature, fix, dependency, and `recursive/*` work from the current `origin/dev` tip.
- Commit work on a non-long-lived branch and open its pull request against `dev`.
- Ordinary pull requests into `dev` normally squash merge after required checks, one maintainer approval, and resolved conversations.
- Never push directly to `dev`, `stage`, or `main`. Never force-push or delete those branches.
- Promote with reviewed merge-commit pull requests in order: `dev -> stage`, then `stage -> main`.
- Do not target `stage` or `main` from an ordinary branch. The only production exception is a reviewed `hotfix/* -> main` pull request created from `main`; forward the merged hotfix to `stage` and `dev` afterward.
- Treat GitHub's `promotion-guard` and protected-branch checks as mandatory. Do not bypass, disable, or rename required checks merely to merge.
- Keep the docs site on its simpler main-only deployment path; do not create dev/stage docs deployments unless the repository policy is intentionally revised.

Before opening or merging a pull request, read `CONTRIBUTING.md` and `docs/operations/02-ci-and-release-flow.md`.

## Runtime channels

- Production: `role-model`, port `3456`.
- Stage: `role-model-stage`, port `3457`.
- Development: `role-model-dev`, port `3458`.

Keep channel state, logs, locks, process identity, and artifacts isolated. Use the lowercase project name `role-model` in current user-facing names.

## recursive-mode

When starting or resuming recursive-mode work, read `.codex/AGENTS.md` and the canonical `.recursive/RECURSIVE.md` before acting. Durable workflow memory lives under `.recursive/memory/`.
