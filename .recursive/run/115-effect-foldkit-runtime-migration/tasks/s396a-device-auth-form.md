# S396a — provider device-authorization connect form (LANDED)

Region: device-auth module + message/model/commands/update/app/control-view/view + tests.

## Landed
- src/device-auth.ts: typed DeviceAuth session/draft/state schemas, initial state, validation, start plan (conflict restore when a pending session matches providerAccountId; exact start payload from providers.tsx:1091-1106), activation plan (unique selected models), poll delay, and the exact HTTP client: POST /accounts/device/start, GET /accounts/device, POST /accounts/device/poll {authRequestId}, POST /endpoints per selected model.
- Model.deviceAuth optional state; Message variants (field change, model add/remove, start, sessions loaded, started, polled, failed, retry, cancelled, activated).
- Commands: StartDeviceAuthorization, ReadDeviceAuthorizations, PollDeviceAuthorization (Effect.sleep(delayMs) then one poll; token carried), ActivateDeviceEndpoint; noop defaults for tests.
- update.ts state machine: start -> read sessions; loaded => invalid (errors, keeps draft) | restore (conflict: no start, ONE poll at returned interval) | start (one start with exact payload); started/polled pending => exactly ONE next poll with selected interval and token+1 (one in flight); connected => ONE ActivateDeviceEndpoint per unique selected model; failed keeps draft+authRequestId; retry re-polls the SAME authRequestId with delay 0; cancel clears session/status/token; every mutation is token-fenced so a late poll after cancel is ignored.
- control-view.ts + view.ts: Providers page renders the controlled form (provider/providerKind/variant/authMode/region/model inputs, Add/Remove model, Start/Cancel, error alert, session status) with data attributes device-auth-state/device-auth-error/device-auth-session.

## State machine
draft --StartRequested--> starting --SessionsLoaded(no pending)--> start command --Started--> pending --Polled(pending)--> pending (one poll/interval) --Polled(connected)--> connected + N activation commands; any failure/poll error -> error (draft kept, authRequestId kept); Retry -> pending poll same authRequestId; Cancel -> draft (token+1).

## Tests (test/s397-device-auth-form.test.ts, 12)
- exact HTTP: start payload fields; poll body {authRequestId}; GET list; one activation POST body.
- state: validation; conflict restore (no duplicate start); exact start payload; activation plan unique.
- transitions: 'conflict restore schedules ONE poll and never a start'; 'no pending session starts once with the exact payload'; 'keeps authRequestId on retry and issues ONE poll in flight'; 'cancel clears the session and token-fences a late poll result'; 'on connected activates ONE command per selected model'.

## Evidence
- RED s397-red.log EXIT_CODE=1 (module missing / pre-implementation); GREEN s397-green.log 6 files / 138 tests; UI tsc exit 0.
- Hashes: device-auth DE1AFA45..., message 858E2105..., model 6D439EAA..., commands A0FCADE8..., update D4D57DD0..., app 09D40482..., control-view 2120BF71..., view 6D6452D4..., s397 test E61C77B9....
- Lint: s397 clean (0).

## Honest remaining
- No JS interval exists: the poll delay is Effect.sleep inside the command fiber, so a cancelled/disposed command cannot leak a timer; the tests cover cancel state/token fencing but not an explicit unmount command-fiber interruption assertion.
- Provider/model catalogue readbacks for populating selects are still read-only rows (no typeahead source wired); the form uses typed text inputs for provider/variant/model.
## S398 repair (3 review holds)

| Hold | Fix | Evidence |
| --- | --- | --- |
| Start payload exactness | ALIGNED to the original providers.tsx contract: payload has NO region; modelRoleBindings is COMPUTED per selected model with the original empty-selection shape {roleIds:[], roleAssignmentMode:'include', enabledRoleIds:[], disabledRoleIds:[]}; allowedModels remains the multi-select extension (all unique selected models, documented). The client test now uses toEqual on the exact shipped payload. | s397 exact-start test (toEqual); device-auth.ts DeviceAuthStartPayload |
| In-flight guard + retry control | DeviceAuthState.inflight added; poll-scheduling transitions set true, results clear false; DeviceAuthRetryRequested refuses while inflight (or status starting) and retries the SAME authRequestId when settled (or re-reads sessions when no session). Providers form renders a Retry button on error (data-device-auth-retry) wired to DeviceAuthRetryRequested. | update.ts retry handler; control-view retry button; tests 'refuses a retry while a poll is in flight and allows it once settled' + DOM 'shows a retry control after a failed read and retries the device read on click' |
| Lint :57/:58 | Recording fetch typed with RecordedInit (no runtime typeof) and a SAFETY comment above the single typeof fetch cast. | test/s397 lint CLEAN |

Evidence: RED s397-red2.log EXIT_CODE=1 (3 failed: exact payload, in-flight guard, retry DOM); GREEN s397-green2.log 6 files / 140 tests; UI tsc exit 0. Hashes: device-auth BF77D9F3..., update D8D74C3F..., control-view 64C100B4..., s397 test EA13B7F5....
## S399 micro-fix (start guard + lint)

- DeviceAuthStartRequested now has a real in-flight guard: it returns no commands when state.inflight === true OR status is starting/pending, so a click during a slow poll cannot issue a second start/read (the token fence would only hide the second response). The Start button remains AriaDisabled while busy.
- Test: 'refuses a second start while a poll is in flight or one is starting' (inflight pending -> no commands; starting -> no commands; idle -> one ReadDeviceAuthorizations).
- Lint: the s397 DOM-test fetch cast now has its own SAFETY comment; test/s397 is CLEAN.
- Evidence: RED s397-red3.log EXIT_CODE=1 (start-guard test failed); GREEN s397-green3.log 6 files / 141 tests; UI tsc 0. Hashes: update 6903B6A0..., s397 test B74F04D7....
