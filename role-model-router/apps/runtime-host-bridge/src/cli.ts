import { spawn } from "node:child_process";
import { createHash, createPublicKey } from "node:crypto";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";

import type { NormalizedCatalog } from "@role-model-router/catalog";
import type { EndpointRegistryResult } from "@role-model-router/endpoint-registry";

import {
  type RuntimeBridgeBackend,
  type StartBridgeServerOptions,
  createRuntimeBridgeBackend,
  resolveBridgeServerOptions,
  startBridgeServer,
} from "./index.js";
import { validateRun88PrivateDistributionIdentity } from "./kw-private-loader.js";
import {
  type DevelopmentVerificationAuthorization,
  negotiateDevelopmentVerificationCapability,
  parseDevelopmentVerificationTrustMaterial,
} from "./development-verification.js";
import { type RuntimeChannelProfile, readPackagedRuntimeProfile } from "./runtime-channel.js";
import { migrateLegacyProductionState } from "./runtime-state-migration.js";
import { resolveRun88StageRuntimeIdentity } from "./runtime-version.js";
import { createTrackBOperations } from "./track-b-operations.js";
import {
  type TrackBExtensionClosure,
  createOwnedTrackBSidecarSpec,
  createPackagedProductionRuntime,
  createProductionExtensionRuntime,
  createReplayIntentScheduler,
  createReplaySourceAttestation,
  createRouterReplayAdapter,
  requireReplayRouterDecisionId,
  createRun88RuntimeCorrelation,
  createRuntimeRequestCorrelationId,
  createTrackBPostObservationOutbox,
  digestTrackBSemanticEvaluationCriteria,
  normalizeTrackBSemanticEvaluationCriteria,
  resolveManagedArtifactKeyFiles,
  runTrackBPostObservation,
  runTrackBPostObservationWithContribution,
  runTrackBShadowPipeline,
  runSupervisedReplay,
  trackBDistributionRequiresSQLiteMaintenance,
  validateRun88ProviderResponseObservation,
  verifyTrackBExtensionClosureAfterRestart,
} from "./track-b-runtime.js";

type CliBackend = Pick<
  RuntimeBridgeBackend,
  | "operatorAuthToken"
  | "registry"
  | "executeChatCompletions"
  | "executeResponses"
  | "readVersionInfo"
  | "listActivityMetrics"
  | "listActivityMetricsPage"
  | "readActivityCapture"
  | "readRuntimeSummary"
  | "readRuntimeConfig"
  | "updateRuntimeConfig"
  | "readHealthStatus"
  | "readTelemetrySummary"
  | "listTelemetryComparisonRows"
  | "listTelemetryRequests"
  | "listTelemetryRequestPage"
  | "queryTelemetryAnalytics"
  | "subscribeTelemetry"
  | "listProviders"
  | "listModels"
  | "listExtensions"
  | "mutateExtension"
  | "readTrackBQaExtensions"
  | "readTrackBShadowReceipts"
  | "readTrackBExtensionReadback"
  | "runTrackBSupervisedReplay"
  | "readOperatorStatus"
  | "listReplayJobs"
  | "createReplayJob"
  | "cancelReplayJob"
  | "listEvaluationJobs"
  | "readEvaluationJob"
  | "cancelEvaluationJob"
  | "retryEvaluationJob"
  | "readLearningState"
  | "updateLearningMode"
  | "rollbackLearning"
  | "measureNoRichCaptureBaseline"
  | "readGraphMigration"
  | "advanceGraphMigration"
  | "rollbackGraphMigration"
  | "readStorageRetention"
  | "dryRunStorageRetention"
  | "updateStorageRetentionPolicy"
  | "executeStorageRetention"
  | "cancelStorageRetentionJob"
  | "rollbackStorageRetention"
  | "readContributionState"
  | "updateContributionState"
  | "listRecommendations"
  | "downloadRecommendations"
  | "applyRecommendation"
  | "dismissRecommendation"
  | "readActivePack"
  | "listRoles"
  | "listAccounts"
  | "listProviderDeviceAuthorizations"
  | "upsertProviderAccount"
  | "startProviderDeviceAuthorization"
  | "pollProviderDeviceAuthorization"
  | "removeProviderAccountModel"
  | "reconnectProviderAccount"
  | "updateProviderApiKey"
  | "openExternalUrl"
  | "activateEndpoint"
  | "activateEndpointBatch"
  | "removeEndpoint"
  | "readControllerAssignment"
  | "updateControllerAssignment"
  | "readRouterSummary"
  | "readRouterConfig"
  | "listRouterCandidates"
  | "listRouterDecisions"
  | "listRouterDecisionPage"
  | "readRouterDecision"
  | "listEndpoints"
  | "listRecentRequestIds"
  | "listRecentRequestObservations"
  | "readRequestObservation"
  | "exportVerifiersTrace"
  | "recoverLegacyTerminalFailure"
  | "readEndpointProfile"
  | "readBenchmarkSuite"
  | "runBenchmark"
  | "readBenchmarkRun"
  | "readActiveBenchmarkRun"
  | "clearBenchmarkEndpointData"
  | "clearBenchmarkData"
  | "readBenchmarkSummary"
  | "readBenchmarkPortfolio"
  | "listBenchmarkRuns"
  | "readBenchmarkSummariesByMode"
  | "readBenchmarkPreferences"
  | "updateBenchmarkPreferences"
  | "listLocalModels"
  | "listPeerLocalModels"
  | "listLlamaSwapLocalModels"
  | "loadLocalModel"
  | "loadPeerModel"
  | "loadLlamaSwapModel"
  | "setPeerModelRoles"
  | "setLlamaSwapModelRoles"
  | "unloadPeerModel"
  | "unloadLocalModel"
  | "readLocalPolicy"
  | "updateLocalPolicy"
  | "readRolePolicy"
  | "createRolePolicyRole"
  | "updateRolePolicyRole"
  | "listTaskDefinitions"
  | "updateTaskDefinitions"
  | "listSwapHistory"
  | "getLocalLogs"
  | "proxyVendorLogStream"
  | "readModelOverrides"
  | "updateModelOverrides"
  | "readPeers"
  | "updatePeers"
  | "checkPeerHealth"
  | "getRoutableInventory"
  | "effectiveRegistry"
  | "getExecutionCatalog"
  | "getEffectiveRoutableInventory"
  | "shutdown"
>;

export function requirePackagedTrackBManifest(
  packagedProfile: RuntimeChannelProfile | null,
  trackBManifestText: string | null,
): void {
  if (packagedProfile && !trackBManifestText) {
    throw new Error(
      `packaged ${packagedProfile.channel} runtime is missing its Track B distribution`,
    );
  }
}

type Run88PiInvocationProvenance = Readonly<{
  source: "routed-execution-callback";
  piInvocationProof: Readonly<Record<string, unknown>>;
  trustedAuthorityPublicKey: string;
  expectedReleaseId: string;
}>;

function readRun88PiInvocationProvenance(
  env: NodeJS.ProcessEnv,
  expectedReleaseId: string | undefined,
): Run88PiInvocationProvenance | null {
  const proofPath = env.RUN88_PI_INVOCATION_PROOF_PATH;
  const authorityPath = env.RUN88_PI_PROOF_AUTHORITY_PUBLIC_KEY_PATH;
  if (!proofPath && !authorityPath) return null;
  if (
    !proofPath ||
    !authorityPath ||
    !path.isAbsolute(proofPath) ||
    !path.isAbsolute(authorityPath)
  )
    throw new Error("Run 88 Pi proof and authority paths must both be absolute");
  if (!/^sha256:[0-9a-f]{64}$/.test(expectedReleaseId ?? ""))
    throw new Error("Run 88 Pi proof requires the packaged release identity");
  let piInvocationProof: Readonly<Record<string, unknown>>;
  try {
    piInvocationProof = JSON.parse(readFileSync(proofPath, "utf8")) as Readonly<
      Record<string, unknown>
    >;
  } catch {
    throw new Error("Run 88 Pi invocation proof file is unreadable or malformed");
  }
  const trustedAuthorityPublicKey = readFileSync(authorityPath, "utf8").trim();
  if (!trustedAuthorityPublicKey) throw new Error("Run 88 Pi proof authority public key is empty");
  return Object.freeze({
    source: "routed-execution-callback",
    piInvocationProof,
    trustedAuthorityPublicKey,
    expectedReleaseId: expectedReleaseId as string,
  });
}

export function createRun88StagePostObservation(input: {
  readonly observation: Readonly<Record<string, unknown>>;
  readonly piInvocationProvenance: Run88PiInvocationProvenance | null;
  readonly proofRequired: boolean;
  readonly releaseId: string;
  readonly sourceId: string;
  readonly executableSha256: string;
  readonly scope: string;
}): Readonly<Record<string, unknown>> {
  if (input.proofRequired && !input.piInvocationProvenance)
    throw new Error("Run 88 Phase 5 provider observation requires signed Pi CLI provenance");
  return Object.freeze({
    ...input.observation,
    ...(input.piInvocationProvenance
      ? {
          run88ProviderResponse: validateRun88ProviderResponseObservation(
            input.observation,
            input.piInvocationProvenance,
          ),
        }
      : {}),
    run88Correlation: createRun88RuntimeCorrelation({
      requestId: String(input.observation.requestId ?? ""),
      routingDecisionId: String(input.observation.routingDecisionId ?? ""),
      endpointId: String(input.observation.endpointId ?? ""),
      releaseId: input.releaseId,
      sourceId: input.sourceId,
      deploymentId: `local-stage:${input.executableSha256}`,
      scope: input.scope,
      correlationId: createRuntimeRequestCorrelationId({
        scope: input.scope,
        requestId: String(input.observation.requestId ?? ""),
        routingDecisionId: String(input.observation.routingDecisionId ?? ""),
      }),
    }),
  });
}

interface CliBootstrapState {
  status: "pending" | "ready" | "failed";
  message?: string;
}

interface CliBackendResolver {
  getBackend: () => CliBackend | null;
  readBootstrapState?: () => CliBootstrapState;
}

