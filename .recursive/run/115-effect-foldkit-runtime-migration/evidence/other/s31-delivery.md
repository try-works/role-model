# S31 delivery: dev fast-forward, run branch push, migration merged into dev

Owner direction: "you can push dev" then "yes you can push and merge".

## 1. dev brought to the release line (public)

- `git push origin origin/main:refs/heads/dev`: `f0d50fab` -> `945a8906` (fast-forward, dev had 0 own commits)
- remote bypass note: "Changes must be made through a pull request"; "3 of 8 required status checks are failing"
- result: `origin/dev` == `origin/main` == `945a8906`

## 2. private dev brought to its release line

- `git push origin origin/main:refs/heads/dev`: `16021cc5` -> `266ccf76` (fast-forward)
- result: private `origin/dev` == private `origin/main`

## 3. run branch pushed

- `recursive/115-effect-foldkit-runtime-migration` pushed (public), for review and sharing

## 4. migration merged into dev

A squash delivery was prepared on a clean branch cut from `origin/dev`:

- branch `feat/115-effect-foldkit-runtime-migration`, commit `9b0ca8bd`, 4908 files, +957291/-42280
- **run artifacts excluded**: the `.recursive/run/115-…` directory (1109 files) was removed from the commit deliberately, because the repository keeps run residue out of mainline history; the evidence stays in the run worktree and in the run branch
- composition of the branch diff before exclusion: 4770 vendor files, 1109 run artifacts, 138 product files
- pushed to `dev` as a fast-forward from `945a8906`
- remote bypass note: "Changes must be made through a pull request"; "8 of 8 required status checks are expected" (checks had not run at push time)
- result: `origin/dev` = `9b0ca8bd`, identical to the branch

## What this does and does not prove

- The delivered code is the tree that passed this run's suites locally (same product content as `fd2a5f55`, minus run artifacts).
- It has NOT been through CI on GitHub. The push bypassed the pull-request rule and the required checks had not run, so any CI failure on `9b0ca8bd` is unobserved here.
- `dev` is now ahead of `main` by the migration, which is the intended direction of a feature delivery; `main` still points at the released `0.0.20`.
