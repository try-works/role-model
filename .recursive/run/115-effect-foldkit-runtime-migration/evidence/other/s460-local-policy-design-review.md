# S460 — design review: S458 local-policy + matrix original parity

Reviewer: `s9-private-readonly`, actual model **deepseek-flash** (verified via list_agents). Read-only design/caller review; no source changes, no commit. The S458 task currently contains the requirement scope but no author design section; findings below come from the original files, current shell routing, and actual host inventory.

## Exact original contract

### Policy
- Original route: `app/routes/local-policy.tsx`; GET `/api/role-model/local/policy`; PUT same path (`app/lib/runtime-api.ts:3815-3825`).
- Host inventory: only `GET /api/role-model/local/policy` and `PUT /api/role-model/local/policy` (`runtime-host-bridge/src/index.ts:20283-20298`). **No `/api/role-model/local/llama-swap/policy` route exists**; the llama-swap path is a UI route, not a second API. Do not invent it.
- Host GET returns the persisted JSON or defaults `{ttl:300,maxConcurrency:1,autoUnload:true}`; a read/parse failure is silently replaced by defaults (`index.ts:34674-34688`). PUT merges `{...existing,...body}` and returns the merged record; there is no field allowlist/validation (`index.ts:34689-34694`).
- Original UI keeps full `policy` and `draft` objects; only `ttl`, `maxConcurrency`, `autoUnload` get controls. Save sends the **whole draft** (unknown/persisted fields included). Field IDs are exactly `local-policy-ttl`, `local-policy-max-concurrency`, `autoUnload`; TTL input min 0, max concurrency min 1. Save success replaces both objects from the PUT response; failure keeps the draft and shows saveError; Reset restores draft from the last policy and clears saveError; Open models links to `/app/local/llama-swap/models` (no query).
- Initial/loading/error: initial load shows loading; load error is displayed but does not fabricate a policy; Raw policy shows the current persisted object (empty object => empty state), otherwise pretty JSON.

### Routes/redirects
- Original `routes.ts`: `local/llama-swap/policy` -> policy page; `local/policy` -> legacy-redirect id `legacy-local-policy`; `local/llama-swap/matrix` -> local-matrix; `local/matrix` -> legacy-redirect id `legacy-local-matrix`.
- `legacy-redirect.tsx`: `/app/local/policy -> /app/local/llama-swap/policy`, `/app/local/matrix -> /app/local/llama-swap/matrix`, both via `<Navigate ... replace />`.
- `local-matrix.tsx`: `<Navigate to="/app/local/llama-swap/models?view=grid" replace />` — fixed target, fixed `view=grid` query, replace (not push).
- Current shell: `legacy-redirects.ts` already maps `/app/local/policy` and `/app/local/matrix` in `LEGACY_REDIRECT_MAP`, but both targets are listed in `MISSING_ORIGINAL_TARGETS` and have no canonical target/route. Adding a route alone will not make the original paths resolve; the resolver table must also move them to supported targets.
- Current `canonicalHref` appends incoming search to the target (`legacy-redirects.ts:252-259`). Original `Navigate` to fixed targets drops any incoming query. For policy this may be an acceptable existing-shell compatibility difference, but for matrix a target that already has `?view=grid` plus an incoming query would produce `?view=grid&...` rather than the original fixed query. Decide and test the exact query behavior; at minimum preserve replace (no extra history entry).

## Design traps / required decisions

1. **Scope omissions:** the S458 expected write list does not include `src/legacy-redirects.ts`, `src/runtime-endpoints.ts`, or `src/init.ts`. Exact original redirects require `legacy-redirects.ts` (remove both missing-target entries, add supported canonical targets to the new canonical route); the policy readback requires a path entry in `runtime-endpoints.ts` (or a spec path, but keep one owner); direct navigation and telemetry refresh require a policy entry in the route init/read plan (`init.ts`/`readPlanForRoute`), otherwise the policy page stays idle on direct entry. These are scope extensions and must be coordinated with the Lead before edits.
2. **Route target choice:** add one new typed route for the policy page, likely `/local/llama-swap/policy` (the current shell short canonical form). Map original `/app/local/llama-swap/policy` to it and remove the missing-list entries. For matrix, map `/app/local/llama-swap/matrix` to a redirect target `/local/llama-swap/models?view=grid`; decide whether that redirect is a resolver target or a dedicated route, but it must be replace and must not render a NotFound page.
3. **Policy payload:** model the readback as a full record plus typed known fields, not a three-field reconstructed object. PUT must send the exact draft object (including persisted unknown fields) to `/api/role-model/local/policy`; do not send only the three controls and do not add fields. Preserve numeric/boolean types and original parseInt fallbacks. Save success must replace policy+draft from the returned merged record; error must keep draft and show a bounded error.
4. **Read/host degraded honesty:** host 404/missing handler is an error; a host GET that returns defaults is a valid default policy, not a fabricated client fallback. Do not silently substitute another channel or another endpoint. Raw policy must be the actual persisted/returned object; an empty object is the honest empty state.
5. **No invented API/route:** do not add `/api/role-model/local/llama-swap/policy`; the existing host route is `/api/role-model/local/policy` only. Do not add fields not present in the original controls or host record.
6. **Redirect tests:** assert replace command, not push; policy legacy -> llama-swap policy; matrix legacy -> matrix -> fixed `view=grid` target; no generic fallback for a missing route; query behavior explicitly covered; direct policy entry triggers the policy read and telemetry/navigation re-reads it (if those sources are in the read plan).
7. **Existing parity:** preserve current s25d/route parity and unrelated redirect entries; only the two policy/matrix missing entries move to supported. No whole R13-R18 claim.

## Bounded design verdict

Direction is feasible with the existing `/api/role-model/local/policy` GET/PUT and the current legacy resolver, but the design must explicitly include the two omitted integration files (`legacy-redirects.ts`, `runtime-endpoints.ts`) and the route init/read-plan entry, model the full policy draft/payload, and decide matrix query semantics. I would HOLD an implementation that adds only the page/UI and leaves the original paths in `MISSING_ORIGINAL_TARGETS` or reads a non-existent llama-swap policy API.

No source/test/config file was modified; no commit.

