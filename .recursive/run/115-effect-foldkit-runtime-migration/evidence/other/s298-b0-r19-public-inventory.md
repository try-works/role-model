# S298 B0/R19 public operation/caller inventory

Read-only execution (s298). No product edits, builds, installs, commits, operator ports, or processes. Commands: grep/read/git show only; temp under E:/rm-tmp.

Authority: REASSESSMENT-AND-EXECUTION.md:84; R19 historical verified claim superseded by s265-requirement-map.md (PARTIAL).

Worktree/HEAD: public D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration @ 84a5c1fd.

## Method

- Extracted every `export (async) function|const|class` from `role-model-router/apps/runtime-host-bridge/src/index.ts` and `cli.ts`.
- Product callers found by scanning monorepo + scripts sources, excluding tests, dist, node_modules, fixtures, .recursive. Same-file call sites are included; the definition line is excluded. Up to 3 callers per operation.
- **Limitation:** signatures were read mechanically; function bodies were not individually reviewed. Dispositions are signature/file-level candidates, not body-verified dispositions. Entries without a product caller are marked **not-read**, never inferred.
- `scripts/track-b/build-runtime-distribution.mjs` does not exist in the public worktree (verified by glob). Private build script is inventoried in the private doc.

## Inventory (137 operations/resources)

