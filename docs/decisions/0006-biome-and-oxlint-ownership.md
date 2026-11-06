# ADR 0006: Biome And Oxlint Ownership

## Decision

Keep Biome as this repository's formatter and baseline linter (`biome check .` / `biome format --write .`) and do
**not** replace it with oxlint in the agent quality-gates workstream (plan:
[agent-quality-gates-and-effect-foldkit-tooling.md](../plans/agent-quality-gates-and-effect-foldkit-tooling.md)).

Add oxlint plus `@effect/tsgo` as a second, semantic gate for Effect and Foldkit rules that Biome cannot host
(oxlint JS plugins), and add a repository typecheck gate. Consolidation of formatting onto oxfmt and removal of Biome
is deferred; revisit only under the triggers in section 12 of the plan.

## Consequences

- Two linters, one formatter: Biome owns formatting and the baseline lint; oxlint is additive and enforced only on a
  bounded, regression-ratcheted scope. `pnpm lint` stays the Biome gate and remains authoritative for formatting, so
  no whole-tree reformat lands with this workstream and every gate pull request keeps a small, reviewable diff.
- oxlint and `@effect/tsgo` are devDependencies and get human supply-chain review per `CONTRIBUTING.md`; neither
  adds a runtime dependency, a server dependency, or network access at test time.
- The effecttsgo rules report repo-wide in warn-only mode first; only the wave-1 rule and scope subset in
  `scripts/quality/oxlint-baseline.json` is enforced, and that baseline is append-only until it shrinks.
- If a gate cannot be wired after its timebox, the remaining phases land without it and the blocked gate is recorded
  with evidence rather than half-wired (plan sections 15-16).
- Deferred Biome migration triggers (plan section 12): the run115 Foldkit work is merged and no long-lived worktree is
  within 50 commits of the reformat base; oxlint reaches parity with the current Biome rule set, including the
  fourteen-file a11y override block and `noArrayIndexKey`; an `oxfmt --check` dry run shows no unexpected whitespace
  or line-ending surprises; and a second ADR records the migration plus its revert path.
- If the team later decides against consolidation, Biome is upgraded from 1.9.4 on its own pull request rather than as
  part of a lint swap.
