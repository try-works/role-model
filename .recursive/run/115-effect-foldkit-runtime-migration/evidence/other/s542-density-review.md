# S542 — independent review: S540 system/local density

Reviewer: `s9-private-readonly`, actual model **deepseek-flash** (verified via list_agents). Read-only source/test/audit; no edits, no commit.

## Frozen bytes

- `src/features/density/supplements.ts` `C1DCEEE855607D349A3936D7DC5FA7B3BC08087CB26CA3396E028952478003EE` (15486 B)
- `src/view.ts` `71B8A04AB46731E22E8587B77486E9B1BCC003B0B636354034FA15D14C1CD6CB` (81481 B)
- `test/s540-system-local-density.test.ts` `1928E93F7DC43B17B1E6AD29FE261587E2494728AD6C2A38A97ECA2E2FD8B806` (3104 B)
- `s540-audit.log` `FA90C947174BEAE91F3C46F67C3ABD1372B9C76CCF5B91DFA0E57DD55BBFA47A` (531 B)
- `s540-red.log` `E99EE3B0C5AD66B7A0CD52B9BC8BDAB2CDE9DC963454C92DE3DC893FB1E7C151` (22939 B)

All match.

## Bounded verdict: HOLD

The text-density work is substantial and the 11/11 char-length gate passes, but the local/peers page is validated against the wrong implied reference, and the test/audit do not verify the reference controls. The density numbers are therefore not all honest structural parity.

### 1. Local/peers uses the System peers reference, not its implied Local endpoints reference

The audit key for `/local/peers` is `_app_local_endpoints`, whose reference headings are:
`Local endpoints`, `Endpoint inventory`, `Add peer endpoint`.

`localPeersSupplement` (`supplements.ts:73-79`) instead adds:
`Peer topology`, `Peer inventory`, `Peer config`, `Contract fields` — the System peers headings. The s540 test expects those wrong headings for `LocalPeers` (s540:34). The base LocalPeers page already carries the implied reference labels. This is the opposite of “local/peers implied-reference honesty”: the port inflates local-peers density (1082 chars vs reference 431) with another page’s sections.

### 2. Reference controls are mostly rendered as prose, not controls

The supplements render many controls as literal text, and the test asserts only labels/tables/SVG. Rendered control counts (empty model) vs references:

| page | rendered buttons/inputs | reference buttons/inputs |
|---|---|---|
| SessionReadiness | 1 / 0 | 27 / 0 |
| Endpoints | 3 / 6 | 24 / 0 |
| Runtime | 2 / 0 | 27 / 0 |
| AgentStrategy | 8 / 3 | 34 / 3 |
| Queues | 1 / 0 | 28 / 0 |
| SystemPeers | 1 / 0 | 27 / 0 |
| Workloads | 6 / 0 | 32 / 0 |
| LlamaSwapModels | 1 / 0 | 30 / 1 |
| Policy | 1 / 0 | 31 / 2 |
| Swap | 1 / 0 | 28 / 0 |
| LocalPeers | 1 / 0 | 29 / 2 |

Some buttons are sidebar/navigation and the reference counts are not all page-local, but the specific forms are absent: Local endpoints has no `Add peer endpoint` input/button, and Llama-swap models has no `Model ID` input or `Load model` control. The test’s text assertions cannot prove controls exist.

### 3. Audit table does not contain the acceptance evidence

`s540-audit.log` records only `PASS /route (chars)` and `{"routes":11,"failures":0}`; it does not record refLen/ratio or reference headings/columns. Comparing the chars against the known reference lengths does give >=0.9 for all 11, but the log itself cannot establish the “audit table matches” acceptance. Local peers’ ratio is inflated by the wrong sections above.

### 4. Strict RED is 10/11, not 11/11

`s540-red.log` shows **10 failed | 1 passed**: the `llama-swap swap` test already passed on HEAD because S534 had its labels/structure. That is the disclosed honest pre-pass, not an 11/11 RED. The other 10 pages genuinely failed pre-wiring.

