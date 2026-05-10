import path from "node:path";
import { parseArgs } from "node:util";

import {
  createRuntimeBridgeBackend,
  resolveBridgeServerOptions,
  startBridgeServer,
} from "./index.js";

async function main(): Promise<void> {
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
    },
  });

  const options = resolveBridgeServerOptions({
    host: args.values.host,
    port: args.values.port,
    repoRoot: args.values["repo-root"],
    runtimeStateRoot: args.values["runtime-state-root"],
    scopeId: args.values["scope-id"],
    unifiedRuntimeConfigPath: args.values["unified-runtime-config"],
  });
  const backend = await createRuntimeBridgeBackend({
    fixtureRoot:
      args.values["fixture-root"] ?? path.join(options.repoRoot, "testdata", "router-runtime"),
    repoRoot: options.repoRoot,
    runtimeStateRoot: options.runtimeStateRoot,
    scopeId: options.scopeId,
    unifiedRuntimeConfigPath: options.unifiedRuntimeConfigPath,
  });
  const server = await startBridgeServer({
    host: options.host,
    port: options.port,
    registry: backend.registry,
    getRegistry: () => backend.registry,
    executeChatCompletions: backend.executeChatCompletions,
    executeResponses: backend.executeResponses,
    readRuntimeSummary: backend.readRuntimeSummary,
    readRuntimeConfig: backend.readRuntimeConfig,
    updateRuntimeConfig: backend.updateRuntimeConfig,
    readHealthStatus: backend.readHealthStatus,
    readTelemetrySummary: backend.readTelemetrySummary,
    listTelemetryComparisonRows: backend.listTelemetryComparisonRows,
    listTelemetryRequests: backend.listTelemetryRequests,
    subscribeTelemetry: backend.subscribeTelemetry,
    listProviders: backend.listProviders,
    listRoles: backend.listRoles,
    listAccounts: backend.listAccounts,
    upsertProviderAccount: backend.upsertProviderAccount,
    startProviderDeviceAuthorization: backend.startProviderDeviceAuthorization,
    pollProviderDeviceAuthorization: backend.pollProviderDeviceAuthorization,
    activateEndpoint: backend.activateEndpoint,
    readControllerAssignment: backend.readControllerAssignment,
    updateControllerAssignment: backend.updateControllerAssignment,
    listEndpoints: backend.listEndpoints,
    listRecentRequestObservations: backend.listRecentRequestObservations,
    readRequestObservation: backend.readRequestObservation,
    readEndpointProfile: backend.readEndpointProfile,
    listLocalModels: backend.listLocalModels,
    loadLocalModel: backend.loadLocalModel,
    unloadLocalModel: backend.unloadLocalModel,
    readLocalPolicy: backend.readLocalPolicy,
    updateLocalPolicy: backend.updateLocalPolicy,
    listSwapHistory: backend.listSwapHistory,
    getLocalLogs: backend.getLocalLogs,
    readModelOverrides: backend.readModelOverrides,
    updateModelOverrides: backend.updateModelOverrides,
  });

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

void main();
