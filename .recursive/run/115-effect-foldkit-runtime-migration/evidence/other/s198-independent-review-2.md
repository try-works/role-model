# S198 independent review #2 - rendered audit, packaged gate, fixtures, UI, invariants, CI

Read-only review. Public HEAD 9603c7c0; private HEAD 677a973d; both worktrees clean. I inspected the diffs since the last review (public 9290f1ef, private 7b1c5616), the new scripts, UI sources/tokens, the five invariant tests, the new fixtures and .github/workflows/build-binaries.yml. I ran the five UI invariant test files: 9/9 pass (s175, s177, s178, s181, s182). I did not run Chrome or a packaged candidate; the audit findings are read from its code and the checked-in evidence.

## Verdicts

| Item | Verdict |
|---|---|
| 1. audit-rendered-ui.mjs | **FAIL** - it can report PASS on a broken route/card/control because several checks are weaker than their names and the route is not validated |
| 2. packaged gate flags + chat journey | **PASS-with-caveats** - the chat request is real and checks a target-model response, but rendered/worker modes can be skipped or only list a model; the static root is not the packaged one |
| 3. fixtures-workers | **PASS-with-caveats** - honest synthetic catalogue for listing/config, but the CI check only reads /models; nothing exercises deepseek routing and the missing capture could fall through to live execution |
| 4. UI changes | **PASS-with-caveats** - the three claimed fixes are correct; the focus ring token is an accessibility problem, the light theme has a remaining meta inconsistency, and the audit only runs one viewport |
| 5. Five invariants | **PASS-with-caveats** - each is falsifiable as a source-string edit, but s178 is vacuous as a contrast claim and s175/s177 do not verify the rendered result |
| 6. build-binaries.yml advisory steps | **FAIL** - rendered NOT RUN is converted to exit 0 even when blocking; the compare step is not target-gated; port 5942 is reused; worker state and static root are wrong |

## 1. audit-rendered-ui.mjs: PASS while the page is broken

The audit is a single CDP target/session; it navigates each route, waits a fixed settle, then evaluates the DOM. That is cheaper than Playwright, but these are concrete false-pass paths.

