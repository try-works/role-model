import path from "node:path";
import { fileURLToPath } from "node:url";
// Production runtime start — no QA mocks, no placeholders
import { createRuntimeBridgeBackend, startBridgeServer } from "../src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");
const port = Number(process.env.PORT ?? "3456");
const stateRoot = process.env.STATE_ROOT ?? `${process.env.TEMP ?? "/tmp"}/role-model-runtime`;
const scopeId = "runtime";

const fixtureRoot = path.join(repoRoot, "testdata", "router-runtime", "fixtures");

// Ensure fixture directory exists with minimal required files
import { mkdir, writeFile } from "node:fs/promises";
await mkdir(fixtureRoot, { recursive: true });
try {
  await writeFile(path.join(fixtureRoot, "provider-accounts.json"), "[]", { flag: "wx" });
} catch {}
try {
  await writeFile(
    path.join(fixtureRoot, "unified-runtime-config.fixture.yaml"),
    'version: "1.1"\n',
    { flag: "wx" },
  );
} catch {}

const backend = await createRuntimeBridgeBackend({
  repoRoot,
  runtimeStateRoot: stateRoot,
  scopeId,
  fixtureRoot,
  unifiedRuntimeConfigPath: path.join(stateRoot, "runtime-config.yaml"),
  runtimeVendorStartup: "disabled",
});

const server = await startBridgeServer({
  host: "127.0.0.1",
  port,
  staticRoot: path.join(repoRoot, "role-model-router", "apps", "runtime-ui", "build", "client"),
  registry: backend.effectiveRegistry,
  getRegistry: () => backend.effectiveRegistry,
  executeChatCompletions: backend.executeChatCompletions,
  executeResponses: backend.executeResponses,
  readVersionInfo: async () => ({ version: "0.0.0", build: "dev" }),
  listActivityMetrics: backend.listActivityMetrics,
  readActivityCapture: backend.readActivityCapture,
  readLogs: async () => "No logs available.",
  readRuntimeSummary: backend.readRuntimeSummary,
  readHealthStatus: backend.readHealthStatus,
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
  activateEndpoint: backend.activateEndpoint,
  readControllerAssignment: backend.readControllerAssignment,
  updateControllerAssignment: backend.updateControllerAssignment,
  readRouterSummary: backend.readRouterSummary,
  readRouterConfig: backend.readRouterConfig,
  listRouterCandidates: backend.listRouterCandidates,
  listRouterDecisions: backend.listRouterDecisions,
  readRouterDecision: backend.readRouterDecision,
  listEndpoints: backend.listEndpoints,
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
  getRoutableInventory: backend.getRoutableInventory,
});

console.log(`Runtime running at http://127.0.0.1:${port}`);
console.log("Press Ctrl+C to stop");

process.on("SIGINT", () => server.close(() => process.exit(0)));
process.on("SIGTERM", () => server.close(() => process.exit(0)));
