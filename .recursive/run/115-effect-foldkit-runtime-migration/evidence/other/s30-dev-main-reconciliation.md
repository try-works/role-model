# S30 dev/main reconciliation (owner direction)

Owner direction in round 43: "our baseline needs to be 0.0.20 and dev cant be allowed to be behind main", followed by "you can push dev".

## Public role-model

- before: `origin/dev` = `f0d50fab083e3fe8daf2474cd9fb08b51066c8e1`, `origin/main` = `945a8906782a434e800a0ca2deb2e08ef1472e20` (`v0.0.20`)
- ancestry: `origin/dev` was an ancestor of `origin/main` with 0 own commits and 35 missing ones, so the reconciliation is a fast-forward, not a merge
- action: `git push origin origin/main:refs/heads/dev`
- after: `origin/dev` = `945a8906782a434e800a0ca2deb2e08ef1472e20`, identical to `origin/main`; behind 0, ahead 0

## Protections were bypassed - recorded, not hidden

The remote reported, verbatim:

```
remote: Bypassed rule violations for refs/heads/dev:
remote: - Changes must be made through a pull request.
remote: - 3 of 8 required status checks are failing.
```

The owner authorised the push. The bypassed rules are the pull-request requirement and three required status checks. Because the push only fast-forwarded `dev` to the already-released `main` commit, it introduced no code: whatever those checks report on `945a8906` is the state the released commit was already in, not a failure created by this push. The commit-status API at the time of the push reported two CircleCI statuses as pending (`ci/circleci: router-contract`, `ci/circleci: full-contract`); the three failing required checks are branch-protection check runs and were not enumerated by the remote output.

## Private role-model-internal

- `origin/dev` = `16021cc5f87f60f2d01338a29adf0002da5e8327`, `origin/main` = `266ccf76635ff3fead9d7c8dfd25a95239e21e58` (main 4 ahead, dev 0 ahead)
- NOT pushed in this slice: the owner authorised pushing `dev` for the public repository; the private repository has its own protection rules and release branches, so the same fast-forward is prepared but left for explicit direction.