const EMPTY_REGISTRY: EndpointRegistryResult = {
  endpoints: [],
  diagnostics: [],
  lifecycleSummary: {
    active: 0,
    degraded: 0,
    offline: 0,
  },
};

const EMPTY_CATALOG: NormalizedCatalog = {
  catalogVersion: "1",
  source: {
    vendor: "runtime-bootstrap",
    commit: "pending",
    capturedAt: "1970-01-01T00:00:00.000Z",
    schemaVersion: "runtime-bootstrap.v1",
  },
  providers: [],
  models: [],
};

export function resolveCliFixtureRoot(_repoRoot: string, fixtureRoot?: string): string | undefined {
  return fixtureRoot?.trim() || undefined;
}

function isCliBackendResolver(value: CliBackend | CliBackendResolver): value is CliBackendResolver {
  return typeof (value as CliBackendResolver).getBackend === "function";
}

function createPendingHealthStatus(state: CliBootstrapState): unknown {
  const bootstrapStatus = state.status === "failed" ? "blocked" : state.status;
  return {
    status: "degraded",
    executionMode: "decision_only",
    vendors: {},
    inactiveVendors: [],
    credentialLifecycleAuthority: {
      state: "provisional",
      bootstrapStatus,
    },
    sessionBootstrap: {
      status: bootstrapStatus,
      startedAt: null,
      finishedAt: null,
      stages: state.message
        ? [
            {
              stageId: "backend",
              status: state.status === "failed" ? "failed" : "pending",
              message: state.message,
            },
          ]
        : [],
    },
  };
}

