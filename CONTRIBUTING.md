# Contributing

Thanks for contributing! Please skim this before opening a PR — these
policies exist because we've been burned skipping them.

## Where does my contribution go?

| Type | What to do |
| --- | --- |
| 🐛 Bug or small fix | **Open a PR** with a failing test and the fix. |
| ✨ New feature / architectural change | **Open an issue first.** Get maintainer approval before implementing. |
| 🧹 Refactor-only | **Don't.** Only if a maintainer asked, as part of a concrete fix. |
| 📦 New dep or version bump | **PR with written justification.** See dependency policy below. |
| ❓ Question | **Open a discussion** or ask in the community channel. |

**Open PR cap: 10 per author.** Get existing ones merged before opening more.

## License baseline

The project-specific `BUSL-1.1` license is published in [LICENSE](LICENSE).

In plain terms, the repository currently allows internal production use, but
does not allow third parties to:

- offer the project as a hosted or managed service
- embed or bundle it into a paid product or service for third-party use
- commercialize the project or a derivative work for third-party use without a
  separate license from `try-works`

Contractors and service providers may help an organization with its own
internal deployment and operation of the software, but they may not turn the
project into a third-party commercial offering under the root license.

The project also requires a contributor license agreement so `try-works` can
relicense future versions of the repository without having to collect fresh
approval from every contributor later.

## CLA requirement

Every non-trivial contribution must be covered by the Contributor License
Agreement in [cla/CLA-v1.0.md](cla/CLA-v1.0.md).

The CLA is required because the project wants the ability to:

- relicense future versions of the repository
- offer commercial licenses
- dual-license or otherwise restructure licensing later without chasing every
  contributor for approval

Pull request submission alone is not acceptance of the CLA. Contributors must
take the explicit assent step requested by the repository's CLA Assistant Lite
workflow.

Contributions are accepted only from individuals acting in their personal
capacity. If an employer, client, company, or other entity has any rights in
the contribution, do not submit it here.

Published CLA version files are immutable. If the CLA changes in the future,
the repository will publish a new versioned file and require assent to that
new version.

## Guiding principles

- **Verification is the author's job, not the reviewer's.**
- **Supply chain is a real threat.** Dependency changes get human review, every time.
- **Strict TDD for production behavior.** RED test before implementation.
- **Build must pass.** All schemas, tests, and type checks must be green.

## Bug fixes

Every bug-fix PR must include:

1. **A reproduction** — minimal reproduction steps or a failing test.
2. **A test that fails before your fix and passes after** (unit, integration, or schema validation).

If you genuinely can't write a test, say so explicitly and explain how you verified.

## Real behavior proof — required on every external PR

We can't merge what we can't verify. Include a **`Real behavior proof`** section
in the PR body covering:

- **Setup you tested on** (OS, Node.js version, pnpm version, provider/model)
- **Exact commands you ran after the patch**
- **After-fix evidence** — terminal output, screenshots, or linked artifacts
- **What you did *not* test**

✅ Counts: terminal output, copied live output, screenshots, runtime logs.
❌ Does **not** count alone: unit tests, mocks, snapshots, lint, typechecks, green CI.
Have them too — but they prove the test passes, not that the feature works.

**PRs missing this may be autoclosed.**

## New features

Before writing code:

1. **Open a feature-request issue.**
2. **Get a 👍 from a core maintainer** before implementing.
3. **Include a short spec** covering:
   - **API surface** (public functions, config, CLI flags, schemas)
   - **Changes to existing behavior**
   - **User stories** — Given / When / Then, golden path + one edge case
   - **Failure modes**
   - **Security considerations**

Short and concrete beats long.

## Dependencies & supply chain

A human maintainer reviews every dep change. PRs that add or bump a package must justify:

- **Why this package** (vs. doing it ourselves / using existing deps)
- **Who maintains it** (activity, release cadence, security history)
- **Install surface** (transitive deps, native code, install/runtime network)
- **Why this version** — permitted reasons: **bug fix**, **security patch**,
  **required new functionality**. Cosmetic bumps will be closed.

## PR workflow

1. Fork, branch from `main`.
2. Install **Node.js >=24 <25** and **pnpm >=10**.
3. Run `corepack pnpm install --frozen-lockfile`.
4. One logical change per PR.
5. Add tests. Follow **strict TDD** for production behavior: RED → GREEN → commit.
6. Verify locally:
   ```powershell
   corepack pnpm run schemas:validate
   corepack pnpm --filter @role-model-router/core test
   corepack pnpm --filter @role-model-router/runtime-host-bridge build
   corepack pnpm --filter @role-model-router/runtime-ui build
   ```
7. Open the PR with a clear description + `Real behavior proof` + any spec/justification required.

**Title format** (conventional commits): `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`.

**Review:** CI green, one maintainer review, coverage held or improved.

## Coding standards

- [Biome](https://biomejs.dev/) for lint and format (configured in `biome.json`).
- TypeScript strict mode. Type hints on public functions.
- Cover new behavior and edge cases. Every requirement gets a test.
- `corepack pnpm` for all package management. Do not use `npm` or `yarn` directly.

## Architecture principles

**Additive, not destructive:** extend existing code rather than replacing it.
New features add layers on top of existing behavior.

**Schema-first:** protocol changes start with JSON Schema updates under
`/protocol/schemas/`. Schemas validate against fixtures before implementation.

**Safety boundaries:** the `pi-role-model` package does not start, stop, or own
the runtime process. It does not read or copy credentials. No hidden model calls
for classification or scoring.

**Performance:** profile before optimizing. Benchmark results inform routing
quality signals, never hard policy.

## Third-party material

Do not submit code, assets, or documentation copied from another project
unless its license permits that reuse and You clearly identify the source and
applicable license.
