# S55b independent review of the Foldkit runtime UI port

Worktree: `D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration`
Mode: read-only review. No product edits, no commits. Evidence written at the path above.

## Verdict summary

| Area | Verdict |
|---|---|
| Shell / rail / navigation | Mostly sound; rail test is weak and two claims (endpoint/mode) depend on fallback-readable fixture fields |
| Overview charts | **Broken/overstated** for token usage and bucket edge/p95 semantics; model-pool card is a cost strip with arbitrary y positions, not the S55a scatter |
| Studio | Dispatch wiring is real but its "exact body" test is not; the **Advanced** tab targets a path the host does not serve; host proxy is dead |
| Static fallback scoping | Sound for path traversal and API scoping; minor source-map exposure; tests do not cover traversal/HEAD |
| llama-swap proxy | **Broken**: the proxy base URL is never assigned, so all four proxied paths always return 503 even with llama-swap running; no host tests |
| A11y | Shell/readbacks/charts largely sound; Studio tabs are buttons, not tabs; model-pool points are not focusable/hoverable; rail dash labels sit on generic spans |
| Packaged SEA | Build is not self-contained: it requires the legacy app's built `fonts` directory and the legacy `node_modules`; a clean `runtime:package-sea` can fail or ship depending on legacy build state |
| Evidence claims | Several are stale or contradicted by code/tests (s50 proxy, s54 Studio/197, s55a missing tdd, s39 parity table) |

Client suite re-run: **194/197 passed, 3 failed** (parallel run, 5 s timeouts in `routes.test.ts`, `s26e` store receipts, `s26k` providers); the same three files pass 61/61 when run alone, so they are load-sensitive/flaky, not assertion regressions. This contradicts the `s54` "197/197" claim as a reproducible full-run statement, though the failures are not product failures.
Logs: `.recursive/run/115-effect-foldkit-runtime-migration/evidence/logs/s55b-review-client.log`, `s55b-review-fails.log`.

## Findings, ordered by severity

### F1 (critical, broken) The llama-swap proxy is unreachable: its base URL is never set
`apps/runtime-host-bridge/src/index.ts:254` declares `let llamaSwapProxyBaseUrl: string | null = null;`. The only other reference is the read at `:20308` (`const vendorBaseUrl = llamaSwapProxyBaseUrl;`). A workspace-wide search finds no assignment. Therefore `llamaSwapProxyPath` (`:20300-20306`) always takes the `vendorBaseUrl === null` branch and answers 503 `"Llama-swap is not running..."` at `:20309-20313`, even when the vendor is active.
Consequences:
- `apps/runtime-ui-next/src/studio.ts:73,76,79` dispatch Images/Audio/Rerank to `/v1/images/generations`, `/v1/audio/speech`, `/v1/rerank`; all are unconditionally 503 through the host.
- `s50-studio-llamaswap.md` says "The host now proxies those same-origin paths" and cites vendor-handler 400s. The vendor proof was direct to the vendor process; it does not exercise the host path. The claim is unsupported.
- No host test references any of the four proxy paths (`grep` over `apps/runtime-host-bridge/test` returns nothing), so the dead variable is invisible to CI.
Failing input: start packaged host with llama-swap running and `POST /v1/audio/speech` -> 503 with the "not running" JSON, not the vendor's answer.

### F2 (critical, broken/overstated) The token-usage chart reads a field shape the host does not emit
`apps/runtime-ui-next/src/view.ts:512` does `Number((item as { tokens?: unknown }).tokens)`. The real `/api/metrics/page` item has a **nested object**, as the captured fixture `test/fixtures/s26o/overview-real-items.json` shows:
`"tokens": {"cache_tokens":0,"input_tokens":10,"output_tokens":3,...}`.
`Number(object)` is `NaN`, so no token value ever accumulates and the Token usage card renders flat zero for every real item. The test fixture used for the token assertions (`overview-boundary-items.json`) was changed to scalar numeric `tokens` (10/20/30/40), which is not the host shape; the test therefore passes only on the hand-adjusted fixture. This is exactly the class S55a was meant to close ("token series values per bucket"; "add token fields to the bucketing").
Failing input: fetch the captured `overview-real-items.json` body for `/api/metrics/page`; the token series is all zeros while the item carries input 10/output 3.

