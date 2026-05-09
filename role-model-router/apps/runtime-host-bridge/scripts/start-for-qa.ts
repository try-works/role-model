import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createRuntimeBridgeBackend, startBridgeServer } from "../src/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");
const runtimeStateRoot = path.join(os.tmpdir(), "role-model-runtime-qa");
const scopeId = "runtime-qa";

console.log("[QA] Starting Role Model Runtime Bridge...");
console.log(`[QA] repoRoot: ${repoRoot}`);
console.log(`[QA] runtimeStateRoot: ${runtimeStateRoot}`);
console.log(`[QA] scopeId: ${scopeId}`);

// Clear any stale SQLite state from previous runs to ensure clean startup
console.log("[QA] Clearing stale runtime state...");
try {
  await rm(runtimeStateRoot, { recursive: true, force: true });
  console.log("[QA] Stale runtime state cleared.");
} catch {
  // Directory may not exist; that's fine
}

const backend = await createRuntimeBridgeBackend({
    fixtureRoot: path.join(repoRoot, "testdata", "router-runtime"),
  repoRoot,
  runtimeStateRoot,
  scopeId,
});

const server = await startBridgeServer({
  host: "127.0.0.1",
  port: 3456,
  staticRoot: path.join(repoRoot, "role-model-router", "apps", "runtime-ui", "build", "client"),
  registry: backend.registry,
  getRegistry: () => backend.registry,
  executeChatCompletions: backend.executeChatCompletions,
  executeResponses: backend.executeResponses,
  readVersionInfo: async () => ({ version: "0.0.0-qa", build: "dev" }),
  listActivityMetrics: async () => [],
  readLogs: async () => "No logs available in QA mode.",
  readRuntimeSummary: backend.readRuntimeSummary,
  readRuntimeConfig: backend.readRuntimeConfig,
  updateRuntimeConfig: backend.updateRuntimeConfig,
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
});

const baseUrl = `http://127.0.0.1:${server.port}`;
console.log(`[QA] Bridge server running at ${baseUrl}`);
console.log(`[QA] API docs:`);
console.log(`  GET ${baseUrl}/api/role-model/runtime/summary`);
console.log(`  GET ${baseUrl}/api/role-model/providers`);
console.log(`  GET ${baseUrl}/api/role-model/accounts`);
console.log(`  GET ${baseUrl}/api/role-model/endpoints`);
console.log(`  GET ${baseUrl}/api/role-model/roles`);
console.log(`  GET ${baseUrl}/api/role-model/runtime/config`);
console.log(`  GET ${baseUrl}/v1/models`);
console.log(`  POST ${baseUrl}/v1/chat/completions`);
console.log(`[QA] Press Ctrl+C to stop`);

process.on("SIGINT", async () => {
  console.log("\n[QA] Shutting down...");
  await server.close();
  await backend.shutdown();
  process.exit(0);
});

// Keep alive
await new Promise(() => {});
