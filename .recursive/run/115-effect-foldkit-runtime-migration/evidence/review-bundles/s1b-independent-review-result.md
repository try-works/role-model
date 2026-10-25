**Verdict: CHANGES REQUESTED (narrow).** The pure guard is substantially spec-aligned, and the raw router record supports tests-first chronology. However, one raw-URL/path-smuggling bypass is real, operator-root isolation needs a semantics decision, and the durable TDD/tool evidence is inaccurate as recorded. The 511-line module is type-table bulk, not behavioral overreach—no rewrite is warranted.

### 1. Real contract bug: raw URL path/control characters are normalized away

`parseClientUrl` (`target-contract.ts:215-251`) validates `url.pathname` **after** `new URL()` parsing. WHATWG parsing strips embedded tab/newline and resolves dot segments, so the guard accepts inputs it claims to reject. Confirmed with Node:

- `http://127.0.0.1:4310/..`, `/.`, `/%2e%2e` → `pathname "/"`, port `4310`
- `http://127.0.0.1:43\n10` → `href "http://127.0.0.1:4310/"`, `pathname "/"`, port `4310`

All pass `parseClientUrl`; with matching intent they produce `{ ok: true, findings: [] }`. That violates the “malformed URL / path smuggling” requirement. The tests only cover `/admin` and `not-a-url`, so this is untested.

Minimal repair: reject raw ASCII tab/CR/LF anywhere in the value, and require the raw post-authority suffix to be empty or exactly `/` with no backslash, before relying on URL normalization. Add RED tests for `/..`, `/.`, `/%2e%2e`, `\..`, and embedded `\n`/`\t`, then GREEN. Do not turn this into a general raw-URL parser.

### 2. Forbidden-root isolation is exact-match only (conditional)

`isForbiddenRoot` (`target-contract.ts:253-265`) uses `===` after canonicalization. A state/config root nested under an explicit forbidden operator root—e.g. forbidden `C:\ProgramData\RoleModel\operator`, observed `C:\ProgramData\RoleModel\operator\run115\state`—produces no finding. If “operator root isolation” means subtree containment, that is a real bypass. If the spec’s “same as operator roots” is literal equality, document that interpretation so it is not mistaken for containment control. If fixing, use boundary-safe prefix matching (`root === forbidden || root.startsWith(forbidden + "/")`), special-case `/` and `C:/`, and add nested plus sibling (`operator2`) tests. Current tests prove equality only.

### 3. Actual chronology passes; durable RED evidence is a post-GREEN replay

Raw router records (authoritative) show:

- `18:47:10` first RED 40/45; `18:47:33` 44/45; `18:47:58` 45/45; `18:48:45` final pre-implementation RED 45/45 with final test SHA `1eb479…` and scaffold `df7174…`.
- Step 99’s implementation write was rejected (“file has not been read”); no production code was written before the final RED.
- Step 109 wrote the implementation; GREEN 45/45 at `18:49:50`; tsc 0.
- Step 114 then replaced the implementation with stub `b8f8c9…`, reran RED to produce `s1b-red.log` (`10:49:49Z`), restored the implementation, and reran GREEN. `tdd.json`’s `red.scaffoldSha256` is that replay stub, not the original `df7174…`.

So strict TDD chronology is substantiated **only by the raw transcript**; the durable `s1b-red.log` is reconstructed after the original GREEN. Preserve/cite the original router record or label the log “reconstructed.” Do not present the replay as contemporaneous evidence.

### 4. Evidence defect: `anti_slop_lint`

`tdd.json:29-33` records `available: false` / “not found on PATH” from the worker’s `Get-Command`. The controller’s actual tool run is reported clean (5 files, 16 rules). The artifact is stale and wrong; update it to the real invocation/result. PATH presence is not a valid availability check.

### 5. Late hardening lacks RED coverage

Step 119 added platform/trim/raw `?`/`#` validation after GREEN. The final test SHA stayed `1eb479…`, and there are no tests for invalid platform, embedded whitespace, bare `?`/`#`, invalid forbidden-root entries, relative config root, or empty expected host. The platform branch is defensive only (typed union). Either add RED tests for the new branches or drop the out-of-scope branch. This is a TDD/coverage issue, not a runtime bug.

### Passes / no action

- Pure contract, no I/O; named readonly types; no `unknown`, assertions, or mocks. `node:path` is used only here, not re-exported (`src/index.ts` exports only `compare.js`), and no other importer was found—no browser/runtime graph leak.
- Protected ports checked on both intent and observed URL, including non-loopback; userinfo/path/query/fragment/port/malformed cases; SHA/PID/roots; health ready; packaged provenance and buildMode. Source/private/UI are non-empty checks only, and no format is specified.
- Outcome semantics match the contract: missing receipt → `NOT_RUN`, invalid → `FAILED`, not_run/missing provider → `NOT_RUN`, pure pass → `VERIFIED` with both limitation codes; no `VERIFIED` on missing/invalid evidence. Note `VERIFIED` carries findings, so consumers must not read status alone as live verification. At the typed boundary this is correct; an unvalidated runtime receipt value would fall through to `VERIFIED`, so the adapter must validate.
- Tests: 45/45 pass in the exact S1b package test I reran (`18:56:53`); current test SHA `1eb479…` and source `7ce0aff…` match `tdd.json` green; tsc 0 per controller/green artifact. Controller’s 80-test total is consistent (45 S1b + S1a). Read-only; no source edits or children.

**Required before lock:** fix the raw-URL bypass with tests; correct the RED and anti-slop evidence; decide/document forbidden-root containment; add RED coverage for the step-119 hardening or revert it.
