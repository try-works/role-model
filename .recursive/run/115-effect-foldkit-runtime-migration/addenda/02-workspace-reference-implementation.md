# Addendum 02: Workspace reference implementation

Date: 2026-10-27. Effective input to Phase3 and REASSESSMENT-AND-EXECUTION.md. Owner-required implementation reference, not optional reading. Supersedes S245/S247 where those reduce adoption to test cleanup or equate frontend Layers with backend R27.

## Reference authority

- Demo: https://foldkit-website-preview-ky42cyp8l-devin-jamesons-projects.vercel.app/example-apps/workspace
- User source locator: https://github.com/foldkit/foldkit/tree/main/examples/workspace/src
- Snapshot: https://foldkit-website-preview-ky42cyp8l-devin-jamesons-projects.vercel.app/preview-release.json
- Migration: https://foldkit-website-preview-ky42cyp8l-devin-jamesons-projects.vercel.app/preview-migration.md
- PR: https://github.com/foldkit/foldkit/pull/1655

Manifest re-fetched today: HTTP200, canary, sourceCommit f3be22cfeefed437164ad614d08b16d9000e0703. Pinned raw README, issueDetail/composition.ts, issueList/model.ts, repository/repository.ts and projectSettings/draft.ts re-read at that commit, HTTP200. GitHub API rate-limited (403) for main contents; PR metadata not usable. Earlier open/not-on-main statements are historical, not freshly verified. Use exact deployment snapshot, never infer that moving main equals preview.

Installed source pin is stable0.169.0/7ee21426, Effect4.0.6. Preview Block/Program/handler symbols require a reviewed pin/compatibility change. Do not import nonexistent preview APIs or silently edit vendor.

## Required implementation mapping

| Reference | Role-model application | Acceptance |
|---|---|---|
| Definition -> Composition -> Block -> Program; block/composition/definition/entry | Feature owners for Observe, Router/Controller, Providers/Connect/DeviceAuth, Models/Benchmark, Local/Swap, Learning, Studio, Diagnostics, RuntimeConfig | Production parent consumes each feature; co-located model/message/update/view/commands/lifecycle. No unused abstract composition credited |
| issueList Model versus ViewInputs | Child owns interaction state; parent owns canonical URL/query/auth/catalogue/refresh facts; explicit controlled inputs | Typed parent filter facts; back/forward/deep links restore values; no competing canonical stores |
| OutMessage folds, bindings, operations | Child-to-parent facts, parent-to-child operations; no child reaching into global model | Exhaustive typed messages; no erasure casts; parent+scene+actual wire tests |
| keyed issueDetailInstances and retained drafts | Details/editors keyed by actual request/entity/route instance, not current visible page | A late result cannot overwrite B; hidden pending save settles its own instance or is canceled per contract; valid same-ID drafts retained |
| issueDetail reconciliation / projectSettings draft | Separate loaded baseline, draft, pending save, incoming revision | Failure/retry retains edits; refresh does not overwrite dirty draft; stale conflict requires explicit reload; double-submit fenced; exact PUT/PATCH unchanged |
| WorkspaceRepository Effect Service/ApplicationLayer | Typed HTTP adapters with one application-lifetime client-service owner; real server remains canonical | Exact request/fallback/status/headers/signal; no per-command graph rebuild; resources closed at owner shutdown |
| AsyncData plus explicit SaveState | Standard read/revalidate/save states without discarding domain stale/truncated/denied/disabled facts | State/race tests; no wholesale rewrite deleting readback distinctions |
| shared Listbox helper and Dialog | One RM3 facade over actual vendored @foldkit/ui controls, device-auth modal and native text editing | Names/typeahead/arrows/Escape/dismissal/focus-return/disabled/RTL/mobile/reduced-motion; scene AND shipped-browser proof |
| native links, URL filters | All original canonical patterns and legacy history-replace redirects; detail/tab/query identity preserved | Inventory-driven parser/browser tests, native open/copy-link, not aliases silently changing navigation |
| feature subscriptions | One refresh owner, correctly scoped feature resources | telemetry.update and revision/gap/refetch, close-once, no duplicate GET/listener or stale publication |
| story/scene/repository tests | Story/update protocol, scene/view interaction, client serialization, mounted/browser wiring, packaged real-client acceptance | Complementary layers, no wiring deletion to reduce clicks; preserve exact payload/failure mutation oracles |
| responsive editor / full workflows | Keep RM3 design; adopt behavior and ownership, not demo visual theme | Complete loading/error/retry/conflict/keyboard/detail/mobile, original forms and chart numeric alternatives |

Do not add issue tracking/boards/comments/simulated activity/drag-and-drop/palette just because demo has them. Implement only mapped original role-model behavior. Demo repository resets on reload: role-model persisted config/history must NOT inherit this limitation. Never replace server authority with its mock in-memory repository.

## API and pin strategy