export function createCliServerOptions(
  options: {
    host: string;
    port: number;
    staticRoot?: string;
    runtimeStateRoot?: string;
    runtimeChannel?: "development" | "stage" | "production";
    operatorAuthToken?: string;
  },
  backendOrResolver: CliBackend | CliBackendResolver,
  shutdown?: () => Promise<void>,
): StartBridgeServerOptions {
  const resolveBackend = () =>
    isCliBackendResolver(backendOrResolver) ? backendOrResolver.getBackend() : backendOrResolver;
  const readBootstrapState = () =>
    isCliBackendResolver(backendOrResolver) && backendOrResolver.readBootstrapState
      ? backendOrResolver.readBootstrapState()
      : ({ status: "ready" } as CliBootstrapState);
  const requireBackend = (): CliBackend => {
    const backend = resolveBackend();
    if (!backend) {
      throw new Error("runtime backend is not ready");
    }
    return backend;
  };
  const bindBackendMethod = (key: keyof CliBackend) =>
    ((...args: readonly unknown[]) => {
      const backend = requireBackend() as unknown as Record<
        string,
        (...methodArgs: readonly unknown[]) => unknown
      >;
      const method = backend[key as string];
      return method(...args);
    }) as unknown;

  return {
    host: options.host,
    port: options.port,
    staticRoot: options.staticRoot,
    runtimeStateRoot: options.runtimeStateRoot,
    runtimeChannel: options.runtimeChannel,
    operatorAuthToken: options.operatorAuthToken ?? resolveBackend()?.operatorAuthToken,
    shutdown,
    registry: resolveBackend()?.effectiveRegistry ?? EMPTY_REGISTRY,
    getRegistry: () => resolveBackend()?.effectiveRegistry ?? EMPTY_REGISTRY,
    getExecutionCatalog: () => resolveBackend()?.getExecutionCatalog() ?? EMPTY_CATALOG,
    readStartupReadiness: () => {
      const state = readBootstrapState();
      return {
        ready: state.status === "ready",
        status: state.status,
        ...(state.message ? { message: state.message } : {}),
      };
    },
    executeChatCompletions: bindBackendMethod(
      "executeChatCompletions",
    ) as StartBridgeServerOptions["executeChatCompletions"],
    executeResponses: bindBackendMethod(
      "executeResponses",
    ) as StartBridgeServerOptions["executeResponses"],
    readVersionInfo: bindBackendMethod(
      "readVersionInfo",
    ) as StartBridgeServerOptions["readVersionInfo"],
    listActivityMetrics: bindBackendMethod(
      "listActivityMetrics",
    ) as StartBridgeServerOptions["listActivityMetrics"],
    listActivityMetricsPage: bindBackendMethod(
      "listActivityMetricsPage",
    ) as StartBridgeServerOptions["listActivityMetricsPage"],
    readActivityCapture: bindBackendMethod(
      "readActivityCapture",
    ) as StartBridgeServerOptions["readActivityCapture"],
    readLogs: async () =>
      (
        (await (bindBackendMethod("getLocalLogs") as CliBackend["getLocalLogs"])()) as {
          logs: string;
        }
      ).logs,
    proxyVendorLogStream: bindBackendMethod(
      "proxyVendorLogStream",
    ) as StartBridgeServerOptions["proxyVendorLogStream"],
    readRuntimeSummary: bindBackendMethod(
      "readRuntimeSummary",
    ) as StartBridgeServerOptions["readRuntimeSummary"],
    readRuntimeConfig: bindBackendMethod(
      "readRuntimeConfig",
    ) as StartBridgeServerOptions["readRuntimeConfig"],
    updateRuntimeConfig: bindBackendMethod(
      "updateRuntimeConfig",
    ) as StartBridgeServerOptions["updateRuntimeConfig"],
    readHealthStatus: async () => {
      const backend = resolveBackend();
      return backend ? backend.readHealthStatus() : createPendingHealthStatus(readBootstrapState());
    },
    readTelemetrySummary: bindBackendMethod(
      "readTelemetrySummary",
    ) as StartBridgeServerOptions["readTelemetrySummary"],
    listTelemetryComparisonRows: bindBackendMethod(
      "listTelemetryComparisonRows",
    ) as StartBridgeServerOptions["listTelemetryComparisonRows"],
    listTelemetryRequests: bindBackendMethod(
      "listTelemetryRequests",
    ) as StartBridgeServerOptions["listTelemetryRequests"],
    listTelemetryRequestPage: bindBackendMethod(
      "listTelemetryRequestPage",
    ) as StartBridgeServerOptions["listTelemetryRequestPage"],
    queryTelemetryAnalytics: bindBackendMethod(
      "queryTelemetryAnalytics",
    ) as StartBridgeServerOptions["queryTelemetryAnalytics"],
    subscribeTelemetry: bindBackendMethod(
      "subscribeTelemetry",
    ) as StartBridgeServerOptions["subscribeTelemetry"],
    listProviders: bindBackendMethod("listProviders") as StartBridgeServerOptions["listProviders"],
    listModels: bindBackendMethod("listModels") as StartBridgeServerOptions["listModels"],
    listExtensions: bindBackendMethod(
      "listExtensions",
    ) as StartBridgeServerOptions["listExtensions"],
    mutateExtension: bindBackendMethod(
      "mutateExtension",
    ) as StartBridgeServerOptions["mutateExtension"],
    readTrackBQaExtensions: bindBackendMethod(
      "readTrackBQaExtensions",
    ) as StartBridgeServerOptions["readTrackBQaExtensions"],
    readTrackBShadowReceipts: bindBackendMethod(
      "readTrackBShadowReceipts",
    ) as StartBridgeServerOptions["readTrackBShadowReceipts"],
    readTrackBExtensionReadback: bindBackendMethod(
      "readTrackBExtensionReadback",
    ) as StartBridgeServerOptions["readTrackBExtensionReadback"],
    runTrackBSupervisedReplay: bindBackendMethod(
      "runTrackBSupervisedReplay",
    ) as StartBridgeServerOptions["runTrackBSupervisedReplay"],
    readOperatorStatus: bindBackendMethod(
      "readOperatorStatus",
    ) as StartBridgeServerOptions["readOperatorStatus"],
    listReplayJobs: bindBackendMethod(
      "listReplayJobs",
    ) as StartBridgeServerOptions["listReplayJobs"],
    createReplayJob: bindBackendMethod(
      "createReplayJob",
    ) as StartBridgeServerOptions["createReplayJob"],
    cancelReplayJob: bindBackendMethod(
      "cancelReplayJob",
    ) as StartBridgeServerOptions["cancelReplayJob"],
    listEvaluationJobs: bindBackendMethod(
      "listEvaluationJobs",
    ) as StartBridgeServerOptions["listEvaluationJobs"],
    readEvaluationJob: bindBackendMethod(
      "readEvaluationJob",
    ) as StartBridgeServerOptions["readEvaluationJob"],
    cancelEvaluationJob: bindBackendMethod(
      "cancelEvaluationJob",
    ) as StartBridgeServerOptions["cancelEvaluationJob"],
    retryEvaluationJob: bindBackendMethod(
      "retryEvaluationJob",
    ) as StartBridgeServerOptions["retryEvaluationJob"],
    readLearningState: bindBackendMethod(
      "readLearningState",
    ) as StartBridgeServerOptions["readLearningState"],
    updateLearningMode: bindBackendMethod(
      "updateLearningMode",
    ) as StartBridgeServerOptions["updateLearningMode"],
    rollbackLearning: bindBackendMethod(
      "rollbackLearning",
    ) as StartBridgeServerOptions["rollbackLearning"],
    measureNoRichCaptureBaseline: bindBackendMethod(
      "measureNoRichCaptureBaseline",
    ) as StartBridgeServerOptions["measureNoRichCaptureBaseline"],
    readGraphMigration: bindBackendMethod(
      "readGraphMigration",
    ) as StartBridgeServerOptions["readGraphMigration"],
    advanceGraphMigration: bindBackendMethod(
      "advanceGraphMigration",
    ) as StartBridgeServerOptions["advanceGraphMigration"],
    rollbackGraphMigration: bindBackendMethod(
      "rollbackGraphMigration",
    ) as StartBridgeServerOptions["rollbackGraphMigration"],
    readStorageRetention: bindBackendMethod(
      "readStorageRetention",
    ) as StartBridgeServerOptions["readStorageRetention"],
    dryRunStorageRetention: bindBackendMethod(
      "dryRunStorageRetention",
    ) as StartBridgeServerOptions["dryRunStorageRetention"],
    updateStorageRetentionPolicy: bindBackendMethod(
      "updateStorageRetentionPolicy",
    ) as StartBridgeServerOptions["updateStorageRetentionPolicy"],
    executeStorageRetention: bindBackendMethod(
      "executeStorageRetention",
    ) as StartBridgeServerOptions["executeStorageRetention"],
    cancelStorageRetentionJob: bindBackendMethod(
      "cancelStorageRetentionJob",
    ) as StartBridgeServerOptions["cancelStorageRetentionJob"],
    rollbackStorageRetention: bindBackendMethod(
      "rollbackStorageRetention",
    ) as StartBridgeServerOptions["rollbackStorageRetention"],
    readContributionState: bindBackendMethod(
      "readContributionState",
    ) as StartBridgeServerOptions["readContributionState"],
    updateContributionState: bindBackendMethod(
      "updateContributionState",
    ) as StartBridgeServerOptions["updateContributionState"],
    listRecommendations: bindBackendMethod(
      "listRecommendations",
    ) as StartBridgeServerOptions["listRecommendations"],
    downloadRecommendations: bindBackendMethod(
      "downloadRecommendations",
    ) as StartBridgeServerOptions["downloadRecommendations"],
    applyRecommendation: bindBackendMethod(
      "applyRecommendation",
    ) as StartBridgeServerOptions["applyRecommendation"],
    dismissRecommendation: bindBackendMethod(
      "dismissRecommendation",
    ) as StartBridgeServerOptions["dismissRecommendation"],
    readActivePack: bindBackendMethod(
      "readActivePack",
    ) as StartBridgeServerOptions["readActivePack"],
    listRoles: bindBackendMethod("listRoles") as StartBridgeServerOptions["listRoles"],
    listAccounts: bindBackendMethod("listAccounts") as StartBridgeServerOptions["listAccounts"],
    listProviderDeviceAuthorizations: bindBackendMethod(
      "listProviderDeviceAuthorizations",
    ) as StartBridgeServerOptions["listProviderDeviceAuthorizations"],
    upsertProviderAccount: bindBackendMethod(
      "upsertProviderAccount",
    ) as StartBridgeServerOptions["upsertProviderAccount"],
    startProviderDeviceAuthorization: bindBackendMethod(
      "startProviderDeviceAuthorization",
    ) as StartBridgeServerOptions["startProviderDeviceAuthorization"],
    pollProviderDeviceAuthorization: bindBackendMethod(
      "pollProviderDeviceAuthorization",
    ) as StartBridgeServerOptions["pollProviderDeviceAuthorization"],
    reconnectProviderAccount: bindBackendMethod(
      "reconnectProviderAccount",
    ) as StartBridgeServerOptions["reconnectProviderAccount"],
    updateProviderApiKey: bindBackendMethod(
      "updateProviderApiKey",
    ) as StartBridgeServerOptions["updateProviderApiKey"],
    openExternalUrl: bindBackendMethod(
      "openExternalUrl",
    ) as StartBridgeServerOptions["openExternalUrl"],
    removeProviderAccountModel: bindBackendMethod(
      "removeProviderAccountModel",
    ) as StartBridgeServerOptions["removeProviderAccountModel"],
    activateEndpoint: bindBackendMethod(
      "activateEndpoint",
    ) as StartBridgeServerOptions["activateEndpoint"],
    activateEndpointBatch: bindBackendMethod(
      "activateEndpointBatch",
    ) as StartBridgeServerOptions["activateEndpointBatch"],
    removeEndpoint: bindBackendMethod(
      "removeEndpoint",
    ) as StartBridgeServerOptions["removeEndpoint"],
    readControllerAssignment: bindBackendMethod(
      "readControllerAssignment",
    ) as StartBridgeServerOptions["readControllerAssignment"],
    updateControllerAssignment: bindBackendMethod(
      "updateControllerAssignment",
    ) as StartBridgeServerOptions["updateControllerAssignment"],
    readRouterSummary: bindBackendMethod(
      "readRouterSummary",
    ) as StartBridgeServerOptions["readRouterSummary"],
    readRouterConfig: bindBackendMethod(
      "readRouterConfig",
    ) as StartBridgeServerOptions["readRouterConfig"],
    listRouterCandidates: bindBackendMethod(
      "listRouterCandidates",
    ) as StartBridgeServerOptions["listRouterCandidates"],
    listRouterDecisions: bindBackendMethod(
      "listRouterDecisions",
    ) as StartBridgeServerOptions["listRouterDecisions"],
    listRouterDecisionPage: bindBackendMethod(
      "listRouterDecisionPage",
    ) as StartBridgeServerOptions["listRouterDecisionPage"],
    readRouterDecision: bindBackendMethod(
      "readRouterDecision",
    ) as StartBridgeServerOptions["readRouterDecision"],
    listEndpoints: bindBackendMethod("listEndpoints") as StartBridgeServerOptions["listEndpoints"],
    listRecentRequestIds: bindBackendMethod(
      "listRecentRequestIds",
    ) as StartBridgeServerOptions["listRecentRequestIds"],
    listRecentRequestObservations: bindBackendMethod(
      "listRecentRequestObservations",
    ) as StartBridgeServerOptions["listRecentRequestObservations"],
    readRequestObservation: bindBackendMethod(
      "readRequestObservation",
    ) as StartBridgeServerOptions["readRequestObservation"],
    exportVerifiersTrace: bindBackendMethod(
      "exportVerifiersTrace",
    ) as StartBridgeServerOptions["exportVerifiersTrace"],
    recoverLegacyTerminalFailure: bindBackendMethod(
      "recoverLegacyTerminalFailure",
    ) as StartBridgeServerOptions["recoverLegacyTerminalFailure"],
    readEndpointProfile: bindBackendMethod(
      "readEndpointProfile",
    ) as StartBridgeServerOptions["readEndpointProfile"],
    readBenchmarkSuite: bindBackendMethod(
      "readBenchmarkSuite",
    ) as StartBridgeServerOptions["readBenchmarkSuite"],
    runBenchmark: bindBackendMethod("runBenchmark") as StartBridgeServerOptions["runBenchmark"],
    readBenchmarkRun: bindBackendMethod(
      "readBenchmarkRun",
    ) as StartBridgeServerOptions["readBenchmarkRun"],
    readActiveBenchmarkRun: bindBackendMethod(
      "readActiveBenchmarkRun",
    ) as StartBridgeServerOptions["readActiveBenchmarkRun"],
    clearBenchmarkEndpointData: bindBackendMethod(
      "clearBenchmarkEndpointData",
    ) as StartBridgeServerOptions["clearBenchmarkEndpointData"],
    clearBenchmarkData: bindBackendMethod(
      "clearBenchmarkData",
    ) as StartBridgeServerOptions["clearBenchmarkData"],
    readBenchmarkSummary: bindBackendMethod(
      "readBenchmarkSummary",
    ) as StartBridgeServerOptions["readBenchmarkSummary"],
    readBenchmarkPortfolio: bindBackendMethod(
      "readBenchmarkPortfolio",
    ) as StartBridgeServerOptions["readBenchmarkPortfolio"],
    listBenchmarkRuns: bindBackendMethod(
      "listBenchmarkRuns",
    ) as StartBridgeServerOptions["listBenchmarkRuns"],
    readBenchmarkSummariesByMode: bindBackendMethod(
      "readBenchmarkSummariesByMode",
    ) as StartBridgeServerOptions["readBenchmarkSummariesByMode"],
    readBenchmarkPreferences: bindBackendMethod(
      "readBenchmarkPreferences",
    ) as StartBridgeServerOptions["readBenchmarkPreferences"],
    updateBenchmarkPreferences: bindBackendMethod(
      "updateBenchmarkPreferences",
    ) as StartBridgeServerOptions["updateBenchmarkPreferences"],
    listLocalModels: bindBackendMethod(
      "listLocalModels",
    ) as StartBridgeServerOptions["listLocalModels"],
    listPeerLocalModels: bindBackendMethod(
      "listPeerLocalModels",
    ) as StartBridgeServerOptions["listPeerLocalModels"],
    listLlamaSwapLocalModels: bindBackendMethod(
      "listLlamaSwapLocalModels",
    ) as StartBridgeServerOptions["listLlamaSwapLocalModels"],
    loadLocalModel: bindBackendMethod(
      "loadLocalModel",
    ) as StartBridgeServerOptions["loadLocalModel"],
    loadPeerModel: bindBackendMethod("loadPeerModel") as StartBridgeServerOptions["loadPeerModel"],
    loadLlamaSwapModel: bindBackendMethod(
      "loadLlamaSwapModel",
    ) as StartBridgeServerOptions["loadLlamaSwapModel"],
    setPeerModelRoles: bindBackendMethod(
      "setPeerModelRoles",
    ) as StartBridgeServerOptions["setPeerModelRoles"],
    setLlamaSwapModelRoles: bindBackendMethod(
      "setLlamaSwapModelRoles",
    ) as StartBridgeServerOptions["setLlamaSwapModelRoles"],
    unloadPeerModel: bindBackendMethod(
      "unloadPeerModel",
    ) as StartBridgeServerOptions["unloadPeerModel"],
    unloadLocalModel: bindBackendMethod(
      "unloadLocalModel",
    ) as StartBridgeServerOptions["unloadLocalModel"],
    readLocalPolicy: bindBackendMethod(
      "readLocalPolicy",
    ) as StartBridgeServerOptions["readLocalPolicy"],
    updateLocalPolicy: bindBackendMethod(
      "updateLocalPolicy",
    ) as StartBridgeServerOptions["updateLocalPolicy"],
    readRolePolicy: bindBackendMethod(
      "readRolePolicy",
    ) as StartBridgeServerOptions["readRolePolicy"],
    createRolePolicyRole: bindBackendMethod(
      "createRolePolicyRole",
    ) as StartBridgeServerOptions["createRolePolicyRole"],
    updateRolePolicyRole: bindBackendMethod(
      "updateRolePolicyRole",
    ) as StartBridgeServerOptions["updateRolePolicyRole"],
    listTaskDefinitions: bindBackendMethod(
      "listTaskDefinitions",
    ) as StartBridgeServerOptions["listTaskDefinitions"],
    updateTaskDefinitions: bindBackendMethod(
      "updateTaskDefinitions",
    ) as StartBridgeServerOptions["updateTaskDefinitions"],
    listSwapHistory: bindBackendMethod(
      "listSwapHistory",
    ) as StartBridgeServerOptions["listSwapHistory"],
    getLocalLogs: bindBackendMethod("getLocalLogs") as StartBridgeServerOptions["getLocalLogs"],
    readModelOverrides: bindBackendMethod(
      "readModelOverrides",
    ) as StartBridgeServerOptions["readModelOverrides"],
    updateModelOverrides: bindBackendMethod(
      "updateModelOverrides",
    ) as StartBridgeServerOptions["updateModelOverrides"],
    readPeers: bindBackendMethod("readPeers") as StartBridgeServerOptions["readPeers"],
    updatePeers: bindBackendMethod("updatePeers") as StartBridgeServerOptions["updatePeers"],
    checkPeerHealth: bindBackendMethod(
      "checkPeerHealth",
    ) as StartBridgeServerOptions["checkPeerHealth"],
    getRoutableInventory: () => resolveBackend()?.getEffectiveRoutableInventory() ?? null,
  };
}

