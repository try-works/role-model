import { readFile } from "node:fs/promises";
import path from "node:path";
import { createRuntimeBridgeBackend, startBridgeServer } from "../src/index.js";
import {
  createOwnedTrackBSidecarSpec,
  createPackagedProductionRuntime,
  createProductionExtensionRuntime,
  createTrackBBridgeServerOptions,
} from "../src/track-b-runtime.js";

const repoRoot = "D:/DEV/role-model";
const runtimeStateRoot = "C:/Users/erikb/AppData/Local/Role Model Runtime/state";
const scopeId = "runtime-host-bridge";

const sidecarArtifactPath = process.env.ROLE_MODEL_TRACK_B_SIDECAR_PATH?.trim();
const sidecarArtifactSha256 = process.env.ROLE_MODEL_TRACK_B_SIDECAR_SHA256?.trim();
const extensionManifestPath = process.env.ROLE_MODEL_TRACK_B_RUNTIME_MANIFEST?.trim();
if (!sidecarArtifactPath || !sidecarArtifactSha256 || !extensionManifestPath) {
  throw new Error("packaged Track B sidecar and extension manifest are required");
}
const extensionManifest = JSON.parse(await readFile(extensionManifestPath, "utf8")) as {
  readonly schemaVersion: string;
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
if (extensionManifest.schemaVersion !== "role-model.track-b-runtime-distribution.v1") {
  throw new Error("unsupported Track B runtime distribution manifest");
}
const extensionRuntime = await createProductionExtensionRuntime({
  stateRoot: path.join(runtimeStateRoot, scopeId, "extensions"),
  authorizationEpoch: 1,
  extensions: extensionManifest.extensions.map((extension) => ({
    ...extension,
    modulePath: path.resolve(path.dirname(extensionManifestPath), extension.modulePath),
  })),
});
const composed = await createPackagedProductionRuntime({
  stateRoot: path.join(runtimeStateRoot, scopeId, "track-b"),
  sidecar: createOwnedTrackBSidecarSpec({
    artifactPath: path.resolve(sidecarArtifactPath),
    artifactSha256: sidecarArtifactSha256,
    stateRoot: path.join(runtimeStateRoot, scopeId, "track-b"),
  }),
  createBackend: ({ trackBOperationsEndpoint }) =>
    createRuntimeBridgeBackend({
      repoRoot,
      runtimeStateRoot,
      scopeId,
      runtimeVendorStartup: "enabled",
      unifiedRuntimeConfigPath: `${runtimeStateRoot}/${scopeId}/runtime-config.yaml`,
      trackBOperationsEndpoint,
    }),
});
const backend = composed.backend;

const server = await startBridgeServer({
  host: "127.0.0.1",
  port: 3456,
  staticRoot: path.join(repoRoot, "role-model-router", "apps", "runtime-ui", "build", "client"),
  registry: backend.registry,
  getRegistry: () => backend.registry,
  executeChatCompletions: backend.executeChatCompletions,
  executeResponses: backend.executeResponses,
  readHealthStatus: backend.readHealthStatus,
  getRoutableInventory: backend.getRoutableInventory,
  readVersionInfo: backend.readVersionInfo,
  readLogs: async () => (await backend.getLocalLogs()).logs,
  listActivityMetrics: backend.listActivityMetrics,
  readActivityCapture: backend.readActivityCapture,
  readRuntimeSummary: backend.readRuntimeSummary,
  readRuntimeConfig: backend.readRuntimeConfig,
  updateRuntimeConfig: backend.updateRuntimeConfig,
  readTelemetrySummary: backend.readTelemetrySummary,
  listTelemetryComparisonRows: backend.listTelemetryComparisonRows,
  listTelemetryRequests: backend.listTelemetryRequests,
  queryTelemetryAnalytics: backend.queryTelemetryAnalytics,
  subscribeTelemetry: backend.subscribeTelemetry,
  listProviders: backend.listProviders,
  listRoles: backend.listRoles,
  listModels: backend.listModels,
  ...createTrackBBridgeServerOptions(backend),
  readRolePolicy: backend.readRolePolicy,
  createRolePolicyRole: backend.createRolePolicyRole,
  updateRolePolicyRole: backend.updateRolePolicyRole,
  listTaskDefinitions: backend.listTaskDefinitions,
  updateTaskDefinitions: backend.updateTaskDefinitions,
  listAccounts: backend.listAccounts,
  listProviderDeviceAuthorizations: backend.listProviderDeviceAuthorizations,
  upsertProviderAccount: backend.upsertProviderAccount,
  startProviderDeviceAuthorization: backend.startProviderDeviceAuthorization,
  pollProviderDeviceAuthorization: backend.pollProviderDeviceAuthorization,
  removeProviderAccountModel: backend.removeProviderAccountModel,
  activateEndpoint: backend.activateEndpoint,
  readControllerAssignment: backend.readControllerAssignment,
  updateControllerAssignment: backend.updateControllerAssignment,
  readRouterSummary: backend.readRouterSummary,
  readRouterConfig: backend.readRouterConfig,
  listRouterCandidates: backend.listRouterCandidates,
  listRouterDecisions: backend.listRouterDecisions,
  readRouterDecision: backend.readRouterDecision,
  listEndpoints: backend.listEndpoints,
  listRecentRequestIds: backend.listRecentRequestIds,
  listRecentRequestObservations: backend.listRecentRequestObservations,
  readRequestObservation: backend.readRequestObservation,
  readEndpointProfile: backend.readEndpointProfile,
  readBenchmarkSuite: backend.readBenchmarkSuite,
  runBenchmark: backend.runBenchmark,
  readBenchmarkRun: backend.readBenchmarkRun,
  readActiveBenchmarkRun: backend.readActiveBenchmarkRun,
  clearBenchmarkEndpointData: backend.clearBenchmarkEndpointData,
  clearBenchmarkData: backend.clearBenchmarkData,
  readBenchmarkSummary: backend.readBenchmarkSummary,
  listBenchmarkRuns: backend.listBenchmarkRuns,
  readBenchmarkSummariesByMode: backend.readBenchmarkSummariesByMode,
  readBenchmarkPreferences: backend.readBenchmarkPreferences,
  updateBenchmarkPreferences: backend.updateBenchmarkPreferences,
  listLocalModels: backend.listLocalModels,
  listPeerLocalModels: backend.listPeerLocalModels,
  listLlamaSwapLocalModels: backend.listLlamaSwapLocalModels,
  loadLocalModel: backend.loadLocalModel,
  loadPeerModel: backend.loadPeerModel,
  loadLlamaSwapModel: backend.loadLlamaSwapModel,
  setPeerModelRoles: backend.setPeerModelRoles,
  setLlamaSwapModelRoles: backend.setLlamaSwapModelRoles,
  unloadPeerModel: backend.unloadPeerModel,
  unloadLocalModel: backend.unloadLocalModel,
  readLocalPolicy: backend.readLocalPolicy,
  updateLocalPolicy: backend.updateLocalPolicy,
  listSwapHistory: backend.listSwapHistory,
  getLocalLogs: backend.getLocalLogs,
  readModelOverrides: backend.readModelOverrides,
  updateModelOverrides: backend.updateModelOverrides,
  readPeers: backend.readPeers,
  updatePeers: backend.updatePeers,
  checkPeerHealth: backend.checkPeerHealth,
});

console.log(`Production runtime on http://127.0.0.1:${server.port}`);
process.on("SIGINT", async () => {
  await server.close();
  await composed.close();
  await extensionRuntime.close();
  process.exit(0);
});
