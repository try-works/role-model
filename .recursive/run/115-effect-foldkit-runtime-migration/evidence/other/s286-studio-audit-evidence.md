# S286 (goal 235) — bounded Studio-gate evidence instrument

Task: task-13 (rev 2, in_progress -> completed, owner s5-health-wait). Model: **deepseek-flash** (verified
live via list_agents). Baseline 9af16985; pinned package
`E:/role-model-run115/package-s284-public/role-model-router/dist/release/win32-x64`
v0.0.20-266-ga01230f0 sha589ecc0c... (read-only; the Lead executes the full gate).

## Scope (two new files; the audit and the gate are untouched)

- `scripts/runtime/studio-audit-evidence.mjs` — collector + classifier + formatter + an instrumented
  driver/CLI that replays the gate's own Studio sequence
- `scripts/studio-audit-evidence.test.mjs` — collector unit tests

No change to `audit-rendered-ui.mjs`, acceptance, timeouts, sleeps, click order, provider or product.
The driver reuses the audit's exact values: 1.5 s settle, 300 ms poll, `AUDIT_STUDIO_TIMEOUT_MS ?? 15000`.

## What it captures (safe, bounded)

- `Network.enable` timestamp, then per Studio POST: path, body **model / stream / messageCount only**,
  phase at start (`seed` / `final`, or any caller-labelled `sweep` via the phase hook), start elapsed,
  response status, finish/duration, failure text.
- Catalogue `GET /api/role-model/models`: status + start/duration, recorded separately from the POST.
- Click state (at the click): Run `disabled`, `data-studio-raw` state, `data-studio-error` text,
  `selectedModelDom`, `clickedAt` (ISO), `navigatedSameUrl` (Page.navigate to the same /studio path).
- Same-URL navigation that preserves an existing loading state and leaves Run disabled is explicitly
  reported as `no POST was observed` (button disabled), not misread as in-flight.
- Classification: `no-post` / `no-post-disabled` / `in-flight` / `http-error` / `responded-unapplied` /
  `applied` / `unknown` — evidence, **not** a root-cause declaration.
- **Never**: response bodies (no `Network.getResponseBody`), prompts, message contents, auth headers or
  tokens; report is bounded and the optional `--json` contains the same redacted shape.

## Evidence

- Strict RED: `evidence/logs/s286-red.log` — 9/9 fail against a zeroed contract skeleton (assertion
  failures, no setup/import error).
- GREEN: `evidence/logs/s286-green.log` — 9/9 pass.
- `node --check` passes for both files.

## Frozen hashes / bytes

```
scripts/runtime/studio-audit-evidence.mjs|16984|7C119D84CBEA62428C4AAF368D8B515A8E71937CC44FB9E91A6A3CEE278074F6
scripts/studio-audit-evidence.test.mjs|10200|FB1F00B58900FC61A68F8806F8383792BBC6AF0537A7623713AE2F314FA75D0F
```

## How the Lead runs it (instrumented, same gate fixture)

```
node scripts/runtime/studio-audit-evidence.mjs --exe <release>/role-model-dev.exe \
  --fixture-root <fixture> --static-root <dist> --port <port> [--json <file>]
```

Prints bounded `studio-evidence:` lines; exits 2 only when the instrument itself cannot run. It does not
fail the gate and cannot relax it. The packaged gate remains FAIL (Studio raw:loading at 15 s) until the
Lead's instrumented run explains it.

## S286 handoff (audit ownership) — frozen helper, Lead owns the audit

Ownership after this round: **s5 owns only** `scripts/runtime/studio-audit-evidence.mjs` (collector/helper)
and `scripts/studio-audit-evidence.test.mjs`; the Lead owns `scripts/runtime/audit-rendered-ui.mjs` and
its hook insertion. No standalone CLI/driver: the helper has no `spawn`, no `process`, no file writes —
only pure exports (constants, `summarizeStudioBody`, `createStudioCollector`, `classifyStudioOutcome`,
`formatStudioEvidence`).

Latest-catalogue fix (found in review): the collector keeps a bounded `catalogues` array (cap 20) with the
phase current at each GET; `catalogueRequest()` returns the LATEST, `evidence.catalogue` is the latest and
`evidence.catalogues` is all of them; the report prints the latest phase/status/start/duration/count. This
is what makes final-click readiness readable instead of the first route's GET; no token/readback inference
is made from it.

Current state of the audit working tree (Lead's file; pre-stop integration left in place, no commit): 16
insertions / 0 deletions, sha256 6250F4D406D8367BF1EAD8AAB75DF3E76A6A16334C1FB626527B2DF68ABD12AC.
Hooks present: import of the helper; `createStudioCollector` + event feed in the existing socket listener;
`Network.enable` + `studioEvidence.handle("Network.enable")` before the seed; `phase("seed"|"sweep"|"final")`;
click-time DOM snapshot; `formatStudioEvidence` printout after the studio step. The Lead may keep, adjust
or replace them; s5 does not write this file again.

## S288 HOLD repair (helper + test only; audit untouched)

Four bounded findings repaired, each with its own regression test captured RED first
(`evidence/logs/s288-red.log`: 13 tests, 4 failed | 9 passed) then GREEN
(`evidence/logs/s288-green.log`: 13/13):

1. **Catalogue ring** — `catalogues` is now a ring (cap 20, shift oldest) with `catalogueTotal` and
   `catalogueDropped` counters in `evidence()` and the header line; `catalogueRequest()` always returns
   the LATEST GET even after the ring wraps (a full-sequence final-click readiness is readable, and a
   capped ring can no longer pin a stale first GET).
2. **No causal claim** — the same-pathname/disabled-Run "no POST was observed / cannot dispatch / preserved
   page state" note is removed. The click line now prints `samePathname=<bool>` as raw pathname evidence;
   same pathname is not the same document, so no no-POST cause is asserted.
3. **Reserved verdict lines** — click and outcome lines are reserved: with more than 30 requests the
   request lines are truncated, never the click/outcome verdict (13 requests over the 30-line budget still
   print `click:` and `outcome:` plus `requests=35`).
4. **No model inference** — a request with no `postData` prints `model=unavailable`; `model=null` is never
   emitted, and no model is inferred from the DOM.

No standalone CLI, no audit write. Frozen after GREEN:

```
scripts/runtime/studio-audit-evidence.mjs|8350|F905CF4645D0B231B5FC70EE1934AE7FFAB17C04A05F9ED160E7982FE24A6FDD
scripts/studio-audit-evidence.test.mjs|14649|41EFBB006D283C85B1655C6369C3489EEDC6AA692E4A1C1D7EE68C390599B303
```

The audit remains the Lead's file and byte-unchanged by this repair (16 insertions / 0 deletions,
sha256 6250F4D406D8367BF1EAD8AAB75DF3E76A6A16334C1FB626527B2DF68ABD12AC); the Lead adds
frame/loader/timeOrigin and the optional full raw JSON report when needed.

## Limits

Collector unit-tested only; the CLI needs a browser and the packaged exe, and was not executed here (no
children/CLI in this task). The driver drives only seed + final; the audit's 20-route click sweep is not
replayed (no click-order change) — the phase hook can label a sweep if the Lead wires one. Page navigation
events are captured (frameNavigated/loadEventFired, bounded) but not required for the evidence.