### F3 (high, overstated) p95 and the end boundary are not the required semantics
- `view.ts:485-488`: `percentile` returns `sorted[Math.min(n-1, Math.floor((p/100)*n))]` - a zero-based index one rank above nearest-rank for many n (n=20: index 19 -> max; nearest-rank p95 is index 18 -> 19th value). The test only covers buckets with one or two samples, where the bug is invisible.
- `view.ts:503-509`: `count = ceil((end-start)/bucketMs)`, then `index = min(count-1, ...)`. An item exactly at `endAtMs` is clamped into the last bucket (23:00 for Day) instead of the 24:00 boundary. The boundary fixture contains `2026-01-02T00:00:00.000Z` (exact end), and `s40b-overview.test.ts:50-51` asserts label `23:00` - the test title says "labels 00:00/24:00" but it encodes the off-by-one. The reference's final label is 24:00; this chart never produces it.
- Empty buckets are omitted from `grouped` entirely (`:504-528`), so the line bridges the gap rather than marking it; the accessible table only shows populated labels. This may be acceptable ("labels that exist") but it is not a gap representation, and the test asserts `02:00` absent (`s40b:52-54`), freezing the omission.
Failing inputs: bucket `[1..20]` -> p95 20 (expected 19); item at `endAtMs` -> 23:00 (expected 24:00/next-day bucket).

### F4 (high, overstated) The "Model pool" is not the S55a scatter
`view.ts:574-596`:
- only `pricing.inputPer1M` is read; quality and speed are omitted (the description admits this; S55a allows dropping axes only if the host lacks fields - the candidate body does expose `recentSamples`, but there is no quality score, so the omission is defensible).
- `cy` is `70 + (index % 2 === 0 ? 0 : 24)` - an arbitrary alternating row, not a data axis. Calling this a scatter is an overstatement.
- marker radius is fixed at 6 (`:594`); S55a requires size proportional to route score, and no score is read.
- no hover/focus, no `tabindex`, no tooltip; the only accessible equivalent is the `sr-only` table (`:596`), which does carry model/cost/endpoint.
- no test asserts axes, marker size, point positions, or a cost/quality mutation; the only S55a assertions are point count and table text (`s40b:55-61`). S55a's required mutations ("a mutation that swaps cost/quality must fail"; "token sum wrong must fail") are absent, and there is no `s55a-tdd.json`; only two RED logs exist (`s55a-red-cost-axis.log`, `s55a-red-token-sum.log`) whose referenced assertions are not independently reproducible from the current fixture shape.
Failing input: swap the cost and quality fields in the source; no test fails.

### F5 (high, overstated) Studio dispatch tests do not prove the bodies, and Advanced has no host path
- `s46a-studio.test.ts:56-58` asserts only `method === "POST"` and `Object.keys(body).length > 0` per tab; no field value is asserted for Images/Audio/Rerank/Advanced. Mutating the image body to `{model}` or the rerank body to omit documents passes.
- `studio.ts:81-87` always sends Advanced to `/v1/messages`, ignoring the `mode` field; the task wording was "messages or embeddings per mode". The host has **no** `/v1/messages` or `/v1/embeddings` registration (grep over index.ts: zero), and the proxy does not include them (F1), so the Advanced tab can only ever get the scoped static 404. It is an honest error, not a working tab.
- Chat end-to-end against a real host is not proven: the success test (`:95-112`) uses an injected fake 200; `s46a-tdd.json` itself records "chat real-host round trip not run".
Failing input: mutate `studioRequestFor` image/audio/rerank bodies to drop required fields; suite stays green.

