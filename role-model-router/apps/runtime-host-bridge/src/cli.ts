import { spawn } from "node:child_process";
import path from "node:path";
import { parseArgs } from "node:util";

import {
  type RuntimeBridgeBackend,
  type StartBridgeServerOptions,
  createRuntimeBridgeBackend,
  resolveBridgeServerOptions,
  startBridgeServer,
} from "./index.js";

type CliBackend = Pick<
  RuntimeBridgeBackend,
  | "registry"
  | "executeChatCompletions"
  | "executeResponses"
  | "readVersionInfo"
  | "readRuntimeSummary"
  | "readRuntimeConfig"
  | "updateRuntimeConfig"
  | "readHealthStatus"
  | "readTelemetrySummary"
  | "listTelemetryComparisonRows"
  | "listTelemetryRequests"
  | "subscribeTelemetry"
  | "listProviders"
  | "listModels"
  | "listRoles"
  | "listAccounts"
  | "listProviderDeviceAuthorizations"
  | "upsertProviderAccount"
  | "startProviderDeviceAuthorization"
  | "pollProviderDeviceAuthorization"
  | "activateEndpoint"
  | "readControllerAssignment"
  | "updateControllerAssignment"
  | "readRouterSummary"
  | "readRouterConfig"
  | "listRouterCandidates"
  | "listRouterDecisions"
  | "readRouterDecision"
  | "listEndpoints"
  | "listRecentRequestObservations"
  | "readRequestObservation"
  | "readEndpointProfile"
  | "listLocalModels"
  | "loadLocalModel"
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
  | "readModelOverrides"
  | "updateModelOverrides"
  | "readPeers"
  | "updatePeers"
  | "checkPeerHealth"
  | "shutdown"
>;

export function resolveCliFixtureRoot(repoRoot: string, fixtureRoot?: string): string {
  return fixtureRoot?.trim() || path.join(repoRoot, "testdata", "router-runtime");
}

export function createCliServerOptions(
  options: {
    host: string;
    port: number;
    staticRoot?: string;
  },
  backend: CliBackend,
): StartBridgeServerOptions {
  return {
    host: options.host,
    port: options.port,
    staticRoot: options.staticRoot,
    registry: backend.registry,
    getRegistry: () => backend.registry,
    executeChatCompletions: backend.executeChatCompletions,
    executeResponses: backend.executeResponses,
    readVersionInfo: backend.readVersionInfo,
    listActivityMetrics: async () => [],
    readLogs: async () => (await backend.getLocalLogs()).logs,
    readRuntimeSummary: backend.readRuntimeSummary,
    readRuntimeConfig: backend.readRuntimeConfig,
    updateRuntimeConfig: backend.updateRuntimeConfig,
    readHealthStatus: backend.readHealthStatus,
    readTelemetrySummary: backend.readTelemetrySummary,
    listTelemetryComparisonRows: backend.listTelemetryComparisonRows,
    listTelemetryRequests: backend.listTelemetryRequests,
    subscribeTelemetry: backend.subscribeTelemetry,
    listProviders: backend.listProviders,
    listModels: backend.listModels,
    listRoles: backend.listRoles,
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
    listLocalModels: backend.listLocalModels,
    loadLocalModel: backend.loadLocalModel,
    unloadLocalModel: backend.unloadLocalModel,
    readLocalPolicy: backend.readLocalPolicy,
    updateLocalPolicy: backend.updateLocalPolicy,
    readRolePolicy: backend.readRolePolicy,
    createRolePolicyRole: backend.createRolePolicyRole,
    updateRolePolicyRole: backend.updateRolePolicyRole,
    listTaskDefinitions: backend.listTaskDefinitions,
    updateTaskDefinitions: backend.updateTaskDefinitions,
    listSwapHistory: backend.listSwapHistory,
    getLocalLogs: backend.getLocalLogs,
    readModelOverrides: backend.readModelOverrides,
    updateModelOverrides: backend.updateModelOverrides,
    readPeers: backend.readPeers,
    updatePeers: backend.updatePeers,
    checkPeerHealth: backend.checkPeerHealth,
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
    },
  });

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
  const backend = await createRuntimeBridgeBackend({
    fixtureRoot: resolveCliFixtureRoot(options.repoRoot, args.values["fixture-root"]),
    repoRoot: options.repoRoot,
    runtimeStateRoot: options.runtimeStateRoot,
    scopeId: options.scopeId,
    unifiedRuntimeConfigPath: options.unifiedRuntimeConfigPath,
  });
  const server = await startBridgeServer(
    createCliServerOptions(
      {
        host: options.host,
        port: options.port,
        staticRoot: options.staticRoot,
      },
      backend,
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

  const shutdown = async (): Promise<void> => {
    await server.close();
    await backend.shutdown();
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown();
  });
  process.on("SIGTERM", () => {
    void shutdown();
  });
}