function openBrowser(url: string): void {
  let executable: string;
  let args: string[];
  if (process.platform === "win32") {
    executable = "cmd";
    args = ["/c", "start", "", url];
  } else if (process.platform === "darwin") {
    executable = "open";
    args = [url];
  } else {
    executable = "xdg-open";
    args = [url];
  }
  const child = spawn(executable, args, {
    detached: true,
    stdio: "ignore",
    shell: false,
  });
  child.unref();
}

type LauncherConfigValues = Record<string, string | boolean | undefined>;

function readLauncherString(values: LauncherConfigValues, key: string): string | undefined {
  const value = values[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function applyRecommendationServiceLauncherConfig(values: LauncherConfigValues): void {
  const channel = readLauncherString(values, "recommendation-channel");
  const serviceUrl =
    readLauncherString(values, "recommendation-service-url") ??
    (channel === "stage" ? "https://recommendations-stage.role-model.dev" : undefined);
  const verificationKey = readLauncherString(values, "recommendation-verification-key");
  const serviceToken = readLauncherString(values, "recommendation-service-token");
  const materialFile = readLauncherString(values, "recommendation-material-file");
  const aggregateScope = readLauncherString(values, "aggregate-scope");
  const recommendationScope = readLauncherString(values, "recommendation-scope");

  if (serviceUrl) {
    process.env.ROLE_MODEL_RECOMMENDATION_SERVICE_URL = serviceUrl;
  }
  if (channel) {
    process.env.ROLE_MODEL_RECOMMENDATION_CHANNEL = channel;
  }
  if (verificationKey) {
    process.env.ROLE_MODEL_RECOMMENDATION_VERIFICATION_KEY = verificationKey;
  }
  if (serviceToken) {
    process.env.ROLE_MODEL_RECOMMENDATION_SERVICE_TOKEN = serviceToken;
  }
  if (aggregateScope) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,511}$/.test(aggregateScope)) {
      throw new Error("aggregate scope is invalid");
    }
    process.env.ROLE_MODEL_AGGREGATE_SCOPE = aggregateScope;
  }
  if (recommendationScope) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,511}$/.test(recommendationScope)) {
      throw new Error("recommendation scope is invalid");
    }
    process.env.ROLE_MODEL_RECOMMENDATION_SCOPE = recommendationScope;
  }
  if (!materialFile) {
    return;
  }

  const material = JSON.parse(readFileSync(materialFile, "utf8")) as {
    readonly recommendationPublicSpkiBase64?: unknown;
    readonly internalServiceToken?: unknown;
  };
  if (
    typeof material.recommendationPublicSpkiBase64 !== "string" ||
    !material.recommendationPublicSpkiBase64.trim()
  ) {
    throw new Error("recommendation material file is missing recommendationPublicSpkiBase64");
  }
  if (typeof material.internalServiceToken !== "string" || !material.internalServiceToken.trim()) {
    throw new Error("recommendation material file is missing internalServiceToken");
  }
  process.env.ROLE_MODEL_RECOMMENDATION_VERIFICATION_KEY =
    material.recommendationPublicSpkiBase64.trim();
  process.env.ROLE_MODEL_RECOMMENDATION_SERVICE_TOKEN = material.internalServiceToken.trim();
}

