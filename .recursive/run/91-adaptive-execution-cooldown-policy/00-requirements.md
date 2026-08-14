Run: `/.recursive/run/91-adaptive-execution-cooldown-policy/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-08-14T08:00:52Z`
LockHash: `ea34c9284d4c6e3ae2f2f10f9d064ee823b54d66cbfee098664da50e6edce54c`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- User-approved adaptive cooldown proposal in the 2026-08-14 task conversation.
- Incident request `req-bf99353f-1375-4eb3-a243-56566d55c46a` and its persisted execution-cooldown evidence.
Outputs:
- `/.recursive/run/91-adaptive-execution-cooldown-policy/00-requirements.md`
Scope note: Replace the over-broad execution-failure cooldown with a failure-class-aware circuit breaker in the existing runtime and operator UI.

## TODO

- [x] Elicit requirements from user/context
- [x] Define requirement identifiers (R1, R2, ...)
- [x] Write acceptance criteria for each requirement
- [x] Document out of scope items (OOS1, OOS2, ...)
- [x] List constraints and assumptions
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Requirements

### `R1` Classify failures before changing endpoint eligibility

Description: The runtime must classify exhausted execution failures into connection/timeout, provider 5xx, rate limit, authentication, quota, invalid request, and non-breaker categories before deciding whether to change endpoint eligibility.

Acceptance criteria:
- Invalid-request/client-input failures do not create or escalate breaker state.
- Benchmark, health-check, and synthetic traffic do not create or escalate the live-request breaker.
- Persisted breaker records expose a stable reason/error class without retaining request bodies, credentials, or provider payloads.

### `R2` Use a short adaptive connection/timeout policy

Description: A transient connection or timeout failure must not immediately ban an endpoint for ten minutes.

Acceptance criteria:
- The first retry-exhausted connection/timeout failure places the endpoint in `probation` and leaves it eligible for live routing.
- A second connection/timeout failure within 60 seconds opens the circuit for 5 seconds.
- Further consecutive connection/timeout failures use 15 seconds, then 60 seconds, then a 5-minute cap.
- A failure after the reset window starts a new escalation sequence rather than inheriting an indefinitely old count.

### `R3` Use failure-class-specific provider and rate-limit policy

Description: Provider server failures and rate limits require different backoff behavior from transport failures.

Acceptance criteria:
- Retry-exhausted provider 5xx failures open for 2 seconds, then 10 seconds, then 30 seconds, capped at 2 minutes.
- Rate-limit failures honor a valid upstream `Retry-After` value when available; otherwise they use 30 seconds, capped at 5 minutes.
- A rate-limited endpoint is not retried immediately within the same request after the rate limit is observed.

### `R4` Block authentication and quota failures explicitly

Description: Authentication and quota failures are configuration/account conditions, not timed transient cooldowns.

Acceptance criteria:
- An authentication failure permits at most one existing credential-refresh/reload attempt, then records `blocked_auth` with no timer-based automatic retry.
- A quota failure records `blocked_quota` with no timer-based automatic retry.
- A later successful execution or an explicit configuration/credential state change clears the applicable blocked state.

### `R5` Implement explicit circuit lifecycle and half-open probing

Description: Live endpoint eligibility must use explicit circuit states instead of treating every record as a hard deny.

Acceptance criteria:
- The observable lifecycle is `healthy`, `probation`, `open`, and `half_open`, plus explicit `blocked_auth` and `blocked_quota` terminal configuration states.
- Expiry of an `open` period admits only one half-open trial for the endpoint at a time.
- A successful live execution clears breaker state and returns the endpoint to `healthy`.
- Five failure-free minutes reset the transient escalation count.

### `R6` Preserve fallback routing and return truthful refusal semantics

Description: The breaker must remove only currently ineligible endpoints while preserving normal fallback routing among eligible candidates.

Acceptance criteria:
- Eligible fallback endpoints remain routable when another endpoint is open or blocked.
- When all otherwise eligible endpoints are only temporarily open/half-open-busy, the runtime returns HTTP 503 with code `endpoint_temporarily_unavailable`.
- The refusal includes safe `retryAfterMs` and `nextProbeAtMs` fields and does not claim an invalid client request.
- Permanent auth/quota exclusion remains distinguishable from temporary unavailability.

