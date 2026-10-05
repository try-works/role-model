---
name: effect-v3-to-v4
description: Use this skill when migrating a codebase from Effect v3 to Effect v4, upgrading `effect` or any `@effect/*` package across the v3/v4 boundary.
disable-model-invocation: true
---

# Effect v3 to v4 Migration

Drive an Effect v3 → v4 migration from the generated migration reference that ships in the Effect repo. Every rename, removal, and signature change is answered by upstream data — do not guess replacements.

## Workflow

Work through these steps in order; each one is detailed in the section named.

1. **Set up and validate the local checkouts** — two shallow clones; verify any pre-existing `.repos/effect` before trusting it. See **Setup: Local Checkouts**.
2. **Read `MIGRATION.md`** and `ls .repos/effect/migration/` for the background and guide index. See **Reading Order**.
3. **Migrate `package.json`** — remove consolidated packages, align every remaining Effect package on one v4 version. Do this before type-checking, or the first run drowns in unresolved-import noise from packages that no longer exist. See **Repo-Level Changes**.
4. **Run the project's type-check** (e.g. `tsc --noEmit`) to get the initial error inventory.
5. **Iterate until the type-check is clean.** For each error, resolve the API through the lookup discipline — search `migration/v3-to-v4.md` for the symbol, escalate per **Reading Order** — then fix the call site, delegating per-file fixes to sub-agents per **Delegating to Sub-Agents**. Never silence an error instead of resolving it; see **Hard Prohibitions**.
6. **Finish** — type-check clean; run tests and report their outcome honestly (not a gate); write the final summary. See **Done Condition**.

## Setup: Local Checkouts

The migration is driven from two shallow, single-branch clones of the canonical Effect repo:

```sh
git clone --depth 1 --single-branch https://github.com/Effect-TS/effect .repos/effect
git clone --depth 1 --single-branch --branch v3 https://github.com/Effect-TS/effect .repos/effect-v3
```

- `.repos/effect` — v4 (`main`). Contains `MIGRATION.md`, the `migration/` guides, and the v4 source.
- `.repos/effect-v3` — v3 (`v3` branch). Escalation-only reference for old semantics.

Each clone is independently re-runnable and separately deletable. Do not use `git worktree` to share one clone between branches.

### Validate an existing checkout before trusting it

`./.repos/effect` may already exist, cloned from the archived `Effect-TS/effect-smol` repo by older setup instructions. That checkout is dead: it is stale and does not contain `migration/v3-to-v4.md`. Verify before using:

```sh
git -C .repos/effect remote get-url origin   # must be the canonical Effect-TS/effect repo
node -p "require('./.repos/effect/packages/effect/package.json').version"   # must be 4.x
```

If the origin points at `effect-smol`, or the version is not `4.x`, delete the directory and re-clone as above.

## Reading Order

1. **Front-load `MIGRATION.md` once** (`.repos/effect/MIGRATION.md`).
2. **`migration/v3-to-v4.md` — the first stop for every API.** The generated reference covers every removed or changed API. Search it (see below); never read it whole.
3. **A per-topic guide** (`.repos/effect/migration/*.md`) when the mapping implies a rewrite rather than a rename — e.g. `Context.Tag` → `Context.Service` is a structural change, not a symbol swap. Reach these on demand from the `MIGRATION.md` index, not front-loaded.
4. **v4 source** (`.repos/effect/packages/*/src/`, including `unstable/`) to confirm a replacement's real signature before writing code against it.
5. **v3 source** (`.repos/effect-v3`) as escalation only — for when unsure about the old v3 semantics.

## Never Read the Reference Doc Whole

**This is the single most important rule in this skill.** `migration/v3-to-v4.md` is ~16,000 lines / ~350k tokens. Reading it in one pass blows the context window and takes the migration with it.

Always search it and read only matched lines plus surrounding context. The file has four sections — **Import Map**, **No Counterpart Imports**, **Removed Modules**, and **API Reference** (one `` ### `<v3 module path>` `` heading per module). Entries are grep-able one-liners of the form `` - `Old.symbol` -> `New.symbol`: <rationale> ``, and removals are explicit `` -> `none` `` entries with a stated alternative.

Concrete recipes:

```sh
# Look up a specific v3 symbol
rg -n 'AnthropicTokenizer\.layer' .repos/effect/migration/v3-to-v4.md

# Read a whole module's section via its heading
rg -n -A 40 '^### `@effect/platform/FileSystem`' .repos/effect/migration/v3-to-v4.md

# Resolve a v3 import path in the Import Map
rg -n '^@effect/platform/FileSystem ' .repos/effect/migration/v3-to-v4.md

# List every module section for a package
rg -n '^### `@effect/cluster/' .repos/effect/migration/v3-to-v4.md
```

Look up APIs as you encounter them, one search at a time. A miss in the Import Map is not a dead end — check the **Removed Modules** and **No Counterpart Imports** sections before concluding anything.

## Repo-Level Changes

Faithful per-API lookup alone still yields a broken `package.json`. Handle these once, up front:

- **Package consolidation.** `@effect/platform`, `@effect/rpc`, `@effect/cluster`, and others merged into the core `effect` package — remove them from `package.json` and rewrite their imports per the Import Map. Packages that remain separate (`@effect/platform-*`, `@effect/sql-*`, `@effect/ai-*`, `@effect/opentelemetry`, `@effect/vitest`, …) stay as dependencies.
- **Version alignment.** All Effect ecosystem packages share one version number in v4. Every remaining `effect` / `@effect/*` dependency must be on the same matching version.
- **Unstable modules.** Some functionality only exists under `effect/unstable/*` import paths (e.g. `effect/unstable/http`, `effect/unstable/rpc`). These are correct v4 imports — use them where the reference maps to them; they may receive breaking changes in minor releases.

## Delegating to Sub-Agents

Per-file migration work is context-hungry; do it in sub-agents so the main session's context survives the whole migration.

- Spawn one sub-agent per file (or per module), giving it the specific v3 symbols to resolve in that file.
- The sub-agent returns the edit and the mappings it used; the main session keeps the error inventory and the running summary.
- Sub-agents inherit the same lookup discipline (**Reading Order**, the `rg` recipes) and **Hard Prohibitions**.
- The reference doc is never read whole in a sub-agent either — a blown sub-agent context still costs the migration that file.

## Hard Prohibitions

- **Never reintroduce a v3-shaped compatibility layer.** Writing a `v3-compat.ts` that re-exports old names makes type errors vanish and permanently freezes the codebase between versions. Migrate call sites to the v4 API.
- **No `any`, no `as` casts** to silence a post-migration type error. Such an error is usually evidence the replacement has a different shape; casting deletes that information. Go back to the reference or the v4 source.
- **No invented APIs.** Every replacement must trace to the reference doc, a topic guide, or the v4 source.

## Done Condition

**The project type-checks against v4.** A v4 migration is fundamentally a type-level exercise; unresolved imports and changed signatures surface there and nowhere else. Run the project's type-check (e.g. `tsc --noEmit`) until clean.

Running the test suite is recommended, and its outcome must be reported honestly — but it is **not** a gate. A repo mid-migration often has tests that cannot run for unrelated reasons; do not weaken tests to make them pass.

The final summary must state: the type-check result, the test result (or why tests were not run), every constructed replacement, and any gaps that were reported rather than bridged.
