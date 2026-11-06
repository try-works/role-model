# Agent quality gates for Effect and Foldkit code

**Status:** proposed
**Date:** 2026-11-04
**Revision:** 2 (2026-11-04) - corrected after the independent pre-implementation audit and the tooling research pass; see "Plan revisions and evidence" at the end.
**Target:** dev
**Method:** strict TDD (RED -> GREEN -> commit), one logical change per PR, Real behavior proof in every PR body
**Audited baseline:** origin/dev 9b0ca8bd (run115), local checkout 35bf639a (stale; see section 5)

## 1. Decision

Do **not** replace Biome with oxlint in this workstream.

1. Keep Biome as the formatter and baseline linter (**biome check .**, **biome format --write .**), unchanged.
2. Add **oxlint + @effect/tsgo** as a second, semantic gate for Effect/Foldkit rules that Biome cannot host.
3. Add a repository **typecheck** gate.
4. Wire **Foldkit** source and conventions into agent docs and MCP.
5. Add CI guards for **vendor pins** and **skill inventory**.

Toolchain consolidation (formatting to oxfmt, removing Biome) is deferred with explicit triggers in section 12.

Why:

- Biome is doing two jobs here (formatter + linter). **pnpm lint** is **biome check .** (lint + format check + import sorting); oxlint does not format. Replacing Biome is a formatter migration, not a lint swap.
- The run115 worktree is 592 commits ahead of origin/dev pre-squash, and the local checkout is 286 commits behind. A whole-tree reformat now is a guaranteed conflict source.
- oxlint's incremental value is additive: the effecttsgo rules and the Foldkit plugin rules are oxlint-native; Biome cannot run them.
- Suppression debt is low: 4 biome-ignore directives across 249 files in runtime-ui/app + packages/ui, so a later formatter migration stays cheap.

## 2. Goal

Close the feedback-loop gap between "an agent wrote Effect/Foldkit code" and "CI can prove it is sane":

- type errors fail a deterministic local command and CI job;
- a known Effect anti-pattern fails a lint gate, and the gate is regression-ratcheted;
- agents can find the pinned upstream source and the conventions to follow (Effect skill, Foldkit skill, MCP);
- vendor pins and skill inventory cannot drift silently.

## 3. Current state (audited 2026-11-04)

