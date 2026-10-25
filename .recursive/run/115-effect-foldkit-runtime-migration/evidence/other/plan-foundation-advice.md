# Run 115 — first-slices test design advice (read-only)

**Bounds.** No writes, no children, no runtime starts, no binary fetches. Nothing below reopens E1/E2 (`R34`/`R35` stay deferred to the named follow-ons). Source-of-truth driver stays blocking `node:sqlite`/`DatabaseSync`; no native driver, no server dependency, and **no `@effect/platform-node*` in the client graph** (that closure belongs to backend B2, later). `M0a` real receipts gate **M1 acceptance**; building the tests/fixtures below may precede the provider preflight.

## Slice 0 — M0a receipts (gate, no product code)

Record at the execution SHA: paired `origin/dev` commit/tree, Node/pnpm/corepack, `VENDORED.json` digest for both repos, wrapper build SHA, one isolated real-client preflight (separate profile/session, isolated loopback port, `NOT RUN` allowed). If client/provider is unavailable, M1 stays open — never substitute fixture evidence. Do not touch 3456/3457/3458.

## Slice 1 — paired Effect pin 4.0.1 → 4.0.6

**RED (contract, both repos).** New `role-model-router/packages/effect/test/run115-vendored-pin.test.ts` and private `shared/effect/test/run115-vendored-pin.test.mjs`, reading `VENDORED.json` + wrapper `package.json` as data (not importing 4.0.6 APIs):

- `tag === "effect@4.0.6"`, `commit === "3b28bf686bf26e9700edd39c025aff2744dc5303"`
- `contentDigest` is 64 hex; `fileCount > 0`
- wrapper `version === "4.0.6"`; wrapper has no `@effect/*` runtime dependency outside `workspace:*`

Invoke: from `role-model-router/packages/effect`, `node ../../../node_modules/vitest/vitest.mjs run test/run115-vendored-pin.test.ts`. Private: from the private worktree root with `TMP=TEMP=RUN00_TEMP_ROOT=E:\role-model-run115\tmp\115`, `node --test --test-concurrency=1 shared/effect/test/run115-vendored-pin.test.mjs`. Expect RED on 4.0.1/`460272d3…`.

**Then the acquisition, under the `SRC-003` characterisation exception — not behavioural RED.** Capture existing GREEN baseline (already in `00-worktree.md`: core 194, protocol 18, registry 16, sqlite 140, UI 752), run `node scripts/vendor-upstream.mjs --name effect --verify`, then `--name effect --sync --tag effect@4.0.6 --commit 3b28bf68…`, immediately `--verify`, then `node role-model-router/packages/effect/build.mjs` and `node shared/effect/build.mjs`. `--sync` re-clones the tag, checks `rev-parse HEAD === --commit`, archives with `core.autocrlf=false`, `core.eol=lf`, and rewrites both manifests. Re-run the pin tests GREEN plus the same consumer suites. Label the pin test's failure `acquisition-guard RED`, never behavioural RED.

**Digest reality:** digest excludes only `VENDORED.json`/`PROVENANCE.md`; normalised on forward-slash relative paths, NUL-separated, line-sorted. Compare public/private `contentDigest` only when payload rows are identical; otherwise compare the shared per-file subset and require tag/commit equality. Public payload is `["packages","LICENSE","README.md","MIGRATION.md"]`.

**Version skew:** private `shared/effect/build.mjs` generates committed shims under `shared/effect/src` and does **not** wipe `dist`, unlike public. After each private build, `git status --porcelain shared/effect/src` must be empty; never `git clean`.

## Slice 2 — Foldkit + parse5 acquisition and wrappers

**RED first, at the tool contract.** Extract the `UPSTREAMS` table from `scripts/vendor-upstream.mjs` into `scripts/vendor-upstream.table.mjs` (CLI imports it; top-level `process.exit` means it cannot be imported directly). New `scripts/test/vendor-upstream-foldkit.test.mjs` asserts:

- `table.foldkit = { tag: "foldkit@0.169.0", commit: "7ee214268c602967937b80f6f20d1e831f2e8ab6" }`
- `payload` **exactly** `["packages/foldkit","packages/ui","packages/oxlint-plugin-foldkit","LICENSE","README.md"]` and matches no `vite-plugin`, `devtools`, `examples-e2e`, `website`, or bare `"packages"`
- `table.effect.payload` unchanged (characterisation)