### `R7` Persist a versioned breaker schema and migrate v1 safely

Description: Breaker state must survive restarts without preserving the unsafe v1 behavior.

Acceptance criteria:
- New state is persisted under a versioned v2 contract with failure class, circuit state, escalation timestamps/counts, probe ownership when applicable, and safe diagnostic identifiers.
- Existing `routing.execution-failure-cooldowns.v1` entries are read and conservatively migrated or retired; a historical v1 record cannot silently become a fresh multi-minute v2 ban.
- Persistence remains bounded and contains no credentials, request bodies, response bodies, or secrets.

### `R8` Expose breaker state through existing runtime telemetry APIs

Description: Operators need to understand why an endpoint is or is not routable.

Acceptance criteria:
- Endpoint/provider telemetry distinguishes provider health from local circuit state.
- Temporary states expose remaining time/next probe; blocked states expose their reason without secret material.
- The exact incident shape (one exhausted `fetch failed`) is reported as probation, not a 10-minute cooldown.

### `R9` Update the existing remote-provider UI

Description: The current provider/endpoint UI must display the new state accurately without a parallel policy store.

Acceptance criteria:
- The UI shows provider health separately from circuit state.
- Open circuits show a live or refresh-derived countdown/next-probe indication.
- Probation, half-open, blocked-auth, and blocked-quota states have distinct operator-readable labels.
- Existing healthy endpoints remain uncluttered and existing page behavior remains functional.

### `R10` Verify behavior with deterministic local tests

Description: The policy must be verified without relying on additional paid/live provider requests.

Acceptance criteria:
- Tests cover each failure class, all escalation ladders/caps, reset-on-success, five-minute decay, one-probe half-open concurrency, fallback routing, truthful 503 metadata, and v1-to-v2 migration.
- UI tests cover state distinction and countdown formatting.
- The focused runtime-host and runtime-ui suites pass locally.

### `R11` Validate a stage release candidate before production promotion

Description: The fix must follow the repository release policy established after the broken v0.0.8/v0.0.9 releases.

Acceptance criteria:
- Local CI-equivalent validation passes before any push.
- A stage beta/release-candidate artifact is the first deployable output; no direct main/production promotion is performed by this run.
- Stage QA can use deterministic fault injection or local provider doubles; no new DeepSeek request volume is required.

## Out of Scope

- `OOS1`: Changing model selection scores, catalog membership, or routing strategy beyond breaker eligibility.
- `OOS2`: Adding a new external cache, queue, database, or background service.
- `OOS3`: Sending additional live DeepSeek/provider load solely to validate this change.
- `OOS4`: Promoting directly to `main` or publishing a production release before the user validates the stage RC.
- `OOS5`: Replacing existing provider credential storage or inventing provider-specific token refresh APIs where no supported refresh/reload seam exists.

## Constraints

- Work is isolated from current `origin/dev` and targets `dev` through review; `stage` and `main` remain promotion branches.
- Implementation reuses the existing runtime-host maintenance-state authority and existing runtime-ui routes; no separate repair package or policy service is created.
- The retry policy already in the execution adapter remains the per-request retry authority; the breaker applies after classification at the live-routing boundary.
- `Retry-After` is honored only when the adapter provides a validated bounded value; absent or malformed values use the default.
- Authentication refresh means the existing supported credential reload/refresh path if present; otherwise the first classified auth failure transitions directly to the explicit blocked state rather than fabricating a refresh.
- Times are based on an injectable/test clock and are persisted as safe integer epoch milliseconds.
- User approval was explicit: “ok this sounds good lets implement it.”

## Coverage Gate

- [x] Every approved policy element maps to R1-R9.
- [x] Persistence, migration, observability, UI, and deterministic verification are explicit.
- [x] Release-channel safety and no-new-live-load boundaries are explicit.
- [x] Security/privacy constraints exclude raw request, response, and credential material.
- [x] Out-of-scope items prevent unrelated routing and infrastructure expansion.

Coverage: PASS

## Approval Gate

- [x] The user explicitly approved the proposal before implementation.
- [x] Requirements preserve the approved timings and failure-class semantics.
- [x] No unresolved product choice is required before Phase 1 analysis.

Approval: PASS
