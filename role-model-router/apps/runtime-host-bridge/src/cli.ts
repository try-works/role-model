import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
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
import { type RuntimeChannelProfile, readPackagedRuntimeProfile } from "./runtime-channel.js";
import { migrateLegacyProductionState } from "./runtime-state-migration.js";
import { resolveRun88StageRuntimeIdentity } from "./runtime-version.js";
import {
  type TrackBExtensionClosure,
  createOwnedTrackBSidecarSpec,
  createPackagedProductionRuntime,
  createProductionExtensionRuntime,
  createRun88RuntimeCorrelation,
  createTrackBPostObservationOutbox,
  resolveManagedArtifactKeyFiles,
  runTrackBPostObservation,
  trackBDistributionRequiresSQLiteMaintenance,
  validateRun88ProviderResponseObservation,
  verifyTrackBExtensionClosureAfterRestart,
} from "./track-b-runtime.js";

type CliBackend = Pick<
  RuntimeBridgeBackend,
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
  const serviceUrl = readLauncherString(values, "recommendation-service-url");
  const channel = readLauncherString(values, "recommendation-channel");
  const verificationKey = readLauncherString(values, "recommendation-verification-key");
  const serviceToken = readLauncherString(values, "recommendation-service-token");
  const materialFile = readLauncherString(values, "recommendation-material-file");
  const aggregateScope = readLauncherString(values, "aggregate-scope");

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
    const drainPostObservationOutbox = async (
      runtime: Awaited<ReturnType<typeof createProductionExtensionRuntime>>,
    ) =>
      postObservationOutbox.drain((observation) =>
        runTrackBPostObservation(runtime, observation, {
          scope: options.scopeId,
          channel: packagedProfile?.channel ?? "development",
          authorizationEpoch: 1,
          ...(packagedReleaseId
            ? {
                expectedReleaseId: packagedReleaseId,
                run88Correlation: observation.run88Correlation as Record<string, unknown>,
              }
            : {}),
        }),
      );
    const createBackend = async (
      trackBOperationsEndpoint?: string,
      trackBOperationsToken?: string,
      runStartupSQLiteMaintenance = true,
    ) => {
      const created = await createRuntimeBridgeBackend({
        fixtureRoot: resolveCliFixtureRoot(options.repoRoot, args.values["fixture-root"]),
        repoRoot: options.repoRoot,
        runtimeStateRoot: options.runtimeStateRoot,
        scopeId: options.scopeId,
        runtimeChannel: packagedProfile?.channel ?? "development",
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
        readTrackBExtensionReadback: async (body) => {
          const requestId = String(body.requestId ?? "").trim();
          if (!requestId) throw new Error("Track B extension readback requestId is required");
          const receipt = await postObservationOutbox.readReceipt(requestId);
          if (!receipt) throw new Error(`Track B observation receipt not found: ${requestId}`);
          const result = receipt.result as Record<string, unknown>;
          const closure = result.extensionClosure as TrackBExtensionClosure | undefined;
          if (!closure)
            throw new Error(`Track B observation has no extension closure: ${requestId}`);
          const runtime = extensionRuntimeRef.current;
          if (!runtime) throw new Error("Track B extension runtime is unavailable");
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
          trustMaterialFile:
            args.values["destination-material-file"] ??
            args.values["destination-trust-material-file"] ??
            process.env.ROLE_MODEL_DESTINATION_AUTH_SECRET_FILE,
          aggregateEndpoint:
            args.values["aggregate-ingestion-url"] ??
            process.env.ROLE_MODEL_AGGREGATE_INGESTION_URL,
          aggregateScope: args.values["aggregate-scope"] ?? process.env.ROLE_MODEL_AGGREGATE_SCOPE,
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
