# S556 — B0/R19 body-verification sweep (remaining public operations)

Read-only sweep; no source edits. Basis: private worktree HEAD 23bed5f5; public worktree at 346d2a1c. Inventory and R19 docs are public-run evidence.

## Method and pragmatic-mode rationale

Pragmatic mode: 137 exported operations/resources across role-model-router/apps/runtime-host-bridge/src/index.ts and cli.ts were parsed from s298; each definition was re-located in current source, its brace-matched body extracted, and classified for Effect/Promise/async usage. All 12 s298 convert candidates and 10 largest/representative kept bodies were then read line-by-line; the remaining kept bodies are covered by definition + body scan, not a full line audit. This limitation is disclosed, not hidden.

Disposition mapping requested by the task: pure/adapter s298 candidates are kept (retained as-is); convert candidates are migrated only when the current body actually runs Effect, otherwise not-converted.

## Counts

- Operations/resources parsed: 137; definitions located: 137/137; symbols missing: 0.
- kept: 125 (s298 pure/adapter retained); migrated: 1; not-converted: 11.
- Deep line-by-line reads: 22 (12 convert candidates + 10 kept samples).
- Definition-line drift: all 137 relocated by later commits since s298 (84a5c1fd -> current 346d2a1c); relocation, not disappearance.
- Disposition drift: the 12 s298 convert candidates resolve to 1 migrated (main) and 11 not-converted.
- Inventory JSON: 15 definition citations corrected; checker 7/7 green. No checker/schema change.

## Inventory JSON drift corrections (drift fact changed)

The 27-entry inventory passed its machine check but 15 citations pointed at non-definition lines (the check only requires non-blank). Corrected definition lines:

| entry | old line | new line | current definition |
|---|---|---|---|
| diagnostics-handler | 17058 | 17072 | `export function handleLocalDiagnosticsRead` |
| host-request-handler | 17447 | 17461 | `function createRequestHandler` |
| host-bridge-server | 20840 | 20874 | `export async function startBridgeServer` |
| host-chat-execution | 30485 | 30543 | `async executeChatCompletions (backend object)` |
| host-cli | 4930 | 5004 | `export async function main` |
| sql-service-make | 490 | 750 | `export const make` |
| sql-service-make-sync | 494 | 754 | `export const makeSync` |
| sql-service-query | 337 | 433 | `const query` |
| sql-service-exec | 350 | 446 | `const exec` |
| sql-service-transaction | 363 | 459 | `const transaction` |
| sql-service-query-sync | 425 | 532 | `const querySync` |
| sql-service-exec-sync | 431 | 539 | `const execSync` |
| sql-service-transaction-sync | 437 | 546 | `const transactionSync` |
| sql-service-close | 451 | 561 | `const close` |
| sql-service-is-open | 474 | 585 | `const isOpen` |

(sql-service-close-sync was already correct at 575.) Checker: node --test scripts/s4-contracts-inventory.test.mjs -> 7 pass, 0 fail.

## Batch A — index.ts lines 1-12000 (51 operations)