### F6 (medium, security) Static fallback scoping is sound against traversal, but has two gaps
- The fallback (`index.ts:20337-20385`) uses `path.join(staticRoot, url.pathname)`. Encoded slashes/backslashes stay percent-encoded in `url.pathname` (checked: `/..%2f..%2fsecret` and `/..%5c..%5csecret` remain literal), and unencoded `..` is normalized by `new URL`, so no traversal was found.
- API scoping (`isApiPath` + `wantsHtml`) correctly returns 404 JSON for `/api/*` and `/v1/*`, and the host test (`index.test.ts:8198-8251`) covers root/app deep links and three API paths. It does not cover traversal, HEAD, or an asset path with `Accept: text/html`, which would serve `index.html` for a missing asset.
- **Source maps are served**: `build.mjs` sets `sourcemap: "linked"`, so `dist/client/assets/main.js.map` exists and the static handler serves it (octet-stream). That exposes the client source in the packaged artifact; low severity for a local runtime, but avoidable.
- The proxy itself, if F1 is fixed, uses an exact four-path allowlist and forwards only `content-type` and query; no operator-path bypass or path escape. It is still unauthenticated (like `/v1/chat/completions`) and buffers the request body without a limit (`:20316-20319`), so a non-loopback bind exposes unauthenticated image/audio/rerank inference and unbounded body buffering.

### F7 (medium, a11y) Shell/readbacks/charts mostly sound; Studio tabs and model points are not
- Charts: primitive renders `role=img` + `aria-label` (`packages/ui/src/foldkit-chart.ts:612-613`) and a real `sr-only` table; point circles have `aria-label` (`:486-487`) but no `tabindex`, so keyboard users cannot focus a point.
- `view.ts:630-645`: Studio "tabs" are plain buttons with `aria-pressed`, no `role=tablist/tab`, no `aria-controls`, no arrow-key navigation, no panel role. They are usable but not tab semantics.
- Model-pool circles (`view.ts:594`) have no focus/hover/tooltip, so S55a's "hover/focus showing the model id and its values" is unimplemented; only the hidden table carries it.
- Rail dash values (`view.ts:744-752`) put the explanation in `aria-label` on a generic `span`; many AT ignore labels on generic elements. Use `role=status` or visible text.
- Overview/readback/Studio empty/loading/error states are otherwise present: `aria-busy` on loading, `role=alert` on error, explicit empty messages. Studio's loading `aria-busy` is only on the Run button, not the form/region.

### F8 (medium, packaging) The client build depends on the legacy app build, so `runtime:package-sea` is not self-contained
- `apps/runtime-ui-next/build.mjs` copies fonts from `../runtime-ui/build/client/assets/fonts`; `style-build.mjs` imports Vite/Tailwind from `../runtime-ui/node_modules`.
- Root `runtime:package-sea` (`package.json`) builds `runtime-ui-next` first, then the host; it does not build `runtime-ui`. On a clean checkout without the legacy build output, the next build fails on the missing fonts directory (or, if the directory is stale, ships stale fonts). The S48a build test passes only where the legacy build already exists.
- Absolute `/assets/...` URLs and the same-origin base in `main.ts` are correct for `--static-root`; font preloads and the class guard are sound.
Failing input: clean worktree, remove `apps/runtime-ui/build/client`, run `pnpm run runtime:package-sea` -> font copy ENOENT.

### F9 (low, evidence) Contradictory/stale verification claims
- `s50` "host now proxies" is false (F1).
- `s54` "Studio: ... llama-swap routing ... proven" is not supported by any host-path test; the vendor proof is direct.
- `s54` "197/197" is not reproducible in one full parallel run under current load (3 timeouts, F0). The individual files pass, so this is a stability claim problem, not a product regression.
- `s39-reference-parity.md` still says "no counts rail", "no charts", "Studio absent", which the current client contradicts; it is now a historical snapshot, not current parity evidence.
- `s55a` has no `s55a-tdd.json` and no tests for the required mutations; the two RED logs reference assertions that were later reshaped around a non-host token fixture.
- `s26o` still has the self-fulfilling contract issue found earlier: 11 of 16 expected statuses are "empty", so a parser that always returns empty passes those rows; dashboard/observe-activity fixes are not pinned. The new fixtures improve the mapping but do not add row-value assertions.

