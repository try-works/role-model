# Effect Backend Migration And Foldkit Runtime UI Rearchitecture

Status: design. Not implemented. This document authorizes no source change on its own.

Baseline: `origin/dev` = `f0d50fab083e3fe8daf2474cd9fb08b51066c8e1` (2026-10-13). Every measurement below was
taken at that commit on 2026-10-24. Re-pin all measurements at the execution SHA; a stale line census is not
evidence (see the old proposal's §1.1, which was already stale when it landed).

Paired baseline verification (2026-10-24): both repositories were fetched, and their local origin/dev refs
matched GitHub's advertised tips. Public: `f0d50fab083e3fe8daf2474cd9fb08b51066c8e1`;
private: `16021cc5f87f60f2d01338a29adf0002da5e8327`. Separate clean worktrees were created
on `proposal/effect-foldkit-rebaseline-20261024`; neither contains this proposal edit. Both vendor Effect 4.0.1
with matching Effect/effect-mq payload digests. Git connectivity and vendor verification passed in both;
public release-workflow tests passed 57/57 and the private source-seal test passed 1/1. Dependencies and full
build/CI/SEA/browser compatibility were not verified in those worktrees. The original size census in §2 is
public-only; §15 adds targeted current public/private backend source analysis. Neither source inspection nor
the planning checks establish a fully migrated or validated executable pair.

Component-source revision (2026-10-24): evaluate Crease UI first, Foldcn selectively, under §4.5 and §5.5-§5.6.
This is a design update, not component installation or proof of compatibility with Effect 4.0.6.

Verification/execution revision (2026-10-24): real DSH or pi CLI requests must traverse the packaged router,
with correlated telemetry, frontend and graph/storage evidence (§6.7-§6.10). Compare to the owner-designated
main-release reference at `D:/role-model-router/0.0.20` as well as the clean dev baseline. Implementation uses
strict TDD (§5.8), with dependency-ordered DSH agent-team tasks and controller-owned integration/review (§14).
Only release layout/manifests, three principal artifact hashes and client documentation were inspected for this
revision; no client inference, runtime launch, restart, graph mutation or release-behaviour verification was
performed. Full artifact closure and served/process identity remain execution gates.

Supersedes, for the parts it covers, the owner archive under `proposals/effect-migration/` (outside this
repository):

- `effect-ts-v4-migration-proposal.md` (v3.0, SHA-256 `4fb20b3a...`)
- `RECONCILIATION-2026-10-03-effect-proposal-v3.md`

Those documents are historical rationale and owner-requirement inputs, not a second executable plan.
This proposal now owns both the backend Effect migration (§15-§17) and Foldkit client port. No old M3-M11
stage remains implicitly executable. §16 explicitly reconciles already-landed work, required conversions and
larger storage/live-durability commitments whose changed implementation must be re-designed and approved.
A historical owner commitment is not silently cancelled by that design gate; unresolved scope is recorded
rather than claimed implemented, optional, or covered by a UI migration.

Scope: the public routing/execution, process-supervision, SQLite/observation, telemetry/diagnostics,
HTTP/SSE, CLI/bootstrap and existing background-work owners; their paired private operations, capture,
artifact/graph, event/projection, replay/evaluation/learning and retention service boundaries; the common
vendored Effect family; and the Foldkit/UI component/client migration. Backend conversion is required work,
not merely an optional fix to make the UI run. Existing pure policies/codecs and already-correct Effect/queue
implementations are retained explicitly; a per-module ledger records conversion or justified retention.
Cloud deployment redesign, replacing every protocol/provider implementation, a competing durable runtime,
and importing unapproved storage schemas are not incidental consequences of using Effect. `apps/docs-site`
remains out of scope. §15-§17 define concrete backend slices, compatibility constraints and their team owners.

Related documents:

- `docs/architecture/06-router-runtime-architecture-lock.md`
- `docs/architecture/11-runtime-ui-telemetry-graph-matrix.md`
- `docs/architecture/15-effect-mq-queue-rebuild.md`
- `docs/operations/02-ci-and-release-flow.md`
- `docs/operations/04-runtime-testing-matrix.md`
- `CONTRIBUTING.md`

## 0. Decision summary

| # | Decision | Instruction | Consequence |
| --- | --- | --- | --- |
| D-E1 | Effect version | Move the vendored pin from `effect@4.0.1` to `effect@4.0.6`, the latest published release | The wrapper, the required-subpath manifest and G-API move together |
| D-E2 | Platform wrappers | Add platform-browser for Foldkit and platform-node plus its complete required closure for backend process supervision (§15 B2) | Separate Node/browser graphs, one Effect identity within each; no accidental native/server dependencies in client |
| D-F1 | Foldkit source | Vendor Foldkit at `foldkit@0.169.0`; do not depend on the npm package | The peer pins inside the vendored tree stop being our policy problem |
| D-F2 | Foldkit scope | Vendor `packages/foldkit`, `packages/ui`, `packages/oxlint-plugin-foldkit` | Framework, headless components, lint rules. Not the Vite plugin (§4.1) |
| D-U1 | UI framework | Port `runtime-ui` to Foldkit; React is deleted at cutover | The Effect-first rule now applies to the client too |
| D-U2 | Docs site | `apps/docs-site` stays on Fumadocs/React | React remains a workspace dependency indefinitely; accepted |
| D-U3 | Charts | Crease-derived SVG/ECharts is the preferred React-free candidate, gated by an early pilot (§5.6); exact per-chart selection remains D3 (§13) | Retain role-model data/axis/state contracts; no default React bridge or assumed pixel equality |
| D-U4 | Vite plugin | Deferred | No state-preserving HMR; plain Vite build |
| D-U5 | Component source | Evaluate selected Crease Tailwind components first; use Foldcn only for explicitly better-suited gaps | One role-model component layer, not two competing themes; provenance and compatibility gates before adoption |
| D-V1 | Real-client acceptance | At least one supported DSH or pi CLI journey through each packaged comparison target; both clients where a changed contract affects both | Mock parity, curl or a successful text response alone cannot close acceptance |
| D-V2 | Release reference | Treat the owner-designated v0.0.20 package as a preserved external behavioural reference, separate from clean dev | Classify release/dev deltas before blaming the port; candidate preserves unwaived shared behaviour |
| D-T1 | Test-first delivery | Strict RED-GREEN-REFACTOR per behaviour slice; permanent tests and independent test review | Tests-after and tool/setup failures do not count as behavioural RED |
| D-A1 | Team execution | Lead acts as controller, integrator and final reviewer; delegate bounded analysis, implementation, tests, live verification and independent review | Disjoint scopes, dependency gates, reproducible evidence and no self-approved implementation |
| D-B1 | Backend architecture | Required migration to Effect services, Layers, scopes, typed failures and owned concurrency across both repos, §15 B0-B10 | A dependency bump, Effect imports or UI-only port cannot close backend acceptance |
| D-B2 | Preserve authority | Keep deterministic scorer, current graph/store authorities, queue IDs and public/private protocol semantics | No new journal, durable-admission semantics or provider rewrite smuggled into framework conversion |
| D-B3 | Client/server boundary | Foldkit needs Effect in the browser, not an Effect server; this program deliberately migrates both | Stable HTTP/SSE contracts permit frontend/backend parallel work; no shared cross-process Layer or single giant runtime |
| D-B4 | Historical storage/durability scope | Reconcile existing implementations and outstanding owner commitments explicitly (§16) | Larger schema/job semantics require current approved design and reader/rollback proofs, not automatic deferral or stale-plan execution |

The backend and frontend are one coordinated program with independent build/runtime graphs. First Foldkit
pilots depend on client wrapper and stable wire contracts, not completion of the entire backend conversion.
Final program acceptance requires both branches, identified paired builds and real-client release parity.
§7/§17 define dependency edges so neither track silently substitutes for the other.

## 1. Why the superseded proposals cannot be executed

The v3.0 proposal was written against `effect@4.0.0-rc.117` at `701b8b8f`. Both of those premises are gone.

| v3.0 assumption | This tree at `f0d50fab` |
| --- | --- |
| Vendored Effect is `4.0.0-rc.117` | `effect@4.0.1`, commit `460272d3...`, dated 2026-10-04 (`vendor/effect/VENDORED.json`) |
| M1 moves the pin to `effect@4.0.0` (`67ba4e46...`) | Running that command today is a **downgrade**; the target is `effect@4.0.6` (`3b28bf68...`) |
| Platform-node wrapper needed for supervisor conversion | Still absent; implement complete Node closure in backend B2, while platform-browser serves the independent client graph |
| Old API reachability assumptions can be reused unchanged | Vendor tooling and workspace queue wrappers already exist; entries/build metadata and required platform/test/diagnostic exports must be re-audited against the new pin |
| "React remains Effect-free; new UI work is in scope" (§0.2) | Superseded by D-U1. This is the one owner decision the port overrides, and it is overridden explicitly, not inferred |
| Bridge 34,302 lines / 529 functions; CLI 10,633; Track-B 12,674 | Bridge 33,717; CLI 11,912; Track-B 12,802 |
| 328 tracked bridge tests | 382 |
| 102 distinct API literals | 119 lines carry an `/api/role-model/` literal; `runtime-api.ts` exports 143 functions and 134 types |
| M11 is the final UI/visual gate | Browser evidence begins at M4; acceptance is per slice and final packaged cutover is M12 |

The audit's own method - re-read the tree, never trust a stale census - is the method this document used. That
is also why it is one document: the old split (effect proposal, then a port plan) cannot survive a tree that
moves monthly.

## 2. Observed baseline

| Surface | Observed | How measured |
| --- | --- | --- |
| Vendored Effect | `effect@4.0.1`, `460272d30457f4697d8b8c52cad41caccbcace08`, 2026-10-04 | `vendor/effect/VENDORED.json` |
| Effect wrapper | `role-model-router/packages/effect`, version `4.0.1`, esbuild over the vendored source | `package.json`, `build.mjs` |
| Vendored effect-mq | `v0.7.0` | `vendor/effect-mq/VENDORED.json` |
| Workspace shape | 41 router packages, 7 router apps, 10 first-party packages, 1 docs app | directory listing |
| runtime-ui source | 93 `.ts` (31,387 LOC) + 102 `.tsx` (28,233 LOC); 51 route modules; 24 E2E specs | file counts at the pinned commit |
| runtime-ui hooks | 101 `useState`, 80 `useEffect`, 110 `useMemo`/`useCallback` | route and component files |
| API surface | `app/lib/runtime-api.ts`: 143 exported functions, 134 exported types, 119 `/api/role-model/` literal lines | source count |
| Bridge | `index.ts` 33,717 lines; `cli.ts` 11,912; `track-b-runtime.ts` 12,802; 382 test files | line counts |
| Browser harness | 24 Playwright specs / 2,455 lines; `playwright.config.ts` 52 lines; `validate-ui.ts` 868 lines | line counts |
| CI | 8 jobs in `ci.yml` (225 lines): promotion-guard, quality, build-test, runtime-critical, runtime-router, rust, smoke, track-b-runtime; plus `build-binaries`, `accept-release-candidate`, `cla`, `docs-site-deploy` | workflow files |
| Design kit | `@role-model/ui` (React), deps `clsx`, `recharts`, `tailwind-merge`; peers `react 19` | `package.json` |
| Charts | 4 Recharts importers: `telemetry-charts.tsx` (app), `chart.tsx`, `chart-ranking.tsx`, `chart-time-series.tsx` (kit) | import scan |
| Import hygiene | Zero `effect/unstable/*` imports in bridge or packages | grep |
| Toolchain | Node `>=24 <25`, pnpm `10.6.5` | root `package.json` |
| Docs site | Fumadocs template (`fuma-nama/fumadocs`), upstream-synced | `apps/docs-site/package.json` |

## 3. Effect 4.0.1 to 4.0.6

### 3.1 Pin

| Field | Value |
| --- | --- |
| npm | `effect@4.0.6`, `@effect/platform-browser@4.0.6` (published latest at 2026-10-22) |
| Git tag | `effect@4.0.6` |
| Commit | `3b28bf686bf26e9700edd39c025aff2744dc5303` (2026-10-22) |
| Wrapper version | `4.0.6` in `role-model-router/packages/effect/package.json` |

The delta is 4.0.1 to 4.0.6 - five patch releases. This is materially smaller than the rc.117-to-4.0.0 jump the
v3.0 proposal budgeted for, but it is not zero: treat it as an API event and classify the export/declaration diff
(in added / changed / removed / renamed-by-deprecation) before rewriting any import.

### 3.2 Sync, verify, build

```powershell
node scripts/vendor-upstream.mjs --name effect --sync --tag effect@4.0.6 --commit 3b28bf686bf26e9700edd39c025aff2744dc5303
node scripts/vendor-upstream.mjs --name effect --verify
corepack pnpm --filter effect build
```

`--sync` re-clones the tag, exports the payload from the object database with EOL conversion disabled, verifies
`rev-parse HEAD` against `--commit`, swaps the tree and rewrites `VENDORED.json` + `PROVENANCE.md` from the bytes
it just wrote. A failing digest after the swap means the sync is not finished.

### 3.3 Required-subpath manifest and G-API

The wrapper's published subpaths are discovered from the vendored family, but discovery is not a guarantee: a
wildcard map cannot create an entry that the upstream package does not export. So:

1. Enumerate every `effect/*` and `@effect/*` specifier the workspace actually imports (both source and tests).
2. Compile a type/import smoke per entry against 4.0.6.
3. Run an esbuild metafile check that exactly one Effect runtime module lands in each entry bundle.
4. Re-read the 4.0.1-to-4.0.6 export diff and record every consumer that had to change in the ledger.

The 2026-10-03 audit's finding still applies: "wildcard map and scan of three vendor roots do not create every
entry". G-API is not satisfied by a successful build.

### 3.4 Platform wrappers

| Package | Needed by | Status |
| --- | --- | --- |
| `@effect/platform-browser` | Foldkit peer; the ported client | New, this program |
| `@effect/platform-node` | Backend process supervision B2; Vite plugin remains excluded independently | Required backend wrapper, including tested SEA process/stream support |
| `@effect/platform-node-shared` | Actual transitive closure of selected platform-node imports | Bundle vendored source or provide an explicit reviewed wrapper; no unresolved external specifier |

Platform sources live in the vendored tree (`vendor/effect/packages/platform/browser`, `.../node`,
`.../node-shared`). Build explicit workspace wrappers with a complete dependency/declaration closure;
externalise the common Effect identity rather than bundling a private copy. Test actual required exports and
OS process semantics before adopting them. The existing Effect wrapper targets platform node/node24 and
selectively emits declarations (`packages/effect/build.mjs:54-100`); the browser must not simply reuse a
Node-only graph. Add browser-safe build/resolve conditions and test the selected closure without Node polyfills,
unresolved optional peers or registry Effect duplicates. Preserve the existing case-sensitive Schema/schema
entry repair and generated-chunk side-effect behavior. G-API covers target typechecking, not just esbuild or
the wrapper's current noCheck declaration emit.

### 3.5 Single-instance guard

Run 101 already established a "single-runtime-instance bundle guard" for the Node bundles (commit `adbb8079`).
Extend it, do not replace it:

- Node bundle: exactly one Effect runtime module.
- Browser bundle: exactly one Effect runtime module, resolved through the wrapper, not through a nested copy.
- Two bundles are expected. Sharing one graph across them is not a goal and would break the browser build.

## 4. Vendored Foldkit

### 4.1 What the upstream actually ships

`foldkit@0.169.0` is a monorepo. At commit `7ee214268c602967937b80f6f20d1e831f2e8ab6` (2026-10-20) it carries:

| Package | Name | Why in or out |
| --- | --- | --- |
| `packages/foldkit` | `foldkit` 0.169.0 | In. Model/Message/update/view, `route`, `scene`, `story`, `html`, `command`, `subscription`, `asyncData`, `managedResource`, `canvas`, devtools client |
| `packages/ui` | `@foldkit/ui` 0.169.0 | In. Headless accessible components (anchor, animation, button, calendar, checkbox, ...) |
| `packages/oxlint-plugin-foldkit` | `@foldkit/oxlint-plugin` 0.15.3 | In. `recommended.json` / `all.json` presets for our existing Oxlint layer |
| `packages/vite-plugin-foldkit` | `@foldkit/vite-plugin` 0.28.0 | Out. Peers `effect 4.0.0`, `foldkit >=0.167.0`, `vite ^8`; depends on `@effect/platform-node`, `@effect/platform-node-shared`, `ws` |
| `packages/devtools`, `devtools-mcp`, `markdown`, `node`, `create-foldkit-app`, `examples-e2e`, `typing-game`, `website` | - | Out. Not needed to build an SPA, or dev-only |

The framework's only runtime dependency is `parse5 ^8.0.1`. Its declared peers are exact: `effect 4.0.0` and
`@effect/platform-browser 4.0.0`.

**Why the Vite plugin is deferred.** It is a development-time convenience (state-preserving reload). It is not
needed to build or serve a Foldkit SPA, and its dependency graph drags `@effect/platform-node`, `platform-node-shared`
and `ws` toward a browser app. Reconsider only as its own reviewed change.

### 4.2 Vendor entry

`scripts/vendor-upstream.mjs` is a table: adding an upstream is one object. Two properties of the tool matter for
the entry:

- `--sync` runs `git archive` over `payload` and copies the result verbatim. `excludes` are recorded in
  `VENDORED.json` and `PROVENANCE.md` for the reader; they are not applied. The payload must enumerate exactly
  what we want.
- The content digest is computed over the tree excluding the two manifest files, so any local edit to a vendored
  file makes `--verify` fail loudly. That is the point.

Appendix A carries the entry verbatim.

### 4.3 Wrapper packages

| Wrapper | Name it publishes | Peers | Build |
| --- | --- | --- | --- |
| `role-model-router/packages/foldkit` | `foldkit` | `effect: workspace:*`, `@effect/platform-browser: workspace:*` | esbuild from `vendor/foldkit/packages/foldkit/src`, one entry per upstream export |
| `role-model-router/packages/foldkit-ui` | `@foldkit/ui` | `foldkit: workspace:*` | same shape |
| `role-model-router/packages/platform-browser` | `@effect/platform-browser` | `effect: workspace:*` | same shape as `packages/effect` |

Rules:

1. **Never edit `vendor/foldkit`.** The peer pins inside it are upstream's; our contract lives in the wrapper's
   `package.json`. Editing a vendored file breaks `--verify` and the verbatim claim in `PROVENANCE.md`.
2. **Externalise `effect` and `@effect/platform-browser`** in every wrapper build. `parse5` is bundled (MIT,
   single runtime dep) so the browser bundle does not need a bare-specifier resolver for it.
3. **Emit one entry per upstream subpath.** Read the vendored `package.json` `exports` at build time and map
   `./x` to `dist/x/public.js`. A missing entry is a build error, not a runtime surprise.
4. **Parity test the subpaths.** A generated test imports every published subpath in both a Node and a browser-like
   module resolution pass. `foldkit/html`, `foldkit/route`, `foldkit/scene`, `foldkit/story`, `foldkit/effect`-adjacent
   entries are the ones the port uses first.
5. **Licence and provenance.** Foldkit is MIT. Keep `LICENSE`, `THIRD-PARTY-NOTICES.md` and the generated
   `VENDORED.json` / `PROVENANCE.md`; follow `CONTRIBUTING.md` § "Third-party material".

### 4.4 Peer policy

Our wrapper declares `effect: workspace:*`, which resolves to `4.0.6`. Upstream's exact `4.0.0` peer inside the
vendored tree is never installed and never resolved, so it never has to be satisfied. This is the whole reason to
vendor rather than install.

If Foldkit 0.169.0 turns out not to compile against 4.0.6, the ordered responses are:

1. Pin a newer Foldkit tag (vendoring makes this a one-line pin change plus a full re-verify).
2. Add a first-party adapter module in our wrapper that covers the gap, in our code, not in `vendor/`.
3. Upstream the fix.

Hand-editing the vendored tree is not on the list.

### 4.5 Component registries: pinned candidates, not installed dependencies

Both candidates deliver source to own and adapt, rather than a React widget bundle. Sampled on 2026-10-24:

| Candidate | Reviewed immutable source pin | Verified scope | Declared compatibility, not our validation |
| --- | --- | --- | --- |
| [Crease UI](https://creaseui.com/docs/getting-started) | [`bb447e363e9c717bf11ebb10b2259f053bff6f71`](https://github.com/Potti1234/creaseui/commit/bb447e363e9c717bf11ebb10b2259f053bff6f71) | Source registry with Tailwind, StyleX and Pleat renderers; selected Tailwind components plus pure SVG and ECharts chart recipes are candidates | [Compatibility matrix](https://github.com/Potti1234/creaseui/blob/bb447e363e9c717bf11ebb10b2259f053bff6f71/compatibility.json): Effect/platform-browser rc.117, Foldkit/UI 0.164.x, Vite 8.x, Tailwind 4.x. Root dependency manifest corroborates the older pins |
| [Foldcn](https://foldcn.elianiva.com/docs/) | [`1fe1acc6a98dee9b8a040023ee88988098b42cab`](https://github.com/elianiva/foldcn/commit/1fe1acc6a98dee9b8a040023ee88988098b42cab) | 67 UI components; its [README](https://github.com/elianiva/foldcn/blob/1fe1acc6a98dee9b8a040023ee88988098b42cab/README.md) explicitly says chart is not yet ported | [Base registry manifest](https://github.com/elianiva/foldcn/blob/1fe1acc6a98dee9b8a040023ee88988098b42cab/packages/registry/registry/default/style/registry.json): Foldkit/UI ^0.169.0, Effect/platform-browser exactly 4.0.0, Tailwind v4 |

Crease advertises 124 components and 70 chart examples on its site. Those are discovery counts, not measured
coverage of role-model workflows. Foldcn's 74 registry items include utilities/base style/blocks, not 74 UI
widgets; its parity badges are author classifications, not an independent accessibility certification.

Neither candidate proves compatibility with our selected Effect 4.0.6 + vendored Foldkit/UI 0.169.0 pair.
Changing package metadata or bypassing peer checks is not evidence that the component API still works.
The [Crease package manifest](https://github.com/Potti1234/creaseui/blob/bb447e363e9c717bf11ebb10b2259f053bff6f71/package.json)
also contains showcase dependencies (maps, multiple styling systems, devtools) that must not become the
application's dependency list. Its Vite-plugin installation instructions do not supersede D-U4. Backend platform-node adoption in B2 is
independent of the decision to omit this development plugin.

Acquisition and ownership rules:

1. Preserve untouched, commit-pinned upstream source and the relevant tests/notices under a reviewed vendor
   payload (proposed `vendor/creaseui`; add `vendor/foldcn` only if a component is selected). Keep package metadata
   as evidence, not as a manifest to install. Record the upstream SHA, file paths, content hashes, selected
   transitive source closure, external packages/versions, local destination, maintainer and upgrade procedure.
2. Retain the [Crease MIT notice](https://github.com/Potti1234/creaseui/blob/bb447e363e9c717bf11ebb10b2259f053bff6f71/LICENSE)
   or [Foldcn MIT notice](https://github.com/elianiva/foldcn/blob/1fe1acc6a98dee9b8a040023ee88988098b42cab/LICENSE)
   with adapted copies. Audit transitive licenses separately, including ECharts' own license/NOTICE obligations;
   a registry's MIT license does not relicense its dependencies.
3. Put adapted source in the first-party role-model component layer, separate from the untouched snapshot.
   Record each adaptation and test it; vendor refreshes must not overwrite role-model fixes. Initial uptake may
   use the current sync/digest tooling only after its payload/export behaviour is verified for the chosen paths.
4. Do not run an unreviewed hosted `shadcn@latest add` or base-style install into the workspace. Both registries
   can write dependencies and global theme variables. Resolve source imports and any required helper files
   explicitly; all Effect/Foldkit imports must still resolve through the reviewed workspace graph.
5. Select the Tailwind renderer only. Do not adopt the showcase, StyleX, Pleat, map stack, CLI policy or complete
   repository lint presets by default. Introduce only the dependencies needed by selected components, with
   approved lockfile changes and no install hooks or runtime network dependency on either registry.
6. Before use, compile the selected closure and run its adapted state/scene/browser tests on the exact target
   versions. Record keyboard, focus, escape/dismissal, disabled, RTL and reduced-motion behaviour. Run the
   anti-slop lint tool on adapted application code; findings require fixes or explicitly reviewed handling.

The staged selection is Crease-first, not a promise to import all of Crease. A component ledger chooses one
implementation per role-model primitive. A Foldcn substitution requires a documented advantage and its own
compatibility evidence; fall back to direct @foldkit/ui composition if neither donor meets the contract.

## 5. Port design

### 5.1 Where the new app lives

Default (decision D1): a sibling app, `role-model-router/apps/runtime-ui-next`, built and served alongside the
React app, then renamed at cutover. This keeps `runtime:validate-ui`, the SEA packaging step and every script that
names `runtime-ui` working unchanged until M12.

What moves without a rewrite:

- `app/lib/*.ts` that is pure logic and already unit-tested (the majority of the 31k `.ts` lines).
- `app.css`, `rm3-tokens.css`, the Geist font assets, Tailwind v4 configuration.
- `cn()` (clsx + tailwind-merge) and every class string.

What is rewritten: 102 `.tsx` files (28,233 lines) minus the 25 `.tsx` test files.

### 5.2 Runtime entry and routing

- `index.html` + `src/entry.ts` (`Runtime.makeApplication` / `Runtime.run`), pure definitions in `src/main.ts`
  and per-domain modules. The existing theme-bootstrap script is plain DOM and survives as-is.
- `app/routes.ts` (97 lines, 51 route modules, 20 legacy redirects) becomes `foldkit/route`: typed parsing and
  building. Legacy paths parse to a redirect Command; they do not stay as route aliases.
- `Document.title` comes from `view`; there is no `Links`/`Meta`/`ScrollRestoration` equivalent to port.

### 5.3 Per-route submodel

Each route is a Submodel with its own `Model` (Schema.Struct), `Message` (`defineMessageUnion`), `update`
(`Message.match`, including the return type that carries commands), `view(model, h)`, Commands and
Subscriptions. The parent routes to the child and keeps cross-route facts (theme, auth/device state, refresh
tick) in the parent Model.

Illustrative shape, using `dashboard` as it stands today (6 filter `useState`, `loading`/`refreshing`/`staleCharts`,
a `disposed` flag, a five-way `Promise.all` with per-call `.catch`):

```ts
const Model = Schema.Struct({
  timeRange: TimeRange,
  filters: Filters,
  snapshot: AsyncData<Snapshot>,
  candidates: Schema.Array(RouterCandidate),
  models: Schema.Array(RuntimeModelRecord),
  requests: Schema.Array(TelemetryRequest),
  charts: Schema.Array(ChartState),
  staleCharts: Schema.Array(StaleChartDiagnostic),
})

const Message = defineMessageUnion({
  SelectedRange: { range: TimeRange },
  ChangedFilter: { key: FilterKey, value: FilterValue },
  Loaded: {},
  SucceededSnapshot: { value: Snapshot },
  SucceededChart: { id: ChartId, value: ChartSeries },
  FailedChart: { id: ChartId, reason: FailureReason },
})
```

`update` returns the next Model plus Commands. `disposed` disappears: it exists to express "this response is from
a request nobody wants any more", which is a Command identity and interruption question, not component state.

Exact Command/Subscription constructor signatures are pilot-verified at M5, not asserted here.

### 5.4 Data layer

| Today | Foldkit |
| --- | --- |
| 143 exported fetch functions in `runtime-api.ts` | Commands, grouped by route wave; each wraps the existing function so request bytes stay identical |
| `.catch(() => [])` fallbacks inside a fan-out | The same fallbacks inside the Command's Effect, so a behavior diff is not introduced |
| `RuntimeEventSourceFactory` (injectable SSE) | `Subscription.make`, with the factory still injectable as a service, so `runtime-api.test.ts` keeps its fakes |
| `runtime-refresh-bus.ts`, `live-refresh.ts` | A `Refresh` Message and one Subscription; the "switched away while refreshing" case becomes one `update` branch |
| `stale-refresh-diagnostics.ts` | A field on the route Model, written by the failure Messages |
| Theme bootstrap + `theme.ts` | Unchanged DOM bootstrap; theme facts in the root Model |

Parity constraint: the port must make the **same requests** as React, on the same endpoints, in the same
loading/error states. The harness (§6) compares method/path/query/body, relevant redacted headers, multiplicity
and response/stream semantics. Ignore ordering only for independent concurrent reads; preserve causal writes
and tool/turn ordering. A screen that fetches twice or changes a request body fails.

### 5.5 Design system

`@role-model/ui` (39 files, React) becomes a Foldkit view-function library: `(h, props) => Html` instead of
JSX. Keep one stable role-model-facing API and one owner per primitive. Behind that API, evaluate selected
Crease Tailwind source first; consider Foldcn for individual gaps, with @foldkit/ui as the common headless
foundation. Do not scatter imports from two competing component systems throughout route code.

| Existing surface | Candidate reuse | Acceptance constraint |
| --- | --- | --- |
| Buttons, badges, cards, input shells, tables | Crease Tailwind helpers; Foldcn alternative if better suited | Preserve variants, DOM semantics, accessible names and RM3 geometry |
| Select/typeahead, checkbox, modal/device authorization, themed select | Selected stateful donor modules backed by @foldkit/ui | Explicit Message/Submodel wiring, correct focus/keyboard/dismissal and async state; not a styling-only swap |
| Shell/sidebar, filters, telemetry state panels | Reuse selected structure/behaviour inside role-model wrappers | Existing routing, status meanings and responsive layouts remain authoritative |
| Charts | Crease SVG/ECharts candidates (§5.6) | Preserve data contracts and separately approve renderer differences |

The visual system remains role-model's: `rm3-tokens.css`, Geist assets, spacing, typography, colour semantics
and light/dark behaviour. Map donor tokens such as `--background`, `--foreground`, `--chart-1..5` and sidebar
variables to our existing semantic tokens in a reviewed compatibility layer; do not replace our stylesheet with
a registry's default theme. Preserve `cn()` semantics or review any replacement. Selected source may need class
adaptations to retain existing visuals; copy-paste adoption is not permission to redesign during the port.

Foldcn's [documented gaps](https://github.com/elianiva/foldcn/blob/1fe1acc6a98dee9b8a040023ee88988098b42cab/packages/web/src/catalog/gaps.ts)
include menubar cross-menu keyboard traversal, context-menu pointer anchoring, questionnaire focus/navigation,
and scroll-area RTL/wheel behaviour. Audit the relevant gap for every selected stateful component; do not
inherit a disclosed regression because an upstream page labels it parity. Crease's component catalogue likewise
is not independent proof of accessibility. Keyboard/focus/RTL and screen-reader semantics are local gates.

Specimen pages (`*-specimens.tsx`) become maintained Story/Scene fixtures and browser visual checkpoints.

### 5.6 Charts

Four files import Recharts, a React-only library. Crease provides a concrete React-free candidate, so the port
no longer assumes a complete custom chart rewrite or a temporary React bridge.

| Candidate | Source-proven capability | Use in role-model |
| --- | --- | --- |
| Crease pure SVG | `barChart`, `areaChart`, `interactiveAreaChart`, `donutChart` helpers | Small/simple charts only where the helper can meet our data and interaction contract |
| Crease ECharts adapter | Lazy Apache ECharts loading; Foldkit Mount, SyncChart, theme/resize observation and scoped disposal | Preferred starting point for richer time series, multi-series data and rankings after pilot validation |
| First-party Foldkit/SVG implementation | Custom renderer behind the same role-model API | Fallback for uncovered requirements or unacceptable compatibility/performance cost |
| React custom-element bridge | Still possible technically, not the default | Requires a separate approved exception and dated removal; cannot satisfy the final React-free client gate |

Evidence: [chart docs](https://creaseui.com/docs/components/chart), pinned
[SVG/composition source](https://github.com/Potti1234/creaseui/blob/bb447e363e9c717bf11ebb10b2259f053bff6f71/src/ui/chart.ts)
and [ECharts adapter](https://github.com/Potti1234/creaseui/blob/bb447e363e9c717bf11ebb10b2259f053bff6f71/src/lib/echarts.ts).
The adapter uses canvas, not React; its small SVG helpers do not need ECharts to draw, but coexist in modules
whose dependency closure must be measured. Lazy imports are not a zero-cost or bundle-splitting guarantee.
Foldcn explicitly lacks charts and is not the fallback chart renderer.

**Keep the domain adapter, replace the renderer.** The current `observe-chart-adapter.ts`,
`overview-chart-adapter.ts`, `telemetry-analytics.ts` and chart tests define area/line/bar/ranking data,
series identity, axis domains, bucket centres/boundaries, ticks, dual-axis/tooltip formatters, units, time
windows and stale/partial/truncated/unsupported states. Preserve those semantics; no relabelling missing data as
zero and no narrowing of the state vocabulary to a donor's ready/loading/empty/error states. Upstream chart
examples do not establish support for these contracts or production live-data updates.

**Early pilot, before broad route conversion (M5).** Use a real telemetry time-series model and a ranking model,
not only demo values. The receipt must cover:

- Exact Effect 4.0.6 + vendored Foldkit/UI build, commands/messages and resource lifecycle; no React or second
  Effect runtime in the client dependency graph.
- Value/series/units/axis/bucket/formatting assertions and real time-window filtering; tooltips and legend
  interactions, empty/loading/error plus stale/partial/truncated/unsupported states.
- Live updates and rapidly switched filters/ranges; ignore obsolete work, preserve the current variant across
  theme changes, and support multiple instances without colliding host IDs or stale global registrations.
- Mount cancellation/unmount/remount, partial-acquisition failure, font readiness, observer and frame cleanup,
  disposal and registry release. The presence of acquireRelease in upstream source is not proof every failure
  path is leak-free; test it in the adapted implementation.
- Resize from hidden/zero-sized containers, responsive layouts, light/dark tokens and reduced motion.
- Meaningful HTML summary/data table alongside canvas charts; tooltips are supplementary, not the only
  keyboard/screen-reader route to the values. Test accessible naming and the alternative's actual numeric data.
- Cold load, loaded chunks/raw/gzip bytes, first chart, live-update latency and mount/unmount heap behaviour
  against the React baseline on the same fixtures/hardware. Lock budgets before accepting the pilot.

ECharts and Recharts do not promise identical pixels. G-CHARTS must separate exact numeric/behaviour/accessibility
contracts from approved per-chart render differences. Keep chart-region comparison bounded and recorded;
never mask entire pages or weaken request/state assertions to make a screenshot pass. Browser lifecycle tests
and data assertions remain required even when a Story/Scene test can inspect the accessible alternative.

### 5.7 Tests

| Today | Destination |
| --- | --- |
| Pure `.ts` tests (the majority of 15k+ test lines) | Move with the modules; the injected fetchers become test Layers |
| 25 `.tsx` tests using `renderToStaticMarkup` | Story tests for state transitions, Scene tests through the view |
| 24 Playwright specs (2,455 lines, mostly accessible locators) | Unchanged scenarios, run against both builds by the parity harness |
| `runtime:validate-ui` (868 lines, real browser against a controlled bridge) | Stays; becomes the packaged lane's backend-side evidence, and the harness reuses its fixture setup |

Suite promotion is mandatory: a Story/Scene test that only exists to prove the port works does not count.
Verified means the test is in a maintained lane, per the repository's existing rule.

Selected donor components must also have adapted compatibility/state tests and real browser checks for focus,
keyboard, RTL and overlay behaviour. ECharts lifecycle, font/canvas readiness, cleanup, data updates and numeric
HTML alternatives require browser tests; virtual view tests alone cannot verify an imperative canvas runtime.

### 5.8 Strict TDD and maintained acceptance tests

Implementation declares `TDD Mode: strict`. Apply the repository's recursive-tdd rules to first-party runtime,
wrappers, component adaptations, view/state machines and verification harness behaviour:

1. Define the slice's contract and requirement IDs. Add a narrowly scoped maintained test with the expected
   outcome, then run it on the pinned pre-change baseline and observe the intended assertion fail. Capture the
   command, test ID, source SHAs, exit status and RED log before production edits. Module-resolution, syntax,
   missing dependency, unavailable provider and harness failures are setup failures, not behavioural RED.
2. Implement only the owned slice needed for GREEN. Re-run the exact test, neighbouring regressions and affected
   dependency/contract suites. Capture GREEN evidence at the implementation revision.
3. Refactor while green. Keep unit/Story/Scene, integration, contract and applicable packaged-browser/live-client
   checks in normal test trees and maintained CI selectors. Temporary evidence scripts are not regression suites.
4. A new ported route can require tests that exercise its new state/view seam, while baseline React
   characterisation stays green. Do not manufacture a baseline defect, delete working production code merely to
   force RED, or weaken an assertion to permit a copy. Test reviewer verifies the failure establishes the contract.
5. Pure mechanical source moves and untouched upstream acquisition use a separately recorded characterisation
   exception: baseline GREEN, byte/export/provenance comparison and GREEN after movement; no behavioural rewrite
   hidden in that exception. If strict RED is genuinely infeasible, stop and obtain an explicit scoped exception
   with compensating tests; never silently switch the whole program to tests-after or pragmatic mode.
6. Live exploratory runs first establish baseline observations; automate their invariants into maintained
   acceptance tests. A request that fails because the provider is unconfigured is not TDD RED. Real client
   evidence (§6.7) supplements the fast RED/GREEN loops, and does not replace them.

A test author can be a separate teammate, but implementation waits for the reviewed RED handoff. Each task
owns its colocated tests after that handoff; independent test reviewers assess adequacy without editing the
same files concurrently. Controller validates the chronology and promotes the tests before slice acceptance.

## 6. Parity harness

One package, `role-model-router/packages/ui-parity`, and one root script, `runtime:parity`. It is the dual-build
parity arbiter; a route is accepted only when its parity result and applicable G-COMPONENTS/G-CHARTS/G-TEST
checks pass. Build the React baseline/self-check lane at M4 before the M1 change is accepted, not at the end;
M4 is independent of M1 and its row number is not a sequencing dependency.

### 6.1 Lanes

| Lane | What it proves | What it cannot prove |
| --- | --- | --- |
| Mocked client (Vitest + Story/Scene) | Model transitions, view output, accessible names | Wiring, request bytes |
| Source-QA Playwright (current default) | Integration against a tsx-started bridge | The packaged artifact |
| Packaged parity (identified SEA + private distribution) | Identity, digests, real process, served assets, controlled scenarios | A fixture-backed provider cannot prove real DSH/pi/provider operation |
| Real-client integration and release comparison (§6.7-§6.10) | DSH/pi to real router/provider plus correlated telemetry/UI/graph and persisted readback on reference/dev/candidate | Statistical model-output equality or proof of scenarios not actually exercised |

The port runs the packaged lane twice: React build and Foldkit build, same fixture backend, same scenario files.

### 6.2 Determinism

Freeze the clock; seed `Math.random`; stop animations at their end state; hide carets and scrollbars; wait for
fonts and images, then 400 ms of DOM quiet, then two frames with no pixel change; then capture until two
screenshots are byte-identical. Playwright's default `networkidle` is wrong here because SSE never idles.

For canvas charts, wait for the renderer's completion and font readiness, fix viewport/DPR/timezone, explicitly
disable or finish ECharts animations, and verify stable canvas captures as well as DOM quiet. Use bounded
timeouts with diagnostic failures; a continuously changing chart must not hang the capture loop. Canvas
determinism and data-table assertions belong to the pilot, not a later screenshot-tolerance adjustment.

### 6.3 Comparators

| Comparator | Rule |
| --- | --- |
| Structure | Every text node and control with position and computed styles, matched by text or accessible role+name. Repeated identical diffs are reported once, grouped by pattern |
| Request log | Compare method/path, canonical query/body and relevant redacted auth/headers, multiplicity, status/error/stream semantics; ignore order only for independent reads, preserve causal write/tool/turn order; extra/missing or changed requests fail |
| Accessibility | Baseline ARIA diff may begin report-only while noise is classified; selected components and charts still require mandatory keyboard/focus/semantic/numeric-alternative checks before acceptance |
| Pixels | 0 perceptual pixels for layout/text routes; tolerance only under the G-CHARTS policy |

### 6.4 Self-checks

- React against React: must be 0 differences. A harness that cannot prove "nothing changed" cannot prove
  "nothing changed by the port".
- Mutation check: change one class in `packages/ui` and confirm the harness flags it.
- Determinism check: two identical runs produce identical captures.

### 6.5 Scenario matrix

Every route in `app/routes.ts`, in light and dark, plus mobile for responsive pages, and per route the empty,
loading and error states. Loading is scenario-driven: hold a chosen endpoint and wait until only held requests
are open, so the spinner is captured at the same moment in both apps. Baseline fixture state is seeded once per
run and pinned by digest.

### 6.6 Report

Per variant: `identical` | `pass` (0 perceptual px, non-zero raw bytes) | `fail` (with the group of diffs).
A standard variant is green only when classified identical or pass, with zero behaviour diffs, zero console
errors, and zero unmocked endpoints.
For a chart renderer change only, a variant may be explicitly `approved-render-change`: record chart ID,
baseline/candidate captures, bounded region and numeric threshold, reviewer approval, rationale and all semantic
checks. This is not an `identical`/zero-pixel pass. Summary reports count these approvals separately and reject
unapproved differences; non-chart regions, data, requests and accessibility remain under their ordinary gates.

### 6.7 Real-client-to-router verification is mandatory

A screenshot harness or direct HTTP request alone is insufficient. Exercise an ordinary request from an
isolated DSH profile/session or pi CLI through the real role-model provider integration and the exact packaged
router under test, into an approved real upstream/local inference provider. A deterministic external provider
fixture remains valuable for fault injection and request-byte tests, but must be labelled fixture evidence and
cannot substitute for this lane. At least one supported client must complete all applicable core journeys;
exercise both DSH and pi if shared discovery, request metadata, tool/stream or client-facing contracts change.

Preflight records the client executable/version and plugin build/hash, target URL, discovery response,
selected alias/endpoint, routing mode, effective config hash, enabled capabilities and supported metadata.
Prove the active client model uses the router, not a client-native provider or silent fallback. DSH status and
alias preferences alone do not prove the active model selection. Use a separate test profile/session; never
repoint the controller's own session or modify the user's active profile to generate acceptance evidence.

Confirmed client guidance is in `packages/pi-role-model/README.md` and `packages/dsh-role-model/README.md`:

- Pi: set `ROLE_MODEL_ENDPOINT` to the isolated target, then use provider `role-model` and a provider-relative
  alias actually returned by that target. The documented ordinary prompt shape is
  `pi --no-session --provider role-model --model <discovered-alias> -p "<synthetic-prompt>"`.
- Pi diagnostics `/role-model status`, `doctor`, `alias list`, `requests` and `explain <request-id>` are
  interactive commands; `pi -p "/role-model status"` is explicitly unsupported and is not a verification step.
- DSH: configure the isolated plugin endpoint/profile, use `/role-model setup`, `status`, `doctor`, discover
  aliases, and select the role-model route/model in the client. Use the installed version's supported ordinary
  prompt/CLI automation after inspecting its help; do not invent command-line switches or pass slash commands
  as inference prompts. Record the effective active model and endpoint.
- Direct `curl` or handcrafted OpenAI requests are diagnostic supplements only. They cannot prove the client
  discovery, metadata, streaming adapter and tool/result paths used by DSH/pi.

Provider calls must be bounded (timeouts, token/cost/request limits); use approved non-sensitive synthetic
prompts and a harmless tool confined to a disposable workspace. Prefer an approved real local model where
suitable. Paid/remote inference and capture egress follow explicit operator/provider authorization; never
extract credentials from existing profiles. If authorization or a supported provider/client is unavailable,
record NOT RUN and keep the gate open rather than replacing real evidence with a mock. Auxiliary provider
classification/discovery calls are budgeted and recorded as well as user completions.

### 6.8 Three comparison targets and the v0.0.20 reference

| Target | Source/artifact authority | Comparison purpose |
| --- | --- | --- |
| R: released main reference | Owner-designated `D:/role-model-router/0.0.20` package, preserved unchanged | Behaviour observed in the shipped product |
| D: pre-change dev | Clean pinned public/private origin/dev pair, React frontend | Isolate existing main-to-dev changes from this migration |
| C: candidate | Rebuilt pinned public/private pair with stable Effect and Foldkit port | Must preserve D and all unwaived shared R behaviours |

Read-only inventory confirmed the reference contains `role-model.exe`, its checksum file, launcher/batch,
`manifest.json`, `build/client` and `track-b-runtime`. The manifest reports version 0.0.20, production channel,
public commit `945a8906782a434e800a0ca2deb2e08ef1472e20`, source tree
`d29e2a3c45ba3617cb0db7bad9fcb6ea0e0bd7b8`, executable SHA-256
`718d71f51ea6cf4f4bcfddf82165695c52fbc6d59eaaa600a38f3c73df8e248a`, private distribution digest
`8074d1025d52cc12b6a43848e429f7868982b666110bc0e1b6a9a035685bcc91` and UI tree digest
`e2b165f8dd9aa16cdd095101189b77f26403e4412b724202f510c9293a9aa3ab`.
The packaged Track-B manifest separately identifies public commit
`c002edfd8efc1459270a3746e80b7636b8271996` with the same public source tree, private commit
`16021cc5f87f60f2d01338a29adf0002da5e8327` and private tree
`18a0e994ed3330293c8bb61931dbf44834172f41`. Preserve both public commit fields; the root and nested commits
are not interchangeable with one another or with the dev baseline. The private pair happens to match the
planning baseline, while the public source tree does not.

Read-only SHA-256 checks of the actual executable, private manifest and operations sidecar matched the root
manifest on 2026-10-24; sidecar SHA-256 is
`e648a6f387b416fbd0962efaa008b414dccc7d493b27f9d08e96ab406ead9526`. The UI tree, remaining artifact closure,
release identity/signature and process/served identity were not verified. Source seal fields remain manifest
claims, not rebuild or live proof. Re-verify all required identities at execution. The folder name and owner
designation do not independently prove this is the latest release at execution time.

Before using R, verify actual executable/checksum, manifest, UI tree and private artifact closure with the
repository's canonical verifier. Record file/process/health identity for all three targets. Re-fetch both dev
refs at execution; source-pair SHAs and R's release identity must remain separate fields in every receipt.

Never launch the reference in place with its production defaults: its manifest advertises port 3456 and a
production state root. Use an isolated copy/staging closure preserving the original bytes, unused loopback
ports, independent config/state/log/lock roots and an owned managed process. Verify the release's supported
launch overrides from its own help/docs before running it. If isolation cannot be demonstrated, stop this lane;
do not edit the release manifest, reset production, take ports 3456/3457/3458, or infer identity from a URL.
Do not share a writable SQLite database between R/D/C or point an older binary at candidate-migrated state.
Seed independently with equivalent authorized configuration; use consistent SQLite backups only when needed,
not naive live DB copies that omit WAL. Preserve source data and never replay operator secrets by default.

Run the same client journeys/config/capability subset against R, D and C. Classify each observed difference as:
pre-existing R-to-D change, migration regression, approved intentional change, known baseline defect, capability
absent or inconclusive/environmental failure. No blanket "dev changed" waiver. Every intentional delta needs
requirement/rationale/approval, expected-value assertions and a regression. R has authority for unwaived shared
user behaviour; D is the immediate migration baseline. An unexplained R/C difference blocks release parity even
if D/C passes; missing capabilities are explicitly recorded and do not count as exercised coverage.

With deterministic provider fixtures, compare exact contractual request/tool/status/decision bytes after a
reviewed volatile-field normalization. With real providers, do not require identical generated prose, timing,
usage values or provider randomness. Compare schema/semantics, endpoint eligibility, preserved role/task/effort,
correct stream/tool/error handling and internal consistency. Normalization must never erase model selection,
errors, missing graph edges, double accounting or lost output. Screenshot exceptions remain chart-only (§6.6).

### 6.9 Cross-surface journey matrix and correlation

Every journey gets a unique synthetic marker and a mapping of client session/turn, runtime request ID, trace
or decision ID, provider result reference, capture/graph identifiers and applicable replay/evaluation job IDs.
Use supported IDs/correlation fields, not an invented header contract. Background client calls (taxonomy,
title/compaction, retries) are classified separately; do not assume one CLI prompt equals one router request.
Record before/after counters and await bounded semantic readiness/watermarks, not fixed sleeps or full-table
count guesses. Test traffic must carry the supported live/probe/evaluation classification and expected headline
inclusion/exclusion; never relabel probes as live just to move a dashboard counter. Where a live user path is
required, run bounded synthetic ordinary client traffic in isolated state and label the evidence honestly.

| Journey | Client/provider proof | Telemetry and frontend proof | Graph/storage and downstream proof |
| --- | --- | --- | --- |
| J1: discovery and routed answer | Target aliases discovered; ordinary real prompt; complete answer/stream terminal status, exact selected model/effort and router path | Correlated request/decision, status, tokens/cost/latency with declared unavailable fields; Observe request/detail/routing plus dashboard numerics match API values for the controlled window | Accepted capture/graph envelope and source refs resolve persisted request/response; graph relationships and payload policy validated, no invented complete-body claim |
| J2: multi-turn tool cycle | Harmless workspace tool call, matching tool_call_id/result and follow-up turn through the client | Correct per-call/turn and aggregate accounting, stream boundaries, refresh and detail links | Ordered message/branch/tool-result relationships, role/task/effort identity and payload references preserved across turns |
| J3: cancellation and failure | Cancel an actual supported streaming client request; controlled provider error/timeout exercises real adapter path | Named terminal/cancel/error state, no hung spinner, false success or double accounting; error is visible and correlated | Persisted supported disposition, no orphan branch or stuck job; no claim cancellation guarantees external exactly-once or zero billing |
| J4: routing/metadata variants | Discovered alias and, where supported, exact endpoint/effort variant; inspect role/task metadata and fallback policy | Eligible selection/reason codes, live-only/excluded accounting and honest unknown/absent fields survive release/dev/candidate comparison | Capture/projection/join identities agree; no synthetic backfill disguising absent evidence |
| J5: persistence and restart | Finish real client work, then restart only the owned isolated runtime and reconnect a fresh client/browser | Request history, detail and analytics read back from identified package; UI values and revision/SSE resync agree | Inspect read-only consistent snapshot or supported storage audit/query; request IDs, edges and referenced payloads survive; sockets are not expected to survive |
| J6: replay/evaluation/learning when configured | Start from J1/J2's actual eligible capture and approved configured arms/providers, not inserted fake success rows | Queue/replay/learning views show actual correlated jobs, scope, disposition and availability; wait for declared completion | Pins/source-arm closure, branch/provider refs, evaluation receipts, normalized finalized effort and learner readback match configured behaviour; disabled/unavailable is named, not PASS |

Use supported APIs first: source currently exposes request detail, router decisions, telemetry
summary/rows/requests/query/stream, captures, storage-retention and queue/learning surfaces. Re-inventory
exact paths/schemas for R/D/C rather than assuming newer endpoints exist in the release. Resolve canonical
public/private graph owners and query schema from current code. Supplement with read-only SQLite/storage
inspection and snapshot integrity checks; no direct repair/insert/DELETE to make the UI match.
Graph/source-row counts alone are insufficient: resolve a sampled complete source-to-projection/edge/payload
chain and prove the exact J1/J2 identities. Respect capture limits, externalization and redaction; retain hashes
and safe refs rather than leaking prompts, credentials or private schemas into public evidence.

Frontend verification uses the actual served candidate assets, exact runtime origin and browser network
requests, not Vite accidentally proxying to production. Compare rendered count/ID/value/status to captured API
responses and stored evidence for that journey. Inspect chart data and alternatives, navigation/filter changes,
SSE refresh/reconnect, loading/empty/degraded/error and desktop/mobile light/dark. Screenshots supplement these
assertions; no `page.route` stubs for accepted runtime/telemetry/storage evidence. A private projection failure
must not be hidden behind a pretty frontend or a healthy public endpoint.

### 6.10 Live evidence, privacy and gate closure

Each receipt contains: scenario and requirement IDs; R/D/C source/build/executable/UI/private identities;
client/plugin versions and command/config (secrets redacted); provider/alias/capability/traffic class; owned
process/PID/URL/root; raw sanitized client outputs/exit codes; ID mapping; API snapshots and time bounds;
read-only graph/storage results and integrity/closure assertions; UI network/DOM/numeric/screenshot evidence;
restart outcomes; expected differences/approvals; exact test commands/results, and cleanup/job receipts.
Store private backend/schema/payload evidence in the private run with a safe public summary or digest reference;
public proposal/test artifacts must not expose credentials or confidential captured content.

Result vocabulary: PASS (executed and all assertions satisfied), FAIL (observed violation), NOT RUN (missing
prerequisite), INCONCLUSIVE (unstable/unattributable observation), or reviewed N/A with reason/capability and
mapped alternative coverage. Missing real requests, unexplained parity deltas, absent graph joins or unavailable
providers do not become PASS. Core J1/J2/J5 and relevant changed paths cannot be waived just because fixture
screenshots pass. Client-specific unsupported scenarios require documented alternatives, not invented CLI flags.

Establish R/D baseline receipts at M0a; run on the implemented Effect-only package before M1 acceptance, at the
M5 pilot, on each affected route/service wave, after integration
of both repositories, and at M12 on the actual cutover artifact. Any change after the final receipt invalidates
its affected evidence until re-run. Only the controller closes G-LIVE/G-RELEASE after independent verification
and code/test review; no worker may approve its own implementation or edit expected baselines to pass it.

## 7. Milestone ladder

This ladder coordinates the required B0-B10 backend implementation (§15/§17) and the frontend port.
Archived M0-M11 labels have no executable authority here. E1/E2 scope dispositions (§16) must be explicit.
M4 baseline work precedes M1 acceptance despite numeric order; backend/client branches then overlap on stable
wire contracts and join at M11. Foldkit itself does not require completing the backend branch first.

| Stage | Work | Depends on | Acceptance evidence |
| --- | --- | --- | --- |
| M0 | Paired analysis, baseline and ledger | - | Current public/private/release identities and complete operation/resource disposition ledger; backend B0-B10 and frontend tasks mapped to requirement IDs; explicit E1/E2 scope decisions and data/rollback boundaries |
| M0a | Real release/dev journey baseline | M0 and reviewed A3 scenarios | Verified R/D isolation and identity; ordinary DSH/pi J1/J2/J5 plus applicable failures/metadata paths; request-to-telemetry/UI/graph evidence and pre-existing delta ledger before production conversion |
| M1 | Effect 4.0.6 | M0a, M4 baseline | Strict dependency-contract RED/GREEN; paired sync/verify/wrapper builds and export/subpath manifests; CI and React baseline green; Effect-only packaged real-client trace and release/dev delta checks repeated |
| M2 | `@effect/platform-browser` wrapper | M1 | Build, subpath smoke, one-instance guard for a browser bundle |
| M3 | Foldkit vendoring and wrappers | M1, M2 | `vendor/foldkit` synced and verified; `foldkit` and `@foldkit/ui` wrappers build; every published subpath resolves; licence/provenance committed |
| M3a | Selected component sources and compatibility | M3 | Pinned Crease Tailwind closure, optional justified Foldcn substitutions, notices/adaptations and target compile/tests; G-COMPONENTS before route-wave acceptance |
| MB | Backend Effect conversion branch | M1 + B0 contracts; per-B dependencies in §17 | Required B1-B9 public/private services, scopes, typed failures, SQL/process/transport/queue/telemetry and B10 integration; strict TDD and per-slice real-client receipts; not a version-bump task |
| M4 | Parity harness and pre-bump React baseline | M0 | React-vs-React 0 diffs; mutation and deterministic double-run checks; preserved baseline for M1; execute before M1 acceptance |
| M5 | Pilot route (`observe/routing`), component and chart pilots | M3a, M4, M0a | Strict component/chart tests, telemetry time-series + ranking pilot, lifecycle/data/a11y/performance receipts; actual DSH/pi traffic populates served UI and persisted graph; affected G-LIVE/G-TRACE-STORAGE evidence before waves |
| M6 | Shell and routing | M5 | App shell, sidebar, theme, 51 routes parsed, 20 legacy redirects, not-found; nav scenarios green |
| M7 | Read-only wave | M6 | Dashboard, observe/activity, observe/requests (+detail), observe/logs, observe/queues, router/* , system/runtime-config; request logs equal |
| M8 | Control/write wave | M7 | control-*, providers, connect/*, local/*, extensions, models/*; write paths exercised by scenarios |
| M9 | Heavy wave | M8 | learning/*, control-models, control-benchmark, workbench, studio-*; performance budget held |
| M10 | Complete chart coverage and renderer removal | M5 pilot; integrated with M7-M9 | Remaining charts meet G-CHARTS; Recharts runtime imports reduced to zero; per-chart receipts and approved render deltas, not deferred chart viability |
| M11 | Combined backend/frontend completion audit | B10 + frontend M5-M10 + diagnostics page + E1/E2 approved disposition | Maintained tests and per-operation backend coverage/retention ledger, required B gates and UI gates; complete selected extension scope or explicit named deferral; no implicit old-plan dependency |
| M12 | Packaged cutover | M11, integrated reviews and §6.10 receipts | Exact public/private/UI closure serves Foldkit; G-LIVE/G-TRACE-STORAGE/G-RELEASE on final artifact; repeat J1/J2/J5 and changed paths; matched-closure and persisted-state-compatible rollback demonstrated |
| M13 | Removal and closure | M12 | Legacy React implementation retired after checked consumers migrate; replacement component API retained; archive only frozen React comparator/reference captures, keep candidate/live/contract/lifecycle acceptance commands in maintained CI; docs/memory updated |

## 8. Gates

| Gate | Must hold before | Required output |
| --- | --- | --- |
| G-VENDOR | Any vendored tree is used by a build | `VENDORED.json` + `PROVENANCE.md` regenerated; `--verify` clean; payload enumerated explicitly |
| G-API | Any new Effect/Foldkit import | Required-subpath manifest; per-entry type/import smoke; one-instance metafile check; diff classification |
| G-COMPONENTS | Selected donor component accepted outside its isolated pilot | Pinned source/dependency closure, provenance and licenses, adaptation ledger, target-version compile/tests, RM3 token/geometry parity, keyboard/focus/RTL and reduced-motion evidence |
| G-PARITY | A route is called ported | All ordinary variants identical or pass; chart-only approvals reported separately per §6.6; request/state parity and no console errors; component/chart test receipts |
| G-CHARTS | Chart pilot accepted and broad chart-bearing route waves start | Exact values/series/units/axes/states and accessible alternatives; current-version lifecycle/update/cleanup evidence; recorded per-chart rendering policy/approvals and no blanket masks |
| G-TEST | Any first-party behavioural slice accepted | Strict assertion-level RED before implementation, minimal GREEN and refactor/retest (§5.8); wrapper/backend/harness/component/route tests promoted to maintained lanes; reviewed scoped characterisation exception only |
| G-BACKEND | Combined M11 acceptance | Required B0-B10 operation/resource ledger closed, actual callers use service graph, retained-pure/adapter/Effect dispositions reviewed, both repo task evidence and integrated live traces |
| G-LIFECYCLE | Any converted resource owner accepted | Partial acquire/finalizer/stop races, real I/O cancellation/late completion fence, no post-stop timer/DB/child writes, bounded drain and shutdown; process-level tests where applicable |
| G-SQL | SQL service/caller conversion accepted | Exact retries/transactions/PRAGMAs/reader compatibility, partial handle cleanup and primary error preservation, explicit sync/async edge, measured blocking honesty and real DB failure tests |
| G-DATA | Persistent owner or schema/retention/admission change accepted | Same graph/event/capture authority/bytes/idempotency/privacy/fences; backup/reader/rollback proof, no cross-store atomicity assumption; new E1/E2 semantics only after approved design |
| G-PERF | M5 pilot acceptance and cutover | Fixed workload/hardware, raw/gzip startup and lazy chart bytes, parse/first-render/update time, repeated-mount heap measurements; pre-agreed budgets and rollback thresholds |
| G-PACKAGED | Packaged verification or cutover accepted | Public/private source/artifact closure, served asset manifest, PID/image/health/network identity; no source-only or stale mixed package claim |
| G-LIVE | Effect-only acceptance, pilot/affected wave and cutover | Supported real DSH or pi CLI through identified router/provider, streaming/tool/metadata/error evidence; both clients when shared client contracts change; no curl/mock substitute |
| G-TRACE-STORAGE | G-LIVE journey accepted | Same request IDs joined through decision/provider/telemetry/API/rendered numerics and committed graph/payload/projections, read-only inspection and restart persistence; no seeded-only proof |
| G-RELEASE | Cutover or migration behaviour declared equivalent | R/D/C identities and comparable journeys, classified release-to-dev differences, exact shared semantics and reviewed intentional deltas; unexplained differences block parity |
| G-CUTOVER | React is deleted | Independent code/test/live review and all gates closed on exact build; one-release matched public/private/UI rollback with compatible persisted state demonstrated; no unresolved acceptance blocker |

## 9. Wave map

| Wave | Routes | Notes |
| --- | --- | --- |
| 1 (M6) | shell, index, app-layout, sidebar, theme toggle, not-found, legacy redirects | No data; proves routing, layout and theme |
| 2 (M7) | dashboard, observe/activity, observe/requests, observe/requests/:requestId, observe/logs, observe/queues, observe/routing, observe/store-degradation-receipts, observe/observability-snapshot, router, router/config, router/candidates, router/decisions, router/decisions/:requestId | Read-only; highest scenario coverage; SSE and polling concentrated here |
| 3 (M8) | models, models/roles, models/benchmark, control/*, remote/providers, connect, connect/downstream, connect/upstream, local/*, extensions, system/* | Forms, writes, modals, device auth |
| 4 (M9) | learning, learning/*, workbench, studio/images, studio/audio, studio/rerank, studio/advanced | Largest files (`learning.tsx` 2.6k, `control-models.tsx` 1.3k, `control-benchmark.tsx` 1.2k) |

`app/routes.ts` is the source of truth; this table is the ordering, not a second route list.

## 10. Verification commands

| Command | Proves |
| --- | --- |
| `node scripts/vendor-upstream.mjs --name effect --verify` / `--name foldkit --verify` | Vendored bytes match the recorded digests |
| `corepack pnpm --filter effect build` (and the wrapper builds) | The wrappers compile against the pinned trees |
| `corepack pnpm run ci:quality` | Biome + lint + Rust checks |
| `corepack pnpm run ci:build` | The workspace builds |
| `corepack pnpm run ci:runtime` | Runtime build/test lane |
| `corepack pnpm run runtime:test-critical` | Host-bridge critical tests, runtime-ui critical tests, `runtime:validate-ui`, observability validators |
| `corepack pnpm run runtime:test-browser` | Playwright against the source-QA bridge |
| `corepack pnpm run runtime:package-sea` | The packaged artifact builds |
| `corepack pnpm run runtime:parity` (new, M4) | Dual-build parity run; does not replace actual client traffic |
| `corepack pnpm run runtime:verify-client-journeys` (proposed, not present; A3/Q1) | Managed R/D/C DSH/pi, API/UI/storage correlation, bounded real-provider/restart receipts after explicit preflight |
| `corepack pnpm run runtime:compare-release` (proposed, not present; A3/Q1) | Compare recorded R/D/C journey receipts with reviewed normalization and delta dispositions |

### 10.1 Live invocation and evidence commands

The new command names above are required implementation deliverables, not currently executable scripts.
The controller adds root/CI wiring after the harness owner has reviewed tests and isolation controls; commands
must fail closed on wrong process/URL/state root and report NOT RUN distinctly from a successful run.
Re-read installed client help before recording exact reproducible invocation. The confirmed pi path can use
PowerShell process-scoped `ROLE_MODEL_ENDPOINT` plus its documented ordinary prompt invocation (§6.7); no
production address or provider credentials belong in committed examples.

DSH package scripts `check:live-discovery`, `check:live-stream` and `check:live-adapter` are useful supporting
checks (confirmed in its package manifest). Discovery alone is not inference; adapter/stream scripts still do
not replace the required ordinary client journey, graph correlation and frontend verification. Inspect their
actual target/config behaviour before use. Never send the acceptance run through the controller session merely
because that session already has a role-model provider selected.

## 11. Risks

| Risk | Mitigation |
| --- | --- |
| Foldkit is Beta (0.169) and its API will churn | Vendored pin + wrapper isolates the app; upgrades are reviewed vendor syncs, not silent |
| 4.0.6 breaks Foldkit's source (upstream developed against 4.0.0) | Wrapper build + Foldkit's own suite is the gate at M3, before app code |
| No route-level code splitting in Foldkit | Measured at M5, budgeted at G-PERF; the app is served from localhost, so the cost is parse time, not bandwidth |
| Crease's compatibility baseline predates stable Effect and our Foldkit pin | G-COMPONENTS/G-API compile and runtime evidence before reuse; adapt owned source or choose another renderer, never silently downgrade |
| ECharts changes pixels, bundle cost and lifecycle ownership | Early time-series/ranking pilot, exact semantic/a11y checks, bounded render approvals and measured G-PERF |
| Donor themes or registry installs overwrite RM3 and workspace pins | Explicit source closure, no blind CLI install, own token mapping and approved lockfile changes |
| Mixed donor components inherit gaps or diverge | One role-model API/owner per primitive; record selection and test keyboard/focus/RTL per component |
| Two UI frameworks in one tree for the port's duration | Parity plus component/chart/test gates; UI changes freeze except bugfixes; branch discipline |
| Verbatim vendor means no local patches | Ordered escape hatches in §4.4 |
| 143 API functions is a large Command surface | Waves + ledger; each command wraps an existing function, so the mapping is mechanical |
| Agent-generated backend/client code | Anti-slop lint, strict TDD and independent code/test review; backend lifecycle/data plus actual client parity, not import counts |
| SQL Effect wrapper mistaken for nonblocking DB | Explicit DatabaseSync caveat, contention/event-loop measures and separately approved off-thread solution if needed |
| Existing queue fibers mistaken for fully interruptible/distributed workers | Propagate actual abort, fence irreversible commits and characterize two-host distinct-job limits |
| Global journal/all-live durability silently added or silently dropped | Current owner reconciliation §16 and explicit E1/E2 scope disposition before lock |
| Cutover changes the packaged artifact binding | Cutover is a promotion through stage, verified by `runtime:validate-packaging` |
| Docs site stays React | Accepted (D-U2); React remains a workspace dependency by design |
| Fixture parity passes while real traffic bypasses router or never persists | G-LIVE/G-TRACE-STORAGE ID joins, negative controls and restart reread; independent verifier checks real package/profile/DB targets |
| Main release and dev have different public source identities | Preserve R/D/C separately, classify deltas before judging the port, keep unwaived shared release contracts |
| Multiple agents overwrite shared files or approve stale evidence | Explicit task ownership/dependencies, single shared-file writer, fresh bundles, independent review and controller re-run after integration |
| Live provider not authorized/available or creates cost/private-data risk | Bounded approved synthetic calls, no credential extraction, honest NOT RUN/INCONCLUSIVE; gate stays open |

## 12. Rollback

- Serving: `package-sea.ts` copies one directory into the release. Switch the source directory back to the React
  build and rebuild; keep the React build artifact for one release after cutover.
- The frontend port must not silently change the bridge's HTTP/storage contracts. Any accepted backend change
  from A1/A2 requires its own state-compatibility/rollback tests; do not infer reversible storage from a UI flag.
- Effect pin rollback requires a matching wrapper graph and a compatible persisted schema; it is not "install an
  older npm version". Restore the reviewed previous pin/tooling and compatible wrapper graph, rebuild the
  matched public/private/UI closure, and verify schema-reader compatibility and pending/persisted work before
  choosing a fallback. Do not use a rebuilt old binary against new state without a supported compatibility path.
- Selected component/chart adaptations roll back behind the same role-model contracts; retain the pinned source
  manifest and previous package/lockfile graph. If a temporary React chart bridge is separately approved, retain
  its removal deadline and do not call the final client React-free until it is gone.

## 13. Open decisions

| # | Question | Recommendation |
| --- | --- | --- |
| D1 | New sibling app or in-place port? | Sibling (`runtime-ui-next`), renamed at cutover |
| D2 | Where does the harness live? | `packages/ui-parity` + `runtime:parity`; do not overload `runtime:validate-ui` |
| D3 | Which charts use SVG versus ECharts; what rendering deltas and budgets are acceptable? | Crease-derived React-free adapter first, decided by M5 time-series/ranking pilot; custom renderer if gaps remain; bridge requires a separate exception and removal date |
| D4 | Which selected component comes from Crease, Foldcn, or direct @foldkit/ui composition? | Crease Tailwind first; Foldcn only with a documented advantage; one role-model facade, RM3 visuals, provenance and G-COMPONENTS per primitive |
| D5 | Vite plugin: never, or after cutover? | Never for this program; revisit as its own change |
| D6 | Docs site: eventually port? | No; it is an upstream-synced template |
| D7 | Which installed client/provider and isolated launch controls support release comparison? | Resolve at A0/A3/M0a; at least one actual DSH/pi integration, budgeted real provider and independent state for R/D/C; unavailable prerequisite leaves verification open |

## 14. Controller-led DSH agent-team execution

### 14.1 Ownership and scheduling

The lead is controller, integration owner and final reviewer, not an unreviewed batch implementer. It maintains
paired source identities, requirements/acceptance ledger, task dependencies, write scopes, shared interface
contracts, verification policy and decisions. Delegate bounded work to durable DSH teammates; use short-lived
subagents for independent read-only investigations or scoped reviews. No actual team is started by this document.
Implementation starts only through the repository's approved run/worktree workflow with refreshed baselines.

Within a recursive run, one phase is active at a time. Parallelize independent tasks within that phase, not
analysis/implementation/verification phases whose upstream inputs have not passed. A phase boundary is not
waived by a teammate claiming its work is finished. Scope decomposition is the same whether tasks run serially
or in parallel, and the controller remains responsible for the full audit and acceptance decision.

Before assignment, create shared tasks with exact `write_scopes`, dependencies and acceptance criteria.
Workers list/get the task, claim its current revision, perform the owned work and report/complete only after
checks. Use `list_agents` and the targets returned by `spawn_teammate` for assignment/messaging. Ownership does
not wake an inactive agent: explicitly dispatch it. Re-list before waiting, wake required inactive agents, wait
for running/provisioning work, and collect all required results before closing the phase. Track and collect or
cancel every managed background job; neither inactivity nor a successful message means task completion.

All team members share the workspace and see edits immediately. Use disjoint named files/directories, not
"the UI" or "the bridge" as concurrent write scopes. Keep shared root manifests, lockfiles, CI, vendor pin
entries, route index, common API client, tokens and package exports single-writer; workers request changes via
the controller or one designated owner. No concurrent formatting/codegen across the repository. Re-read and
rebase an edit after FS_STALE_VERSION; never overwrite a peer's change. A worker may not change the release
baseline, fixture expectations or screenshot tolerance to make its own implementation pass.

### 14.2 Task catalogue and dependency graph

Instantiate each row as one or more shared tasks with stable IDs. This table defines work packages, not permission
to bypass the active phase. Every implementation row includes its own strict TDD cycle and maintained tests;
route-family rows are split into small vertical slices, not assigned as giant monolith rewrites.

| Package / role | Depends on accepted inputs | Bounded scope and deliverable | Acceptance handoff |
| --- | --- | --- | --- |
| A0 controller / paired-baseline owner | Fresh fetch and clean worktrees | Pair manifest, current release/artifact IDs, requirement IDs, dependency DAG, execution budgets and launch isolation policy; sole shared control-file writer | Exact public/private/source/release diff bases and unresolved gates recorded before work |
| A1 public analyst | A0 | Read-only public ingress/routing/telemetry/UI/export/CI census, affected contracts and current addenda | Evidence paths/line refs; changed-path map, no stale counts promoted as current |
| A2 private analyst | A0; parallel with A1 | Read-only private store/graph/queue/sidecar/package/source-seal census and release-to-dev delta map | Confidential evidence in private run; explicit public/private ownership and source-to-projection chain |
| A3 test architect / contract author | A1+A2 | Reviewed acceptance scenarios, correlation schema, release normalization/approved deltas, test-only negative controls; no production edits | Tests exercise client bypass, missing graph persistence, wrong request body, stale SSE/assets and data mismatches |
| Q0 baseline verifier | A0+A3 | Evidence-only release/dev client sessions and pre-change React captures, isolated provider/config/state | §6.7-§6.10 reference receipts; unavailable prerequisites remain NOT RUN |
| Q1 parity-harness implementer | A3; M4 before M1 acceptance | `packages/ui-parity` and dedicated scenario/test files only; controller owns root script/CI wiring | Reviewed RED/GREEN, deterministic selfcheck and sensitive negative controls, baseline captures protected |
| C0a Effect dependency implementer | A1+A2+A3+Q0+Q1 | Paired Effect/SQL wrapper version/API graph only; root manifest changes through controller | M1 per-entry/identity/provenance tests and Effect-only real-client receipt |
| C0b client dependency implementer | C0a | Platform-browser/browser-safe Effect graph, Foldkit/UI wrappers and source pins; serialize shared wrapper edits with backend platform owner | M2/M3 import/type/browser/package proofs, no client prerequisite for starting backend foundation |
| C1 component adapter owner | C0b and frozen role-model component API | Selected donor snapshot/adaptation files, primitive-specific tests and token mapping; separate designated token owner | G-COMPONENTS, notices/provenance and reviewed interface; no other worker independently recreates primitives |
| C2 chart adapter implementer | C0b+Q1; interface agreed with C1 | Named chart adapter modules/tests and pilot specimens, not all route files | Early time-series/ranking G-CHARTS/G-PERF with data, lifecycle, a11y and live-update tests |
| C3a..C3n backend implementers (required B0-B10 branch) | A1+A2+A3+C0a and per-B dependencies (§17); no dependency on C0b completion | Dedicated diagnostics/process/SQL/routing/transport/public composition/private storage/background/private composition owners, named files per B task, serialized monolith extraction | Required Effect conversions and explicit retained modules, RED/GREEN real-dependency/lifecycle/data tests, integrated release parity; no optional-backend escape |
| D0 shell/routing implementer | C1+C2 pilot accepted | Named shell, navigation, redirect and root-model modules/tests; route index serialized through its owner | Shell/URL/a11y parity; route-instance and stale-message lifecycle tests |
| DG diagnostics UI implementer | Backend B1 authorized DTO/API + D0 client shell | Additive Observe diagnostics route/submodel/tests; navigation and shared API changes via single owners | Actual bounded query, injected test defect, auth/no-data/degraded/drop/build identity and keyboard/mobile states; no telemetry contamination |
| D1..Dn route-family implementers | D0 and accepted shared API/chart/component contracts | One route family and its own state/view/commands/tests; disjoint files across workers | Strict RED/GREEN plus parity and affected real-client telemetry/UI/storage receipt per slice |
| T independent test reviewer | Frozen implementation/test diff for each C/D slice | Read-only code/test review plus findings; if more tests are needed, assign a separate repair task | Validate RED chronology, negative sensitivity, maintained CI selectors, real dependency coverage and no weakened oracle |
| V live/package verifier | Frozen assembled public/private build with explicit source/build identities, not yet verification-accepted | Evidence-only owned runtime/client/browser jobs, §6 matrix and read-only graph inspections; no production file edits | Exact artifacts, client outputs, ID-joined graph/API/UI evidence, restart and release comparison; run per affected slice and again after assembly |
| R0 preliminary code/security reviewer | Frozen slice diff + available T tests; no dependency on V or I final build | Read-only review outside authored implementation; prerequisite findings for safe assembly | Contract/security/race/resource review before I; this is not final live-evidence approval |
| R final independent code/security reviewer | I assembled exact build + T + V evidence | Fresh read-only code/evidence review, not assumed inherited R0 PASS | Graph integrity, actual live/package evidence, auth/privacy, lifetime and requirement review; repairs invalidate affected receipts |
| I controller / integrator | Frozen slice changes and preliminary T/R0 findings; dependencies compile | Assemble/commit identified paired candidate, merge/rebase/cherry-pick if separate worktrees were used, serialize packaging/CI/root changes; final acceptance waits for post-assembly T/V/R | Re-run integrated tests and §6 journeys after assembly; do not reuse pre-integration PASS or require final verification before a build exists |
| X packaging/cutover owner (controller-designated) | I and M11 for cutover preparation; all final gates before promotion/removal | Named packaging/release-switch files and rollback receipts in both repos; build first, then send exact cutover artifact to V/R | Reproducible stage-bound artifact closure, real-client release parity, persisted-state-compatible rollback before React removal |

A representative dependency path is A0 -> (A1 || A2) -> A3 -> (Q0 || Q1) -> C0a ->
(C0b -> C1/C2 -> D0 -> disjoint D slices) in parallel with required C3/B0-B10 backend branch -> preliminary T/R0 ->
I paired assembly -> post-assembly T/V/R -> combined controller acceptance -> X. §17 defines backend edges;
the branches share wire contracts, not concurrent ownership of common files. Repeat assembly/review after repairs.
X may prepare and assemble the cutover candidate before its final gates; promotion/removal waits for the
post-build receipts. A test build must exist before it can be verified; no task depends on its own final PASS.
Review starts per frozen slice and repeats on the integrated candidate; the diagram is not a waterfall excuse to
postpone tests or independent review until every route is ported. Component, chart and API boundaries must be
agreed before parallel writes; initial worker count is bounded by memory/CPU/provider budgets and adjusted by
controller observation, not a target to maximize concurrency.

### 14.3 Handoff/evidence contract

Each assignment supplies: task/requirement IDs; role and returned agent target; active phase; source worktrees
and exact paired SHAs; normalized diff basis; current artifact/hash; approved scope, file list and exclusions;
upstream docs/addenda/current contract refs; dependency status; test commands/expected RED; review questions;
resource/provider/privacy budget; ports/state roots where applicable; output/evidence paths and acceptance gates.
Do not delegate a vague "review the migration" with no fresh context bundle. Use the canonical review-bundle
helper during an implementation run and store stable bundles under run-scoped evidence, not private raw data
in a public issue/PR. Public and private artifacts cite one another through safe IDs/digests where necessary.

Every return includes actual touched files and commit/diff identity, tests executed and exits, RED/GREEN/refactor
receipts, live correlation evidence if assigned, findings/limitations and requirement completion status. The
controller reads outputs and checks claims against the actual filesystem/diff and raw evidence. A chat summary,
agent status, completed task flag, assertion of "tests pass" or `success: false` route is not acceptance.
Failed/interrupted attempts retain logs and must be repaired/re-run or recorded as an explicit fallback.

Material delegated work has a durable action record under the run's subagent records; raw transcripts/stdout
and invocation metadata stay in run-scoped evidence/router paths when routed. Review records name the stable
artifact and inputs actually reviewed. If repairs change the hash/scope/evidence, refresh the bundle, invalidate
affected claims and re-review. The controller records acceptance/rejection, its own verification and any repair
performed after checking delegated output. Do not fabricate a delegated review when self-audit was required.

### 14.4 Controller closeout and independence

For every slice: draft -> independent review/audit -> repair -> re-audit -> pass -> supported lock, when the
recursive workflow applies. Independent reviewers do not approve their own implementation or tests. Controller
remains the final reviewer/integrator and may reject a delegated PASS; findings need code/evidence references
and explicit resolution, not votes. If delegation is unavailable, record the capability probe and full self-audit
with the same checklist; never reduce requirements or claim external independence.

Controller closure requires strict TDD receipts, maintained-suite promotion, code/test/security reviews,
applicable G-BACKEND/G-LIFECYCLE/G-SQL/G-DATA and G-API/G-COMPONENTS/G-CHARTS/G-PERF checks,
real J1/J2/J5 and changed-path traces, release/dev/candidate
delta disposition, identified paired packaging and a demonstrated rollback. Requirement states distinguish
planned, implemented, verified, failed and NOT RUN with cited changed files and separate verification evidence.
No phase advances because other workers are waiting. No migration implementation, protected-branch change,
production runtime reset or new provider expenditure is authorized by this documentation edit alone.

## 15. Backend Effect implementation: current owners and required conversions

### 15.1 Source evidence and existing adoption

Backend source analysis on 2026-10-24 used the clean public f0d50fab and private 16021cc5 worktrees;
both dev refs were fetched again and still matched GitHub. P below denotes the public repository,
I the private repository. Public package/host paths below are under role-model-router. Private source
references identify owner modules, not permission to publish private schemas or captured content.
This is targeted source analysis, not a full dynamic audit or a claim the migration is implemented.

| Current owner / source anchor | Observed implementation | Required disposition |
| --- | --- | --- |
| P packages/effect/{package.json,entries.mjs,build.mjs}; entries:9-36, build:54-100 | Stable4.0.1, case-sensitive Schema/schema entry repair, shared chunks, Node24 build, selective declarations | Retain repairs; paired upgrade plus Node/browser/platform/testing/diagnostics closure and real target typechecks |
| P host src/queue-runtime/{index,store,queues,evaluation,learner,workers}.ts; index:151-215; queues:16-63 | Real Effect persistence PersistedQueue, scoped store Layers, per-plane ManagedRuntime and worker fibers | Retain persisted codecs, claim/retry IDs and store; complete ownership/cancellation, not queue replacement |
| P host src/track-b-auto-replay-runtime.ts:20,99-173,524; run108-observability.ts:1-67,112-149 | Effect handoff/claim/replay helpers, scope-specific metrics and stage tracing | Preserve existing adoption and isolated registry; close remaining Promise/task seams |
| P packages/core/src/{router,route-advisory-ladder,route-ladder-dispatch,reason-codes}.ts; router:1976,2141 | Deterministic synchronous routeRequest plus partial Effect schema/ladder seams | Pure scorer retained; Effect producer/service edge, explicit caller migration, wire and empty-pool parity |
| P host src/index.ts:11576-11670,20297,20443,24173,34276-34293,34753-34764 | node:http, Promise backend factory, working abort/drain support, callback notifications and detached background work | Required domain/request services, owned tasks, typed failures and shutdown |
| P host src/{cli,track-b-runtime,track-b-operations,benchmark-runner}.ts; cli:3438,4040,4205,5347; operations:967-1023,1504 | Imperative lifecycle, sidecar/operations workflows and policy-specific retries; sequential benchmarking | Extract small owner modules then convert orchestration; retain pure normalizers/codecs and actual retry policies |
| P packages/process-supervisor/src/index.ts:60-63,115-139,147 | Spawn APIs, health polling, mutable process records/restart promises | Required scoped process leaf, platform-node closure, Windows process-tree integration tests |
| P packages/sqlite-memory/src/index.ts:167-212,4738,5217-5253,6497-6522 | DatabaseSync/retry waits, SQL observation transactions, graph-pointer hydration and maintenance | Required Effect SQL/observation service and explicit async caller migration; retain sync façade and store authority |
| P packages/runtime-observability/src/{index,otel}.ts; otel:9-39 | Business observation/traffic/effort data plus GenAI attribute projection | Retain telemetry, add bounded separate module diagnostics; attribute mapper is not an exporter |
| I shared/queues/{queue-root,queue-store,evaluation-queue,evaluation-worker}.mjs; sidecar:4401-4450 | Existing persisted producer/store; public host consumes packaged evaluation work. Private evaluation worker exists/tests exercise it, not established as live | Follow actual producer/consumer wiring, do not instantiate another worker or migrate dead code as if production |
| I scripts/track-b/runtime-operations-server.mjs:648,850,1743,3456,4195,4401,5402 | Partial Effect queue handoff inside Promise extension/operator/replay/retention owners | Required private service/Layer composition, boundary errors, finalization and public/private integration |
| I extensions/{artifact-store,event-log,replay-core,memory-store}/index.mjs; shared/{capture,graph,retention,projections} | Domain journals, graph/artifact authority, replay snapshots, local capture WAL, archives/holds/restore already exist | Adopt existing owners as service leaves; do not create a competing persistence authority |

The live queue plane currently uses Effect persistence interfaces. Vendored effect-mq and wrappers exist;
that does not mean every queue runs effect-mq Job/Worker. Adopt effect-mq where suitable, not by renaming a
working persisted store. Provider-* packages are largely protocol translation/detection; actual HTTP execution
is in the host. Pure helpers need not become async services just to increase Effect import counts.

Source-grounded regression candidates, not claimed reproduced runtime failures:

- P supervisor:126 awaits health fetch without a signal; an outer wall-clock deadline cannot bound a hung call.
- P queue workers:246-247 discard tryPromise's signal. Timeout/cancel can stop the Effect/ack path without
  stopping underlying Promise I/O. Pass cancellation to actual I/O and fence late completion before retry/ack.
- P backend shutdown:34276-34283 does not visibly own the detached bootstrap at34286 or reprobe timer34764;
  test shutdown during both. Sidecar launch readiness/cleanup in track-b-runtime:12753-13044 also needs scopes.
- I sidecar:7319-7328 starts capture backlog interval; close:8601-8615 closes stores without clearing/joining
  that drain. unref is not cleanup. Preserve one drain at a time and the bounded five-item/five-second cadence.

Read-only anti-slop lint on sampled existing files produced representation/assertion/unknown/service-constructor
findings; these are pattern debt, not a count of proved bugs. Do not delete security checks or bulk-fix legacy
files in extraction commits. Lint changed first-party slices with the anti_slop_lint tool (Effect rules where
applicable), fix or explicitly review findings using contracts/tests, and leave vendor source untouched.

Source-reading index (pinned worktrees; private links are local reviewer navigation, not published source):

- [Public queue store](../../role-model-router/apps/runtime-host-bridge/src/queue-runtime/store.ts),
  [worker cancellation seam](../../role-model-router/apps/runtime-host-bridge/src/queue-runtime/workers.ts#L227-L304),
  [PersistedQueue SQLite deviation](../../role-model-router/apps/runtime-host-bridge/src/queue-runtime/learner.ts#L13-L19).
- [Process health owner](../../role-model-router/packages/process-supervisor/src/index.ts#L106-L145),
  [public SQL retry](../../role-model-router/packages/sqlite-memory/src/index.ts#L167-L212),
  [graph-backed observation read](../../role-model-router/packages/sqlite-memory/src/index.ts#L5217-L5253),
  [actual routeRequest](../../role-model-router/packages/core/src/router.ts#L1976).
- [Existing metric scope](../../role-model-router/apps/runtime-host-bridge/src/run108-observability.ts#L45-L67),
  [GenAI projection, not exporter](../../role-model-router/packages/runtime-observability/src/otel.ts#L9-L39),
  [operations retry policy](../../role-model-router/apps/runtime-host-bridge/src/track-b-operations.ts#L967-L1023).
- [Private queue store](<D:/DEV/role-model-internal/.worktrees/baseline-effect-foldkit-20261024/shared/queues/queue-store.mjs#L74-L99>),
  [real evaluation producer](<D:/DEV/role-model-internal/.worktrees/baseline-effect-foldkit-20261024/scripts/track-b/runtime-operations-server.mjs#L4401-L4450>),
  [capture drain](<D:/DEV/role-model-internal/.worktrees/baseline-effect-foldkit-20261024/scripts/track-b/runtime-operations-server.mjs#L7318-L7328>)
  and [close owner](<D:/DEV/role-model-internal/.worktrees/baseline-effect-foldkit-20261024/scripts/track-b/runtime-operations-server.mjs#L8601-L8615>).
- [Graph compatibility, not storage authority](<D:/DEV/role-model-internal/.worktrees/baseline-effect-foldkit-20261024/shared/graph/index.mjs#L1-L79>),
  [ArtifactStore](<D:/DEV/role-model-internal/.worktrees/baseline-effect-foldkit-20261024/extensions/artifact-store/index.mjs>),
  [EventLog](<D:/DEV/role-model-internal/.worktrees/baseline-effect-foldkit-20261024/extensions/event-log/index.mjs>),
  [capture WAL](<D:/DEV/role-model-internal/.worktrees/baseline-effect-foldkit-20261024/shared/capture/durable-queue.mjs>).

### 15.2 Target service graph and process boundaries

The following names are planned internal contracts, not claims of existing classes/files. Prefer owner-local
modules over new domain packages without a second consumer/release boundary:

- Pure kernel: deterministic policy/scoring/tie breaks, schemas/reason vocabularies, wire projections, graph
  registry and folds. No fetch/SQL/clock/random inside a pure fold or score calculation.
- Shared process leaves: RuntimeConfig/identity, credential-reference resolver, Clock/IDs, HttpClient,
  ProcessSupervisor, scoped SqliteMemory/store owners, ObservationRepository and DiagnosticsService.
- Public domains: RoutingService calls the pure scorer; ProviderExecutor owns actual I/O; CapturePublisher
  calls the current graph/capture boundary; TelemetryService persists canonical observations; QueuePlane
  retains existing persisted queues; PrivateOperationsClient preserves authorized private transport.
- Private domains: ArtifactGraphService, EventLogService, CaptureDrain, RetentionService and
  Replay/Evaluation/LearningServices compose the existing stores/extension processes into OperatorSurface.
- Edges: node:http/SSE, CLI/signal handlers and SDK/extension façades run Effects at explicit boundaries.
  Existing Promise methods stay Promise methods; sync exports stay sync until deliberately migrated.

Each process has a closed Layer DAG and owned scope. Reuse actual leaf Layer OBJECT identities/MemoMap
when sharing is intended; merging sibling Layers does not supply their requirements. Require a closed input
environment at runtime entry and test partial startup/disposal. Existing queue-plane SQLite clients remain
independent until a measured migration proves shared-client equivalence; a shared tag is not shared ownership.
Public host, private sidecar, worker processes and browser exchange validated DTOs, not raw Causes, Layers or
Fibers. They have separate Effect runtime identities. Private .mjs service adoption does not require a wholesale
TypeScript rewrite. Avoid nested runPromise inside domain services or per-request recreation of the graph.

### 15.3 B0-B3: contracts, diagnostics, process and public SQL leaves

Every B slice requires strict TDD and permanent tests. Backend conversions are required program work, not
conditional on the frontend failing. Retention decisions for already-pure/already-correct modules are explicit.

| Slice | Source ownership / proposed modules | Implementation and evidence |
| --- | --- | --- |
| B0 contracts/extraction | P host index/cli/track-b-runtime/operations/benchmark; I sidecar; internal backend/, routes/, domain modules | Freeze exports, sync/Promise methods, auth/route order, closure captures/config; characterize, move+shim, then separate behavioural conversion. No giant all-monolith split prerequisite |
| B1 diagnostics foundation | P run108-observability/runtime-observability retained; new diagnostics service/reporter/DTO and private operation boundaries | Minimal bounded test sink and Cause attribution, native reporter after API proof; authorized bounded query before broad instrumentation; preserve business result and current telemetry |
| B2 process supervisor | P process-supervisor and selected vendor/owned-sidecar callers; platform-node/node-shared wrapper closure | Scope child/streams/readiness/exit/restarts, bounded polling and stop; preserve environment/cwd/logs/Windows tree cleanup; real child/grandchild + SEA smoke |
| B3 public SQL/observations | P sqlite-memory/sql-sqlite-node and named async host callers; AsyncSqliteMemory/ObservationRepository | Fallible acquire/PRAGMA/SQL/transaction/finalization; original errors, exact busy schedule, graph hydration, sync compatibility, explicit async callers and maintenance fencing |

B1 retains run108's per-runtime metrics and spans. Machinery diagnostics are separate from business token/
routing telemetry. Preserve each Fail/Die/Interrupt reason and original error identity; cancellation is not a
defect. Record earliest observed module/operation origin with bounded propagation; do not invent an upstream
source line. One reporting owner at request/job/lifecycle edge after finalizers and before error translation
avoids duplicates. Compile target ErrorReporter/Cause APIs rather than copy rc.117 code. Test nested/mixed/
reused errors, acquire/finalizer failure, hostile/cyclic serializer inputs, sink overflow and exporter outage;
sink failure must not alter business Cause or recurse into itself.

Add bounded diagnostic record/byte/ingress/formatting/TTL/query limits before enablement; calibrate values, not
assume historical defaults measured safe. Include instance/build/source identity, loss/history floor and cursors,
not raw prompts/provider bodies/secrets or unrestricted fiber dumps. Required additive authorized local read API
and Foldkit Observe diagnostics page must have loopback peer, trust/read-credential, exact Host/Origin and
redaction tests; never trust forwarded owner headers or wildcard CORS. Show denied/stale/drop/no-data/disabled
states honestly. OTLP tracer, logger and metrics are separate optional sinks with bounded flush/outage behavior,
no collector admission dependency, and low-cardinality labels; retain existing GenAI attribute contracts.

B3 preserves initial + two busy retries (100/200ms waits) and 5s busy timeout unless an explicit policy change is
approved. Catch open/PRAGMA errors as operational failures and close partially acquired handles. Preserve the
primary SQL error if rollback/close also fails. SQL BEGIN/COMMIT/ROLLBACK use one owned connection and existing
nesting semantics; Effect Ref/Tx* memory operations do not transact SQL. Never retry provider/network side effects
inside a SQL transaction. The vendored node:sqlite client remains synchronous: an Effect/Promise façade only
makes outer retry sleeps nonblocking. Measure event-loop/lock cost; off-thread/driver changes need separate
SEA/caller/serialization proof. Do not run scheduled retry via runSync. Keep sync adapters while explicitly
migrating async callers. Serialize connection/transaction ownership, not a shared depth counter across yielding
fibers. Drain/fence every owner before backup/reset/restore; preserve per-store PRAGMAs and source graph closure.

### 15.4 B4-B6: routing, provider execution, streaming and public composition

| Slice | Concrete source scope | Required conversion and invariants |
| --- | --- | --- |
| B4 routing/registry/schema | P core router/reason-codes, protocol-routing, endpoint-registry and actual decode callers | Effect routing producer around unchanged deterministic kernel, explicit caller/type edges; Schema vocabularies and code/detail wire projection, no hidden policy/default changes |
| B5 provider/private transport | P host provider attempt/stream functions, track-b-operations and benchmark judge I/O | HttpClient/Stream, typed transport/status/auth/protocol/timeout/cancel errors, actual AbortSignal propagation, reader/listener cleanup and exact retry/commit semantics |
| B6 public application | P backend factory, CLI lifecycle, owned sidecar/capture/outbox and benchmark-runner/judge-runtime | Closed domain Layers, scoped bootstrap/refresh/drains/benchmarks, config/cache permits and shutdown; preserve Promise/sync facades and early readiness |

B4's routeRequest currently returns a synchronous decision. The Effect producer retains the pure computation;
either explicitly migrate the export/type edge and callers, or add a separately named producer with a tested
compatibility adapter. Returning Effect does not preserve a sync signature. A protocol-routing runSync edge is
valid only while no async service is required. Preserve empty-pool success with empty chosen endpoint, tie order,
role/task/effort and arm identity, and decision golden bytes. Deriving reason codes from Schema does not authorize
changing values/order or spreading tagged errors onto the wire. Registry fail-closed unknown-input rejection is
a deliberate behavior change: enumerate current legacy accepted spellings and obtain reviewed semantics first.

B5 preserves existing abort and drain support. Thread tryPromise's signal through actual fetch/private I/O and
readers; an interrupted Fiber does not automatically stop its Promise. Acquire scoped listeners/readers and
cancel/release on every exit. Span the asynchronous operation, not only Promise creation. Preserve operations
connection retry delays250/1000/2500/5000ms and distinct typed idempotent aggregate timeout policy
(operations:967-1023); status/protocol/caller abort are not generic retry. Never repeat arbitrary billable inference.
Keep substantive-first-delta commit gate, tool/result pairing, reasoning/content policy, UTF-8/SSE fragmentation,
finish/DONE/error envelopes and lossless downstream backpressure. After response commit do not send a second
HTTP response or restart inference. Only refresh notifications can coalesce/slide with explicit gap+snapshot
resync; token streams cannot share that lossy buffer.

B6 replaces detached intervals/Promise tails with scoped non-overlapping fibers and suitable gates, preserving
cadence, first-run, limits and idempotency. Share provider permits at the process owner, bound waiters separately,
retain concurrency defaults and approve parallelism as a distinct policy change. Metadata caches retain config/
authority/model keying, TTL, cap and invalidation; never deduplicate distinct stochastic inference. Keep early
UI/health bind before backend readiness, truthful degraded startup, idempotent shutdown, sidecar byte/token/
loopback/readiness checks and exact Node/SEA selection. Stop admission, join/drain or interrupt tasks, then close
dependencies; one finalizer error must not skip remaining releases or trigger early process.exit. BenchmarkRun
owns judge throttle/circuit/membership/progress per run: preserve sequential grading and linear retry waits,
then test cancellation and overlapping-run isolation before any concurrency change.

### 15.5 B7-B9: private persistence, background work and cross-repo ownership

| Slice | Concrete source scope | Required conversion and invariants |
| --- | --- | --- |
| B7 private stores/graph/capture | I artifact-store/event-log/memory-store; shared graph/capture/retention; sidecar retention builder | Scope existing storage leaves and capture drain; typed errors, immutable commit/idempotency/lease/backup/restore APIs; no new rich journal authority |
| B8 queue/replay/eval/learner | P queue-runtime/auto-replay/supervised handoff; I shared queues and replay/evaluation/profile/trajectory owners | Interruptible actual handlers and scoped worker ownership; retain persisted jobs/IDs/locks and evidence-before-ack; dynamic policy and late-write fencing |
| B9 private/public application | I operations/operator/replay/retention builders and extension process/journal; P private client/sidecar/CLI adapters | Closed private Layers and validated DTO/version/auth/readiness boundaries; correlated capture/observation/projection and exact paired build closure |

ArtifactStore owns graph bytes; the graph registry describes compatibility and is not a database. Preserve
immutable occurrences/roots/generations, request-hash duplicate checks, shared blob reference lifetime,
redaction/encryption/key/channel/scope authority and honest unavailable states. EventLog is bounded metadata,
not a complete raw inference journal. Actual CaptureQueue callers persist a bounded local raw-capture ingress
WAL; its storageMode label is not proof of reference-only payloads. Do not copy raw payloads to generic jobs or
change pointer/encryption/admission/degraded-routing policy without a separate privacy/contract decision.
Preserve per-store PRAGMAs: ArtifactStore DELETE/FULL/FK versus relevant WAL stores.

B7 CaptureDrain owns in-flight work and bounded stop/join, preserving caller-priority startup flush and small
periodic batches. Test stale leases, interrupted maintenance, failed ack/late completion, corruption/decryption,
restore and partial publication using real disposable stores. One SQL transaction cannot commit another DB,
file or blob store atomically. Separate transactional from post-commit errors: rollback after an already committed
EventLog append can mask the original lookup/prune failure; test committed-state reporting and finalization. Preserve existing recovery receipts; a new cross-store guarantee needs an explicit
durable outbox/idempotent protocol, not a belief that Layer/Scope makes dual writes atomic.

B8 retains the current PersistedQueue deviation: effect-mq is vendored but its available reviewed drivers do not
provide a production SQLite replacement. A new effect-mq SQLite driver is a separate approved conformance slice,
not a required name swap. Preserve replay round/reservation/attempt IDs, effort finalization, terminal versus
deferrable refusals, tool policy, recovery handoff and source availability; do not revive superseded recovery
passes. Timeout/cancel must reach real I/O and stale attempts must not publish/ack after lease loss. Local fiber
or semaphore counts plus exclusive same-row claims do not prove a global concurrency cap across hosts/distinct
jobs. Characterize topology/policy and enforce single owner or distributed admission if required; test two hosts,
two jobs and max-active1. Public host remains the actual packaged evaluation consumer until a reviewed topology
change. Scope-root paths, kill/drain/retry readback and cleanup must agree across processes.

B8 also preserves existing durable trial sandbox/lease/heartbeat and scorer behaviour: submitted output is
reused after scorer failure rather than re-running inference; a provider receipt precedes branch/evaluation
handoff and is not redispatched after recovery. Preserve no-egress sandbox/process-tree/time/output/workspace
limits, holdout/scorer provenance, deterministic ladder/floor/tie policies and versioned profile publication.
Learning/evidence materialization already has Effect folds; reuse them and their rollback generations, not a
second learner. Authorized contribution remains aggregate-only with independent consent/destination/revocation
and late-ack checks; framework conversion cannot export raw graph/capture content.

B9 scopes worker processes, readline readiness, ephemeral auth, timeouts and post-acquire endpoint rejection
with their stores; partial startup must release the child. Preserve bounded pagination, missing-versus-unavailable
joins, live/probe/evaluation classification and codec/externalization limits. Public/private service migration is
incremental and compatible; an answering port is not proof the private package matches the public build.

### 15.6 B10: backend integration and regression acceptance

B10 composes B1-B9 at the actual public/private entry points and closes the backend ledger. A wrapped but unused
leaf is not converted; a token Effect around an unowned timer/Promise is not structured concurrency. Classify
every production operation/resource as converted, retained-pure, retained-compatible-adapter,
retained-existing-Effect or approved N/A, with caller/source/test evidence. No blanket retention for monoliths.
Remove old orchestration only after callers migrate. Minimal B1 query tooling precedes service conversion;
its additive diagnostics page can be built once in Foldkit after client primitives, while existing observability
and store-degradation pages remain intact.

Maintained regression anchors to extend (not tests executed for this proposal):

- P process-supervisor/test/index.test.ts and CLI startup/sidecar suites: hung health, partial acquire, ignored
  stop/grandchild cleanup, repeated stop, post-acquire endpoint failure and early UI readiness.
- P sqlite-memory/test/recursive-87-atomic-observation.test.ts, recursive-87-maintenance.test.ts,
  run95-migration-parity.test.ts, run106-effort-source-migration.test.ts: exact retries, transaction/cleanup fault,
  graph hydration and backup/restore after drain.
- P host run101-addendum06-attempt-timeout, run101-r5-cancel-drain, addendum19-stream-commit-point,
  addendum20-substantive-stream-gate and addendum21-terminal-stream-error: actual Promise I/O cancellation and
  late completion, not only Effect.never/source regex; fragmented frames and slow downstream drain.
- P run108 observability/metric/span/case-entry and benchmark-judge tests: two runtime scopes, per-run judge
  isolation, exporter outage, bounded resync and causal IDs across complete asynchronous spans.
- I queue/capture/event/artifact/retention/replay/projection tests: immutable duplicate conflict, source/branch
  links, evidence-before-ack, lease fencing/reclaim, shared blob holds/GC, privacy/channel/scope and reader/version
  refusal on real disposable DBs/files. Kill actual processes at enqueue/claim/result-before-ack/publication;
  Fiber interruption is not crash proof and current live provider work is not assumed restartable.
- Final identified public SEA/private distribution on supported Windows/Linux lanes plus browser-safe build,
  complete peer/import/one-Effect checks and real DSH/pi R/D/C API/frontend/graph/storage journeys (§6).

## 16. Historical requirements reconciliation and storage design boundaries

The archive is not resurrected by renumbering. Landed domain mechanisms are not automatically proof of a
stronger universal protocol. Outstanding owner commitments remain explicit; framework migration cannot be
called complete fulfillment of the old design while silently dropping them.

| Historical topic | Current evidence | Disposition |
| --- | --- | --- |
| Stable Effect/platform wiring | Stable4.0.1 and queue/SQL wrappers landed; new Node/browser closure needed | M1/B0/B2/client M2 implement current target reachability, not rc introduction |
| Core/process/SQL/CLI/registry conversion | Partial schema/queue islands, imperative major owners | Required B2-B6 with current contracts, not optional repair |
| Diagnostics and exporters | Existing run108 scoped metrics/spans/readback; GenAI mapping, not bounded module-Cause API | Required B1 additive foundation/query/Foldkit page and isolated optional export adapters |
| Event journal/checkpoints | I EventLog:115-202 domain sequence/hash/archive; replay-core:560-631 bounded versioned checkpoint; graph generations | Retain in B7/B8, not claim common-sequence all-projection coherent C |
| Archive/pins/retention/backup | ArtifactStore:2174-2265 held closure/tombstone/GC; retention:974-1065; P SQL:3897-4200 bounded archive/retention | Retain exact semantics; finite leases expire today, stronger nonexpiring dependency pins are not incidental conversion |
| Universal journal/coherent C/cold tier/erase epochs | Existing domains do not establish full global envelopes, projection CAS, complete cold source graph or stronger late-writer erase authority | E1 extension design and explicit owner disposition; no stale SQL block copied into migration |
| ALL accepted live requests durable/results/reconnect | Capture/background persistence does not prove every admitted HTTP/SSE inference is restartable | E2 extension design and explicit owner disposition; preserve current abort/SSE during B slices |

E1/E2 are larger product protocols, not required by Foldkit. Before implementation scope locks, record the
owner-approved disposition: include fully specified, re-analysed tasks in this program, or explicitly defer to a
named follow-on with rationale and revised completion scope. Historical owner choices are not cancelled merely
by calling them redesign. Until disposition, list unresolved; claim only framework migration preserving current
semantics, not universal storage/all-live-durability delivery. No new destructive tiering or live-admission change
while unresolved. If included, add implementation tasks/dependencies/acceptance, not just an appendix promise.

E1 requires a current full-envelope/order/projection-membership protocol, common-watermark/CAS checkpoint and
rebuild laws, complete graph/source archive reader/checksum/publication, durable pin/outbox/deletion fences and
privacy/backup/late-publisher authority. Test all prune/clear/restore paths, shared blob references, torn archives,
pin/delete races, erased-data non-resurrection and reader/rollback compatibility. Old10-table syntax checks do
not establish current migration or crash guarantees.

E2 requires persisted accepted/queued/running/terminal/uncertain states, conflicting submission identity rules,
pinned decision/config/model versions, source dependencies, offsets/result/status/reconnect authorization and
explicit cancel-versus-detach/provider-attempt ownership. Legacy HTTP/SSE stays wire compatible; a socket cannot
survive crash. Paid external work can be uncertain after a crash; never claim external exactly-once or blindly
repeat unsafe operations. Ack after durable result/receipt and test kill before claim, during provider call,
before ack, result publication and reconnect/history-floor gaps.

For B0-B10 prefer unchanged schema/file formats. Necessary schema changes require versioned idempotent
migration, copied-fixture preflight, N/N-1 reader/build matrix, source/channel/key backup manifest and rollback
retirement window before authority switch. Code rollback cannot undo incompatible bytes. Long-lived store
owners must drain/fence before reset/restore. One public SQLite backup is not artifact/graph/queue/key closure;
use consistent snapshots and current recovery protocols. No global WAL switch, shared R/D/C writable state or
old binary against new schema. Retain a compatible reader or approved forward repair/export path.

## 17. Combined backend/client dependency and completion plan

B labels identify backend work packages; M labels identify program/client milestones; Q0/Q1 name baseline
verification/harness team tasks so their IDs cannot collide with backend B0/B1. Every B row requires
completion or a reviewed per-operation retained disposition. No backend is "done" merely because Effect4.0.6
builds or the frontend parity suite passes. E1/E2 require explicit disposition before final scope approval.

| Backend package | Dependencies | Team owner / write scope | Required closure |
| --- | --- | --- | --- |
| B0 contracts/extraction | A1/A2/A3, M0a/M4 baseline; M1 before new target APIs | Contract author + one serialized owner per monolith region; move+shim separate | Current export/route/lifecycle ledger and baseline characterization |
| B1 diagnostics | M1 + B0 operation map | Named diagnostics service/reporter/API modules and separate private operation instrumentation | Bounded/auth/error attribution RED/GREEN before larger conversion |
| B2a Node platform closure | M1 + B0 required-import inventory; independent of client C0b | Designated Node wrapper owner for platform-node/required node-shared/declarations, shared Effect edits serialized with C0b | Target-version compile/import/one-identity proof, real process primitive SEA smoke before supervisor consumers |
| B2 supervisor | B1 + accepted B2a | process-supervisor and named sidecar adapter files | Hung health/restart/partial acquire, bounded OS cleanup and SEA |
| B3 public SQL | B1 | sqlite-memory owner + named async caller handoffs | Exact busy/transaction/handle/maintenance contracts and graph hydration |
| B4 routing/registry | B1 + frozen codec policy | core/protocol-routing/registry owner and coordinated call sites | Deterministic/empty-pool/wire/schema golden plus Effect producer |
| B5 transports | B1/B4 contracts; B3 at observation integration | Extracted provider/private execution/stream files | Actual cancellation/retry/drain/response commit semantics |
| B6 public composition | B2/B3/B4/B5 integration interfaces | Backend composition/CLI/benchmark owner; serialized shared monolith writes | Closed Layers, all timers/tasks owned, early readiness, no late I/O after stop |
| B7 private storage | B1 + private storage authority contracts | Named private store/capture/retention adapters and tests | Same persistence/privacy/lease/restore authority with scoped cleanup |
| B8 background workflows | B1 + B5 cancellation + B7 leaves; integrate into B6/B9 after | Public queue and separate private replay/eval/learner owners | Existing queue identities/evidence-before-ack, fenced late completion and topology proof |
| B9 private composition | B2 process interface + B7/B8 service interfaces | Private application/operator composition, public counterpart assigned separately | Closed compatible private graph and exact authenticated DTO/version/readiness |
| B10 integrated backend | B1-B9, code/test review, identified paired artifact assembly | Controller + independent live/verifier reviewers | G-BACKEND/G-LIFECYCLE/G-SQL/G-DATA/G-LIVE/G-TRACE-STORAGE/G-RELEASE and §6 receipts |

High-level DAG: baseline/contract tests -> M1 -> (B2a Node wrapper || B1 diagnostics) ->
independent B2/B3/B4/B7 leaves -> B5/B8 ->
B6/B9 -> B10. Wrapper work for client M2/M3 can run alongside backend foundation. M5 pilots and route waves
use frozen wire DTOs; they do not wait for all B conversions. A wire-affecting backend slice must freeze its
contract before the consuming route slice starts. Integrate B6/B9 against approved service interfaces using
explicit task dependencies; never require B10's final live PASS before an assembled test build exists.

Final M11 audit requires backend B10 plus frontend M5-M10, including B1 diagnostics API/page. M12 cutover is
blocked by either incomplete track or unexplained R/D/C divergence. Roll out compatibility flags one owner at a
time with one active writer/claim owner; preserve current queue modes until intentional mode transition tests.
Measure latency/event-loop delay, cancellation tail, open handles, queue/store contention, diagnostics overhead
and private/public shutdown under quiet/burst/degraded/collector-down cases; G-PERF is not only bundle gzip.

### 17.1 Backend coverage/acceptance ledger

For every production operation/resource record: public/private repo + path/export, current owner/caller,
converted or explicit retention disposition, Effect service/Layer and scope, typed error/wire projection,
transaction/lease/fence and cancel policy, B/M/task/requirement IDs, RED/GREEN/refactor/maintained-lane evidence,
unit/contract/integration/property/OS/package/live coverage or reviewed N/A, source/build identity, reviewer and
rollback. Diagnostics, data/journal redesign and runtime conversion must not be conflated in the completion count.
Each B slice returns implemented separately from verified; unresolved E1/E2 or unavailable live evidence is named,
not converted into PASS by marking a shared task complete. Controller inspects real callers and final integrated
artifacts before accepting this as an end-to-end Effect backend + Foldkit migration.

## Appendix A - vendor entry

```js
foldkit: {
  url: "https://github.com/foldkit/foldkit",
  tag: "foldkit@0.169.0",
  commit: "7ee214268c602967937b80f6f20d1e831f2e8ab6",
  dir: "vendor/foldkit",
  license: "MIT (Copyright (c) 2026 Devin Jameson)",
  packageGroups: "`foldkit`, `@foldkit/ui`, `@foldkit/oxlint-plugin`",
  // Payload is enumerated, not filtered: --sync archives these paths verbatim.
  payload: [
    "packages/foldkit",
    "packages/ui",
    "packages/oxlint-plugin-foldkit",
    "LICENSE",
    "README.md",
  ],
  excludes: [".git", "node_modules", "*.tsbuildinfo"],
  reason:
    "Foldkit is the Elm-architecture frontend runtime the runtime UI is being ported to. Vendoring keeps the " +
    "reviewed source in-repo (offline builds, auditable pin, one Effect instance) and lets our wrapper own the " +
    "Effect peer range instead of inheriting upstream's exact pin.",
}
```

## Appendix B - wrapper skeleton

```json
{
  "name": "foldkit",
  "version": "0.0.0-vendored",
  "private": true,
  "type": "module",
  "exports": { ".": "./dist/index.js", "./*": "./dist/*.js" },
  "peerDependencies": {
    "effect": "workspace:*",
    "@effect/platform-browser": "workspace:*"
  },
  "scripts": { "build": "node build.mjs" }
}
```

`build.mjs` reads `vendor/foldkit/packages/foldkit/package.json` `exports`, maps `./x` to
`dist/x/public.js`, and esbuild-bundles each entry from the vendored `src`, with `effect` and
`@effect/platform-browser` marked external and `parse5` bundled.

## Appendix C - supersession map

| Superseded section | Replaced by |
| --- | --- |
| v3.0 §0.1 vendor/platform decision (stable 4.0.0 exact pin) | §0, §3.1, §3.2 (4.0.6) |
| v3.0 §0.2 "React remains Effect-free" | §0 D-U1, §5 |
| v3.0 §1.1 measurements | §2 (re-measured at `f0d50fab`) |
| v3.0 §2 M1 "stable vendor pair" | §3, §7 M1-M2 |
| v3.0 §3.1 platform-node | §3.4 and §15 B2 (required Node process closure) plus independent browser-safe client graph |
| v3.0 §9-§10 test and UI verification | §5.7-§5.8, §6, backend §15.6 and combined §17 completion |
| v3.0 §12 rollback | §12 (unchanged in spirit, extended for the UI) |
| v3.0 §4-§8 conversion work | Replaced by source-grounded required B0-B10 (§15/§17); stronger historical storage/live durability explicitly reconciled as E1/E2 (§16), no implied stage execution |