| Export | file:line | Return | Coupling | Disposition | Product caller(s) |
|---|---|---|---|---|---|
| `fetchWithTransientRetry` | `index.ts:411` | Promise | host module/closure | convert | `role-model-router/apps/runtime-host-bridge/src/index.ts:15221` |
| `resolveEndpointExecutionEffort` | `index.ts:429` | sync | host module/closure | pure | `role-model-router/apps/runtime-host-bridge/src/index.ts:9930`<br>`role-model-router/apps/runtime-host-bridge/src/index.ts:28954` |
| `OPENAI_CODEX_SUBSCRIPTION_MODEL_MATRIX` | `index.ts:611` | sync | host module/closure | pure | `role-model-router/apps/runtime-host-bridge/src/index.ts:730`<br>`role-model-router/apps/runtime-host-bridge/src/index.ts:9244` |
| `OPENAI_CODEX_SUBSCRIPTION_MODEL_IDS` | `index.ts:730` | sync | host module/closure | pure | `role-model-router/apps/runtime-host-bridge/src/index.ts:760`<br>`role-model-router/apps/runtime-host-bridge/src/index.ts:24253` |
| `OPENAI_CODEX_SUBSCRIPTION_MODEL_EXCLUSIONS` | `index.ts:752` | sync | host module/closure | pure | not-read |
| `normalizeReasoningEffortPolicy` | `index.ts:989` | sync | host module/closure | pure | `role-model-router/apps/runtime-host-bridge/src/index.ts:1059`<br>`role-model-router/apps/runtime-host-bridge/src/index.ts:1072` |
| `resolveEffortPolicy` | `index.ts:1009` | sync | host module/closure | pure | `role-model-router/apps/runtime-ui/app/lib/effort-truth.ts:4` |
| `DIFFICULTY_CLASSIFIER_VERSION` | `index.ts:1492` | sync | host module/closure | pure | `role-model-router/apps/runtime-host-bridge/src/index.ts:1636`<br>`role-model-router/apps/runtime-host-bridge/src/index.ts:2389` |
| `computeDifficultyFeatures` | `index.ts:1516` | sync | host module/closure | pure | `role-model-router/apps/runtime-host-bridge/src/index.ts:1563`<br>`role-model-router/apps/runtime-host-bridge/src/index.ts:1638` |
| `shouldInvalidateDifficultyClassifierVersion` | `index.ts:1546` | sync | host module/closure | adapter | `role-model-router/apps/runtime-host-bridge/src/index.ts:1490`<br>`role-model-router/apps/runtime-host-bridge/src/index.ts:29898` |
| `classifyDifficultyFromSignals` | `index.ts:1553` | sync | host module/closure | pure | `role-model-router/apps/runtime-host-bridge/src/index.ts:2365`<br>`role-model-router/apps/runtime-host-bridge/src/index.ts:29979` |
| `DIFFICULTY_CLASSIFIER_MAX_MESSAGES` | `index.ts:1751` | sync | host module/closure | pure | `role-model-router/apps/runtime-host-bridge/src/index.ts:1746`<br>`role-model-router/apps/runtime-host-bridge/src/index.ts:1760` |
| `DIFFICULTY_CLASSIFIER_MAX_CHARS_PER_MESSAGE` | `index.ts:1752` | sync | host module/closure | pure | `role-model-router/apps/runtime-host-bridge/src/index.ts:1747`<br>`role-model-router/apps/runtime-host-bridge/src/index.ts:1766` |
| `DIFFICULTY_CLASSIFIER_MAX_JSON_BYTES` | `index.ts:1753` | sync | host module/closure | pure | `role-model-router/apps/runtime-host-bridge/src/index.ts:1748`<br>`role-model-router/apps/runtime-host-bridge/src/index.ts:1787` |
| `buildDifficultyClassifierMessages` | `index.ts:1755` | sync | host module/closure | pure | `role-model-router/apps/runtime-host-bridge/src/index.ts:30014`<br>`role-model-router/apps/runtime-host-bridge/src/index.ts:30023` |
| `CONTROLLER_MAX_TRANSCRIPT_BYTES` | `index.ts:1824` | sync | host module/closure | pure | `role-model-router/apps/runtime-host-bridge/src/index.ts:1836` |
| `buildControllerRoutingMessages` | `index.ts:1844` | sync | host module/closure | pure | `role-model-router/apps/runtime-host-bridge/src/index.ts:30140` |
| `buildCompactControllerRoutingMessages` | `index.ts:1880` | sync | host module/closure | pure | `role-model-router/apps/runtime-host-bridge/src/index.ts:30148` |
| `inferHeuristicControllerGuidance` | `index.ts:1952` | sync | host module/closure | adapter | `role-model-router/apps/runtime-host-bridge/src/index.ts:30195` |
| `mergeControllerGuidanceDefaults` | `index.ts:2006` | sync | host module/closure | adapter | `role-model-router/apps/runtime-host-bridge/src/index.ts:30235` |
| `expandPreferredEndpointIdsToEffortArms` | `index.ts:2470` | sync | host module/closure | adapter | `role-model-router/apps/runtime-host-bridge/src/index.ts:2508` |
| `resolveObservedDifficultyBucketForPlan` | `index.ts:2555` | sync | host module/closure | pure | `role-model-router/apps/runtime-host-bridge/src/index.ts:27262` |
| `resolveBridgeExecutionCost` | `index.ts:3073` | sync | host module/closure | pure | `role-model-router/apps/runtime-host-bridge/src/index.ts:29839` |
| `buildRuntimeTelemetrySnapshot` | `index.ts:3108` | sync | host module/closure | pure | `role-model-router/apps/runtime-host-bridge/src/index.ts:29349` |
| `toCacheContinuityScopeDescriptor` | `index.ts:4726` | sync | host module/closure | pure | `role-model-router/apps/runtime-host-bridge/src/index.ts:4849`<br>`role-model-router/apps/runtime-host-bridge/src/index.ts:4870` |
| `readCacheContinuityRouteHints` | `index.ts:4845` | sync | host module/closure | adapter | `role-model-router/apps/runtime-host-bridge/src/index.ts:27415`<br>`role-model-router/apps/runtime-host-bridge/src/index.ts:29322` |
| `persistCacheContinuityOutcome` | `index.ts:4862` | sync | host module/closure | adapter | `role-model-router/apps/runtime-host-bridge/src/index.ts:29313` |
| `classifyUpstreamExecutionFailure` | `index.ts:5008` | sync | host module/closure | pure | `role-model-router/apps/runtime-host-bridge/src/index.ts:5295`<br>`role-model-router/apps/runtime-host-bridge/src/index.ts:27982` |
| `shouldRetryUpstreamExecutionOnSameEndpoint` | `index.ts:5242` | sync | host module/closure | adapter | `role-model-router/apps/runtime-host-bridge/src/index.ts:29067` |
| `classifyExecutionFailureIfNeeded` | `index.ts:5271` | sync | host module/closure | pure | `role-model-router/apps/runtime-host-bridge/src/index.ts:29019` |
| `hasSubstantiveStreamDelta` | `index.ts:5318` | sync | host module/closure | pure | `role-model-router/apps/runtime-host-bridge/src/index.ts:18352`<br>`role-model-router/apps/runtime-host-bridge/src/index.ts:27317` |
| `buildTerminalStreamErrorPayload` | `index.ts:5948` | sync | host module/closure | pure | `role-model-router/apps/runtime-host-bridge/src/index.ts:18388` |
| `isRuntimeBootstrapBlock` | `index.ts:5991` | sync | host module/closure | pure | `role-model-router/apps/runtime-host-bridge/src/index.ts:30278`<br>`role-model-router/apps/runtime-host-bridge/src/index.ts:30848` |
| `projectBenchmarkDecisionEvidence` | `index.ts:6414` | sync | host module/closure | pure | `role-model-router/apps/runtime-host-bridge/src/index.ts:27202` |
| `projectTelemetryDecisionEvidence` | `index.ts:6493` | sync | host module/closure | pure | `role-model-router/apps/runtime-host-bridge/src/index.ts:27203` |
| `summarizeSelectionDiagnosticsFromDecision` | `index.ts:6651` | sync | host module/closure | adapter | `role-model-router/apps/runtime-host-bridge/src/index.ts:28635`<br>`role-model-router/apps/runtime-host-bridge/src/index.ts:29456` |
| `createRuntimeExecutionCatalogCache` | `index.ts:7284` | sync | host module/closure | adapter | `role-model-router/apps/runtime-host-bridge/src/index.ts:22333` |
| `createRoleModelNormalizedIntentObservation` | `index.ts:8327` | sync | host module/closure | adapter | `role-model-router/apps/runtime-host-bridge/src/index.ts:29362` |
| `buildRequestClassification` | `index.ts:8560` | sync | host module/closure | pure | `role-model-router/apps/runtime-host-bridge/src/track-b-runtime.ts:8014` |
| `buildRequestClassificationForPlan` | `index.ts:8630` | sync | host module/closure | pure | `role-model-router/apps/runtime-host-bridge/src/index.ts:27435`<br>`role-model-router/apps/runtime-host-bridge/src/index.ts:27439` |
| `createModelListResponse` | `index.ts:9045` | sync | host module/closure | adapter | `role-model-router/apps/runtime-host-bridge/src/validate-ui.ts:16` |
| `createRuntimeModelRecords` | `index.ts:9188` | sync | host module/closure | adapter | `role-model-router/apps/runtime-host-bridge/src/index.ts:745`<br>`role-model-router/apps/runtime-host-bridge/src/index.ts:31211` |
| `resolveEndpointWebSearchSupport` | `index.ts:9336` | sync | host module/closure | pure | `role-model-router/apps/runtime-host-bridge/src/index.ts:9387`<br>`role-model-router/apps/runtime-host-bridge/src/index.ts:9397` |
| `classifyBridgeRoutePass` | `index.ts:9956` | sync | host module/closure | pure | `role-model-router/apps/runtime-host-bridge/src/index.ts:27568` |
| `applyReasoningEffortToModelPool` | `index.ts:9993` | sync | host module/closure | adapter | `role-model-router/apps/runtime-host-bridge/src/index.ts:11005`<br>`role-model-router/apps/runtime-host-bridge/src/index.ts:11009` |
| `createDownstreamOpenAIProviderConfig` | `index.ts:10288` | sync | host module/closure | adapter | `role-model-router/apps/runtime-host-bridge/src/index.ts:19203` |
| `inferTaxonomyToolClasses` | `index.ts:10795` | sync | host module/closure | adapter | `role-model-router/apps/runtime-host-bridge/src/index.ts:10984`<br>`role-model-router/apps/runtime-host-bridge/src/index.ts:11301` |
| `mapChatCompletionsRequest` | `index.ts:10948` | sync | host module/closure | pure | `role-model-router/apps/runtime-host-bridge/src/validate-ui.ts:18` |
| `mapResponsesRequest` | `index.ts:11250` | sync | host module/closure | pure | `role-model-router/apps/runtime-host-bridge/src/index.ts:30621` |
| `writeUnhandledBridgeError` | `index.ts:11559` | sync | host module/closure | adapter | `role-model-router/apps/runtime-host-bridge/src/index.ts:20620` |
| `resolveLiveAttemptTimeoutMs` | `index.ts:11671` | sync | host module/closure | pure | `role-model-router/apps/runtime-host-bridge/src/index.ts:18332` |
| `loadMcpConnectorConfigs` | `index.ts:12089` | Promise | host module/closure | convert | `role-model-router/apps/runtime-host-bridge/src/index.ts:12153` |
| `createRequestScopedToolRegistry` | `index.ts:12186` | sync | host module/closure | adapter | `role-model-router/apps/runtime-host-bridge/src/index.ts:28133` |
| `routeRuntimeRequest` | `index.ts:12302` | sync | host module/closure | adapter | `role-model-router/apps/runtime-host-bridge/src/local-model-role-bindings.ts:2`<br>`role-model-router/packages/adapter-execution/src/cli.ts:11` |
| `guardSoleCandidateThroughputDeny` | `index.ts:12316` | sync | host module/closure | adapter | `role-model-router/packages/bench-routing/src/reasoning-extraction.test.ts:64` |
| `seedManagedCodexWorkspaceFixture` | `index.ts:12331` | Promise | host module/closure | convert | not-read |
| `isTransientProviderTransportError` | `index.ts:13081` | sync | host module/closure | pure | `role-model-router/apps/runtime-host-bridge/src/index.ts:13145`<br>`role-model-router/apps/runtime-host-bridge/src/index.ts:33103` |
| `resolveOauthDeviceHttpTimeoutMs` | `index.ts:13120` | sync | host module/closure | pure | `role-model-router/apps/runtime-host-bridge/src/index.ts:13138` |
| `buildCodexDynamicTools` | `index.ts:13289` | sync | host module/closure | pure | `role-model-router/apps/runtime-host-bridge/src/index.ts:28087` |
| `normalizeCodexSubscriptionModelName` | `index.ts:13344` | sync | host module/closure | pure | `role-model-router/apps/runtime-host-bridge/src/index.ts:14417`<br>`role-model-router/apps/runtime-host-bridge/src/index.ts:14418` |
| `createCodexSubscriptionResponsesExecutionAdapter` | `index.ts:14491` | sync | host module/closure | adapter | `role-model-router/apps/runtime-host-bridge/src/index.ts:20932` |
| `resolveStoredOauthTokenLocations` | `index.ts:14648` | sync | host module/closure | pure | `role-model-router/apps/runtime-host-bridge/src/index.ts:14751` |
| `readProviderStreamTranscript` | `index.ts:15436` | Promise | host module/closure | convert | `role-model-router/apps/runtime-host-bridge/src/index.ts:28356` |
| `filterRouterRegistryByExecutionMode` | `index.ts:15557` | sync | host module/closure | pure | `role-model-router/apps/runtime-host-bridge/src/index.ts:22330`<br>`role-model-router/apps/runtime-host-bridge/src/index.ts:22346` |
| `handleLocalDiagnosticsRead` | `index.ts:17048` | sync | host module/closure | adapter | `role-model-router/apps/runtime-host-bridge/src/index.ts:17541` |
| `resolveAnonymousLearningReads` | `index.ts:17143` | sync | host module/closure | pure | `role-model-router/apps/runtime-host-bridge/src/index.ts:17576` |
| `resolveDeviceOwnerTrust` | `index.ts:17170` | sync | host module/closure | pure | `role-model-router/apps/runtime-host-bridge/src/index.ts:17214` |
| `projectLearningProfileEstimate` | `index.ts:17257` | sync | host module/closure | pure | `role-model-router/apps/runtime-host-bridge/src/index.ts:17321` |
| `resolveLearningProfileRouteResult` | `index.ts:17301` | sync | host module/closure | pure | `role-model-router/apps/runtime-host-bridge/src/index.ts:17859` |
| `attachRouterPolicyResolution` | `index.ts:17355` | sync | host module/closure | adapter | `role-model-router/apps/runtime-host-bridge/src/index.ts:17907` |
| `RUNTIME_HOST_STORAGE_REGISTRY` | `index.ts:20467` | sync | host module/closure | pure | `role-model-router/apps/runtime-host-bridge/src/index.ts:20479` |
| `assertRuntimeHostStorageWriteAllowed` | `index.ts:20478` | sync | host module/closure | adapter | `role-model-router/apps/runtime-host-bridge/src/index.ts:20497` |
| `createModuleHealthComposition` | `index.ts:20536` | sync | host module/closure | adapter | `role-model-router/apps/runtime-host-bridge/src/index.ts:20591`<br>`role-model-router/apps/runtime-host-bridge/src/index.ts:20619` |
| `wireModuleHealth` | `index.ts:20589` | sync | host module/closure | adapter | `role-model-router/apps/runtime-host-bridge/src/index.ts:20622`<br>`role-model-router/apps/runtime-host-bridge/src/index.ts:20731` |
| `createBridgeRequestListener` | `index.ts:20616` | sync | host module/closure | adapter | `role-model-router/apps/runtime-host-bridge/src/index.ts:20518`<br>`role-model-router/apps/runtime-host-bridge/src/index.ts:20604` |
| `recordDirectContributionWith` | `index.ts:20664` | sync | host module/closure | pure | `role-model-router/apps/runtime-host-bridge/src/index.ts:21162` |
| `recordRouteCaptureAtHostEdge` | `index.ts:20720` | sync | host module/closure | pure | `role-model-router/apps/runtime-host-bridge/src/index.ts:28770`<br>`role-model-router/apps/runtime-host-bridge/src/index.ts:29710` |
| `startBridgeServer` | `index.ts:20729` | Promise | host module/closure | convert | `role-model-router/apps/runtime-host-bridge/scripts/prod-launcher.ts:3`<br>`role-model-router/apps/runtime-host-bridge/scripts/start-for-qa.ts:17` |
| `projectPublicProviderAttemptIds` | `index.ts:20798` | sync | host module/closure | pure | `role-model-router/apps/runtime-host-bridge/src/index.ts:27179` |
| `fatalRegistryDiagnostics` | `index.ts:20829` | sync | host module/closure | adapter | `role-model-router/apps/runtime-host-bridge/src/index.ts:22617`<br>`role-model-router/apps/runtime-host-bridge/src/index.ts:22618` |
| `OBSERVABILITY_SNAPSHOT_SCHEMA_VERSION` | `index.ts:20869` | sync | host module/closure | pure | `role-model-router/apps/runtime-host-bridge/src/index.ts:18123`<br>`role-model-router/apps/runtime-host-bridge/src/index.ts:20872` |
| `openRetentionCleanupDatabase` | `index.ts:20881` | sync | host module/closure | pure | `role-model-router/apps/runtime-host-bridge/src/index.ts:20891` |
| `runRetentionCleanupAt` | `index.ts:20887` | sync | host module/closure | pure | `role-model-router/apps/runtime-host-bridge/src/index.ts:21376` |
| `createRuntimeBridgeBackend` | `index.ts:20905` | Promise | host module/closure | convert | `role-model-router/apps/runtime-host-bridge/scripts/prod-launcher.ts:3`<br>`role-model-router/apps/runtime-host-bridge/scripts/start-for-qa.ts:16` |
| `resolveStandaloneStaticRoot` | `index.ts:35346` | sync | host module/closure | pure | `role-model-router/apps/runtime-host-bridge/src/index.ts:35439` |
| `resolveBridgeServerOptions` | `index.ts:35380` | sync | host module/closure | pure | `role-model-router/apps/runtime-host-bridge/src/cli.ts:31` |
| `openReadOnlyStateDatabase` | `cli.ts:198` | sync | CLI wiring | pure | `role-model-router/apps/runtime-host-bridge/src/cli.ts:221` |
| `setStateDatabaseServiceFactoryForTests` | `cli.ts:207` | sync | CLI wiring | adapter | not-read |
| `readEndpointModelIdForRoutePackage` | `cli.ts:233` | sync | CLI wiring | adapter | `role-model-router/apps/runtime-host-bridge/src/cli.ts:6991` |
| `supervisedReplayBranchCaptureRequestId` | `cli.ts:272` | sync | CLI wiring | adapter | `role-model-router/apps/runtime-host-bridge/src/cli.ts:10095`<br>`role-model-router/apps/runtime-host-bridge/src/cli.ts:10174` |
| `readRouteCaptureFromQueueReceipt` | `cli.ts:318` | sync | CLI wiring | adapter | `role-model-router/apps/runtime-host-bridge/src/cli.ts:369`<br>`role-model-router/apps/runtime-host-bridge/src/cli.ts:11263` |
| `resolveResumedHandoffJobRecord` | `cli.ts:377` | sync | CLI wiring | pure | `role-model-router/apps/runtime-host-bridge/src/cli.ts:11190` |
| `evaluationJobExistsFromGetJobAnswer` | `cli.ts:391` | sync | CLI wiring | adapter | `role-model-router/apps/runtime-host-bridge/src/cli.ts:11624` |
| `evaluationJobStatusFromGetJobAnswer` | `cli.ts:444` | sync | CLI wiring | adapter | `role-model-router/apps/runtime-host-bridge/src/cli.ts:11668` |
| `readPersistedControllerEndpointId` | `cli.ts:501` | sync | CLI wiring | adapter | `role-model-router/apps/runtime-host-bridge/src/cli.ts:8735`<br>`role-model-router/apps/runtime-host-bridge/src/cli.ts:9297` |
| `readCaptureTaxonomyVersion` | `cli.ts:777` | sync | CLI wiring | adapter | `role-model-router/apps/runtime-host-bridge/src/cli.ts:2250` |
| `readCaptureRoleId` | `cli.ts:793` | sync | CLI wiring | adapter | `role-model-router/apps/runtime-host-bridge/src/track-b-runtime.ts:9145` |
| `readCaptureTaskTypeId` | `cli.ts:816` | sync | CLI wiring | adapter | `role-model-router/apps/runtime-host-bridge/src/cli.ts:2245` |
| `replayRequestIdFromProviderResultRef` | `cli.ts:834` | sync | CLI wiring | adapter | `role-model-router/apps/runtime-host-bridge/src/cli.ts:964`<br>`role-model-router/apps/runtime-host-bridge/src/cli.ts:10234` |
| `buildReplayAppendExecution` | `cli.ts:869` | sync | CLI wiring | pure | `role-model-router/apps/runtime-host-bridge/src/cli.ts:955`<br>`role-model-router/apps/runtime-host-bridge/src/cli.ts:966` |
| `resolveResumedReplayAppendDispatch` | `cli.ts:951` | sync | CLI wiring | pure | `role-model-router/apps/runtime-host-bridge/src/cli.ts:10228`<br>`role-model-router/apps/runtime-host-bridge/src/cli.ts:10242` |
| `deriveSupervisedReplayTrajectoryEvents` | `cli.ts:1018` | sync | CLI wiring | pure | `role-model-router/apps/runtime-host-bridge/src/cli.ts:1330`<br>`role-model-router/apps/runtime-host-bridge/src/cli.ts:2604` |
| `deriveLearnerTrajectoryEvidenceForReplay` | `cli.ts:1245` | Promise | CLI wiring | pure | `role-model-router/apps/runtime-host-bridge/src/cli.ts:1372`<br>`role-model-router/apps/runtime-host-bridge/src/cli.ts:7501` |
| `FINALIZATION_SIGNALS_EXAMINED_LIMIT` | `cli.ts:1390` | sync | CLI wiring | pure | `role-model-router/apps/runtime-host-bridge/src/cli.ts:1434`<br>`role-model-router/apps/runtime-host-bridge/src/cli.ts:7677` |
| `FINALIZATION_SIGNALS_COMPUTE_LIMIT` | `cli.ts:1398` | sync | CLI wiring | pure | `role-model-router/apps/runtime-host-bridge/src/cli.ts:7676` |
| `FINALIZATION_SIGNALS_BUDGET_MS` | `cli.ts:1401` | sync | CLI wiring | pure | `role-model-router/apps/runtime-host-bridge/src/cli.ts:7678` |
| `sweepFinalizationSignalsForGroups` | `cli.ts:1414` | Promise | CLI wiring | convert | `role-model-router/apps/runtime-host-bridge/src/cli.ts:7656` |
| `buildSupervisedReplayEvaluationReferences` | `cli.ts:1588` | sync | CLI wiring | pure | `role-model-router/apps/runtime-host-bridge/src/cli.ts:2597` |
| `persistSupervisedReplayEvaluationCaseReferences` | `cli.ts:1768` | Promise | CLI wiring | convert | `role-model-router/apps/runtime-host-bridge/src/track-b-runtime.ts:10790` |
| `persistSupervisedReplayEvaluationReferenceFacts` | `cli.ts:1877` | Promise | CLI wiring | convert | `role-model-router/apps/runtime-host-bridge/src/cli.ts:2553` |
| `resolvePostObservationReleaseId` | `cli.ts:1995` | sync | CLI wiring | pure | `role-model-router/apps/runtime-host-bridge/src/cli.ts:9237` |
| `classifyLearnerPromotionResult` | `cli.ts:2027` | sync | CLI wiring | pure | `role-model-router/apps/runtime-host-bridge/src/cli.ts:6671`<br>`role-model-router/apps/runtime-host-bridge/src/cli.ts:9186` |
| `finaliseRefusalDispositionDetail` | `cli.ts:2045` | sync | CLI wiring | adapter | `role-model-router/apps/runtime-host-bridge/src/cli.ts:11394` |
| `finaliseRefusalDispositionWrite` | `cli.ts:2067` | sync | CLI wiring | adapter | `role-model-router/apps/runtime-host-bridge/src/cli.ts:11380`<br>`role-model-router/apps/runtime-host-bridge/src/cli.ts:11398` |
| `createSupervisedReplayEvaluationCompleter` | `cli.ts:2089` | sync | CLI wiring | adapter | `role-model-router/apps/runtime-host-bridge/src/cli.ts:2920`<br>`role-model-router/apps/runtime-host-bridge/src/cli.ts:10484` |
| `parseAnonymousLearningReadsFlag` | `cli.ts:3054` | sync | CLI wiring | pure | `role-model-router/apps/runtime-host-bridge/src/cli.ts:5482` |
| `resolveMaxExtraPairComparisons` | `cli.ts:3071` | sync | CLI wiring | pure | `role-model-router/apps/runtime-host-bridge/src/cli.ts:2890` |
| `createRuntimeOperatorCallbacks` | `cli.ts:3081` | sync | CLI wiring | adapter | `role-model-router/apps/runtime-host-bridge/src/cli.ts:10567` |
| `requirePackagedTrackBManifest` | `cli.ts:3326` | sync | CLI wiring | adapter | `role-model-router/apps/runtime-host-bridge/src/cli.ts:5786` |
| `createRun88StagePostObservation` | `cli.ts:3378` | sync | CLI wiring | adapter | `role-model-router/apps/runtime-host-bridge/src/cli.ts:10603` |
| `projectCliStartupReadiness` | `cli.ts:3427` | sync | CLI wiring | pure | `role-model-router/apps/runtime-host-bridge/src/cli.ts:4368` |
| `awaitCliExtensionRuntime` | `cli.ts:3439` | Promise | CLI wiring | convert | `role-model-router/apps/runtime-host-bridge/src/cli.ts:12519` |
| `createCliExtensionRuntimeOwner` | `cli.ts:3474` | sync | CLI wiring | adapter | `role-model-router/apps/runtime-host-bridge/src/cli.ts:12416`<br>`role-model-router/apps/runtime-host-bridge/src/cli.ts:12543` |
| `negotiatePackagedTrackBStartup` | `cli.ts:3673` | sync | CLI wiring | adapter | `role-model-router/apps/runtime-host-bridge/src/cli.ts:12308` |
| `resolveCliFixtureRoot` | `cli.ts:3882` | sync | CLI wiring | pure | `role-model-router/apps/runtime-host-bridge/src/cli.ts:9365` |
| `flattenStoreDegradationReadback` | `cli.ts:3938` | sync | CLI wiring | adapter | `role-model-router/apps/runtime-host-bridge/src/cli.ts:4019` |
| `readStoreDegradationReceiptsFromRuntime` | `cli.ts:3996` | Promise | CLI wiring | convert | `role-model-router/apps/runtime-host-bridge/src/cli.ts:4601`<br>`role-model-router/apps/runtime-host-bridge/src/cli.ts:4650` |
| `startDurableRouteAdvisoryRefresh` | `cli.ts:4076` | sync | CLI wiring | adapter | `role-model-router/apps/runtime-host-bridge/src/cli.ts:12587` |
| `startCliExtensionRuntimeWatchdog` | `cli.ts:4241` | sync | CLI wiring | adapter | `role-model-router/apps/runtime-host-bridge/src/cli.ts:12602` |
| `createCliServerOptions` | `cli.ts:4300` | sync | CLI wiring | adapter | `scripts/validate-agent-path.ts:516` |
| `applyRecommendationServiceLauncherConfig` | `cli.ts:4970` | sync | CLI wiring | adapter | `role-model-router/apps/runtime-host-bridge/src/cli.ts:5475` |
| `resolveReplayCandidateBudgetReservation` | `cli.ts:5067` | sync | CLI wiring | pure | `role-model-router/apps/runtime-host-bridge/src/cli.ts:9483` |
| `resolveProductionReplayAuthorizationNonceStorePath` | `cli.ts:5091` | sync | CLI wiring | pure | `role-model-router/apps/runtime-host-bridge/src/cli.ts:5315` |
| `resolveProductionReplayDispatchLedgerPath` | `cli.ts:5110` | sync | CLI wiring | pure | `role-model-router/apps/runtime-host-bridge/src/cli.ts:5318` |
| `createProductionReplayDispatchLedger` | `cli.ts:5129` | sync | CLI wiring | adapter | `role-model-router/apps/runtime-host-bridge/src/cli.ts:5317` |
| `createProductionReplayAdapter` | `cli.ts:5312` | sync | CLI wiring | adapter | `role-model-router/apps/runtime-host-bridge/src/cli.ts:9941` |
| `main` | `cli.ts:5386` | Promise | CLI wiring | convert | `role-model-router/apps/gateway-smoke/src/index.ts:77`<br>`role-model-router/apps/runtime-host-bridge/scripts/start-for-qa.ts:337` |