Currently RED because `table.foldkit` is undefined. **Critical:** `excludes` are recorded metadata only — `git archive` copies `payload` verbatim, so `payload: ["packages"]` would vendor the Vite plugin and devtools, against `R6`/`SRC-008`. Enumerate package dirs.

Then `--name foldkit --sync --tag foldkit@0.169.0 --commit 7ee21426…`, `--verify`. Untouched acquisition = `SRC-003` exception: digest/fileCount/byteCount parity, no vendored-file edits (peer pins `effect 4.0.0` in `vendor/foldkit` are never installed; our wrapper peers are `workspace:*`).

**parse5:** vendored `foldkit` declares it as its only runtime dependency. Do not add a floating range or a `frozen-lockfile` conflict — pin the exact version from `vendor/foldkit/packages/foldkit/package.json`, add it as its own vendor entry (enumerate only its package dir + `LICENSE`), and bundle it. `@effect/platform-browser` becomes a first-party wrapper, not a registry install.

**Wrapper build flags** (copy public `packages/effect/build.mjs` shape, do not copy its Node target): `bundle:true, splitting:true, chunkNames:"chunks/[name]-[hash]", format:"esm", platform:"browser", target:"es2022", sourcemap:false, metafile:true, external:["effect","effect/*","@effect/platform-browser","@effect/platform-browser/*"]`. One entry per upstream `exports` key; a missing entry is a build error. Reject `platform:"node"`, `node24`, and any `node:` builtin.

**Lockfile:** unchanged deps → `corepack pnpm install --frozen-lockfile --ignore-scripts --store-dir E:/role-model-run115/pnpm-store`. Adding workspace-only packages → `corepack pnpm install --lockfile-only --ignore-scripts --config.auto-install-peers=false --store-dir …`, inspect the `pnpm-lock.yaml` diff, then frozen install. No `--no-frozen-lockfile` on a routine build; record the approved lockfile delta.

## Slice 3 — graph guard and export ledger

Extend, do not replace, the Run101 single-runtime guard. New assertions on the browser wrapper metafile: exactly one Effect runtime module, resolved through `vendor/effect/packages/effect/src`; zero `platform/node` inputs; zero `node:` imports; no duplicate registry `effect`. Keep the existing case-sensitive entry contract (`assertNoCaseInsensitiveCollisions`, `Schema` vs `schema/index`) and its test lane.

Classify the 4.0.1→4.0.6 export/declaration diff **before** rewriting imports: `added/changed/removed/renamed-by-deprecation` in a JSON ledger, with consumer list. Empty diff → record zero consumer change; do not manufacture a defect. Each actual consumer change gets its own narrow RED test; do not fold it into this slice. Leave `declarationEntries` filtering alone unless the 4.0.6 subpath set changes.

## Slice 4 — ui-parity foundation + bounded lifecycle oracle

`role-model-router/packages/ui-parity`, independent of M1 (M4 ordering). Strict TDD at unit level: create only the minimal module skeleton **after** the test exists, so the accepted RED is an assertion mismatch, not `ERR_MODULE_NOT_FOUND` (resolution failure is recorded as setup, `R3`).

- `test/compare.test.ts`: structure comparator (text/role+name pairing, repeated-diff grouping), request comparator (method/path/query/body/multiplicity/status; order ignored only for independent reads), accessibility diff classifier.
- `test/selfcheck.test.ts`: React-vs-React ⇒ zero diffs.
- `test/determinism.test.ts`: two runs byte-identical.
- `test/mutation.test.ts`: one class change in `packages/ui` is flagged.
- Root script `runtime:parity`; invoke `node ../../../node_modules/vitest/vitest.mjs run` from the package, then `node ../../scripts/runtime-parity.mjs --lane selfcheck --artifact <react-dist>`.

**Lifecycle regression** (`apps/runtime-ui/app/lib/observe-chart-adapter.test.ts` neighbourhood): unmount disconnects the observer once, cancels the frame, disposes the renderer, leaves registry size 0, ignores post-unmount resize, and remount registers exactly once. If current React already passes, record it as **GREEN characterisation oracle**, not a fabricated RED; the Foldkit pilot must satisfy the same oracle. No Playwright/browser process in these first slices.

## Cleanup / prohibitions

All temp under `E:\role-model-run115\tmp\115`; delete only that owned directory; clear `TMP`/`TEMP`/`RUN00_TEMP_ROOT` overrides after. Public build wipes `dist`; private does not — verify tracked shims unchanged. No ports bound, no processes left, no operator state or secrets read. Never edit `vendor/**`; refresh `VENDORED.json`/`PROVENANCE.md` in the same commit as the bytes.