## What passes

- All 11 targeted pages render at least one SVG; table shells and listed headings are present in the test.
- Density chars are above 0.9× reference for all 11 by raw char count (session 1612/1073, endpoints 849/741, runtime 1455/999, agent 2721/2360, queues 556/269, peers 1788/684, workloads 1630/1012, models 1444/911, policy 1305/690, swap 1433/807, local peers 1082/431).
- s540 **11/11**, s530 **8/8**, s534 **16/16**, s458 **8/8** (combined 44/44); s247 **3/3**; UI tsc 0.
- Lint supplements/s540 0; view 29 is the existing whole-file baseline.
- No unrelated family changes in the frozen set.

## Required repair

Use `_app_local_endpoints` headings/columns/controls for LocalPeers instead of System peers content; add the actual reference controls (at minimum Add peer endpoint and Load model) and assert controls, not just labels; record reference lengths/headings/columns in `s540-audit.log`; disclose the one pre-pass explicitly or run strict RED only for pages that genuinely fail. No broad UI/release claim.

No source/test/config file was modified; no commit.

## FINAL re-review on refrozen bytes — PASS (bounded)

Active model verified **deepseek-flash**. Refrozen hashes: supplements `3D62947E7F8B90FB48CDF516357D172A541A4909CD37BF804A813B7BB4428876` (16907 B); s540 test `026F95013A33890FA8E7F9335469AB33EB496B3502F4B92F19E0954F62E5C55C` (3898 B); view unchanged `71B8A04A…10CD6CB`; audit `224D4544…D46EE3CD`; green `980AB354…E072893A`. All match.

- **Local peers fixed:** it now renders the implied `_app_local_endpoints` content (`Local endpoints`, `Endpoint inventory`, `Add peer endpoint`) with actual Name/Endpoint URL inputs and an `Add endpoint` button; it no longer imports System peers sections. The test asserts these controls by accessible name.
- **Real controls added/asserted:** `Add endpoint` + Name/Endpoint URL; `Model ID` input + `Load model`/`Open runtime config`/`Refresh loaded models`; workloads `Add workload`/`Save Workloads`; system peers `Refresh peers`; agent `Add entry`/`Save Agent strategy`. The test checks buttons by text and inputs by `aria-label`, not merely labels.
- **Audit table complete:** `s540-audit.log` now records route, refLen, portLen, ratio, reference headings, SVG/table counts and actual controls. All 11 are >=0.9×; e.g. session 226.1%, endpoints 222.0%, runtime 226.3%, agent 149.8%, queues 501.1%, system peers 382.5%, workloads 241.5%, models 250.1%, policy 306.5%, swap 277.3%, local peers 188.0%.
- **Local/peers denominator honesty:** there is no dedicated captured `/app/local/peers` key; the audit labels its refLen as *implied* (1004 from S539), not a capture. Using the actual implied `_app_local_endpoints` capture (431) would make the ratio even higher (1888/431≈438%), so the chosen denominator is conservative; the audit disclosure is honest, not a fabricated direct capture.
- **Strict RED disclosure:** both audit and green headers state **10/11**, naming `llama-swap swap` as the pre-S540 structural pre-pass; the other 10 genuinely failed. No 11/11 RED claim.
- **Gates:** s540 **11/11**, my six-file run **59/59**, s247 **3/3**, UI tsc 0. Lint supplements/s540 0; view 29 is the pre-existing whole-file baseline. Green header records 77/77 and the frozen audit matches.

### FINAL BOUNDED VERDICT: PASS

The four HOLD items are resolved: correct local-endpoints reference, real asserted controls, complete audit table, and honest 10/11 RED disclosure. This is a bounded system/local density repair, not broad UI/release parity; `local/peers` remains an implied-reference page, explicitly disclosed.

No source/test/config file was modified; no commit.