1. Now implement these ownership/behavior contracts using real currently pinned Submodel, AsyncData, scene/story, @foldkit/ui, Command/Subscription/Mount APIs. This is substantive feature architecture, not merely testing. Preserve typed boundaries that can migrate leaf-first.
2. Run bounded exact-preview compatibility spike IN PARALLEL: manifest/migration guide -> required exports/types/peers/compiler -> one leaf feature assembly and browser graph. Merge status alone is neither a blocker nor compatibility proof. No floating latest/main.
3. Before vendor change require immutable target, untouched payload/digests/provenance/license, wrapper subpaths/declarations, Effect4.0.6 and current compiler proof, one real leaf init/update/view/handler service, scene+wire tests and production build/one-Effect graph. No blind TypeScript7 upgrade, devtools/Vite-plugin/MCP install or peer override.
4. If gate passes, adopt actual Definition/Composition/Block/Program, local EffectsLayer/ApplicationLayer leaf-first during required feature completion. Pilot RuntimeConfigEditor or Controller, with real save/conflict behavior; then parent and root. Rebuild packaged artifact and repeat affected parity.
5. If incompatible, record exact failure and reviewed adapter/pin remedy; continue stable feature work. Do not fake Blocks with casts or defer full route completion to an unnamed future run. Reference architecture remains required guidance; package feasibility has its own explicit decision.

## Team implementation sequence

F0 read-only snapshot/API advisor -> bounded compatibility report (parallel backend/URL work).
F1 route owner -> original URL/deep-link/redirect contract plus typed feature boundaries; route/init/update single writer.
F2 feature worker -> RuntimeConfig/Controller first, then provider/device-auth and other original route families; dedicated feature directory/tests, shared shell integrated by Lead.
F3 facade owner -> actual listbox/dialog/fields + accessible lifecycle tests; no concurrent shared feature edits.
F4 independent reviewer/verifier -> compare original behavior AND reference ownership matrix, actual types/commands/wire/browser/package evidence.

Each feature acceptance requires invoked child graph, typed controlled inputs/parent facts, async/draft/conflict/race behavior, exact HTTP method/path/query/body/headers/multiplicity, keyboard/mobile/theme and package identity. Test counts and class names do not satisfy this.

## Exhaustive feature-family ownership map

These are required family work packages, not claims of implemented routes. Every original module/URL from runtime-ui/app/routes.ts and component inventory must map to one family and concrete test, including20redirect entries (22map strings must be reconciled, not guessed counts).

| Owner package | Original surfaces | Dedicated destination/test contract |
|---|---|---|
| F-Observe | dashboard, activity, requests/detail, logs, queues, routing, degradation receipts, observability | features/observe; request/deep-link/filter/numeric/refresh/parity tests |
| F-Router | router/config/candidates/decisions/detail, routing strategy, agent strategy, workloads, controller | features/router; policy/metadata forms/exactPATCH, request-ID and controlled filter tests |
| F-Providers | remote/providers, Connect/endpoints, downstream/upstream, device-auth card/modal | features/providers; account form/start/poll/cancel/auth/focus/typed child facts and exact wire tests |
| F-Models | models, roles/eligibility, benchmark/control-benchmark | features/models; role save, benchmark start/read/progress/cancel/conflict tests |
| F-Local | choose/models/peer models, llama-swap models/swap/policy/logs/matrix, local endpoints/peers, swap modal | features/local; current vendored llama-swap proxy/action/query/close/focus tests |
| F-Learning | overview/configuration/packs/decisions/evidence/history | features/learning; six URL identities, real config/action/readbacks, authorized/disabled/degraded/no-fabricated-success tests |
| F-Studio | Workbench/chat, images, audio voices/speech/transcription, rerank and reranking alias, advanced responses/messages/count_tokens/embeddings | features/studio; each supported endpoint/payload/file/text/stream/error capability tested; no five-tab-only completion claim |
| F-System | runtime, runtime-config, session readiness, peers, extensions, operator, retention | features/system; RuntimeConfigEditor pilot, extensions/operator/retention exact actions, state/denial/error tests |
| F-Diagnostics | added diagnostics page plus existing observability/degradation retained | features/diagnostics; real authorized defect/API/identity/loss/redaction/mobile tests |
| F-Facade | original selected24components including dialogs/fields/charts, source ledger | packages/ui foldkit modules, provenance selection ledger, scene/browser/keyboard/RTL/reduced-motion tests |

Lead owns shared route/model/API/bootstrap/refresh/token/common exports. Family workers own only named leaf files after DTO/child-interface handoff, no parallel edits to shared shell. No command palette or board feature invented when absent from role-model inventory.

## Independent backend and acceptance gates

Frontend ApplicationLayer does NOT implement B6/R27 public OS/server/SQL/queue/capture ownership or B9/R32 private graph. Separate processes have separate closed graphs and validated DTOs only. Backend does not wait for Foldkit upstream merge.

Reference-informed refactor does not waive dual-build React selfcheck/deterministic parity, actual DSH/pi provider J1/J2/J5, joined telemetry/UI/storage, current R/D/C, performance or rollback. Keep RM3 tokens/geometry. Intentional rendering/behavior deltas need their own approval and regression evidence.
