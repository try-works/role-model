import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runRuntimeAdapterValidation } from "@role-model-router/adapter-execution/cli";
import { createRuntimeObservationBundle } from "@role-model-router/runtime-observability";
import {
  backupRuntimeState,
  deleteRuntimeState,
  exportRuntimeState,
  persistRuntimeObservationBundle,
  readRuntimeObservationBundle,
  restoreRuntimeState,
} from "@role-model-router/sqlite-memory";

import { runRuntimeHostValidation } from "./validate-host.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface RuntimeOperationsHostValidationSummary {
  readonly requestId: string;
  readonly endpointId: string;
  readonly captureId: number;
}

export interface RuntimeOperationsValidationOptions {
  readonly repoRoot: string;
  readonly runtimeStateRoot: string;
  readonly scopeIds?: readonly [string, string];
  readonly hostValidation?: () => Promise<RuntimeOperationsHostValidationSummary>;
}

export interface RuntimeOperationsValidationResult {
  readonly hostValidation: RuntimeOperationsHostValidationSummary;
  readonly scopes: ReadonlyArray<{
    readonly scopeId: string;
    readonly databasePath: string;
    readonly requestId: string;
    readonly endpointId: string;
  }>;
  readonly isolation: {
    readonly distinctDatabasePaths: boolean;
    readonly distinctScopeIds: boolean;
  };
  readonly maintenance: {
    readonly exportSummary: ReturnType<typeof exportRuntimeState>;
    readonly backupPath: string;
    readonly deletedDatabaseMissing: boolean;
    readonly restoredObservation: ReturnType<typeof readRuntimeObservationBundle>;
  };
  readonly replayShadow: {
    readonly replayedEndpointId: string;
    readonly matchesChosenEndpoint: boolean;
  };
}

async function readJson<TValue>(filePath: string): Promise<TValue> {
  return JSON.parse(await readFile(filePath, "utf8")) as TValue;
}

async function prepareObservedScope(input: {
  readonly repoRoot: string;
  readonly runtimeStateRoot: string;
  readonly scopeId: string;
}) {
  const validation = await runRuntimeAdapterValidation({
    repoRoot: input.repoRoot,
    runtimeStateRoot: input.runtimeStateRoot,
    scopeId: input.scopeId,
  });
  const history = await readJson<{
    byEndpointId: Record<string, Parameters<typeof createRuntimeObservationBundle>[0]["priorSamples"]>;
  }>(path.join(input.repoRoot, "testdata", "router-runtime", "observability-history.json"));
  const policy = await readJson<Parameters<typeof createRuntimeObservationBundle>[0]["capturePolicy"]>(
    path.join(input.repoRoot, "testdata", "router-runtime", "observability-policy.json"),
  );
  const observation = createRuntimeObservationBundle({
    decision: validation.decision,
    routingDiagnostics: validation.routingDiagnostics,
    retrievalReceipt: validation.retrievalReceipt,
    contextEnvelope: validation.contextEnvelope,
    execution: validation.execution,
    priorSamples: history.byEndpointId[validation.decision.chosen_endpoint_id] ?? [],
    maintenancePolicy: {
      "redaction.level": "strict",
      "retention.class": "standard",
    },
    capturePolicy: policy,
  });

  persistRuntimeObservationBundle({
    databasePath: validation.databasePath,
    observation,
  });

  return {
    validation,
    observation,
  };
}

async function runDefaultHostValidation(): Promise<RuntimeOperationsHostValidationSummary> {
  const result = await runRuntimeHostValidation();
  return {
    requestId: result.request_id,
    endpointId: result.structured_endpoint_id,
    captureId: result.capture_id,
  };
}

export async function runRuntimeOperationsValidation(
  options: RuntimeOperationsValidationOptions,
): Promise<RuntimeOperationsValidationResult> {
  const [primaryScopeId, secondaryScopeId] = options.scopeIds ?? [
    "operations-primary",
    "operations-secondary",
  ];
  const hostValidation = await (options.hostValidation ?? runDefaultHostValidation)();

  const primary = await prepareObservedScope({
    repoRoot: options.repoRoot,
    runtimeStateRoot: options.runtimeStateRoot,
    scopeId: primaryScopeId,
  });
  const secondary = await prepareObservedScope({
    repoRoot: options.repoRoot,
    runtimeStateRoot: options.runtimeStateRoot,
    scopeId: secondaryScopeId,
  });

  const exportPath = path.join(options.runtimeStateRoot, primaryScopeId, "ops", "runtime-export.json");
  const backupPath = path.join(options.runtimeStateRoot, primaryScopeId, "ops", "memory-backup.sqlite");
  const exportSummary = exportRuntimeState({
    databasePath: primary.validation.databasePath,
    exportPath,
  });
  const backupSummary = backupRuntimeState({
    databasePath: primary.validation.databasePath,
    backupPath,
  });

  deleteRuntimeState({
    databasePath: primary.validation.databasePath,
  });

  const deletedDatabaseMissing = !existsSync(primary.validation.databasePath);

  restoreRuntimeState({
    databasePath: primary.validation.databasePath,
    backupPath: backupSummary.backupPath,
  });

  const restoredObservation = readRuntimeObservationBundle({
    databasePath: primary.validation.databasePath,
    requestId: primary.validation.decision.request_id,
  });

  const replay = await prepareObservedScope({
    repoRoot: options.repoRoot,
    runtimeStateRoot: options.runtimeStateRoot,
    scopeId: "operations-shadow",
  });

  return {
    hostValidation,
    scopes: [
      {
        scopeId: primaryScopeId,
        databasePath: primary.validation.databasePath,
        requestId: primary.validation.decision.request_id,
        endpointId: primary.validation.decision.chosen_endpoint_id,
      },
      {
        scopeId: secondaryScopeId,
        databasePath: secondary.validation.databasePath,
        requestId: secondary.validation.decision.request_id,
        endpointId: secondary.validation.decision.chosen_endpoint_id,
      },
    ],
    isolation: {
      distinctDatabasePaths: primary.validation.databasePath !== secondary.validation.databasePath,
      distinctScopeIds: primaryScopeId !== secondaryScopeId,
    },
    maintenance: {
      exportSummary,
      backupPath: backupSummary.backupPath,
      deletedDatabaseMissing,
      restoredObservation,
    },
    replayShadow: {
      replayedEndpointId: replay.validation.decision.chosen_endpoint_id,
      matchesChosenEndpoint:
        replay.validation.decision.chosen_endpoint_id === primary.validation.decision.chosen_endpoint_id,
    },
  };
}

if (process.argv[1] === __filename) {
  const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");
  const runtimeStateRoot = path.join(os.tmpdir(), "role-model-runtime-operations");

  console.log(
    JSON.stringify(
      await runRuntimeOperationsValidation({
        repoRoot,
        runtimeStateRoot,
      }),
      null,
      2,
    ),
  );
  process.exit(0);
}
