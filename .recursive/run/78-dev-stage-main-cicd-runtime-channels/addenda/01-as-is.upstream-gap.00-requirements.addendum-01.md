Run: `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/`
Phase: `01 AS-IS`
Status: `LOCKED`
LockedAt: `2026-07-18T23:41:10Z`
LockHash: `5765b0a93e01194b7686f71f10e84c9f97e850509561f4ffcf4b03fff8739570`
Inputs:
- `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/00-requirements.md`
- user clarification on 2026-07-19 that the simple docs site does not need the full repository CI/CD promotion topology
Outputs:
- `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/addenda/01-as-is.upstream-gap.00-requirements.addendum-01.md`
Scope note: This addendum narrows the locked docs-deployment requirement while preserving the runtime and repository promotion requirements.

## TODO

- [x] Record the upstream gap precisely
- [x] Add discovery evidence
- [x] State impact and compensation plan
- [x] Update current-phase planning accordingly
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Gap Statement

- `R4` over-scoped the simple docs site by requiring separate Cloudflare Pages projects and deployments for `dev`, `stage`, and `main`.
- The effective requirement is a single docs deployment from `main`, with relevant pull requests retaining build validation without deployment credentials.
- Repository promotion gates, runtime candidate builds, and the three isolated packaged-runtime channel profiles remain unchanged.

## Discovery Evidence

- The user stated: "the docs-site is simple, it may not need the full ci/cd like the rest of the repo".
- The existing docs workflow already separates pull-request builds from non-PR deployment, while Cloudflare currently has only the `role-model-dev` Pages project and the `role-model.dev` custom domain attached to it.
- Applying the original `R4` literally would create deployment infrastructure that the user has now identified as unnecessary.

## Impact

- Phase 1 audits the docs workflow as an intentionally smaller deployment surface rather than a three-channel deployment surface.
- Phase 2 will plan one production docs deployment from `main`, relevant PR build checks, least-privilege permissions, explicit deployment identity, visible credential skips, health checks, and rollback guidance.
- GitHub environments are reduced to those needed for runtime candidate/release authorization; separate docs `development` and `staging` environments are not required.
- Cloudflare Pages projects `role-model-stage` and a second dev/stage docs topology are not created by this run.

## Compensation Plan

- Add workflow contract tests proving docs deploys only from `main` and relevant pull requests only build.
- Keep the docs deployment job distinct from repository CI and runtime artifact workflows.
- Document the single-site deployment and rollback contract without coupling it to runtime-channel promotion.
- Record the existing `role-model-dev` project/custom-domain state before any Cloudflare mutation; do not move the custom domain without a validated production replacement.

## Traceability Impact

- `R4 | Status: superseded by approved addendum | Addendum: /.recursive/run/78-dev-stage-main-cicd-runtime-channels/addenda/01-as-is.upstream-gap.00-requirements.addendum-01.md`
- `R1`, `R2`, `R3`, and `R5` through `R9` remain in force.

## Coverage Gate

- [x] The docs-site exception is bounded to deployment topology
- [x] Pull-request docs build validation remains required
- [x] Main-only docs deployment and operational verification remain required
- [x] Runtime dev/stage/main isolation and promotion remain required

Coverage: PASS

## Approval Gate

- [x] The user supplied the scope correction during Phase 1
- [x] The correction reduces infrastructure scope and does not authorize unrelated changes
- [x] The locked Phase 0 artifact remains unmodified

Approval: PASS
