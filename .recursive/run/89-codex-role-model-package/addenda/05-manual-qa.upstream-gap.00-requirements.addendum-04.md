Run: `/.recursive/run/89-codex-role-model-package/`
Phase: `05 Manual QA`
Addendum: `05-manual-qa.upstream-gap.00-requirements.addendum-04`
Status: `LOCKED`
LockedAt: `2026-08-07T09:46:35Z`
LockHash: `7d42ec480ef46a3a5c4184b40df47cb702bfc64ff3ba60421e4e2b65ab5c8997`
Workflow version: `recursive-mode-audit-v2`
QA Execution Mode: `hybrid`
Inputs:
- `/.recursive/run/89-codex-role-model-package/00-requirements.md` (LOCKED) — `R1`, Fixed Decisions #16/#17, `OOS5`
- `/.recursive/run/89-codex-role-model-package/03-implementation-summary.md` (LOCKED) — package scaffold recorded with `"private": true`
- User direction (2026-08-07): make install easy for others — (1) npm publishable package, (2) Codex marketplace, (3) one-liner docs; Agent Plugins 1.0 packaging for future-proofing
- Live publish/verify (2026-08-07): npm registry + Codex CLI `0.147.0-alpha.1.2` marketplace materialization
Outputs:
- `/.recursive/run/89-codex-role-model-package/addenda/05-manual-qa.upstream-gap.00-requirements.addendum-04.md`
- Repo artifacts: `packages/codex-role-model/package.json` (`private` removed, `publishConfig.access: public`), `.agents/plugins/marketplace.json`, `.agents/plugins/marketplace.local.json`, `packages/codex-role-model/marketplace.npm.json`, `packages/codex-role-model/plugin.json`, `packages/codex-role-model/.codex-plugin/plugin.json`, README + `apps/docs-site/content/docs/integrations/codex.mdx`
Scope note: Phase 5 upstream-gap amendment that **supersedes locked `OOS5`** for the remainder of run 89: public npm publish of `@try-works/codex-role-model` is **in scope and completed**, and a **Codex plugin marketplace catalog** (npm-backed) is **authored and verified** for third-party install. GitHub one-liner install still waits on merging the catalog to a published git ref (e.g. `dev`).

## TODO