| Area | Current state | Evidence |
|---|---|---|
| Lint/format | lint = biome check . + Rust; format = biome format --write .; Biome 1.9.4; no oxlint, oxfmt, or @effect/tsgo. Baseline lint is NOT globally green on Windows at 9b0ca8bd (see section 16a) | package.json, biome.json, Phase 0 baseline probe |
| Typecheck | No root script, no CI job. Non-vendor typecheck scripts: only packages/dsh-role-model (tsc --noEmit -p tsconfig.json) and the turnstile-spin skill template. origin/dev turbo.json has a typecheck task (dependsOn ["^build"]) that nothing invokes | package.json, turbo.json |
| Package count | The four workspace globs match 54 package.json files (+ root = 55). pnpm-lock has 43 importers because dep-less workspace projects are omitted; that is consistent, not stale | git ls-tree / lockfile inspection |
| CI | quality job runs pnpm install --frozen-lockfile then pnpm run ci:quality (lint && schemas:validate). No typecheck, oxlint, tsgo, vendor verification, or skills check | .github/workflows/ci.yml |
| Workspace build policy | pnpm-workspace.yaml has literal placeholders ("set this to true or false") under allowBuilds. Pinned pnpm 10.6.5 has zero allowBuilds support (10.33 does). 10.6.5 DOES read settings from pnpm-workspace.yaml: its config loader reads workspaceManifest and calls getOptionsFromPnpmSettings(workspaceDir, workspaceManifest, rootProjectManifest) (pnpm.cjs ~line 17967), and an install with onlyBuiltDependencies in that file ran exactly the allowlisted postinstalls. Root package.json pnpm.onlyBuiltDependencies also works but is not the chosen location | pnpm dist + install log |
| Vendor pins | origin/dev: effect@4.0.6 (3b28bf6, 2,155 files), foldkit@0.169.0 (7ee2142, 2,020), effect-mq v0.7.0 (5fea694, 65), crease commit-only bb447e3 (1,512), each with VENDORED.json + digest. Three vendor pin tests already exist and pass 17/17 (scripts/vendor-upstream.test.mjs, foldkit-vendored.test.mjs, crease-vendored.test.mjs) but are NOT wired into test:release-workflows, so CI never runs them | vendor/*/VENDORED.json, scripts/*.test.mjs, package.json |
| Agent docs | Effect skill pinned with PROVENANCE.md, but its 36-line body contains 3 node_modules/effect references (absent at the repo root); no Foldkit skill; AGENTS.md/CLAUDE.md/.recursive/docs have zero Foldkit mentions; no root .mcp.json | .agents/skills/effect-ts/SKILL.md, git grep on origin/dev |
| Foldkit tooling available | Template at vendor/foldkit/packages/create-foldkit-app/templates/base/ ships .oxlintrc.effect.json (extends @effect/tsgo/oxlint-presets/correctness.json; 17 entries = 16 warn + 1 off), .oxlintrc.json (@foldkit/oxlint-plugin/recommended + sort-imports + consistent-type-assertions), .mcp.json (npx -y @foldkit/devtools-mcp), FOLDKIT.md (102 lines, repos/foldkit and example-app references), AGENTS.md; vendored payload excludes examples/** | vendor tree on origin/dev |
| Skill inventory | 34 dirs in .agents/skills, 30 entries in skills-lock.json; unlocked exactly: effect-ts, effect-v3-to-v4, swiss-design, ui-design-system. computedHash is not reproducible by hashing SKILL.md or the directory (CLI metadata participates) | skills-lock.json, audit hash-check |
| Test wiring | test:release-workflows explicitly lists 7 files; the three vendor pin tests are not in it | package.json |

## 4. Requirements

| ID | Requirement | Tests |
|---|---|---|
| R1 | pnpm-workspace.yaml build policy is valid and demonstrably effective under pinned pnpm: no placeholder values, onlyBuiltDependencies present, and install behavior matches the allowlist | T0.1, install-behavior oracle |
| R2 | CI fails when any vendored source drop drifts from its VENDORED.json digest; exactly one digest implementation exists and all vendor pin tests run in CI | T0.2, T0.3, T0.4, existing tests |
| R3 | A repository typecheck gate exists, runs in CI with a measurable package count, and covers a documented ratcheted package set | T1.1-T1.4 |
| R4 | oxlint with @effect/tsgo fails on a known Effect anti-pattern and passes a clean fixture; CI enforces a bounded rule+scope subset whose paths all exist | T2.1-T2.5 |
| R5 | A repo-local Foldkit skill exists, points at vendor/foldkit, and contains no dead repos/foldkit or example-app paths | T3.1 |
| R6 | Foldkit devtools MCP registration is committed, valid JSON, and exactly one registration location | T3.4 |
| R7 | AGENTS.md tells agents to read the Foldkit skill; the Effect skill body no longer points at nonexistent paths | T3.3, T3.5 |
| R8 | Every installed skill is tracked in skills-lock.json or in an explicit in-test allowlist with a reason; no hand-written computedHash | T3.2 |
| R9 | Every PR carries RED/GREEN evidence and a Real behavior proof section; one logical change per PR | review + PR body |
| R10 | Biome stays authoritative for formatting; no reformatting in these PRs; changed files are Biome-clean and the baseline error count does not increase | pnpm run lint diff, git diff review |

## 5. Constraints and policies

- Implement from a **clean worktree off origin/dev** (run115 at 9b0ca8bd or later). The audit worktree is .worktrees/agent-quality-gates-20261104 on branch proposal/agent-quality-gates-20261104. Do not build these PRs on the stale fix/role-model-channel-options checkout.
- Follow AGENTS.md and CONTRIBUTING.md: branch from dev, target dev, required checks, one maintainer review. Do not touch stage or main.
- Dependency additions (oxlint, @effect/tsgo, oxlint-tsgolint; later @foldkit/oxlint-plugin) get human supply-chain review per CONTRIBUTING.md section "Dependencies & supply chain".
- No edits to vendor/**. No source reformatting. No product behavior changes.
- Workspace build policy lives in pnpm-workspace.yaml (verified for pnpm 10.6.5). Do not duplicate it in package.json pnpm; one source of truth.
- CI assertions must be **indentation-bounded job slices**, not whole-file regexes; require a direct run: line, no continue-on-error, and no if: false.
- Tests must be deterministic, cross-platform (Windows local + ubuntu-latest CI), and must not require network at test time. Never spawn a bare node_modules/.bin shim on Windows: resolve the JS bin and run it with process.execPath (or use pnpm exec with an explicit shell policy).
- Unit tests must not spawn the linter. Fixture lint checks live in their own test file with their own command.
- Every behavior/config/doc change starts with a failing test (section 6). Tests for docs are structural: existence, path resolution, required links, lock parity.
- Line endings: *.md is eol=lf in .gitattributes. vendor/crease/** and vendor/foldkit/** also need eol=lf pins (added in Phase 0) so the digests are stable on Windows checkouts.

## 6. TDD protocol (mandatory)

1. **RED first.** Write the test that encodes the requirement, run it, and confirm it fails for the intended reason (missing file/script/step/behavior, not a typo).
2. **Capture RED.** Save the failing command and output for the PR body (Real behavior proof, "RED evidence"). CI cannot be red on merge, so RED evidence is a local log or PR excerpt, not a committed failing test.
3. **GREEN minimal.** Implement the smallest change that makes the test pass. No opportunistic refactors.
4. **REFACTOR** with tests green; rerun.
5. **Commit order:** test commit, then implementation commit (or one pair); reviewers must be able to see the test came first.
6. **Negative proof for every gate.** Seed the failure the gate is supposed to catch, show it fails with the expected file/rule/code, revert, show green again. For vendor verify use the tamper test, not a vendor/** mutation.
7. **No merge with:** red CI, missing Real behavior proof, formatter churn, or a new dependency without review notes.

## 7. Phase 0 - Truth and guards (PR 0)

**Goal:** make the workspace build policy honest, put drift guards under test, and consolidate the existing vendor digest logic instead of adding a third copy.

**Files**

- docs/plans/agent-quality-gates-and-effect-foldkit-tooling.md (this document, revision 2)
- docs/decisions/0006-biome-and-oxlint-ownership.md (ADR)
- pnpm-workspace.yaml (remove allowBuilds placeholders; keep onlyBuiltDependencies here; ignoredBuiltDependencies only with a justification)
- .gitattributes (vendor/crease and vendor/foldkit eol=lf pins)
- scripts/vendor-upstream.mjs (export the digest helpers; CLI behavior unchanged; main runs only when invoked directly)
- scripts/vendor-upstream.test.mjs, scripts/foldkit-vendored.test.mjs, scripts/crease-vendored.test.mjs (retarget to the exported helpers; keep existing pin assertions)
- scripts/vendor-verify.test.mjs (new tamper + stability test)
- scripts/agent-tooling.test.mjs (new workspace/CI contracts)
- package.json (verify:vendors script; add all vendor tests + the tooling tests to test:release-workflows)
- .github/workflows/ci.yml (verify:vendors step in the quality job, directly after ci:quality)

**RED - write first, run, capture**

T0.1 In scripts/agent-tooling.test.mjs:
  (a) read pnpm-workspace.yaml -> no "set this to true or false", no allowBuilds key;
  (b) read pnpm-workspace.yaml -> onlyBuiltDependencies is an array whose set equals @biomejs/biome, esbuild, sharp, workerd (order-insensitive, every value a string);
  (c) assert the four workspace globs are still present.
  Do not assert against package.json pnpm; the workspace file is the source of truth (verified: pnpm 10.6.5 config loader reads workspaceManifest).

T0.2 In scripts/agent-tooling.test.mjs: assert root package.json scripts contain verify:vendors, and that the command references every upstream name in scripts/vendor-upstream.mjs. Extract names from an anchored slice of the UPSTREAMS block (from "const UPSTREAMS = {" to the next top-level "}" or a marker), not the whole file.

T0.3 In scripts/agent-tooling.test.mjs: slice the quality job from "
  quality:
" to the next job header (indentation-bounded) and assert a direct "run: pnpm run verify:vendors" line exists after "run: pnpm run ci:quality" and has no continue-on-error.

T0.4 In scripts/vendor-verify.test.mjs: use the exported helpers directly on a temp dir. Write a.txt and nested/b.txt (LF); compute twice and assert stable; assert /^[0-9a-f]{64}$/ and fileCount === 2; verify true for matching digest; flip one byte -> verify false and digest changed with fileCount unchanged; add a file -> fileCount and digest change; always rmSync in finally. Optionally assert one real tree digest matches its VENDORED.json (read-only, ~10s on Windows).

Run:
~~~
node --test scripts/agent-tooling.test.mjs scripts/vendor-verify.test.mjs scripts/vendor-upstream.test.mjs scripts/foldkit-vendored.test.mjs scripts/crease-vendored.test.mjs
~~~
Expected RED: T0.1-T0.3 fail on the placeholder/script/step; T0.4 fails because the helpers are not exported yet; the three existing tests keep passing before and after the retarget.

**GREEN**

- Refactor scripts/vendor-upstream.mjs into exported pure helpers (one digest algorithm): computeVendorDigest(dir) -> { fileCount, byteCount, contentDigest } and verifyVendorDigest(dir, recorded) -> { ok, actual, recorded }. Keep the CLI output and exit codes byte-compatible. Guard main execution so importing the module has no side effects.
- Retarget scripts/vendor-upstream.test.mjs, foldkit-vendored.test.mjs and crease-vendored.test.mjs to import the helper; keep their recorded pin assertions (tag/commit/fileCount/digest). Do not keep a second or third digest implementation.
- Keep the workspace policy in pnpm-workspace.yaml with onlyBuiltDependencies (@biomejs/biome, esbuild, sharp, workerd). The audit's "move to package.json" recommendation is rejected: pnpm 10.6.5 reads workspace settings (pnpm.cjs ~17967 calls getOptionsFromPnpmSettings with workspaceManifest). Add ignoredBuiltDependencies only with a concrete justification; the Phase 0 implementation keeps it to silence the @google/genai/protobufjs install warning and records that reason.
- Add .gitattributes pins: vendor/crease/** text eol=lf, vendor/foldkit/** text eol=lf, plus binary exclusions for Foldkit images/fonts (.png/.webp/.woff2 -text).
- Add root verify:vendors covering every UPSTREAMS name (effect, effect-mq, crease, foldkit).
- Add the CI step in the quality job directly after "run: pnpm run ci:quality".
- Add docs/decisions/0006-biome-and-oxlint-ownership.md (decision: keep Biome for formatting/baseline lint; add oxlint + @effect/tsgo as additive semantic gate; defer consolidation; consequences).
- Add every vendor test plus the two new test files to test:release-workflows.

**Verification**

| Command | Expected |
|---|---|
| corepack pnpm install --frozen-lockfile | exit 0; postinstall lines for @biomejs/biome, esbuild, sharp, workerd; no placeholder warning |
| install-behavior oracle: temporarily remove one allowlisted name, reinstall | that package's postinstall is skipped/warned; restore; reinstall returns to the allowlisted behavior |
| corepack pnpm run verify:vendors | exit 0; four verify lines with digests |
| node --test (all five vendor/tooling test files) | all pass; existing three tests keep their pin assertions |
| node --test the full test:release-workflows list | pass |
| corepack pnpm run lint | Known pre-existing baseline failure on Windows (71 errors at 9b0ca8bd before the change; 66 on the Phase 0 branch). Acceptance: every changed/new file is Biome-clean, the error count does not increase, and no unrelated reformatting. Record the baseline probe and do not treat global lint as a Phase 0 gate; Linux CI remains the authority and any baseline red there is a separate cleanup issue |
| git status --porcelain | only intended files; no vendor diff |
| CI quality | green; verify step visible after ci:quality |

**Rollback:** revert the config/scripts/workflow changes; the placeholder block was inert, so install behavior returns to baseline.

## 8. Phase 1 - Typecheck gate (PR 1)

**Goal:** make type errors fail fast locally and in CI, with an honest coverage record.

**Spike (before RED, timeboxed):** run tsc -p tsconfig.json --noEmit per package on origin/dev; record pass/fail, command variants and wall time in the PR. Select **wave 1** = packages already clean. Do not change product code to make a package pass.

**Files**

- scripts/quality/typecheck-coverage.json (versioned dir -> command map; append-only is a review rule)
- package.json files in wave 1 (typecheck script; command may be tsc -p tsconfig.json --noEmit)
- root package.json (typecheck script)
- .github/workflows/ci.yml (new typecheck job with install/setup/timeout <= 20)
- scripts/agent-tooling.test.mjs (assertions)

**RED**

T1.1 root package.json has a typecheck script that invokes turbo run typecheck with the same workspace filters as build (assert on the meaningful tokens, not exact string equality).

T1.2 turbo.json has a typecheck task with dependsOn ["^build"].

T1.3 .github/workflows/ci.yml has a typecheck job block with checkout, pnpm 10.6.5, node 24, pnpm install --frozen-lockfile, run: pnpm run typecheck, timeout-minutes <= 20.

T1.4 scripts/quality/typecheck-coverage.json is non-empty and shaped as { version: 1, wave: 1, packages: [{ dir, command }] }; dirs are sorted and unique; every dir/package.json exists and its scripts.typecheck equals the recorded command. The test does not claim to detect removal; append-only is an explicit review rule documented in the file.

Run: node --test scripts/agent-tooling.test.mjs -> expected RED on all four.

**GREEN**

- Add typecheck scripts to wave-1 packages using their real tsconfig; do not force one string for all packages (packages/dsh-role-model already uses tsc --noEmit -p tsconfig.json).
- Add root typecheck script (types:generate then turbo run typecheck).
- Add the CI job block.
- Write the coverage map with wave 1.
- Record how many packages ran: turbo summary/--summarize or per-package output in CI; a silently missing script must show up as a lower count.

**Verification**

| Command | Expected |
|---|---|
| corepack pnpm run typecheck | exit 0; package count recorded |
| corepack pnpm exec turbo run typecheck --force --summarize | execution proven, count matches coverage map |
| node --test scripts/agent-tooling.test.mjs | pass |
| Negative: temporarily delete a wave-1 package's typecheck script | T1.4 fails naming that package; restore |
| Negative: seed a type error in a wave-1 src file | typecheck exits nonzero naming file/line; revert; clean |
| CI typecheck job | green; add to required checks (maintainer action) |

**Rollback:** revert scripts/job/coverage file; wave-1 packages lose only the new script.

## 9. Phase 2 - oxlint + @effect/tsgo (PR 2; dependency PR)

**Goal:** add a semantic Effect/Foldkit lint gate with the ecosystem's exact, compatible pins, without changing formatting.

**Preconditions:** dependency review complete; the pinned versions are validated together (section 14).

**Pins (from tooling research, exact, no ranges):**
- oxlint 1.90.0 (NOT 1.91.0: @effect/tsgo 0.64.1 supports 1.88.0/1.89.0/1.90.0 and rejects 1.91.0 at runtime)
- @effect/tsgo 0.64.1
- oxlint-tsgolint 7.0.2005 (required; the effect rules are type-aware)
- @foldkit/oxlint-plugin 0.15.3 (optional/deferred; 0.15.4 is an Effect 4.1 upgrade and incompatible with this Effect 4.0.6 repo)

**Corrections that shape the implementation (verified in research):**
- The effecttsgo rules are native: they are installed by patching oxlint's binding, d.ts and tsgolint, not registered as jsPlugins.
- --no-typescript is required: plain "effect-tsgo patch --oxlint" also selects the TypeScript integration, which needs TS >= 7 (repo has TS 5.9.3). Do not use @effect/tsgo's TypeScript integration for the typecheck gate.
- Prefer the wrapper: effect-tsgo oxlint --config .oxlintrc.effect.json --deny-warnings <scope>. The patch chain also works, but under pnpm it writes into node_modules/.pnpm hardlinks (the package README warns); use patch only as a documented fallback.
- Diagnostics render as effecttsgo(rule-name) with parentheses, not effecttsgo/rule-name; assertions must match the real format.

**Files**

- package.json (devDeps + lint:oxlint, lint:oxlint:report, optional lint:foldkit)
- pnpm-lock.yaml
- .oxlintrc.json (base: plugins typescript/import/oxc/unicorn; no formatting rules; ignores vendor/**, .worktrees/**, node_modules/**, dist/**)
- .oxlintrc.effect.json (extends @effect/tsgo/oxlint-presets/correctness.json; enables the template's 16 warn rules; unstable-api-usage stays off)
- scripts/oxlint-policy.test.mjs (new; fixtures only; separate command; no dependence on lint:oxlint)
- scripts/fixtures/oxlint/effect-antipattern.ts and effect-clean.ts
- .gitignore (scripts/quality/oxlint-report.json)
- biome.json **or** committed Biome-clean fixtures (decide one)
- scripts/quality/oxlint-baseline.json (versioned schema)
- scripts/quality/oxlint-baseline-check.mjs (CI comparison; node builtins only)
- .github/workflows/ci.yml (lint:oxlint step in quality)

**RED**

T2.1 In scripts/oxlint-policy.test.mjs: spawn the effect-tsgo wrapper (or the documented patch+oxlint fallback) on scripts/fixtures/oxlint/effect-antipattern.ts and assert nonzero plus a diagnostic containing "effecttsgo(" and the expected rule name (for example effecttsgo(try-catch-in-effect-gen)). Resolve the JS bin and run it with process.execPath; do not spawn a bare .bin shim on Windows.

T2.2 Same command on effect-clean.ts -> exit 0.

T2.3 Parse .oxlintrc.effect.json: it exists, includes @effect/tsgo/oxlint-presets/, the enabled set matches the baseline's enforced rules, and the base config contains no Biome-owned formatting rules (oxfmt, sort-imports, typescript/consistent-type-assertions, @foldkit/oxlint-plugin/recommended). Record the deliberate omission of the template's first "oxlint src" (Biome owns base lint).

T2.4 In scripts/agent-tooling.test.mjs: root scripts include lint:oxlint and lint:oxlint:report; the quality job slice has a direct run: pnpm run lint:oxlint line after ci:quality with no continue-on-error.

T2.5 In scripts/oxlint-policy.test.mjs: unit assertions on the committed baseline (no linter spawn): every enforced rule id appears in .oxlintrc.effect.json with severity warn or error; every enforced count is 0; every scope path exists; report-only counts are non-negative integers. The CI-only comparison script reruns the report and fails if any enforced count > 0 or any report-only count > baseline.

Run: node --test scripts/oxlint-policy.test.mjs scripts/agent-tooling.test.mjs -> RED (wrapper/config missing).

**GREEN**

- Install the exact pins in the same PR that updates the lockfile; record the dependency justification table (section 14) in the PR.
- Add configs. Base config must not duplicate Biome formatting/import rules. Effect config uses the template's rule severities; enforce with --deny-warnings only for the rule+scope subset in the committed baseline.
- Enforced scope wave 1: use only paths that exist, and assert each in the policy test:
  role-model-router/packages/effect/src, role-model-router/packages/effect/build.mjs, role-model-router/packages/effect/entries.mjs, role-model-router/packages/foldkit/build.mjs, role-model-router/packages/foldkit/entries.mjs, role-model-router/packages/foldkit/test, role-model-router/packages/foldkit-ui/build.mjs, role-model-router/packages/foldkit-ui/entries.mjs, role-model-router/apps/runtime-ui-next/src.
  Everything else is report-only until cleaned.
- Add .gitignore entry for scripts/quality/oxlint-report.json.
- Decide the fixture policy explicitly: either add scripts/fixtures/oxlint/** to biome.json files.ignore (and list biome.json in the phase) or keep the fixtures Biome-clean and prove it with biome check on the fixture directory. One of these, in the PR.
- Add lint:oxlint = effect-tsgo oxlint --config .oxlintrc.effect.json --deny-warnings <enforced scope> (or the verified patch fallback), and lint:oxlint:report = same config without --deny-warnings, writing JSON counts (verify the available formatter; if no JSON, use a deterministic text parse and record the exact command).
- Add scripts/quality/oxlint-baseline-check.mjs and wire it in CI next to lint:oxlint.
- Add the CI step in the quality job.
- Optional (team decision): commit .vscode settings/extensions for the @effect/tsgo language service; manual verification only.

**Verification**

| Command | Expected |
|---|---|
| node --test scripts/oxlint-policy.test.mjs | pass (fixture fails; clean passes) |
| corepack pnpm run lint:oxlint | exit 0 on the enforced rule+scope subset |
| corepack pnpm run lint:oxlint:report | JSON/report written; counts recorded |
| node scripts/quality/oxlint-baseline-check.mjs | exit 0; counts <= baseline |
| Negative: seed try/catch inside Effect.gen in an in-scope file | exit 1 with effecttsgo(try-catch-in-effect-gen); revert |
| Negative: set one enforced rule count above 0 in a scratch baseline | baseline check fails; restore |
| corepack pnpm run lint / biome check . | no new errors; changed files clean; no formatting changes |
| CI quality | green; steps recorded |

**Rollback:** remove configs/scripts/.gitignore/step and devDeps; restore lockfile; no product code touched.

## 10. Phase 3 - Foldkit agent wiring (PR 3)

**Goal:** make Foldkit source and conventions discoverable, and fix the Effect skill's dead pointers.

**Files**

- .agents/skills/foldkit/SKILL.md and PROVENANCE.md (new)
- .agents/skills/effect-ts/SKILL.md (edit the 3 node_modules lines), PROVENANCE.md (record the delta)
- AGENTS.md (Foldkit subsection)
- .mcp.json (one location; see section 18)
- skills-lock.json (only entries with CLI evidence) and/or the in-test allowlist
- scripts/agent-tooling.test.mjs (assertions)

**RED**

T3.1 .agents/skills/foldkit/SKILL.md exists; has YAML frontmatter with name foldkit; contains vendor/foldkit; does not contain repos/foldkit; every referenced vendor path exists (vendor/foldkit/packages/foldkit/src, vendor/foldkit/packages/typing-game/client/src, vendor/foldkit/packages/website/src); it states that examples/** is not vendored.

T3.2 For every directory containing SKILL.md, require either a skills-lock.json key or an entry in an in-test allowlist [{ name, reason }]; assert the allowlist equals the uncovered set, reasons are non-empty, names exist on disk, and lock entries have source/sourceType/computedHash matching /^[0-9a-f]{64}$/. Only add a lock entry with recorded CLI evidence (npx skills check/add output) or an independently reproducible algorithm; hand-written hashes are forbidden. foldkit is repo-local; swiss-design and ui-design-system have no provenance in-repo; effect-ts/effect-v3-to-v4 have PROVENANCE.md. Allowlisting the uncovered set with reasons is acceptable if CLI evidence is unavailable.

T3.3 AGENTS.md contains .agents/skills/foldkit/SKILL.md and vendor/foldkit.

T3.4 .mcp.json parses; exactly one mcpServers entry named foldkit-devtools; command === "npx"; args deep-equal ["-y", "@foldkit/devtools-mcp"].

T3.5 .agents/skills/effect-ts/SKILL.md contains zero node_modules/effect occurrences and contains the vendor/effect redirect.

Run: node --test scripts/agent-tooling.test.mjs -> RED on all five.

**GREEN**

- Write foldkit/SKILL.md as a **rewrite** for this repo, not a path substitution: adapt from the vendored FOLDKIT.md but drop repos/foldkit paths and the example apps that do not exist here (weather, kanban, auth). Point at vendor/foldkit source, the wrapper packages, and the vendored production apps (packages/typing-game/client/src, packages/website/src). Attribute the source (MIT) and keep it concise.
- Add PROVENANCE.md: upstream foldkit@0.169.0 commit 7ee2142..., source path packages/create-foldkit-app/templates/base/FOLDKIT.md, retrieval date, sha256 of the source, local-adaptation list (rewrite scope, vendor path, examples exclusion).
- Edit the Effect skill's 3 body lines from node_modules/effect to the vendor paths; keep the rest unchanged; record the 3-line delta in PROVENANCE.md.
- Add the AGENTS.md Foldkit subsection (read the skill; source at vendor/foldkit; wrappers; runtime-ui-next; do not import vendor/).
- Add .mcp.json with a note that it requires the Foldkit dev server running.
- Add lock entries only with CLI evidence; otherwise use the allowlist with reasons. Record the method in the PR.
- examples/** is excluded; do not reference it. Vendoring examples is a follow-up (section 12).

**Verification**

| Command | Expected |
|---|---|
| node --test scripts/agent-tooling.test.mjs | pass |
| JSON parse .mcp.json | valid; exactly one registration |
| path checks in T3.1 | all referenced dirs exist |
| corepack pnpm run lint | changed files clean; no new errors |
| Manual (not CI): with the dev server running, the MCP exposes tools | record output or "not tested" explicitly |

**Rollback:** delete the new skill/MCP files; revert AGENTS/effect-skill/lock edits.

## 11. PR plan and sequencing

| PR | Phase | Contents | Dependencies | Risk | Est. effort |
|---|---|---|---|---|---|
| PR 0 | Phase 0 | workspace build policy + vendor helper consolidation + CI guard + ADR | none | low-medium (vendor test retarget) | 1 day |
| PR 1 | Phase 1 | typecheck scripts + turbo wiring + CI job + coverage map | PR 0 | medium (inventory may be red) | 1-2 days |
| PR 2 | Phase 2 | oxlint + @effect/tsgo + oxlint-tsgolint + fixtures + CI | PR 0; dependency review | medium-high (version coupling) | 1-3 days |
| PR 3 | Phase 3 | Foldkit skill + MCP + AGENTS + effect-skill fix + lock/allowlist | PR 0 | low | 0.5-1 day |

Each PR: one logical change, RED/GREEN evidence, Real behavior proof, no formatter churn. PR 2 is the only dependency PR and must carry the section 14 justification in its body.

## 12. Deferred: Biome -> oxfmt consolidation

Do not do this now. Revisit only when all of the following are true:

1. The run115 Foldkit branch/worktree has merged to dev and no long-lived worktree is within 50 commits of the reformat base.
2. oxlint has reached parity for the repo's current Biome rule set, including the 14-file a11y override block and noArrayIndexKey.
3. A formatter dry-run (oxfmt --check) on the whole tree produces no whitespace/line-ending surprises beyond the expected reformat.
4. An ADR records the migration, with a revert path.

Sequence then: (a) oxfmt formatting-only commit; (b) Biome removal; (c) dependency cleanup. Separate PRs, separate release notes. If the team decides against consolidation, upgrade Biome (1.9.4 to the current line) as its own PR.

## 13. Verification matrix

| Req | Test | Command | Evidence |
|---|---|---|---|
| R1 | T0.1 + install oracle | node --test scripts/agent-tooling.test.mjs; corepack pnpm install --frozen-lockfile (and the remove-one-name negative) | test output; install postinstall lines |
| R2 | T0.2-T0.4 + existing tests | corepack pnpm run verify:vendors; node --test all vendor tests | digest lines; 17/17 existing pass; tamper test |
| R3 | T1.1-T1.4 | corepack pnpm run typecheck; turbo --force --summarize | clean + seeded-error outputs; package count |
| R4 | T2.1-T2.5 | node --test scripts/oxlint-policy.test.mjs; corepack pnpm run lint:oxlint; baseline check | fixture RED/GREEN; baseline JSON |
| R5 | T3.1 | node --test scripts/agent-tooling.test.mjs | pass + path list |
| R6 | T3.4 | node --test scripts/agent-tooling.test.mjs | parsed config deep-equal |
| R7 | T3.3, T3.5 | node --test scripts/agent-tooling.test.mjs | pass |
| R8 | T3.2 | node --test scripts/agent-tooling.test.mjs | pass; allowlist reasons |
| R9 | review | PR body Real behavior proof | PR links |
| R10 | review/CI | corepack pnpm run lint; git diff --stat | changed files clean; baseline count not increased |

CI required checks after all PRs: quality, build-test, typecheck, runtime-critical, runtime-router, rust, smoke (plus track-b-runtime as applicable).

## 14. Dependency justification (per CONTRIBUTING)

| Field | oxlint 1.90.0 | @effect/tsgo 0.64.1 | oxlint-tsgolint 7.0.2005 | @foldkit/oxlint-plugin 0.15.3 (deferred) |
|---|---|---|---|---|
| Why this package | Fast Rust linter; host for the native Effect diagnostics | Ships the Effect rule set and presets used by the Foldkit template | Required for the type-aware effect rules | Foldkit architecture rules; deferred until Phase 2 scope grows |
| Maintainers | oxc-project | Effect-TS (published 2026-11-02) | oxc-project / tsgolint line | Foldkit ecosystem |
| Install surface | Platform binaries; devDependency only | Native/binary + JS wrapper; devDependency only; copies into oxlint's binding only under patch | Type-aware engine binary; devDependency only | JS plugin for oxlint; devDependency only |
| Version rationale | Exact; the only supported line for @effect/tsgo 0.64.1 | Exact; current stable | Exact; required by the rules | 0.15.4 targets Effect 4.1, repo is 4.0.6 |
| License | verify (MIT expected) | MIT | verify (MIT expected) | verify |
| Rollback | remove devDep + scripts/step | remove devDep + configs/step | remove with tsgo | remove plugin/config |

Do not use @effect/tsgo's TypeScript integration for the typecheck gate: it requires TypeScript >= 7 and the repo is on 5.9.3.

## 15. Risks and mitigations

| Risk | Mitigation |
|---|---|
| effecttsgo rules flood existing code | Report-only repo-wide; enforce --deny-warnings only on the committed baseline rule+scope subset; reduce counts in later PRs |
| oxlint/tsgo version coupling | Pin the exact trio validated together (1.90.0/0.64.1/7.0.2005); verify the wrapper runs in CI before adopting rules; record Linux execution (not verified locally) |
| workspace settings location confusion | Keep pnpm-workspace.yaml as the single source; prove with install-behavior oracle; do not duplicate in package.json |
| Pre-existing lint baseline is red on Windows | Record baseline count; require changed files clean and no count increase; do not reformat unrelated files; Linux CI is the authority; separate cleanup issue if baseline is red there |
| Typecheck inventory reveals many pre-existing errors | Wave 1 = already-clean packages; product fixes are separate PRs; coverage map is append-only by review |
| Ratchet silently shrinks | Show package count in CI (turbo --summarize); review rule; verifier deletes one script to prove the test fails |
| Rebase conflicts with run115 | Implement from a clean origin/dev worktree; rebase each PR before opening |
| Windows vs Linux spawn differences | Resolve JS bins and run with process.execPath; CI Linux is canonical; document local commands |
| Skill hash convention unknown | No hand hashes; CLI evidence or explicit allowlist with reasons; lock entries validated by regex |
| MCP requires a running dev server | CI checks JSON validity only; manual verification labelled |
| Fixture files trip Biome | Decide and record: biome.json ignore for scripts/fixtures/oxlint/** or Biome-clean fixtures, proven by biome check |
| Dependency supply chain | Human review per CONTRIBUTING; exact pins; lockfile diff reviewed |

## 16. Abort and rollback criteria

- If @effect/tsgo cannot run in CI after two iterations, land Phase 0 + Phase 1 and mark Phase 2 blocked with captured evidence; do not add a half-wired lint gate. Fallback: oxlint core + @foldkit/oxlint-plugin (real jsPlugin) + typecheck; defer effect rules.
- If a wave-1 typecheck package cannot be made green without product changes, shrink wave 1; product changes are out of scope.
- If the workspace policy change causes unexpected install behavior, revert and document; keep the install oracle.
- Any PR that requires reformatting or product behavior change is rejected from this plan.

## 16a. Known pre-existing lint baseline

The pristine 9b0ca8bd worktree is NOT globally Biome-clean on Windows: the Phase 0 baseline probe recorded 71 biome errors (format plus rule findings) before any change; the Phase 0 branch has 66 (the refactored file and new tests are clean). The plan therefore does not require a global "pnpm run lint" green in Phase 0. Required instead: changed/new files are Biome-clean, the error count does not increase, no unrelated reformatting, and CI (Linux) is the authority. If Linux CI is also red on the baseline, that is a separate pre-existing issue and must not be fixed by reformatting inside this workstream.

## 17. Definition of done

- [ ] PR 0-PR 3 merged to dev, each with RED/GREEN evidence and Real behavior proof.
- [ ] corepack pnpm install --frozen-lockfile, pnpm run typecheck, pnpm run lint:oxlint, pnpm run verify:vendors all exit 0.
- [ ] corepack pnpm run lint: changed files clean, baseline error count not increased (global baseline red is recorded in section 16a).
- [ ] CI required checks include typecheck; quality runs vendor verify + oxlint baseline check.
- [ ] Existing vendor pin tests are in test:release-workflows and pass; exactly one digest implementation.
- [ ] .agents/skills/foldkit/SKILL.md + PROVENANCE.md exist; AGENTS.md links them; Effect skill has zero node_modules/effect references.
- [ ] skills-lock.json + allowlist explain every installed skill; no hand-written hashes.
- [ ] .mcp.json committed and valid with exactly one registration.
- [ ] ADR 0006 merged; deferred consolidation criteria recorded.
- [ ] No vendor/** diff and no source formatting diff in any PR of this plan.

## 18. Open questions

1. **MCP location:** root .mcp.json vs role-model-router/apps/runtime-ui-next/.mcp.json. Recommend app-scoped if the MCP only serves the Foldkit dev server, root if agents run from the repo root. Decide before Phase 3; the test accepts exactly one.
2. **oxlint enforcement scope:** the wave 1 listed in section 9, or narrower (packages/effect + runtime-ui-next only)?
3. **@foldkit/oxlint-plugin timing:** now at 0.15.3, or after the first green Effect-lint wave?
4. **Commit .vscode LSP settings?** Editors differ; if committed, keep minimal and documented.
5. **Who updates branch protection** to require the new typecheck job (maintainer action)?
6. **Vendor examples:** add vendor/foldkit/examples/** (or a curated subset) later? It is the Foldkit guide's "first stop"; currently excluded.

## 19. References and revision evidence

- Decision inputs: AGENTS.md section "Effect-first implementation rule"; CONTRIBUTING.md sections "Guiding principles", "Real behavior proof", "Dependencies & supply chain", "PR workflow".
- Current lint config: biome.json, package.json. CI: .github/workflows/ci.yml.
- Vendor tooling: scripts/vendor-upstream.mjs, scripts/vendor-upstream.test.mjs, scripts/foldkit-vendored.test.mjs, scripts/crease-vendored.test.mjs, vendor/*/VENDORED.json.
- Foldkit templates: vendor/foldkit/packages/create-foldkit-app/templates/base/{FOLDKIT.md,AGENTS.md,.oxlintrc.json,.oxlintrc.effect.json,.mcp.json,.oxfmtrc.json,package.json} on origin/dev.
- Effect tooling upstream: vendor/effect/packages/tools/oxc/ (@effect/oxc) on origin/dev.
- Skill provenance: .agents/skills/effect-ts/PROVENANCE.md, .agents/skills/effect-v3-to-v4/PROVENANCE.md.
- Local revision evidence (gitignored, not committed): .tmp/agent-quality-gates/verification/plan-audit.md (pre-implementation audit, task-7) and .tmp/agent-quality-gates/research/tooling-findings.md (registry/compat research, task-1).
- Revision 2 corrections:
  - Rejected audit B1: pnpm 10.6.5 reads onlyBuiltDependencies from pnpm-workspace.yaml; the package.json fallback is not needed (dist config loader + install oracle).
  - Applied audit B2-B9: real Phase 2 scope paths; edit the Effect skill's 3 lines; skill lock allowlist/no hand hashes; consolidate the existing vendor tests; CI quality-job slicing after ci:quality; .gitignore and Biome fixture decision; typecheck coverage map + honest ratchet; oxlint baseline schema + CI check.
  - Applied research corrections: exact pins (oxlint 1.90.0, @effect/tsgo 0.64.1, oxlint-tsgolint 7.0.2005, optional @foldkit/oxlint-plugin 0.15.3); native effecttsgo rules; --no-typescript; parenthesized diagnostics; prefer the wrapper over the patch chain; TS integration needs TS >= 7.
  - Applied fact corrections: 54 workspace manifests (+ root); CI wording; existing vendor tests; template chain/rules; 249 files; FOLDKIT.md rewrite, not substitution.
  - Added section 16a for the pre-existing lint baseline found during Phase 0.