### F10 (low) Rail test is not a contract test
`s40a-rail.test.ts:36-58` asserts a handful of values from fixtures and that one dash exists in failure cases. It does not assert:
- every unavailable field is a dash with a reason (only any one dash),
- a fabricated value is not shown (the runtime summarised fallback can still populate mode from the router),
- cache/requests arithmetic for 0, missing, or non-numeric rows,
- the per-model count limit/ordering logic (`view.ts:779-790`) beyond two models.
Mutation: return `"0"` for every unavailable field - two of the three failure tests still find the models dash and pass; the assertions do not cover the other fields.

## Area verdicts

- **Shell / rail / navigation**: sound in structure (single sidebar, grouped nav, aria-current, focus ring, one title). Rail logic is reasonable but the test does not pin the contract; dash labels are not reliably exposed.
- **Overview charts**: **broken/overstated**. Token field is wrong for the real host, p95 index is wrong for n>=20, end-boundary label is 23:00 instead of 24:00, empty buckets are omitted rather than marked as gaps, and the model-pool card is not the S55a scatter (arbitrary y, fixed marker size, no hover/focus, no axis/size tests).
- **Studio**: dispatch plumbing and error rendering are real; "exact body" is not tested; Advanced targets an unregistered `/v1/messages`; real host/vendor path is unproven because the proxy is dead.
- **Static fallback**: sound against traversal and API fallback; missing source-map exclusion and traversal/HEAD tests; minor.
- **llama-swap proxy**: **broken** (dead base URL); no tests; if repaired, exact allowlist is safe but unauthenticated and unbounded body.
- **A11y**: shell/readbacks/chart tables sound; Studio tab semantics and model-pool focus are missing; rail labels are weak.
- **Packaging**: assets/fonts/CSS guard are good in-tree; build depends on legacy build outputs, so "packaged SEA" is conditional.

## Three things I would fix first

1. **Repair or delete the proxy claim.** Assign `llamaSwapProxyBaseUrl` when the llama-swap vendor starts (or remove the proxy entirely), add host tests that run a real in-process vendor stub for all four paths and the inactive 503, and add `/v1/messages`/`/v1/embeddings` to the allowlist or make Studio Advanced dispatch to a served path. Until then, s50 and the Studio "llama-swap routing proven" claim must be withdrawn.
2. **Fix the chart data contract.** Parse the real nested `tokens` shape (input/output/total), compute p95 with a correct nearest-rank formula, label the end boundary 24:00 (or exclude it as half-open), represent empty buckets as gaps, and capture a real windowed fixture with nested tokens for the chart tests. Then add the S55a mutations: swap cost/quality, wrong token sum, point count/size.
3. **Make the verification claims match the tests.** Add exact Studio body assertions, a real host (or in-process handler) chat/vendor path, model-pool axis/size assertions, and rail "every field dash" assertions. Restore a missing `s55a-tdd.json` and refresh s39/s50/s54. Also stabilize the 5 s client tests (three timeouts under parallel load) before claiming 197/197.

## Method and limits

Read: `s39-reference-parity.md`, `s50-studio-llamaswap.md`, `s53-*`, `s54-verification-state.md`, task files s40a-s55a, `view.ts`, `readback.ts`, `studio.ts`, `update.ts`, `commands.ts`, `build.mjs`, `style-build.mjs`, `index.html`, chart primitive, host `index.ts` proxy/static regions, host tests around the static fallback. Ran the client suite and the three failing files separately (`s55b-review-client.log`, `s55b-review-fails.log`). Did not re-run the 420-file host suite (cost); the host findings above are source-level and were checked against the host tests that exist. No product files were edited.
