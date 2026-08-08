# Live proof — web-search SERP dump addendum 01

Date: 2026-08-06 (~06:47 UTC+8)

## Automated

- RED: `evidence/logs/addendum-web-search-serp-dump/red.log` (exhausted continues dumped `[wordlim:`; duplicate queries re-fetched)
- GREEN: `evidence/logs/addendum-web-search-serp-dump/green.log` — 42 tests passed (`forwarder` + `codex-tool-bridge`)
- Build: `corepack pnpm --filter @try-works/codex-role-model build`
- Adapter restarted on `127.0.0.1:3460`

## Adapter HTTP probe (real runtime + ChatGPT search auth)

Request: non-stream `/v1/responses` on adapter with `baseline.remote-only`, tool `web_search`, prompt asking SNDK + NET prices via web_search only.

Result (`live-probe.json`):
- HTTP 200
- No `[wordlim:` in body
- Assistant synthesized answer (example from probe): SNDK ≈ $1,216 and NET ≈ $196 with source-conflict caveat — not a raw ChatGPT SERP dump

## Desktop

Operator should re-run a short dual-ticker prompt in a **new** Desktop thread against the rebuilt adapter. Expected: synthesized prices or honest missing-quote text; never raw `[wordlim:` SERP paste.