## Counts

- Operations/resources enumerated: **137** (index.ts + cli.ts); plus one named-but-absent build script.
- Operations with at least one product caller found: **134**.
- Not-read/no caller: **3**.
- Sync: **124**; Promise/async: **13**.

## SQL exclusion correction

Claim: `evidence/other/s4-contracts-inventory.json:28` (scope.excluded area `role-model-router/packages/sql-sqlite-node/src/service.ts`): "Effect SQLite service has no product caller in the public host today (its callers are package tests only)...".

**Verdict: FALSE at this revision.** Actual product imports of `@effect/sql-sqlite-node` / `.../service` include:

- `role-model-router/apps/runtime-host-bridge/src/cli.ts:11` — `SqliteService, makeSync`
- `role-model-router/apps/runtime-host-bridge/src/index.ts:19` — `makeSync`
- `role-model-router/apps/runtime-host-bridge/src/queue-runtime/admin.ts:19` — `SqliteService, makeSync`
- `role-model-router/apps/runtime-host-bridge/src/queue-runtime/store.ts:18` — `SqliteClient`
- `role-model-router/apps/runtime-host-bridge/src/route-challenge-evidence.ts:2` — `SqliteService, makeSync`
- `role-model-router/apps/runtime-host-bridge/src/route-ladder-census.ts:3` — `SqliteService, makeSync`
- `role-model-router/apps/runtime-host-bridge/src/track-b-runtime.ts:30` — `SqliteService, makeSync`

A related stale exclusion for `packages/effect/src/sql.ts` and `packages/effect-mq/src/index.ts` (s4 inventory) is not re-verified here and is marked not-read.

## Follow-on author slice

Named follow-on: **R19/B0 inventory correction author slice** must (a) replace s4's SQL exclusion with the caller list above, (b) body-verify dispositions for the 137 exports, (c) add the missing private half, and (d) update the R19 requirement map from PARTIAL only after both docs are reviewed. No implementation is done in this analyst slice.