- [x] Authorize flipping `"private": true` / public npm publish (supersede `OOS5` / Fixed Decision #16 for this run)
- [x] Publish `@try-works/codex-role-model` to the public npm registry
- [x] Verify registry visibility (`npm view`, `npx … help`)
- [x] Author Agent Plugins 1.0 + Codex-native plugin manifests + skill
- [x] Author repo Codex marketplace catalog (npm plugin source) + personal/npm catalog template
- [x] Verify Codex marketplace → npm plugin install path end-to-end on Codex CLI
- [x] Document one-liner install paths (README + docs-site Codex integration page)
- [x] Record post-merge follow-up: land `.agents/plugins/marketplace.json` on published `dev` (not a Phase 5 lock blocker; operator accepted 2026-08-07)
- [x] Fold into Phase 5 receipt / human sign-off (operator sign-off 2026-08-07)

## Gap

Locked `00-requirements.md` Fixed Decision #16 and `OOS5` keep the package `"private": true` and mark public npm / marketplace publish **out of scope** for run 89 (doctor-green was definition-only).

Later product direction (2026-08-07): outsiders need a low-friction install path — npm package + Codex marketplace catalog + one-liner docs — without waiting for a follow-up run solely to flip publish gates.

## Amendment (authoritative for remaining Phase 5 / closeout work)

1. **`OOS5` is superseded for run 89.** Public npm publish of `@try-works/codex-role-model` and shipping a Codex marketplace catalog that installs that package are **in scope**.
2. **Fixed Decision #16** (private-only for this run) is **superseded** by this addendum. Doctor-green definition in Fixed Decision #17 remains useful as a quality bar but is no longer a hard gate blocking publish after successful live routing proof and package verification already performed in Phase 5.
3. **Locked Phase 0–3 history is not edited.** Downstream compensation: package/`private` flip, npm publish, marketplace files, and install docs live in the worktree and are recorded here.
4. **Adapter behavioral constraints from later Phase 5 work still apply** (protocol-only adapter; no phrase-matching narration detectors / coaching injections). Packaging does not change that boundary.
5. **Runtime ownership unchanged:** the npm package still does **not** install or own the role-model runtime process.

## Publication status (verified)

### npm package — SUCCESS

| Field | Value |
| --- | --- |
| Package | `@try-works/codex-role-model` |
| Latest | `0.1.1` (`dist-tags.latest`) |
| Also published | `0.1.0` (superseded by `0.1.1` on latest) |
| Registry | `https://registry.npmjs.org` |
| Access | public (`publishConfig.access: public`) |
| License | `BUSL-1.1` |
| Bin | `codex-role-model` → `bin/codex-role-model.js` |
| Created (registry) | `2026-08-07T09:18:42.878Z` |
| `0.1.1` published | `2026-08-07T09:22:46.902Z` |

Verification commands (2026-08-07):

```bash
npm view @try-works/codex-role-model version   # → 0.1.1
npx --yes @try-works/codex-role-model@latest help
```

Published tarball includes Codex plugin surface (non-exhaustive): `.codex-plugin/plugin.json`, `plugin.json` (Agent Plugins 1.0), `skills/role-model/**`, `marketplace.npm.json`, `dist/**`, `bin/**`.

Quick start for other machines (unchanged contract):

```bash
# role-model runtime already listening
npx --yes @try-works/codex-role-model@latest setup
npx --yes @try-works/codex-role-model@latest start
```

### Codex marketplace — SUCCESS (npm materialization); GitHub catalog PENDING merge

| Surface | Status |
| --- | --- |
| Repo catalog `.agents/plugins/marketplace.json` | Authored; **npm** source → `@try-works/codex-role-model@^0.1.1` |
| Personal catalog template `packages/codex-role-model/marketplace.npm.json` | Authored (same npm source); shipped in npm package |
| Local-checkout template `.agents/plugins/marketplace.local.json` | Authored for monorepo contributors (`source.local` → `./packages/codex-role-model`) |
| Codex CLI install of plugin from npm via marketplace | **Verified PASS** on Codex CLI `0.147.0-alpha.1.2` |
| `codex plugin marketplace add try-works/role-model --ref dev` | **Not yet** — catalog files are on run branch / worktree; not on `origin/dev` at time of this addendum |

Marketplace layout note (Codex CLI requirement): `codex plugin marketplace add <SOURCE>` expects a **repo-shaped** root containing `.agents/plugins/marketplace.json`. A directory that only has a bare `marketplace.json` at its root is rejected (`marketplace root does not contain a supported manifest`).

Verified install path (throwaway `CODEX_HOME`, 2026-08-07):

```text
marketplace root (repo-shaped)
  └─ .agents/plugins/marketplace.json   # npm source
codex plugin marketplace add <that-root>
codex plugin list --available --json
  → pluginId role-model@role-model, source.npm @try-works/codex-role-model@^0.1.1
codex plugin add role-model@role-model --json
  → version 0.1.1
  → installedPath …/plugins/cache/role-model/role-model/0.1.1
```

Recommended outsider commands **after** catalog lands on `dev`:

```bash
codex plugin marketplace add try-works/role-model --ref dev
codex plugin add role-model@role-model
npx --yes @try-works/codex-role-model@latest setup
npx --yes @try-works/codex-role-model@latest start
```

Until merge, outsiders can copy `marketplace.npm.json` into a personal repo-shaped marketplace:

```bash
mkdir -p ~/role-model-marketplace/.agents/plugins
# copy marketplace.npm.json → …/marketplace.json
codex plugin marketplace add ~/role-model-marketplace
codex plugin add role-model@role-model
```

Plugin vs adapter split (normative):

- **Marketplace / plugin install** → skill + Codex plugin metadata surface
- **`setup` / `start` CLI** → Responses adapter + user `$CODEX_HOME/config.toml` wiring

## Packaging artifacts (effective)

| Path | Role |
| --- | --- |
| `packages/codex-role-model/package.json` | Public npm package; bin; files include plugin manifests |
| `packages/codex-role-model/plugin.json` | Agent Plugins 1.0.0 portable contract |
| `packages/codex-role-model/.codex-plugin/plugin.json` | Codex-native plugin entry (`skills`, `interface`) |
| `packages/codex-role-model/skills/role-model/SKILL.md` | Installed skill |
| `.agents/plugins/marketplace.json` | Public Codex marketplace catalog (npm source) |
| `.agents/plugins/marketplace.local.json` | Optional local-path catalog for unpublished checkouts |
| `packages/codex-role-model/marketplace.npm.json` | Same npm catalog for personal marketplace roots |
| `packages/codex-role-model/README.md` | One-liner npm + marketplace install docs |
| `apps/docs-site/content/docs/integrations/codex.mdx` | Docs-site install guidance |

## Requirement Completion Status

- R-PUB1 supersede `OOS5` / private-only gate for run 89: **implemented** (this addendum + package.json)
- R-PUB2 public npm publish `@try-works/codex-role-model`: **verified** (`npm view` → `0.1.1`; tarball includes plugin files)
- R-PUB3 Codex marketplace catalog with npm plugin source: **implemented** (`.agents/plugins/marketplace.json`, `marketplace.npm.json`)
- R-PUB4 Codex marketplace → npm plugin materialization: **verified** (`codex plugin add role-model@role-model` → cache `0.1.1`)
- R-PUB5 one-liner install docs (npm + marketplace): **implemented** (README + docs-site); GitHub marketplace one-liner **pending** published `dev` ref
- R-PUB6 Agent Plugins 1.0 + Codex-native manifests in published package: **verified** (npm pack listing)

## Earlier Phase Reconciliation

- Locked `00-requirements.md` `OOS5` / Fixed Decision #16: **superseded by this addendum** for remaining run 89 work; do not treat private-only as binding after this file.
- Locked `03-implementation-summary.md` recording `"private": true`: historical; effective package state is public/`0.1.1` as of this addendum.
- No change to live routing proof ownership (`R11`) or tool-bridge addenda (`R12` / later Phase 5 amendments).

## Audit

- Audit Execution Mode: self-audit
- Subagent Capability Probe: not required for packaging/receipt documentation
- Delegation Decision Basis: controller recorded live registry + Codex CLI evidence directly
Audit: PASS

## Coverage Gate

Coverage: PASS

## Approval Gate

Approval: PASS