export async function main(): Promise<void> {
  const args = parseArgs({
    options: {
      host: {
        type: "string",
      },
      port: {
        type: "string",
      },
      "repo-root": {
        type: "string",
      },
      "runtime-state-root": {
        type: "string",
      },
      "scope-id": {
        type: "string",
      },
      "unified-runtime-config": {
        type: "string",
      },
      "fixture-root": {
        type: "string",
      },
      "static-root": {
        type: "string",
      },
      "track-b-runtime-manifest": {
        type: "string",
      },
      "track-b-qa-extension-manifest": {
        type: "string",
      },
      "operator-auth-token": {
        type: "string",
      },
      "artifact-digest-key-file": {
        type: "string",
      },
      "artifact-encryption-key-file": {
        type: "string",
      },
      "destination-trust-material-file": {
        type: "string",
      },
      "destination-material-file": {
        type: "string",
      },
      "aggregate-ingestion-url": {
        type: "string",
      },
      "aggregate-scope": {
        type: "string",
      },
      "development-verification-lease-file": {
        type: "string",
      },
      "development-verification-trust-key-file": {
        type: "string",
      },
      "development-verification-deployment-ids": {
        type: "string",
      },
      "development-verification-revocation-epoch": {
        type: "string",
      },
      "recommendation-scope": {
        type: "string",
      },
      "recommendation-service-url": {
        type: "string",
      },
      "recommendation-material-file": {
        type: "string",
      },
      "recommendation-verification-key": {
        type: "string",
      },
      "recommendation-service-token": {
        type: "string",
      },
      "recommendation-channel": {
        type: "string",
      },
    },
  });
  applyRecommendationServiceLauncherConfig(args.values);
  const operatorAuthToken =
    readLauncherString(args.values, "operator-auth-token") ??
    (process.env.ROLE_MODEL_OPERATOR_AUTH_TOKEN?.trim() || undefined);

  const launchedWithoutRuntimeArgs =
    !args.values["repo-root"] && !args.values["runtime-state-root"];
  const options = resolveBridgeServerOptions({
    host: args.values.host,
    port: args.values.port,
    repoRoot: args.values["repo-root"],
    runtimeStateRoot: args.values["runtime-state-root"],
    scopeId: args.values["scope-id"],
    executablePath: process.execPath,
    localAppData: process.env.LOCALAPPDATA,
    unifiedRuntimeConfigPath: args.values["unified-runtime-config"],
  });
  const packagedProfile = readPackagedRuntimeProfile(process.execPath);
  const packagedManifestRecord = packagedProfile
    ? (JSON.parse(
        readFileSync(path.join(path.dirname(process.execPath), "manifest.json"), "utf8"),
      ) as Record<string, unknown>)
    : null;
  const run88StageIdentity = resolveRun88StageRuntimeIdentity(
    packagedProfile?.channel ?? "development",
    packagedManifestRecord,
  );
  const packagedReleaseId = run88StageIdentity?.releaseId;
  const packagedExecutableSha256 = String(packagedManifestRecord?.executable_sha256 ?? "");
  const aggregateCorrelationReleaseId =
    run88StageIdentity?.releaseId ??
    (/^[a-f0-9]{64}$/.test(packagedExecutableSha256)
      ? `sha256:${packagedExecutableSha256}`
      : undefined);
  const aggregateCorrelationCohortId = packagedProfile
    ? packagedProfile.channel === "stage"
      ? "stage-1pct"
      : packagedProfile.channel === "development"
        ? "development-default"
        : undefined
    : undefined;
  const loadRun88PiInvocationProvenance = run88StageIdentity
    ? () => readRun88PiInvocationProvenance(process.env, run88StageIdentity.releaseId)
    : null;
  if (packagedProfile?.channel === "production" && !args.values["runtime-state-root"]) {
    const migration = await migrateLegacyProductionState({
      legacyRoot: path.join(process.env.LOCALAPPDATA || os.tmpdir(), "Role Model Runtime"),
      destinationRoot: options.runtimeStateRoot,
    });
    if (migration.copied.length > 0 || migration.conflicts.length > 0) {
      console.log(
        JSON.stringify({
          status: "legacy-state-migration",
          copied: migration.copied.length,
          conflicts: migration.conflicts,
        }),
      );
    }
  }
  const staticRoot = args.values["static-root"]?.trim() || options.staticRoot;
  let server: Awaited<ReturnType<typeof startBridgeServer>> | null = null;
  let backend: RuntimeBridgeBackend | null = null;
  let packagedRuntime: Awaited<
    ReturnType<typeof createPackagedProductionRuntime<RuntimeBridgeBackend>>
  > | null = null;
  let extensionRuntime: Awaited<ReturnType<typeof createProductionExtensionRuntime>> | null = null;
  const extensionRuntimeRef: {
    current: Awaited<ReturnType<typeof createProductionExtensionRuntime>> | null;
  } = { current: null };
  const bootstrapState: CliBootstrapState = { status: "pending" };
  let shutdownPromise: Promise<void> | null = null;
  const shutdown = async (): Promise<void> => {
    if (shutdownPromise) {
      return shutdownPromise;
    }

    shutdownPromise = (async () => {
      await server?.close();
      if (packagedRuntime) await packagedRuntime.close();
      else await backend?.shutdown();
      await extensionRuntime?.close();
      process.exit(0);
    })();

    return shutdownPromise;
  };

  server = await startBridgeServer(
    createCliServerOptions(
      {
        host: options.host,
        port: options.port,
        staticRoot,
        runtimeStateRoot: options.runtimeStateRoot,
        runtimeChannel: packagedProfile?.channel ?? "development",
        ...(operatorAuthToken ? { operatorAuthToken } : {}),
        ...(run88StageIdentity ? { run88StageIdentity } : {}),
      },
      {
        getBackend: () => backend,
        readBootstrapState: () => bootstrapState,
      },
      shutdown,
    ),
  );

  console.log(
    JSON.stringify(
      {
        status: "listening",
        host: options.host,
        port: server.port,
      },
      null,
      2,
    ),
  );

  if (launchedWithoutRuntimeArgs) {
    openBrowser(`http://${options.host}:${server.port}/`);
  }

  process.on("SIGINT", () => {
    void shutdown();
  });
  process.on("SIGTERM", () => {
    void shutdown();
  });

  try {
    const explicitManifest =
      args.values["track-b-runtime-manifest"]?.trim() ||
      process.env.ROLE_MODEL_TRACK_B_RUNTIME_MANIFEST?.trim();
    const packagedManifest = path.join(
      path.dirname(process.execPath),
      "track-b-runtime",
      "track-b-runtime-manifest.json",
    );
    const trackBManifestPath = explicitManifest || (packagedProfile ? packagedManifest : null);
    const trackBManifestText = trackBManifestPath
      ? await readFile(trackBManifestPath, "utf8").catch((error: unknown) => {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
          throw error;
        })
      : null;
    const qaManifestPath =
      args.values["track-b-qa-extension-manifest"]?.trim() ||
      process.env.ROLE_MODEL_TRACK_B_QA_EXTENSION_MANIFEST?.trim() ||
      null;
    const qaManifest = qaManifestPath
      ? (JSON.parse(await readFile(qaManifestPath, "utf8")) as {
          readonly schemaVersion: string;
          readonly extensions?: readonly {
            readonly descriptor: {
              readonly id: string;
              readonly protocolVersion: string;
              readonly capabilities: readonly string[];
            };
            readonly modulePath: string;
            readonly artifactSha256: string;
          }[];
        })
      : null;
    if (
      qaManifest &&
      (qaManifest.schemaVersion !== "role-model.track-b-qa-extension-manifest.v1" ||
        !qaManifest.extensions?.length)
    ) {
      throw new Error("invalid explicit Track B QA extension manifest");
    }
    const qaExtensions = (qaManifest?.extensions ?? []).map((extension) => ({
      ...extension,
      modulePath: path.resolve(path.dirname(qaManifestPath as string), extension.modulePath),
    }));
    const qaStartupReceipts = new Map<string, Record<string, unknown>>();
    requirePackagedTrackBManifest(packagedProfile, trackBManifestText);
    const postObservationOutbox = createTrackBPostObservationOutbox({
      filePath: path.join(
        options.runtimeStateRoot,
        options.scopeId,
        "track-b",
        "post-observation-outbox.json",
      ),
    });
    let postObservationOperations: ReturnType<typeof createTrackBOperations> | null = null;
    // `createBackend` initializes this after the packaged runtime is selected.
    // Keep that initialization boundary opaque to TypeScript's local control-flow
    // analysis: the public-only build does not inline the private operations
    // adapter, but startup still needs to retry a durable outbox when it is
    // available at runtime.
    const currentPostObservationOperations = (): ReturnType<typeof createTrackBOperations> | null =>
      postObservationOperations;
    const postObservationHandler =
      (runtime: Awaited<ReturnType<typeof createProductionExtensionRuntime>>) =>
      (observation: Parameters<typeof runTrackBPostObservation>[1]) => {
        const processingInput = {
          scope: options.scopeId,
          channel: packagedProfile?.channel ?? "development",
          authorizationEpoch: 1,
          ...(packagedReleaseId
            ? {
                expectedReleaseId: packagedReleaseId,
                run88Correlation: observation.run88Correlation as Record<string, unknown>,
              }
            : {}),
        } as const;
        const operations = postObservationOperations;
        return operations
          ? runTrackBPostObservationWithContribution(
              runtime,
              observation,
              processingInput,
              (aggregate) => operations.recordContributionAggregate(aggregate),
            )
          : runTrackBPostObservation(runtime, observation, processingInput);
      };
    const drainPostObservationOutbox = async (
      runtime: Awaited<ReturnType<typeof createProductionExtensionRuntime>>,
    ) => postObservationOutbox.drain(postObservationHandler(runtime));
    const createBackend = async (
      trackBOperationsEndpoint?: string,
      trackBOperationsToken?: string,
      runStartupSQLiteMaintenance = true,
    ) => {
      postObservationOperations = trackBOperationsEndpoint
        ? createTrackBOperations({
            statePath: path.join(
              options.runtimeStateRoot,
              options.scopeId,
              "track-b-production-bridge.json",
            ),
            catalog: [],
            runtimeChannel: packagedProfile?.channel ?? "development",
            operationsEndpoint: trackBOperationsEndpoint,
            operationsToken: trackBOperationsToken,
          })
        : null;
      const created = await createRuntimeBridgeBackend({
        fixtureRoot: resolveCliFixtureRoot(options.repoRoot, args.values["fixture-root"]),
        repoRoot: options.repoRoot,
        runtimeStateRoot: options.runtimeStateRoot,
        scopeId: options.scopeId,
        runtimeChannel: packagedProfile?.channel ?? "development",
        ...(operatorAuthToken ? { operatorAuthToken } : {}),
        ...(run88StageIdentity ? { run88StageIdentity } : {}),
        unifiedRuntimeConfigPath: options.unifiedRuntimeConfigPath,
        ...(trackBOperationsEndpoint ? { trackBOperationsEndpoint } : {}),
        ...(trackBOperationsToken ? { trackBOperationsToken } : {}),
        trackBExtensionHealth: () => {
          const runtime = extensionRuntimeRef.current;
          if (!runtime) {
            return {
              host: { extensions: [] as const },
              supervisor: {},
            };
          }
          const health = runtime.health();
          return {
            host: health.host as { readonly extensions?: readonly string[] },
            supervisor: health.supervisor,
          };
        },
        trackBExtensionRuntime: () => extensionRuntimeRef.current,
        trackBQaExtensionCatalog: () =>
          qaExtensions.map((extension) => ({
            id: extension.descriptor.id,
            name: extension.descriptor.id,
            description: "Explicit test-only packaged-runtime extension.",
            routingDependency: false,
            testOnly: true,
            protocolVersion: extension.descriptor.protocolVersion,
            capabilities: extension.descriptor.capabilities,
            ...(qaStartupReceipts.has(extension.descriptor.id)
              ? { qaStartupReceipt: qaStartupReceipts.get(extension.descriptor.id) }
              : {}),
          })),
        trackBPostObservationReceipts: () => postObservationOutbox.read(),
        readTrackBPostObservationReceipt: (requestId) => postObservationOutbox.readReceipt(requestId),
        readTrackBExtensionReadback: async (body) => {
          const requestId = String(body.requestId ?? "").trim();
          if (!requestId) throw new Error("Track B extension readback requestId is required");
          const runtime = extensionRuntimeRef.current;
          if (!runtime) throw new Error("Track B extension runtime is unavailable");
          const receipt = await postObservationOutbox.drainUntilReceipt(
            requestId,
            postObservationHandler(runtime),
          );
          if (!receipt) throw new Error(`Track B observation receipt not found: ${requestId}`);
          const result = receipt.result as Record<string, unknown>;
          const closure = result.extensionClosure as TrackBExtensionClosure | undefined;
          if (!closure)
            throw new Error(`Track B observation has no extension closure: ${requestId}`);
          return verifyTrackBExtensionClosureAfterRestart(runtime, closure, {
            channel: packagedProfile?.channel ?? "development",
            scope: options.scopeId,
            authorizationEpoch: 1,
            readDurableEvidence: async ({ durableLocator, durableOutputId }) =>
              runtime.invoke("artifact-store", {
                requestId: `${requestId}:readback:evidence:${durableOutputId}`,
                protocolVersion: "1.1.0",
                channel: packagedProfile?.channel ?? "development",
                scope: options.scopeId,
                authorizationEpoch: 1,
                capability: "artifact:read",
                payload: { durableLocator, durableOutputId },
              }),
          });
        },
        runTrackBSupervisedReplay: async (body) => {
          const requestId = typeof body.requestId === "string" ? body.requestId.trim() : "";
          const idempotencyKey =
            typeof body.idempotencyKey === "string" ? body.idempotencyKey.trim() : "";
          const candidateEndpointIds = Array.isArray(body.candidateEndpointIds)
            ? [...new Set(body.candidateEndpointIds.filter((value): value is string => typeof value === "string" && value.trim().length > 0))]
            : [];
          if (!requestId || !idempotencyKey || candidateEndpointIds.length === 0) {
            throw new Error("supervised replay requires requestId, idempotencyKey, and candidateEndpointIds");
          }
          if (candidateEndpointIds.length > 6) {
            throw new Error("supervised replay candidate count exceeds the host bound");
          }
          const budget = body.budget;
          if (
            !budget ||
            typeof budget !== "object" ||
            Array.isArray(budget) ||
            !["maxCandidates", "maxProviderCalls", "maxCostMicros", "maxBytes", "deadlineMs"].every(
              (key) => Number.isSafeInteger((budget as Record<string, unknown>)[key]) && Number((budget as Record<string, unknown>)[key]) > 0,
            )
          ) {
            throw new Error("supervised replay requires a complete positive integer budget");
          }
          if (
            Number((budget as Record<string, unknown>).maxCandidates) < candidateEndpointIds.length ||
            Number((budget as Record<string, unknown>).maxProviderCalls) < candidateEndpointIds.length
          ) {
            throw new Error("supervised replay budget cannot cover every requested candidate");
          }
          const runtime = extensionRuntimeRef.current;
          const operations = currentPostObservationOperations();
          if (!runtime || !operations) throw new Error("supervised replay runtime is not ready");
          const capture = await operations.readLocalRouteCapture({ requestId });
          if (!capture || typeof capture !== "object" || Array.isArray(capture)) {
            throw new Error(`durable route capture is unavailable for replay request ${requestId}`);
          }
          const sourceCapture = capture as Record<string, unknown>;
          const sourceReplay =
            sourceCapture.replaySource &&
            typeof sourceCapture.replaySource === "object" &&
            !Array.isArray(sourceCapture.replaySource)
              ? (sourceCapture.replaySource as Record<string, unknown>)
              : null;
          const originallyEligibleEndpointIds = sourceReplay && Array.isArray(sourceReplay.eligibleEndpointIds)
            ? [...new Set(sourceReplay.eligibleEndpointIds.filter(
                (value): value is string => typeof value === "string" && value.trim().length > 0,
              ))].sort()
            : [];
          if (originallyEligibleEndpointIds.length === 0) {
            throw new Error("supervised replay source is missing its frozen eligible endpoint snapshot");
          }
          if (candidateEndpointIds.some((endpointId) => !originallyEligibleEndpointIds.includes(endpointId))) {
            throw new Error("supervised replay candidate was not eligible in the frozen source decision");
          }
          const sourceMessages = Array.isArray(sourceCapture.messages) ? sourceCapture.messages : [];
          if (
            sourceMessages.length === 0 ||
            sourceMessages.some((message) => {
              const value = message && typeof message === "object" ? (message as Record<string, unknown>) : {};
              return value.role === "tool" || value.tool_calls !== undefined || value.toolCalls !== undefined;
            })
          ) {
            throw new Error("supervised replay currently accepts only complete tool-free source captures");
          }
          const endpoints = created.effectiveRegistry.endpoints;
          const candidatePackages = candidateEndpointIds.map((endpointId) => {
            const endpoint = endpoints.find((item) => item.identity.endpoint_id === endpointId);
            if (!endpoint) throw new Error(`supervised replay candidate is not an eligible endpoint: ${endpointId}`);
            return {
              endpointId,
              modelId: endpoint.identity.model_id,
              reasoningEffort: endpoint.identity.reasoning_effort ?? null,
              promptAdapterId: "router-host/default-v1",
              toolPolicy: "deny",
              experiencePackId: "none",
              samplingProfileId: "deterministic-v1",
            };
          });
          const evaluationCriteria = normalizeTrackBSemanticEvaluationCriteria(
            body.evaluationCriteria,
          );
          const evaluationCriteriaDigest = digestTrackBSemanticEvaluationCriteria(evaluationCriteria);
          const sourceResponse = sourceCapture.response && typeof sourceCapture.response === "object"
            ? sourceCapture.response as Record<string, unknown>
            : null;
          const sourceOutput = typeof sourceResponse?.content === "string"
            ? sourceResponse.content
            : typeof sourceCapture.outputText === "string"
              ? sourceCapture.outputText
              : null;
          const sourceEndpointId = typeof sourceCapture.endpointId === "string"
            ? sourceCapture.endpointId
            : "";
          const sourceModelId = typeof sourceCapture.modelId === "string"
            ? sourceCapture.modelId
            : "";
          if (!sourceOutput || !sourceEndpointId || !sourceModelId) {
            throw new Error("supervised replay source capture lacks independently observable output identity");
          }
          const sourceOutputSha256 = createHash("sha256").update(sourceOutput, "utf8").digest("hex");
          const counterfactualPackages = candidatePackages.filter(
            (candidate) => candidate.endpointId !== sourceEndpointId,
          );
          if (counterfactualPackages.length === 0) {
            throw new Error("supervised replay requires an eligible counterfactual distinct from the source endpoint");
          }
          const channel = packagedProfile?.channel ?? "development";
          const attestation = createReplaySourceAttestation({
            channel,
            scope: options.scopeId,
            authorizationEpoch: 1,
            capture: sourceCapture,
            eligibleEndpointIds: originallyEligibleEndpointIds,
          });
          const dispatched = new Map<
            string,
            { readonly execution: Awaited<ReturnType<typeof created.executeChatCompletions>>; readonly replayRequestId: string }
          >();
          const preparedBranches = new Map<string, { readonly branchRootRef: string; readonly branchRequestId: string }>();
          const adapter = createRouterReplayAdapter({
            channel,
            scope: options.scopeId,
            authorizationEpoch: 1,
            dispatch: async (envelope) => {
              const candidateEndpointId = String(envelope.candidateEndpointId ?? "");
              const candidate = candidatePackages.find((item) => item.endpointId === candidateEndpointId);
              if (!candidate) throw new Error("replay dispatch candidate package is not host-authorized");
              const replayRequestId = `replay-${requestId}-${createHash("sha256").update(candidateEndpointId).digest("hex").slice(0, 16)}`;
              const execution = await created.executeChatCompletions(
                {
                  model: candidate.modelId,
                  messages: structuredClone(sourceMessages) as never,
                  stream: false,
                },
                replayRequestId,
                undefined,
                { endpointId: candidateEndpointId, executionTrafficClass: "replay" },
              );
              dispatched.set(candidateEndpointId, { execution, replayRequestId });
              const observedCostUsd = execution.replayCost?.usd;
              if (typeof observedCostUsd !== "number" || !Number.isFinite(observedCostUsd) || observedCostUsd < 0) {
                throw new Error("replay provider execution did not return a bounded cost receipt");
              }
              return {
                dispatchReceiptId: `router-replay:${replayRequestId}`,
                routerDecisionId: requireReplayRouterDecisionId(execution.routingDecisionId),
                providerResultRef: `route-capture:${replayRequestId}`,
                observedCostMicros: Math.ceil(observedCostUsd * 1_000_000),
                observedResponseBytes: Buffer.byteLength(
                  JSON.stringify({
                    outputText: execution.outputText,
                    contentText: execution.contentText,
                    reasoningText: execution.reasoningText,
                    toolCalls: execution.toolCalls ?? [],
                  }),
                  "utf8",
                ),
              };
            },
          });
          const result = await runSupervisedReplay({
            runtime,
            adapter,
            requestId,
            channel,
            scope: options.scopeId,
            authorizationEpoch: 1,
            sourceAttestation: attestation,
            idempotencyKey,
            intent: "counterfactual_route",
            evaluationCriteriaDigest,
            candidatePackages,
            budget: structuredClone(budget) as Record<string, unknown>,
            leaseOwner: `runtime-host:${process.pid}`,
            leaseMs: Math.min(Number((budget as Record<string, unknown>).deadlineMs), 30_000),
            scheduler: createReplayIntentScheduler({
              runtime,
              requestId,
              channel,
              scope: options.scopeId,
              authorizationEpoch: 1,
              ownerId: `runtime-host:${process.pid}`,
            }),
            prepareBranch: async (branchRequest) => {
              const candidateEndpointId = String(branchRequest.candidateEndpointId ?? "");
              const candidate = candidatePackages.find((item) => item.endpointId === candidateEndpointId);
              if (!candidate) throw new Error("replay branch preparation candidate is not host-authorized");
              const existing = preparedBranches.get(candidateEndpointId);
              if (existing) return { branchRootRef: existing.branchRootRef };
              const branchRequestId = `replay-${requestId}-${createHash("sha256").update(candidateEndpointId).digest("hex").slice(0, 16)}-prepared`;
              const branch = (await operations.recordLocalRouteCapture({
                requestId: branchRequestId,
                routingDecisionId: String(branchRequest.sourceDecisionId),
                endpointId: candidateEndpointId,
                modelId: candidate.modelId,
                reasoningEffort: candidate.reasoningEffort,
                effortSource: "variant",
                messages: [],
                toolExecutions: [],
                branchKind: "replay",
                branchPhase: "prepared",
                branchOfRootArtifactId: sourceCapture.rootArtifactId,
              })) as Record<string, unknown>;
              if (typeof branch.rootArtifactId !== "string" || !branch.rootArtifactId) {
                throw new Error("operations boundary did not persist a prepared replay branch root");
              }
              preparedBranches.set(candidateEndpointId, { branchRootRef: branch.rootArtifactId, branchRequestId });
              return { branchRootRef: branch.rootArtifactId };
            },
            appendBranch: async (branchRequest) => {
              const candidateEndpointId = String(branchRequest.candidateEndpointId ?? "");
              const dispatch = dispatched.get(candidateEndpointId);
              if (!dispatch) throw new Error("durable replay branch append has no host dispatch receipt");
              const preparedBranchRootRef = String(branchRequest.preparedBranchRootRef ?? "");
              if (!preparedBranchRootRef) throw new Error("durable replay result append requires its prepared branch root");
              const branchRequestId = `${dispatch.replayRequestId}-branch`;
              const branch = (await operations.recordLocalRouteCapture({
                requestId: branchRequestId,
                routingDecisionId: requireReplayRouterDecisionId(dispatch.execution.routingDecisionId),
                endpointId: candidateEndpointId,
                modelId: dispatch.execution.model,
                reasoningEffort: candidatePackages.find((item) => item.endpointId === candidateEndpointId)
                  ?.reasoningEffort ?? null,
                effortSource: "variant",
                // The private sidecar hydrates sourceCapture.rootArtifactId and
                // reuses its prefix occurrences. Sending the transcript here
                // would create a copied branch and violate replay isolation.
                messages: [],
                outputText: dispatch.execution.outputText,
                providerExecutions: [
                  {
                    attemptId: `replay:${dispatch.replayRequestId}`,
                    providerId: dispatch.execution.vendorId ?? "router-replay",
                    adapterFamily: dispatch.execution.adapterFamily,
                    statusCode: 200,
                  },
                ],
                toolExecutions: [],
                branchKind: "replay",
                branchOfRootArtifactId: preparedBranchRootRef,
              })) as Record<string, unknown>;
              if (typeof branch.rootArtifactId !== "string" || !branch.rootArtifactId) {
                throw new Error("operations boundary did not return a durable replay branch root");
              }
              return { branchRootRef: branch.rootArtifactId };
            },
            handoffEvaluation: async ({ replayJobId }) => {
              const evaluationJobId = `evaluation-replay-${createHash("sha256").update(String(replayJobId)).digest("hex").slice(0, 20)}`;
              return { evaluationJobId };
            },
            completeEvaluation: async ({ evaluationJobId, replayJobId, replayJob }) => {
              const replayDispatches = replayJob && typeof replayJob === "object" &&
                !Array.isArray(replayJob) && (replayJob as Record<string, unknown>).dispatches &&
                typeof (replayJob as Record<string, unknown>).dispatches === "object"
                  ? (replayJob as Record<string, unknown>).dispatches as Record<string, unknown>
                  : {};
              const counterfactuals = await Promise.all(counterfactualPackages.map(async (candidate) => {
                const dispatchedCandidate = dispatched.get(candidate.endpointId);
                const durableDispatch = replayDispatches[candidate.endpointId] as Record<string, unknown> | undefined;
                const durableResult = durableDispatch?.result && typeof durableDispatch.result === "object"
                  ? durableDispatch.result as Record<string, unknown>
                  : null;
                const providerResultRef = typeof durableResult?.providerResultRef === "string"
                  ? durableResult.providerResultRef
                  : null;
                const recoveredRequestId = providerResultRef?.startsWith("route-capture:")
                  ? providerResultRef.slice("route-capture:".length)
                  : null;
                const recoveredCapture = !dispatchedCandidate && recoveredRequestId
                  ? await operations.readLocalRouteCapture({ requestId: recoveredRequestId }) as Record<string, unknown> | null
                  : null;
                if (recoveredCapture && (
                  recoveredCapture.scope !== options.scopeId ||
                  recoveredCapture.endpointId !== candidate.endpointId ||
                  recoveredCapture.modelId !== candidate.modelId ||
                  recoveredCapture.routingDecisionId !== durableResult?.routerDecisionId ||
                  recoveredCapture.rootArtifactId !== durableResult?.branchRootRef
                )) {
                  throw new Error("durable replay evaluation recovered capture does not match its fenced replay receipt");
                }
                const recoveredResponse = recoveredCapture?.response && typeof recoveredCapture.response === "object"
                  ? recoveredCapture.response as Record<string, unknown>
                  : null;
                const output = dispatchedCandidate?.execution.outputText ??
                  (typeof recoveredResponse?.content === "string" ? recoveredResponse.content : null) ??
                  (typeof recoveredCapture?.outputText === "string" ? recoveredCapture.outputText : null);
                if (typeof output !== "string" || !output) {
                  throw new Error("durable replay evaluation is missing counterfactual output evidence");
                }
                return {
                  candidate,
                  replayRequestId: dispatchedCandidate?.replayRequestId ?? recoveredRequestId,
                  output,
                  outputSha256: createHash("sha256").update(output, "utf8").digest("hex"),
                };
              }));
              if (counterfactuals.some(({ replayRequestId }) => !replayRequestId)) {
                throw new Error("durable replay evaluation cannot recover counterfactual request provenance");
              }
              const sourceRootArtifactId = typeof sourceCapture.rootArtifactId === "string"
                ? sourceCapture.rootArtifactId
                : "";
              const sourceDecisionId = typeof sourceCapture.routingDecisionId === "string"
                ? sourceCapture.routingDecisionId
                : "";
              if (!sourceRootArtifactId || !sourceDecisionId || typeof evaluationJobId !== "string" || !evaluationJobId) {
                throw new Error("durable replay evaluation is missing source or evaluation provenance");
              }
              const evaluated = await runTrackBShadowPipeline(runtime, {
                requestId: `${requestId}:supervised-replay`,
                channel,
                scope: options.scopeId,
                authorizationEpoch: 1,
                productionState: {},
                routePackage: sourceEndpointId,
                sourceDecisionId,
                sourceGraphRef: sourceRootArtifactId,
                prefix: [],
                counterfactuals: counterfactuals.map(({ candidate }) => ({ id: candidate.endpointId, suffix: [] })),
                comparableEvidence: {
                  source: {
                    rolloutId: `source:${requestId}`,
                    routePackage: sourceEndpointId,
                    endpointId: sourceEndpointId,
                    modelId: sourceModelId,
                    policyId: "run96-supervised-replay",
                    reasoningEffort: sourceCapture.reasoningEffort ?? null,
                    effortSource: sourceCapture.effortSource ?? "none",
                    evidenceRef: sourceRootArtifactId,
                    artifactRef: sourceRootArtifactId,
                    evaluationActual: sourceOutput,
                    propensity: 1,
                    outcome: { outcomeId: `outcome:source:${requestId}`, outcomeRef: sourceRootArtifactId, outcomeDigest: `sha256:${sourceOutputSha256}`, source: "observed", status: "success" },
                  },
                  counterfactuals: counterfactuals.map(({ candidate, replayRequestId, output, outputSha256 }) => ({
                    rolloutId: `counterfactual:${replayRequestId}`,
                    routePackage: candidate.endpointId,
                    endpointId: candidate.endpointId,
                    modelId: candidate.modelId,
                    policyId: "run96-supervised-replay",
                    reasoningEffort: candidate.reasoningEffort,
                    effortSource: "variant",
                    evidenceRef: `route-capture:${replayRequestId}-branch`,
                    artifactRef: `route-capture:${replayRequestId}-branch`,
                    evaluationActual: output,
                    propensity: 1,
                    outcome: { outcomeId: `outcome:${replayRequestId}`, outcomeRef: `route-capture:${replayRequestId}-branch`, outcomeDigest: `sha256:${outputSha256}`, source: "replay", status: "success" },
                  })),
                  candidateSet: [
                    { routePackage: sourceEndpointId, endpointId: sourceEndpointId, propensity: 1 },
                    ...counterfactuals.map(({ candidate }) => ({ routePackage: candidate.endpointId, endpointId: candidate.endpointId, propensity: 1 })),
                  ],
                },
                evaluationCases: Array.from({ length: 1 + counterfactuals.length }, (_, index) => ({
                  id: `replay:${String(replayJobId)}:${index}`,
                  evaluationCriteria,
                })),
                trajectoryEvents: [],
                evaluationJobIds: [
                  evaluationJobId,
                  ...counterfactuals.map(({ candidate }) => `${evaluationJobId}:${createHash("sha256").update(candidate.endpointId).digest("hex").slice(0, 12)}`),
                ],
                identity: {
                  endpointId: sourceEndpointId,
                  modelId: sourceModelId,
                  reasoningEffort: typeof sourceCapture.reasoningEffort === "string" ? sourceCapture.reasoningEffort : null,
                  effortSource: typeof sourceCapture.effortSource === "string" ? sourceCapture.effortSource as "none" | "client" | "variant" | "variant_coerced" : "none",
                },
              });
              const comparison = evaluated.evaluation as Record<string, unknown>;
              const outcome = comparison.outcome;
              const comparisonGroupId = comparison.groupId;
              if (typeof comparisonGroupId !== "string" || !comparisonGroupId || !["candidate", "source", "tie", "rejected", "incomplete", "insufficient", "disagreement"].includes(String(outcome))) {
                throw new Error("durable replay evaluation did not finalize a valid comparison");
              }
              return {
                evaluationJobId,
                comparisonGroupId,
                outcome,
                comparisonDigest: `sha256:${createHash("sha256").update(JSON.stringify(comparison)).digest("hex")}`,
              };
            },
          });
          return {
            schemaVersion: "role-model.supervised-replay-command-receipt.v1",
            requestId,
            replayJobId: result.jobId,
            state: result.state,
            evaluationJobId: result.evaluationJobId,
          };
        },
        ...(trackBManifestText
          ? {
              trackBPostObservation: async (observation: Readonly<Record<string, unknown>>) => {
                const run88PiInvocationProvenance = loadRun88PiInvocationProvenance?.() ?? null;
                const correlatedObservation = run88StageIdentity
                  ? createRun88StagePostObservation({
                      observation,
                      piInvocationProvenance: run88PiInvocationProvenance,
                      proofRequired: Boolean(
                        process.env.RUN88_PI_INVOCATION_PROOF_PATH ||
                          process.env.RUN88_PI_PROOF_AUTHORITY_PUBLIC_KEY_PATH,
                      ),
                      releaseId: run88StageIdentity.releaseId,
                      sourceId: run88StageIdentity.sourceId,
                      executableSha256: run88StageIdentity.executableSha256,
                      scope: options.scopeId,
                    })
                  : observation;
                await postObservationOutbox.enqueue(correlatedObservation);
                const runtime = extensionRuntimeRef.current;
                if (!runtime) return { status: "queued_for_extension_runtime" };
                await drainPostObservationOutbox(runtime);
                return { status: "processed" };
              },
            }
          : {}),
      });
      if (trackBOperationsEndpoint && trackBOperationsToken && runStartupSQLiteMaintenance) {
        const response = await fetch(`${trackBOperationsEndpoint}/sqlite-maintenance`, {
          method: "POST",
          headers: {
            authorization: `Bearer ${trackBOperationsToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            nowMs: Date.now(),
            maxDeleteRows: 256,
            idle: true,
            lockRisk: "low",
          }),
        });
        if (!response.ok) {
          throw new Error(`Track B startup SQLite maintenance failed with ${response.status}`);
        }
      }
      return created;
    };
    if (trackBManifestText && trackBManifestPath) {
      const manifest = JSON.parse(trackBManifestText) as {
        readonly schemaVersion: string;
        readonly sidecar: { readonly modulePath: string; readonly artifactSha256: string };
        readonly publicRuntimeAdapter?: {
          readonly modulePath: string;
          readonly artifactSha256: string;
          readonly routerRoot: string;
        };
        readonly extensions: readonly {
          readonly descriptor: {
            readonly id: string;
            readonly protocolVersion: string;
            readonly capabilities: readonly string[];
          };
          readonly modulePath: string;
          readonly artifactSha256: string;
        }[];
      };
      if (
        manifest.schemaVersion !== "role-model.track-b-runtime-distribution.v1" &&
        manifest.schemaVersion !== "role-model.track-b-runtime-distribution.v2"
      ) {
        throw new Error("unsupported packaged Track B distribution");
      }
      if (
        manifest.schemaVersion === "role-model.track-b-runtime-distribution.v2" &&
        !manifest.publicRuntimeAdapter
      ) {
        throw new Error("v2 Track B distribution is missing its public runtime adapter");
      }
      const distributionRoot = path.dirname(trackBManifestPath);
      if (packagedReleaseId) {
        validateRun88PrivateDistributionIdentity(
          {
            generation:
              manifest.schemaVersion === "role-model.track-b-runtime-distribution.v2" ? "N" : "N-1",
            manifestSha256: createHash("sha256").update(trackBManifestText).digest("hex"),
            channel: packagedProfile?.channel ?? "development",
          },
          {
            channel: "stage",
            manifestSha256: String(packagedManifestRecord?.private_distribution_sha256 ?? ""),
            publicGeneration: "N",
          },
        );
      }
      const trackBStateRoot = path.join(options.runtimeStateRoot, options.scopeId, "track-b");
      const runtimeChannel = packagedProfile?.channel ?? "development";
      const destinationTrustMaterialFile =
        args.values["destination-material-file"] ??
        args.values["destination-trust-material-file"] ??
        process.env.ROLE_MODEL_DESTINATION_AUTH_SECRET_FILE;
      const aggregateEndpoint =
        args.values["aggregate-ingestion-url"] ??
        process.env.ROLE_MODEL_AGGREGATE_INGESTION_URL ??
        (runtimeChannel === "stage" && destinationTrustMaterialFile
          ? "https://ingest-stage.role-model.dev/contribution/aggregate"
          : undefined);
      const aggregateScope =
        args.values["aggregate-scope"] ??
        process.env.ROLE_MODEL_AGGREGATE_SCOPE ??
        (runtimeChannel === "stage" && destinationTrustMaterialFile
          ? "standalone-runtime-stage"
          : undefined);
      const developmentVerificationLeaseFile =
        args.values["development-verification-lease-file"] ??
        process.env.ROLE_MODEL_DEVELOPMENT_VERIFICATION_LEASE_FILE;
      const developmentVerificationTrustKeyFile =
        args.values["development-verification-trust-key-file"] ??
        process.env.ROLE_MODEL_DEVELOPMENT_VERIFICATION_TRUST_KEY_FILE;
      const developmentVerificationDeploymentIds = (
        args.values["development-verification-deployment-ids"] ??
        process.env.ROLE_MODEL_DEVELOPMENT_VERIFICATION_DEPLOYMENT_IDS ??
        ""
      )
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      const developmentVerificationRevocationEpochRaw =
        args.values["development-verification-revocation-epoch"] ??
        process.env.ROLE_MODEL_DEVELOPMENT_VERIFICATION_REVOCATION_EPOCH;
      const developmentVerificationRevocationEpoch =
        developmentVerificationRevocationEpochRaw === undefined
          ? undefined
          : Number(developmentVerificationRevocationEpochRaw);
      const hasDevelopmentVerificationInput = Boolean(
        developmentVerificationLeaseFile ||
          developmentVerificationTrustKeyFile ||
          developmentVerificationDeploymentIds.length > 0 ||
          developmentVerificationRevocationEpochRaw !== undefined,
      );
      if (runtimeChannel !== "development" && hasDevelopmentVerificationInput) {
        throw new Error("development verification capability is valid only for development runtimes");
      }
      if (hasDevelopmentVerificationInput) {
        const requiredDevelopmentVerificationRevocationEpoch = developmentVerificationRevocationEpoch;
        if (
          typeof requiredDevelopmentVerificationRevocationEpoch !== "number" ||
          !Number.isSafeInteger(requiredDevelopmentVerificationRevocationEpoch) ||
          requiredDevelopmentVerificationRevocationEpoch < 0
        ) {
          throw new Error("development verification upload requires a non-negative current revocation epoch");
        }
        if (
          !developmentVerificationLeaseFile ||
          !developmentVerificationTrustKeyFile ||
          developmentVerificationDeploymentIds.length === 0 ||
          !aggregateEndpoint ||
          !aggregateScope
        ) {
          throw new Error(
            "development verification upload requires lease, trust key, deployment IDs, a non-negative current revocation epoch, aggregate endpoint, and aggregate scope",
          );
        }
        const authorization = JSON.parse(
          readFileSync(developmentVerificationLeaseFile, "utf8"),
        ) as DevelopmentVerificationAuthorization;
        const trustMaterial = parseDevelopmentVerificationTrustMaterial(
          readFileSync(developmentVerificationTrustKeyFile, "utf8"),
        );
        negotiateDevelopmentVerificationCapability({
          runtimeChannel,
          sourceScopeId: aggregateScope,
          authorization,
          trustedPublicKey: createPublicKey(trustMaterial.publicKey),
          expectedKeyId: trustMaterial.keyId,
          requiredRevocationEpoch: requiredDevelopmentVerificationRevocationEpoch,
          destinationDeploymentIds: developmentVerificationDeploymentIds,
        });
      }
      const artifactKeyFiles = await resolveManagedArtifactKeyFiles({
        channel: runtimeChannel,
        stateRoot: trackBStateRoot,
        artifactDigestKeyFile:
          args.values["artifact-digest-key-file"] ??
          process.env.ROLE_MODEL_ARTIFACT_DIGEST_KEY_FILE,
        artifactEncryptionKeyFile:
          args.values["artifact-encryption-key-file"] ??
          process.env.ROLE_MODEL_ARTIFACT_ENCRYPTION_KEY_FILE,
      });
      // Start extension-host registration in parallel with sidecar/backend bring-up, but
      // mark core APIs ready as soon as the packaged backend exists. Waiting on all
      // packaged extensions previously kept /api/role-model/* at 503 runtime_initializing.
      const extensionRuntimePromise = createProductionExtensionRuntime({
        stateRoot: path.join(trackBStateRoot, "extensions"),
        authorizationEpoch: 1,
        repoRoot: options.repoRoot,
        extensions: manifest.extensions.map((extension) => ({
          ...extension,
          modulePath: path.resolve(distributionRoot, extension.modulePath),
        })),
        qaExtensions,
      });
      packagedRuntime = await createPackagedProductionRuntime({
        stateRoot: trackBStateRoot,
        sidecar: createOwnedTrackBSidecarSpec({
          artifactPath: path.resolve(distributionRoot, manifest.sidecar.modulePath),
          artifactSha256: manifest.sidecar.artifactSha256,
          stateRoot: trackBStateRoot,
          channel: runtimeChannel,
          artifactDigestKeyFile: artifactKeyFiles.artifactDigestKeyFile,
          artifactEncryptionKeyFile: artifactKeyFiles.artifactEncryptionKeyFile,
          trustMaterialFile: destinationTrustMaterialFile,
          aggregateEndpoint,
          aggregateScope,
          developmentVerificationLeaseFile,
          developmentVerificationTrustKeyFile,
          developmentVerificationDeploymentIds,
          developmentVerificationRevocationEpoch,
          ...(aggregateCorrelationReleaseId && aggregateCorrelationCohortId
            ? {
                aggregateCorrelationReleaseId,
                aggregateCorrelationCohortId,
                aggregateCorrelationOperationId: "aggregate.upload",
              }
            : {}),
          ...(manifest.publicRuntimeAdapter
            ? {
                sqliteDatabasePath: path.join(
                  options.runtimeStateRoot,
                  options.scopeId,
                  "memory",
                  "memory.sqlite",
                ),
                publicRuntimeAdapterPath: path.resolve(
                  distributionRoot,
                  manifest.publicRuntimeAdapter.modulePath,
                ),
                publicRouterRoot: path.resolve(
                  distributionRoot,
                  manifest.publicRuntimeAdapter.routerRoot,
                ),
                migrationScope: options.scopeId,
              }
            : {}),
        }),
        createBackend: ({ trackBOperationsEndpoint, trackBOperationsToken }) =>
          createBackend(
            trackBOperationsEndpoint,
            trackBOperationsToken,
            trackBDistributionRequiresSQLiteMaintenance(manifest),
          ),
      });
      backend = packagedRuntime.backend;
      bootstrapState.status = "ready";
      delete bootstrapState.message;
      try {
        extensionRuntime = await extensionRuntimePromise;
        extensionRuntimeRef.current = extensionRuntime;
        for (const extension of qaExtensions) {
          const capability = extension.descriptor.capabilities.find(
            (candidate) => candidate !== "health:probe",
          );
          if (!capability)
            throw new Error(`QA extension has no business capability: ${extension.descriptor.id}`);
          const requestId = `run87:packaged-qa:${extension.descriptor.id}`;
          const receipt = await extensionRuntime.invoke(extension.descriptor.id, {
            requestId,
            protocolVersion: extension.descriptor.protocolVersion,
            channel: packagedProfile?.channel ?? "development",
            scope: options.scopeId,
            authorizationEpoch: 1,
            capability,
            payload: { packagedQa: true },
          });
          qaStartupReceipts.set(extension.descriptor.id, { ...receipt, requestId });
        }
        await drainPostObservationOutbox(extensionRuntime);
        // A prior cloud outage must not require an unrelated new provider request
        // before its already-authorized, durable aggregate is retried.
        await currentPostObservationOperations()?.retryContributionAggregates();
      } catch (error) {
        console.error("[role-model] extension host failed after core runtime was ready:", error);
      }
    } else {
      backend = await createBackend();
      bootstrapState.status = "ready";
      delete bootstrapState.message;
    }
  } catch (error) {
    if (bootstrapState.status !== "ready") {
      bootstrapState.status = "failed";
      bootstrapState.message =
        error instanceof Error ? error.message : "runtime backend initialization failed";
    }
    console.error("runtime backend initialization failed", error);
  }
}