- **A route with no page content passes.** Page.navigate is ignored (:221), there is no URL/status/title/readyState check, and title is returned but never asserted (:194). The generic shell (sidebar/nav) supplies more than the 40-character minimum at :262; controls, contrast and overflow can all pass with an empty main. A route that 404s into the shell or is still the previous page passes. Smallest test: serve a route whose main is empty but the shell is present; the audit's own default routes would mark it PASS unless its 40-char threshold trips.
- **Stale/early evaluate.** The fixed 1200 ms sleep (:222) is not a load/network-idle wait. If navigation is slow, Runtime.evaluate can run against the old document or a partial one; there is no document.readyState, route marker, or Page.loadEventFired check. The result is attributed to the new route. The events buffer (:219-220) is reset but never used to confirm a new execution context.
- **Invisible controls are only exact colour equality.** :142 checks cs.color === cs.backgroundColor and only when the control's own background is non-transparent. An opacity:0, visibility:hidden, off-screen/clipped control with different colours passes; a transparent-background control with white text on a white page passes (the contrast loop excludes button at :146). The S175 case happened to be exact white-on-white.
- **Control naming is not accessible-name computation.** :141 selects only button, a[href], [role=button], select - no input/textarea, and no shadow root. :143 uses aria-label/innerText/first label only; aria-labelledby, title, and input labels are ignored. :144 flags only names longer than 60 chars or containing a newline; a short self-describing name (the S177 class) passes. A select with aria-label="" passes the source invariant and is not caught here.
- **Contrast is incomplete and can be skipped.** parse accepts only rgb()/rgba() (:135); oklch(), color(), unsupported serialisations return null and the element is silently skipped. backgroundOf (:138) ignores background-image, gradients, images, opacity blending, and falls back to dark {10,10,10}; a white label over a light gradient on a dark page is measured against dark and passes. fg.a < 0.5 is skipped (:154), but element/parent opacity is not considered. Text inside buttons/inputs/selects is not scanned at all; the S175 control is only caught by the exact invisible check, and a different low-contrast button (#aaa on white) passes.
- **Cards are counted, not checked.** --expect-overview-cards polls only document.querySelectorAll("[data-overview-card]").length (:248-259) for up to 8 s. It does not check visibility, content, or that the cards are populated. A hidden or empty <div data-overview-card> counts. The audit runs all text/contrast/overflow checks before the poll, so newly inserted cards are never audited. The card poll is also after the focus pass, so card controls are not focus-tested.
- **The bypass block is not asserted.** skip is computed at :191 and returned, but no problems.push uses audit.skip. A page with no skip link passes the rendered audit; only the source invariant s181 guards that. The script header claims "missing bypass block" is caught.
- **--focus is a presence check, not visibility.** :235-245 tabs at most 6 times per route. If no element receives focus (value.none) it continues and still reports focus: true; there is no minimum number of focused elements. hasRing accepts any non-none boxShadow, including a static card shadow, and any non-zero outline width. It does not compare focused vs unfocused styles or measure focus-ring contrast. The shell's own focusRingClass uses --rm-accent-subtle = 8% ink (view.ts:25, app.css:269/371), which is a real box-shadow but nowhere near a visible 3:1 focus indicator. A control after the sixth Tab stop is never tested.
- **Shadow DOM/iframes are invisible.** document.querySelectorAll does not pierce shadow roots; controls or text there are neither named, contrasted, measured nor focused. If the shipped UI is all light DOM today this is a limitation, not a proof.
- **Focus measurement has side effects and skips zero-size controls.** The 24x24 loop focuses every control, then blurs and restores document.activeElement (:171-179); it skips a control only when both dimensions are zero. A display:none control is skipped as "zero-size", so a hidden control passes every check. The skip link is measured separately (good), but a missing skip link is not flagged.
- **Seed failure can be silent.** --seed-chat logs the status but never requires response.ok (:200-213); if a caller omits --expect-overview-cards (the audit API allows that), a 401/404 seed is a pass. The wrapper/workflow pass the expectation, but the primitive does not fail closed.
- **No port ownership check.** With --exe, the audit spawns on --port default 6231 (:65) and only tests /healthz; if the port is occupied it audits the other process. There is no free-port/probe and no executable identity comparison after startup. This matters in CI because the audit uses 5942 after the compare step (below).

Smallest tests: a stub route with shell/nav but empty main; a button with opacity:0 and contrasting colours; an unlabeled <input>; a white label on a light gradient; a button with #aaa text on white; three empty data-overview-card divs; a page with no skip link; a seventh focusable control with outline:none;box-shadow:none; a static box-shadow with no focus change. Most are pure HTML/CSS fixtures against the same rendered audit.

## 2. Packaged gate and chat journey

**The chat check is real but narrow.** verify-client-journeys.mjs:174-188 POSTs to /v1/chat/completions and asserts object, model, assistant role and usage.total_tokens type. On the host, the response model is execution.target.modelId (src/index.ts:30516-30518, :15664), so the model assertion is not a trivial echo of the request; it is a target-model assertion. However:

- empty choices[0].message.content passes; only the role is checked;
- usage.total_tokens may be 0; only typeof === "number" is checked;
- no finish_reason, prompt/completion token values, or provider/adapter identity is checked;
- no fetch timeout (the job timeout is the only bound);
- R39_CHAT_MODEL is read at execution time (:175); the workflow never sets it.

The chat check therefore proves a 200-shaped OpenAI contract from whatever the fixture served, not a real provider completion or the deepseek worker.

**The new wrapper flags can pass without exercising their claim.**

- verify-packaged-candidate.mjs:141-166: with --rendered but without --require-rendered, an audit exit 2 is printed as "SKIP rendered: no browser available" and the wrapper exits 0. That is explicitly "rendered not checked" with a green process. --require-rendered turns it into exit 2, but the workflow invokes audit-rendered-ui.mjs directly, not this wrapper.
- --worker-fixtures is ignored unless --expect-model is also supplied (:116-118); --expect-model alone is likewise ignored. There is no NOT RUN for a half-specified worker request. The workflow avoids this by invoking the verifier directly, but the maintained wrapper is not fail-closed for its own flags.
- The worker run uses --port port+2 and stateRoot + "-workers" (:128-130); neither is validated for the operator ports or cleaned. If port is 3455, +1/+2 can hit 3456/3457; if port is 65534, +2 is invalid. The wrapper's own port probe does not cover the derived ports.
- **The static root is not the package's.** The wrapper defaults staticRoot to role-model-router/apps/runtime-ui-next/dist/client (:29), and the workflow passes the same external path (build-binaries.yml:539,551,564). The verifier does forward --static-root now (verify-client-journeys.mjs:87), but it is forwarding the repo build, not $packageDir/build/client. A package with a missing/stale packaged UI can pass ui css/ui bundle/ui shell because the host serves the external tree. The staged UI is not what the gate verifies.

Smallest tests: a chat fixture with empty content and total_tokens: 0 (should fail, currently passes); a wrapper invocation with --rendered and a forced audit exit 2 (currently exits 0); --worker-fixtures without --expect-model (currently silently skips); and a package with a broken build/client plus a good external static root (currently passes).

## 3. fixtures-workers: honest synthetic listing, not a route proof

The fixture is a normal fixture copy plus deepseek-official.primary and deepseek-official.primary.ap-east-1.flash (provider-accounts.json, registry-sources.json). It is public-tree, labelled synthetic in S191, and the package QA check bans testdata from the package. That part is honest.

But the CI check only does GET /api/role-model/models and matches the ID (verify-client-journeys.mjs:166-170; workflow :560-569). It proves the catalogue was parsed and the model listed; it does not prove routing, controller selection, a completion request, or a provider adapter. The chat check in the same run requests openai/gpt-4.1-mini-fast (default), which the worker catalogue also contains; no request is made for deepseek-flash. adapter-captures.json has no deepseek entry; a deepseek request would miss the fixture capture and fall through to live execution (src/index.ts:27920-27940). Since the provider account uses DEEPSEEK_API_KEY and providerKind: provider-openai, a future test with that env present could hit a real provider rather than a fixture. Today the gate does not do that; the synthetic status is honest, but "configuration path" should be read as "catalogue/list path", not "routing path". Smallest test: request deepseek-official/deepseek-flash against the worker catalogue with a fetch spy and assert it is served by a fixture/capture, not a live adapter; or add a deepseek adapter capture and assert the response.

## 4. UI changes: correct fixes, residual accessibility risk

The three claimed fixes are present and correct in source:

- view.ts:673,731,733: Studio Run, runtime-config Save and Confirm save use text-[var(--rm-on-primary)]; no accent-filled control remains with text-white (s175 passes).
- view.ts:573-579: both filter selects carry h.AriaLabel(...); s177 passes.
- view.ts:914: the skip link is the first child of the shell (not an attribute), targets #main-content; view.ts:1028-1030 gives the main column ml-3 min-w-0 flex-1 max-w-[1138px] and id="main-content"; s181/s182 pass.
- index.html: the inline palette table and setProperty("--rm-*") calls are gone; the shell only selects data-theme. app.css:257: light --rm-muted is now --rm3-light-muted-foreground (#666 on white, ~5.74:1).

Residual points:

- **The focus ring is not visible enough.** view.ts:25 uses focus-visible:ring-2 focus-visible:ring-[var(--rm-accent-subtle)]; light --rm-accent-subtle is rgb(10 10 10 / 8%) (app.css:269) and dark is rgb(255 255 255 / 8%) (:371). That is a 1.07-1.2:1 ring on the surface, below WCAG 2.4.11's 3:1 focus-appearance intent. The s184/audit check passes it because it only requires a box-shadow. This is exactly the class of defect the focus check was meant to catch, and the audit's S184 CSS-override proof would not detect the low-contrast ring (it only removes the ring entirely). Smallest test: compare the focused ring's composited colour to the surface and require 3:1; or take a screenshot and measure.
- **Light theme is still not fully consistent.** index.html:6 keeps <meta name="theme-color" content="#0a0a0a"> (dark) in light mode. The main fixes are correct; the browser chrome/status bar remains dark under the light theme. This is not a WCAG failure but contradicts "light theme consistent". Also the audit's workflow run uses only 1440x900; the S182 mobile claim is not gated at 390 in CI.
- **Focusable SVG circles** (view.ts:622: h.circle(... h.Tabindex(0) ...)) are not in the audit's controls selector and have no explicit focus ring. If they are keyboard-focusable, keyboard users get an unindicated target. The audit's focus check cannot see them.

No selector appears to have stopped matching: rm3-next-shell remains, #main-content is new and referenced, the focus classes are compiled (I checked dist/client/assets/main.css for focus:not-sr-only, focus:absolute, focus:bg-[var(--rm-accent)]), and the s182/s181 tests still find their source markers.

## 5. The five invariants

The five files are source-string tests, not rendered tests. All 9 assertions pass.

- **s175** (test/s175-accent-contrast.test.mjs): it scans only Class("...") double-quoted strings; it requires at least one accent fill (non-vacuous) and requires the on-primary token. It does not verify the token's value or rendered contrast. If --rm-on-primary is redefined to the accent colour, the test stays green while the Run button is invisible again. This is falsifiable as a source edit, but not as the accessibility claim.
- **s177** (test/s177-select-names.test.mjs): it requires h.AriaLabel on every h.select source and on the filter line. It does not verify the label value/non-empty or the computed accessible name; h.AriaLabel("") passes. It is falsifiable by removing the call, not by breaking the name.
- **s178** (test/s178-theme-tokens.test.mjs): it checks that the CSS contains --rm-muted: var(--rm3-light-muted-foreground) and not the ring variable. It never reads the token value or computes contrast; a comment containing the same string, or a later override, passes. This one is effectively vacuous as a WCAG claim (it is a spelling guard for one mapping). A real test would compute #666/#fff or parse the token values.
- **s181** (test/s181-skip-link.test.mjs): it checks the anchor, target id and that the anchor appears after a 
    [
 children marker. It does not prove the anchor is a direct child (a nested descendant after the marker passes) or that the page loads without the S181 crash. The crash was caught by a rendered session, not this test.
- **s182** (test/s182-shell-overflow.test.mjs): it checks the main class line for min-w-0, flex-1 and absence of w-full. It does not measure scrollWidth; a CSS rule elsewhere can reintroduce overflow while this passes. It is falsifiable as a source edit, not as the layout claim.

None is completely empty (s175/s177/s182 require positive findings), but s178 is the clearest pass-vacuously case, and s175/s177/s181 test source spelling rather than the rendered accessibility outcome.

## 6. Workflow: advisory steps and interference

The three steps are build-binaries.yml:525-569 (journeys + worker), :575-597 (rendered), and :431-451 (compare).

- **Rendered NOT RUN is converted to success even when blocking.** :593-596:
  if ($LASTEXITCODE -eq 2) {
    Write-Output "NOT RUN: no Chromium-family browser ..."
    exit 0
  }
  This executes regardless of vars.R39_VERIFY_BLOCKING. With the variable true, the step is not continue-on-error, but it still exits 0 on no browser/host-unhealthy. The claim "a runner without a browser reports NOT RUN (exit 2), which is honest, not a pass" is false at the workflow layer. It must exit 2 (or throw when blocking) and let continue-on-error decide advisory vs blocking. Smallest test: run the step's script with a missing CHROME_PATH and assert the job fails when the variable is true; currently it passes.
- **Compare is not target-gated.** The step at :431-432 runs on any production matrix job, but the matrix is linux-x64, darwin-x64, darwin-arm64, win32-x64 (:53-61). It searches for *.exe and runs a Windows executable path. On Linux/macOS production it will not find a stage .exe and exit 2; with R39_VERIFY_BLOCKING=true that blocks every non-Windows production build. It should be if: env.ROLE_MODEL_BUILD_CHANNEL == 'production' && matrix.target == 'win32-x64', or use a platform-specific executable selection.
- **Port 5942 is reused by compare and the rendered audit.** Compare uses --left-port 5942 (:449) and audit uses --port 5942 (:588). They are sequential, but compare's child?.kill() has no exit wait (compare-release.mjs final), and audit has no free-port check. If the stage/compare server survives briefly, the audit's /healthz can reach the stage process and audit it as if it were the production candidate; --seed-chat then sends traffic to that stale host. The audit's seed step should not be reachable before confirming which executable owns the port.
- **Worker state root is not cleaned.** $stateRoot + "-workers" (:566) is never removed, unlike the normal state root at :533-534. A dirty state from a previous run makes the verifier exit 2; with blocking true the worker step throws. This is a flake/false-failure, not a false pass.
- **Static root is external for all three checks** (:539,551,564; audit :586). The package's own build/client is never the served root. The earlier "static-root not forwarded" bug is fixed in the script, but the workflow now forwards the wrong root, so packaged UI regressions are not gated.
- **Seed/telemetry interference:** direct interference is unlikely because the audit spawns its own host and uses its own default state root; the journey verifier runs earlier in a separate process/state. But the fixed-port collision above means --seed-chat can reach the compare stage host, and the audit's card count then reflects that host's state. There is no test or check that the audit's host is the package executable it was given.
- **Advisory semantics:** continue-on-error: vars.R39_VERIFY_BLOCKING != 'true' is reasonable, but because the rendered step swallows 2, only the journey/compare/worker steps become real gates. The rendered audit can never be a blocking gate as written.

## Claims I believe are wrong

- "The rendered audit catches invisible controls, naming, contrast, focus and targets" overstates it: invisible is exact colour only, naming is not accessible-name computation, contrast can be skipped for gradients/opacity/unsupported colours/buttons, focus is any box-shadow for at most six stops, and a missing skip link or empty cards pass.
- "A runner without a browser reports NOT RUN (exit 2), which is honest, not a pass": the workflow converts exit 2 to 0, even when R39_VERIFY_BLOCKING is true.
- "The worker catalogue checks the deepseek configuration path": it checks /models only; no request routes to deepseek and no adapter capture exists for it.
- "The five UI invariants guard accessibility": s178 is a token-name spelling guard, and s175/s177 do not verify rendered names/contrast; the actual rendered behavior is guarded only by the audit, which has the false-pass paths above.
- "The rendered audit runs at 390 in CI": the workflow runs only 1440x900; the 390 claim is from manual evidence.

## Smallest test list

1. Rendered audit with an empty main/shell-only route -> expect fail (currently likely PASS).
2. Rendered audit with a hidden opacity:0 button, an unlabeled input, or three hidden data-overview-card divs -> expect fail.
3. Rendered audit with a white label over a light gradient, or #aaa text on white -> expect fail (currently skipped or not scanned).
4. Focus test with a 7th focusable control with no outline/shadow, and with a static box-shadow -> expect fail (currently 6 stops only; static shadow passes).
5. audit-rendered-ui.mjs with --seed-chat returning 500 and no --expect-overview-cards -> expect NOT RUN (currently may PASS).
6. verify-packaged-candidate.mjs --rendered with audit exit 2 -> expect nonzero (currently exits 0 without --require-rendered).
7. Chat fixture with empty content and total_tokens: 0 -> expect fail (currently passes).
8. Worker fixture request for deepseek-official/deepseek-flash with a network spy -> expect fixture/no live call; current capture map has no deepseek entry.
9. s178 token test with --rm3-light-muted-foreground: #888 -> expect fail; current string test stays green.
10. Workflow: CHROME_PATH missing + R39_VERIFY_BLOCKING=true -> expect job failure; current rendered step exits 0. Linux production compare -> expect no stage exe / exit 2; current step is not target-gated.

## Method

Diffed both trees since the last review, read the three scripts, the UI source/tokens, all five invariant tests, the worker fixtures, and the workflow; ran the five UI test files (9/9). Docker/browser/SEA execution was not repeated in this session; the findings above are static and reproducible from the cited lines.