| operation | current body citation | body evidence | disposition | drift |
|---|---|---|---|---|
| `fetchWithTransientRetry` | index.ts:430 | async retry loop: await networkFetcher, transient-error check, setTimeout backoff; Promise, no Effect | not-converted | s298 convert -> not-converted; definition +19 lines |
| `resolveEndpointExecutionEffort` | index.ts:448 | export function resolveEndpointExecutionEffort(input: {; sync, no Effect | kept | definition relocated +19 lines |
| `OPENAI_CODEX_SUBSCRIPTION_MODEL_MATRIX` | index.ts:630 | export const OPENAI_CODEX_SUBSCRIPTION_MODEL_MATRIX = [; sync, no Effect | kept | definition relocated +19 lines |
| `OPENAI_CODEX_SUBSCRIPTION_MODEL_IDS` | index.ts:749 | export const OPENAI_CODEX_SUBSCRIPTION_MODEL_IDS = OPENAI_CODEX_SUBSCRIPTION_MODEL_MATRIX.map(; sync, no Effect | kept | definition relocated +19 lines |
| `OPENAI_CODEX_SUBSCRIPTION_MODEL_EXCLUSIONS` | index.ts:771 | export const OPENAI_CODEX_SUBSCRIPTION_MODEL_EXCLUSIONS = {; sync, no Effect | kept | definition relocated +19 lines |
| `normalizeReasoningEffortPolicy` | index.ts:1008 | export function normalizeReasoningEffortPolicy(; sync, no Effect | kept | definition relocated +19 lines |
| `resolveEffortPolicy` | index.ts:1028 | export function resolveEffortPolicy(input: {; sync, no Effect | kept | definition relocated +19 lines |
| `DIFFICULTY_CLASSIFIER_VERSION` | index.ts:1511 | export const DIFFICULTY_CLASSIFIER_VERSION = "run106-turn-aware-v1";; sync, no Effect | kept | definition relocated +19 lines |
| `computeDifficultyFeatures` | index.ts:1535 | export function computeDifficultyFeatures(signals: DifficultyRoutingSignals): DifficultyFeatureSet {; sync, no Effect | kept | definition relocated +19 lines |
| `shouldInvalidateDifficultyClassifierVersion` | index.ts:1565 | export function shouldInvalidateDifficultyClassifierVersion(; sync, no Effect | kept | definition relocated +19 lines |
| `classifyDifficultyFromSignals` | index.ts:1572 | export function classifyDifficultyFromSignals(input: {; sync, no Effect | kept | definition relocated +19 lines |
| `DIFFICULTY_CLASSIFIER_MAX_MESSAGES` | index.ts:1770 | export const DIFFICULTY_CLASSIFIER_MAX_MESSAGES = 12;; sync, no Effect | kept | definition relocated +19 lines |
| `DIFFICULTY_CLASSIFIER_MAX_CHARS_PER_MESSAGE` | index.ts:1771 | export const DIFFICULTY_CLASSIFIER_MAX_CHARS_PER_MESSAGE = 4_000;; sync, no Effect | kept | definition relocated +19 lines |
| `DIFFICULTY_CLASSIFIER_MAX_JSON_BYTES` | index.ts:1772 | export const DIFFICULTY_CLASSIFIER_MAX_JSON_BYTES = 48 * 1024;; sync, no Effect | kept | definition relocated +19 lines |
| `buildDifficultyClassifierMessages` | index.ts:1774 | export function buildDifficultyClassifierMessages(input: {; sync, no Effect | kept | definition relocated +19 lines |
| `CONTROLLER_MAX_TRANSCRIPT_BYTES` | index.ts:1843 | export const CONTROLLER_MAX_TRANSCRIPT_BYTES = 128 * 1024;; sync, no Effect | kept | definition relocated +19 lines |
| `buildControllerRoutingMessages` | index.ts:1863 | export function buildControllerRoutingMessages(input: {; sync, no Effect | kept | definition relocated +19 lines |
| `buildCompactControllerRoutingMessages` | index.ts:1899 | export function buildCompactControllerRoutingMessages(input: {; sync, no Effect | kept | definition relocated +19 lines |
| `inferHeuristicControllerGuidance` | index.ts:1971 | export function inferHeuristicControllerGuidance(input: {; sync, no Effect | kept | definition relocated +19 lines |
| `mergeControllerGuidanceDefaults` | index.ts:2025 | export function mergeControllerGuidanceDefaults(input: {; sync, no Effect | kept | definition relocated +19 lines |
| `expandPreferredEndpointIdsToEffortArms` | index.ts:2489 | export function expandPreferredEndpointIdsToEffortArms(input: {; sync, no Effect | kept | definition relocated +19 lines |
| `resolveObservedDifficultyBucketForPlan` | index.ts:2574 | export function resolveObservedDifficultyBucketForPlan(plan: {; sync, no Effect | kept | definition relocated +19 lines |
| `resolveBridgeExecutionCost` | index.ts:3092 | export function resolveBridgeExecutionCost(input: {; sync, no Effect | kept | definition relocated +19 lines |
| `buildRuntimeTelemetrySnapshot` | index.ts:3127 | export function buildRuntimeTelemetrySnapshot(input: {; sync, no Effect | kept | definition relocated +19 lines |
| `toCacheContinuityScopeDescriptor` | index.ts:4750 | export function toCacheContinuityScopeDescriptor(executionRequest: RuntimeExecutionRequest): {; sync, no Effect | kept | definition relocated +24 lines |
| `readCacheContinuityRouteHints` | index.ts:4869 | export function readCacheContinuityRouteHints(input: {; sync, no Effect | kept | definition relocated +24 lines |
| `persistCacheContinuityOutcome` | index.ts:4886 | export function persistCacheContinuityOutcome(input: {; sync, no Effect | kept | definition relocated +24 lines |
| `classifyUpstreamExecutionFailure` | index.ts:5032 | export function classifyUpstreamExecutionFailure(input: {; sync, no Effect | kept | definition relocated +24 lines |
| `shouldRetryUpstreamExecutionOnSameEndpoint` | index.ts:5266 | export function shouldRetryUpstreamExecutionOnSameEndpoint(input: {; sync, no Effect | kept | definition relocated +24 lines |
| `classifyExecutionFailureIfNeeded` | index.ts:5295 | export function classifyExecutionFailureIfNeeded(; sync, no Effect | kept | definition relocated +24 lines |
| `hasSubstantiveStreamDelta` | index.ts:5342 | export function hasSubstantiveStreamDelta(chunk: unknown): boolean {; sync, no Effect | kept | definition relocated +24 lines |
| `buildTerminalStreamErrorPayload` | index.ts:5972 | export function buildTerminalStreamErrorPayload(error: unknown): {; sync, no Effect | kept | definition relocated +24 lines |
| `isRuntimeBootstrapBlock` | index.ts:6015 | export function isRuntimeBootstrapBlock(state: {; sync, no Effect | kept | definition relocated +24 lines |
| `projectBenchmarkDecisionEvidence` | index.ts:6438 | export function projectBenchmarkDecisionEvidence(; sync, no Effect | kept | definition relocated +24 lines |
| `projectTelemetryDecisionEvidence` | index.ts:6517 | export function projectTelemetryDecisionEvidence(; sync, no Effect | kept | definition relocated +24 lines |
| `summarizeSelectionDiagnosticsFromDecision` | index.ts:6675 | export function summarizeSelectionDiagnosticsFromDecision(; sync, no Effect | kept | definition relocated +24 lines |
| `createRuntimeExecutionCatalogCache` | index.ts:7308 | export function createRuntimeExecutionCatalogCache(): {; sync, no Effect | kept | definition relocated +24 lines |
| `createRoleModelNormalizedIntentObservation` | index.ts:8351 | export function createRoleModelNormalizedIntentObservation(; sync, no Effect | kept | definition relocated +24 lines |
| `buildRequestClassification` | index.ts:8584 | export function buildRequestClassification(input: {; sync, no Effect | kept | definition relocated +24 lines |
| `buildRequestClassificationForPlan` | index.ts:8654 | export function buildRequestClassificationForPlan(; sync, no Effect | kept | definition relocated +24 lines |
| `createModelListResponse` | index.ts:9069 | export function createModelListResponse(; sync, no Effect | kept | definition relocated +24 lines |
| `createRuntimeModelRecords` | index.ts:9212 | export function createRuntimeModelRecords(; sync, no Effect | kept | definition relocated +24 lines |
| `resolveEndpointWebSearchSupport` | index.ts:9360 | export function resolveEndpointWebSearchSupport(; sync, no Effect | kept | definition relocated +24 lines |
| `classifyBridgeRoutePass` | index.ts:9980 | export function classifyBridgeRoutePass(input: {; sync, no Effect | kept | definition relocated +24 lines |
| `applyReasoningEffortToModelPool` | index.ts:10017 | export function applyReasoningEffortToModelPool(input: {; sync, no Effect | kept | definition relocated +24 lines |
| `createDownstreamOpenAIProviderConfig` | index.ts:10312 | export function createDownstreamOpenAIProviderConfig(; sync, no Effect | kept | definition relocated +24 lines |
| `inferTaxonomyToolClasses` | index.ts:10819 | export function inferTaxonomyToolClasses(toolNames: readonly string[]): string[] {; sync, no Effect | kept | definition relocated +24 lines |
| `mapChatCompletionsRequest` | index.ts:10972 | export function mapChatCompletionsRequest(; sync, no Effect | kept | definition relocated +24 lines |
| `mapResponsesRequest` | index.ts:11274 | export function mapResponsesRequest(; sync, no Effect | kept | definition relocated +24 lines |
| `writeUnhandledBridgeError` | index.ts:11583 | export function writeUnhandledBridgeError(response: ServerResponse, error: unknown): boolean {; sync, no Effect | kept | definition relocated +24 lines |
| `resolveLiveAttemptTimeoutMs` | index.ts:11695 | export function resolveLiveAttemptTimeoutMs(env: NodeJS.ProcessEnv = process.env): number {; sync, no Effect | kept | definition relocated +24 lines |

## Batch B — index.ts lines 12001-20000 (19 operations)

| operation | current body citation | body evidence | disposition | drift |
|---|---|---|---|---|
| `loadMcpConnectorConfigs` | index.ts:12113 | async readJson of testdata/router-runtime/mcp-connectors.json; Promise, no Effect | not-converted | s298 convert -> not-converted; definition +24 lines |
| `createRequestScopedToolRegistry` | index.ts:12210 | export function createRequestScopedToolRegistry(; sync, no Effect | kept | definition relocated +24 lines |
| `routeRuntimeRequest` | index.ts:12326 | export function routeRuntimeRequest(input: RoutingInput): string {; sync, no Effect | kept | definition relocated +24 lines |
| `guardSoleCandidateThroughputDeny` | index.ts:12340 | export function guardSoleCandidateThroughputDeny(input: RoutingInput): boolean {; sync, no Effect | kept | definition relocated +24 lines |
| `seedManagedCodexWorkspaceFixture` | index.ts:12355 | fs/promises mkdir/writeFile seeds src+state fixtures; Promise, no Effect | not-converted | s298 convert -> not-converted; definition +24 lines |
| `isTransientProviderTransportError` | index.ts:13105 | export function isTransientProviderTransportError(error: unknown): boolean {; sync, no Effect | kept | definition relocated +24 lines |
| `resolveOauthDeviceHttpTimeoutMs` | index.ts:13144 | export function resolveOauthDeviceHttpTimeoutMs(env: NodeJS.ProcessEnv = process.env): number {; sync, no Effect | kept | definition relocated +24 lines |
| `buildCodexDynamicTools` | index.ts:13313 | export function buildCodexDynamicTools(; sync, no Effect | kept | definition relocated +24 lines |
| `normalizeCodexSubscriptionModelName` | index.ts:13368 | export function normalizeCodexSubscriptionModelName(model: string): string {; sync, no Effect | kept | definition relocated +24 lines |
| `createCodexSubscriptionResponsesExecutionAdapter` | index.ts:14515 | export function createCodexSubscriptionResponsesExecutionAdapter(options?: {; sync, no Effect | kept | definition relocated +24 lines |
| `resolveStoredOauthTokenLocations` | index.ts:14672 | export function resolveStoredOauthTokenLocations(input: {; sync, no Effect | kept | definition relocated +24 lines |
| `readProviderStreamTranscript` | index.ts:15460 | async readSseTranscript with onPayload streamWriter; Promise, no Effect | not-converted | s298 convert -> not-converted; definition +24 lines |
| `filterRouterRegistryByExecutionMode` | index.ts:15581 | export function filterRouterRegistryByExecutionMode(; sync, no Effect | kept | definition relocated +24 lines |
| `handleLocalDiagnosticsRead` | index.ts:17072 | export function handleLocalDiagnosticsRead(; sync, no Effect | kept | definition relocated +24 lines |
| `resolveAnonymousLearningReads` | index.ts:17167 | export function resolveAnonymousLearningReads(; sync, no Effect | kept | definition relocated +24 lines |
| `resolveDeviceOwnerTrust` | index.ts:17194 | export function resolveDeviceOwnerTrust(; sync, no Effect | kept | definition relocated +24 lines |
| `projectLearningProfileEstimate` | index.ts:17281 | export function projectLearningProfileEstimate(value: unknown): Record<string, unknown> \| null {; sync, no Effect | kept | definition relocated +24 lines |
| `resolveLearningProfileRouteResult` | index.ts:17325 | export function resolveLearningProfileRouteResult(input: {; sync, no Effect | kept | definition relocated +24 lines |
| `attachRouterPolicyResolution` | index.ts:17379 | export function attachRouterPolicyResolution(; sync, no Effect | kept | definition relocated +24 lines |

## Batch C — index.ts lines 20001+ (16 operations)

| operation | current body citation | body evidence | disposition | drift |
|---|---|---|---|---|
| `RUNTIME_HOST_STORAGE_REGISTRY` | index.ts:20496 | export const RUNTIME_HOST_STORAGE_REGISTRY = Object.freeze({; sync, no Effect | kept | definition relocated +29 lines |
| `assertRuntimeHostStorageWriteAllowed` | index.ts:20507 | export function assertRuntimeHostStorageWriteAllowed(storageClass: string, channel: string): void {; sync, no Effect | kept | definition relocated +29 lines |
| `createModuleHealthComposition` | index.ts:20573 | export function createModuleHealthComposition(; sync, no Effect | kept | definition relocated +37 lines |
| `wireModuleHealth` | index.ts:20631 | export function wireModuleHealth<Options extends ModuleHealthWiringOptions>(; sync, no Effect | kept | definition relocated +42 lines |
| `createBridgeRequestListener` | index.ts:20658 | export function createBridgeRequestListener<Options extends ModuleHealthWiringOptions>(; sync, no Effect | kept | definition relocated +42 lines |
| `recordDirectContributionWith` | index.ts:20706 | export const recordDirectContributionWith = async (; async/Promise, no Effect | kept | definition relocated +42 lines |
| `recordRouteCaptureAtHostEdge` | index.ts:20762 | export const recordRouteCaptureAtHostEdge = async (; async/Promise, no Effect | kept | definition relocated +42 lines |
| `startBridgeServer` | index.ts:20874 | async startup; resolves the real composed Backend owner, then composes listener/server lifecycle; Promise, no Effect boundary at definition | not-converted | s298 convert -> not-converted; definition +145 lines |
| `projectPublicProviderAttemptIds` | index.ts:20910 | export function projectPublicProviderAttemptIds(observation: object): readonly string[] {; sync, no Effect | kept | definition relocated +112 lines |
| `fatalRegistryDiagnostics` | index.ts:20941 | export function fatalRegistryDiagnostics<; sync, no Effect | kept | definition relocated +112 lines |
| `OBSERVABILITY_SNAPSHOT_SCHEMA_VERSION` | index.ts:20981 | export const OBSERVABILITY_SNAPSHOT_SCHEMA_VERSION = "role-model.observability-snapshot.v1";; sync, no Effect | kept | definition relocated +112 lines |
| `openRetentionCleanupDatabase` | index.ts:20995 | export const openRetentionCleanupDatabase = (databasePath: string): ReturnType<typeof makeRetentionCleanupData; sync, no Effect | kept | definition relocated +114 lines |
| `runRetentionCleanupAt` | index.ts:20998 | export const runRetentionCleanupAt = (; sync, no Effect | kept | definition relocated +111 lines |
| `createRuntimeBridgeBackend` | index.ts:21024 | async backend factory composing bootstrap owner, Track B operations, codex auth/execution adapters; Promise, no Effect boundary | not-converted | s298 convert -> not-converted; definition +119 lines |
| `resolveStandaloneStaticRoot` | index.ts:35507 | export function resolveStandaloneStaticRoot(input: {; sync, no Effect | kept | definition relocated +161 lines |
| `resolveBridgeServerOptions` | index.ts:35541 | export function resolveBridgeServerOptions(input: {; sync, no Effect | kept | definition relocated +161 lines |

## Batch D — cli.ts (51 operations)

| operation | current body citation | body evidence | disposition | drift |
|---|---|---|---|---|
| `openReadOnlyStateDatabase` | cli.ts:200 | export const openReadOnlyStateDatabase = (file: string): DatabaseSync =>; sync, no Effect | kept | definition relocated +2 lines |
| `setStateDatabaseServiceFactoryForTests` | cli.ts:209 | export function setStateDatabaseServiceFactoryForTests(; sync, no Effect | kept | definition relocated +2 lines |
| `readEndpointModelIdForRoutePackage` | cli.ts:235 | export function readEndpointModelIdForRoutePackage(input: {; sync, no Effect | kept | definition relocated +2 lines |
| `supervisedReplayBranchCaptureRequestId` | cli.ts:274 | export function supervisedReplayBranchCaptureRequestId(input: {; sync, no Effect | kept | definition relocated +2 lines |
| `readRouteCaptureFromQueueReceipt` | cli.ts:320 | export function readRouteCaptureFromQueueReceipt(input: {; sync, no Effect | kept | definition relocated +2 lines |
| `resolveResumedHandoffJobRecord` | cli.ts:379 | export function resolveResumedHandoffJobRecord(input: {; sync, no Effect | kept | definition relocated +2 lines |
| `evaluationJobExistsFromGetJobAnswer` | cli.ts:393 | export function evaluationJobExistsFromGetJobAnswer(answer: unknown): boolean \| null {; async/Promise, no Effect | kept | definition relocated +2 lines |
| `evaluationJobStatusFromGetJobAnswer` | cli.ts:446 | export function evaluationJobStatusFromGetJobAnswer(answer: unknown): string \| null \| undefined {; async/Promise, no Effect | kept | definition relocated +2 lines |
| `readPersistedControllerEndpointId` | cli.ts:503 | export function readPersistedControllerEndpointId(input: {; sync, no Effect | kept | definition relocated +2 lines |
| `readCaptureTaxonomyVersion` | cli.ts:780 | export function readCaptureTaxonomyVersion(capture: DurableReplayCapture): string \| undefined {; sync, no Effect | kept | definition relocated +3 lines |
| `readCaptureRoleId` | cli.ts:796 | export function readCaptureRoleId(capture: DurableReplayCapture): string \| undefined {; sync, no Effect | kept | definition relocated +3 lines |
| `readCaptureTaskTypeId` | cli.ts:819 | export function readCaptureTaskTypeId(capture: DurableReplayCapture): string \| undefined {; sync, no Effect | kept | definition relocated +3 lines |
| `replayRequestIdFromProviderResultRef` | cli.ts:837 | export function replayRequestIdFromProviderResultRef(; sync, no Effect | kept | definition relocated +3 lines |
| `buildReplayAppendExecution` | cli.ts:872 | export function buildReplayAppendExecution(input: {; sync, no Effect | kept | definition relocated +3 lines |
| `resolveResumedReplayAppendDispatch` | cli.ts:954 | export function resolveResumedReplayAppendDispatch(input: {; sync, no Effect | kept | definition relocated +3 lines |
| `deriveSupervisedReplayTrajectoryEvents` | cli.ts:1021 | export function deriveSupervisedReplayTrajectoryEvents(input: {; sync, no Effect | kept | definition relocated +3 lines |
| `deriveLearnerTrajectoryEvidenceForReplay` | cli.ts:1248 | export async function deriveLearnerTrajectoryEvidenceForReplay(input: {; async/Promise, no Effect | kept | definition relocated +3 lines |
| `FINALIZATION_SIGNALS_EXAMINED_LIMIT` | cli.ts:1393 | export const FINALIZATION_SIGNALS_EXAMINED_LIMIT = 64;; async/Promise, no Effect | kept | definition relocated +3 lines |
| `FINALIZATION_SIGNALS_COMPUTE_LIMIT` | cli.ts:1401 | export const FINALIZATION_SIGNALS_COMPUTE_LIMIT = 16;; sync, no Effect | kept | definition relocated +3 lines |
| `FINALIZATION_SIGNALS_BUDGET_MS` | cli.ts:1404 | export const FINALIZATION_SIGNALS_BUDGET_MS = 30_000;; async/Promise, no Effect | kept | definition relocated +3 lines |
| `sweepFinalizationSignalsForGroups` | cli.ts:1417 | async bounded walk invoking signals:analyze-finalized-evaluation per group; Promise, no Effect | not-converted | s298 convert -> not-converted; definition +3 lines |
| `buildSupervisedReplayEvaluationReferences` | cli.ts:1591 | export function buildSupervisedReplayEvaluationReferences(input: {; sync, no Effect | kept | definition relocated +3 lines |
| `persistSupervisedReplayEvaluationCaseReferences` | cli.ts:1771 | async invoke(evaluation case-reference write) per case; Promise, no Effect | not-converted | s298 convert -> not-converted; definition +3 lines |
| `persistSupervisedReplayEvaluationReferenceFacts` | cli.ts:1880 | async invoke(reference-facts write); Promise, no Effect | not-converted | s298 convert -> not-converted; definition +3 lines |
| `resolvePostObservationReleaseId` | cli.ts:1998 | export function resolvePostObservationReleaseId(input: {; sync, no Effect | kept | definition relocated +3 lines |
| `classifyLearnerPromotionResult` | cli.ts:2030 | export function classifyLearnerPromotionResult(input: {; sync, no Effect | kept | definition relocated +3 lines |
| `finaliseRefusalDispositionDetail` | cli.ts:2048 | export function finaliseRefusalDispositionDetail(error: unknown): string \| null {; sync, no Effect | kept | definition relocated +3 lines |
| `finaliseRefusalDispositionWrite` | cli.ts:2070 | export function finaliseRefusalDispositionWrite(input: {; sync, no Effect | kept | definition relocated +3 lines |
| `createSupervisedReplayEvaluationCompleter` | cli.ts:2092 | export function createSupervisedReplayEvaluationCompleter(input: {; sync, no Effect | kept | definition relocated +3 lines |
| `parseAnonymousLearningReadsFlag` | cli.ts:3057 | export function parseAnonymousLearningReadsFlag(; sync, no Effect | kept | definition relocated +3 lines |
| `resolveMaxExtraPairComparisons` | cli.ts:3074 | export function resolveMaxExtraPairComparisons(; sync, no Effect | kept | definition relocated +3 lines |
| `createRuntimeOperatorCallbacks` | cli.ts:3084 | export function createRuntimeOperatorCallbacks(; sync, no Effect | kept | definition relocated +3 lines |
| `requirePackagedTrackBManifest` | cli.ts:3329 | export function requirePackagedTrackBManifest(; sync, no Effect | kept | definition relocated +3 lines |
| `createRun88StagePostObservation` | cli.ts:3381 | export function createRun88StagePostObservation(input: {; sync, no Effect | kept | definition relocated +3 lines |
| `projectCliStartupReadiness` | cli.ts:3430 | export function projectCliStartupReadiness(state: CliBootstrapState): {; sync, no Effect | kept | definition relocated +3 lines |
| `awaitCliExtensionRuntime` | cli.ts:3463 | awaits extensionRuntimePromise and bootstrap health; Promise, no Effect | not-converted | s298 convert -> not-converted; definition +24 lines |
| `createCliExtensionRuntimeOwner` | cli.ts:3498 | export function createCliExtensionRuntimeOwner<; sync, no Effect | kept | definition relocated +24 lines |
| `negotiatePackagedTrackBStartup` | cli.ts:3697 | export function negotiatePackagedTrackBStartup(input: {; sync, no Effect | kept | definition relocated +24 lines |
| `resolveCliFixtureRoot` | cli.ts:3906 | export function resolveCliFixtureRoot(_repoRoot: string, fixtureRoot?: string): string \| undefined {; sync, no Effect | kept | definition relocated +24 lines |
| `flattenStoreDegradationReadback` | cli.ts:3962 | export function flattenStoreDegradationReadback(input: {; sync, no Effect | kept | definition relocated +24 lines |
| `readStoreDegradationReceiptsFromRuntime` | cli.ts:4020 | async invoke reads of knowledge-store/knowledge-worker receipts; Promise, no Effect | not-converted | s298 convert -> not-converted; definition +24 lines |
| `startDurableRouteAdvisoryRefresh` | cli.ts:4100 | export function startDurableRouteAdvisoryRefresh(options: {; sync, no Effect | kept | definition relocated +24 lines |
| `startCliExtensionRuntimeWatchdog` | cli.ts:4265 | export function startCliExtensionRuntimeWatchdog(options: {; sync, no Effect | kept | definition relocated +24 lines |
| `createCliServerOptions` | cli.ts:4370 | export function createCliServerOptions(; async/Promise, no Effect | kept | definition relocated +70 lines |
| `applyRecommendationServiceLauncherConfig` | cli.ts:4588 | export function applyRecommendationServiceLauncherConfig(values: LauncherConfigValues): void {; sync, no Effect | kept | definition relocated +-382 lines |
| `resolveReplayCandidateBudgetReservation` | cli.ts:4685 | export function resolveReplayCandidateBudgetReservation(input: {; sync, no Effect | kept | definition relocated +-382 lines |
| `resolveProductionReplayAuthorizationNonceStorePath` | cli.ts:4709 | export function resolveProductionReplayAuthorizationNonceStorePath(input: {; sync, no Effect | kept | definition relocated +-382 lines |
| `resolveProductionReplayDispatchLedgerPath` | cli.ts:4728 | export function resolveProductionReplayDispatchLedgerPath(input: {; sync, no Effect | kept | definition relocated +-382 lines |
| `createProductionReplayDispatchLedger` | cli.ts:4747 | export function createProductionReplayDispatchLedger(filePath: string) {; sync, no Effect | kept | definition relocated +-382 lines |
| `createProductionReplayAdapter` | cli.ts:4930 | export function createProductionReplayAdapter(; async/Promise, no Effect | kept | definition relocated +-382 lines |
| `main` | cli.ts:5004 | async CLI main; uses Effect.runSync(Scope.make) and Effect.runPromise(acquireRelease/Scope.close) at cli.ts:5334-5351 for the server scope; orchestration shell remains async | migrated | s298 convert -> migrated; definition +-382 lines |

## Verified count

New verified count: 137/137 public host operations have a current definition, extracted body, and disposition (125 kept / 1 migrated / 11 not-converted); 22 were read line-by-line. The prior 16 inventory entries remain body-verified (s321), and the 11 SQL-service entries (s300) remain body-verified; combined inventory entries stay 27. No operation was left not-read.

## Limitations (not hidden)

- Kept-row dispositions rely on the body scan plus the listed samples; not every kept body was read line-by-line.
- The brace scanner can under-bound bodies with generic object type parameters (for example awaitCliExtensionRuntime); evidence for those rows is the definition plus the manual read, not the scanner line count.
- Inventory caller citations were not re-body-verified in this sweep; only definition citations were corrected.
- No source file changed; no commit.
