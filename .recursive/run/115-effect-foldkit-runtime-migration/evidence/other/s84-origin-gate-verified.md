# S84 Cross-origin write gate verified at the source

## The fix is real and the test is falsifiable

I read `test/write-origin-gate.test.ts` and ran it myself (**3/3**):

- foreign `Origin: https://evil.example` on `PUT /runtime/config`, `PATCH /controller`, `POST /endpoints` -> **403** each;
- the injected handler state stays `{config:"old", controller:"old", endpoint:"old"}` - **a handler that ran would have mutated it**, so the test cannot pass on a gate that rejects after dispatch;
- no `Access-Control-Allow-Origin` on any of the three responses;
- `Origin` equal to the server base -> **200**, state updated;
- no `Origin` (curl) -> **200**;
- `GET /health` with a foreign origin -> **200** with ACAO `*` (reads unchanged);
- with `operatorAuthToken` configured, a same-origin write **without** the bearer credential -> **401**.

## My packaged-exe probe was inconclusive, and why

I fired `PATCH /api/role-model/controller` with `Origin: https://evil.example` at the packaged exe on port 5807 and got **400**, not 403. That binary was built BEFORE this fix (the `s38b` artifact predates it), so the probe measured the old build and proved nothing either way. The source-level test above is authoritative; a packaged re-check requires a repackage, which is queued.

## Rule as implemented

Mutating `POST/PUT/PATCH/DELETE` on `/api/role-model/*` is allowed only when `Sec-Fetch-Site` is `same-origin`/`none`, or the `Origin` host equals the request `Host`, or no `Origin` is present; otherwise **403 before the handler**. When an operator token is configured, writes additionally require `Authorization: Bearer <token>` (**401** otherwise). Mutating responses and their `OPTIONS` preflights carry **no** ACAO.

## Still queued from the review

- Config diff truthfulness (refuse Review before Load; recompute at Confirm; refuse a changed snapshot).
- Models join test with exact endpoint/health/role values and an always-empty mutation.
- Single-title test must assert the route title TEXT, not just the count.
- Filters: coverage for source/difficulty/breakdown-dimension, stale breakdown value reset, and a model pool built from the FILTERED body.
- Learning `productionActivation` must not fabricate `disabled` when the field is absent.
- Repackage so packaged verification hits the fixed build.