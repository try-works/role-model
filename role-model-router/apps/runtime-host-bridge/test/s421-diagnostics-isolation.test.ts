import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  initializeSqliteMemory,
  listRuntimeTelemetryRecords,
  persistRuntimeTelemetryFailure,
  readRuntimeTelemetrySummary,
} from "@role-model-router/sqlite-memory";
import { Cause } from "effect";
import { afterEach, describe, expect, it } from "vitest";

import { bindBackendStorageRef, composeBackendStorage } from "../src/composition-dag.js";
import { createModuleHealthComposition, handleLocalDiagnosticsRead } from "../src/index.js";

/** S421: diagnostic/business isolation on a real disposable SQLite backend. */

const roots: string[] = [];
const storages: Array<ReturnType<typeof composeBackendStorage>> = [];
afterEach(async () => {
  for (const storage of storages.splice(0)) await storage.close();
  for (const root of roots.splice(0)) rmSync(root, { force: true, recursive: true });
});

const setup = () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "s421-diagnostics-"));
  roots.push(root);
  const storage = composeBackendStorage({
    channel: "development",
    runtimeStateRoot: root,
    scopeId: "scope-s421",
    trackBOperationsEndpoint: undefined,
    useFixtures: false,
  });
  const options = {
    diagnostics: { calibration: { approved: true }, enabled: true },
  };
  bindBackendStorageRef(options, { current: storage });
  storages.push(storage);
  return { databasePath: storage.initialization.databasePath, options, root, storage };
};

const seedBusinessFailure = (databasePath: string, requestId: string) =>
  persistRuntimeTelemetryFailure({
    databasePath,
    errorClass: "provider.rate_limited",
    requestId,
    statusCode: 502,
  });

const diagnosticsRequest = (authorization: string) => ({
  headers: {
    authorization,
    "x-role-model-authorization-epoch": "421",
    "x-role-model-channel": "development",
    "x-role-model-scope": "run115:s421",
  },
  method: "GET",
  socket: { remoteAddress: "203.0.113.9" },
  url: "/api/role-model/operator/diagnostics",
});

const authorizedRead = (source: ReturnType<NonNullable<ReturnType<typeof createModuleHealthComposition>>["source"]>) =>
  handleLocalDiagnosticsRead(diagnosticsRequest("Bearer diagnostics-secret"), {
    deviceOwnerTrust: "off",
    host: "0.0.0.0",
    operatorAuthToken: "diagnostics-secret",
    operatorContext: { authorizationEpoch: 421, channel: "development", scope: "run115:s421" },
    source,
  });

describe("S421 diagnostics isolation on a real backend", () => {
  it("module diagnostics do not change business request/failure counts or rows", () => {
    const { databasePath, options } = setup();
    seedBusinessFailure(databasePath, "business-provider-1");
    const before = readRuntimeTelemetrySummary({ databasePath, windowMs: 60_000 });
    const beforeRows = listRuntimeTelemetryRecords({ databasePath, limit: 50 });
    const composition = createModuleHealthComposition(options);
    if (composition === undefined) throw new Error("composition expected");
    composition.reportRequestFailure(Cause.die(new Error("injected machinery defect")));
    const after = readRuntimeTelemetrySummary({ databasePath, windowMs: 60_000 });
    const afterRows = listRuntimeTelemetryRecords({ databasePath, limit: 50 });
    expect(after.requestCount).toBe(before.requestCount);
    expect(after.failureCount).toBe(before.failureCount);
    expect(afterRows).toHaveLength(beforeRows.length);
  });

  it("authorized diagnostics omit a genuine business failure and show the module Cause", () => {
    const { databasePath, options } = setup();
    seedBusinessFailure(databasePath, "business-provider-2");
    const composition = createModuleHealthComposition(options);
    if (composition === undefined) throw new Error("composition expected");
    composition.reportRequestFailure(Cause.die(new Error("injected machinery defect")));
    const authorized = authorizedRead(composition.source());
    const records = authorized.body.records ?? [];
    expect(records.filter((record) => record.code === "cause.die")).toHaveLength(1);
    expect(records.some((record) => (record.code ?? "").includes("provider"))).toBe(false);
    expect(records).toHaveLength(1);
  });

  it("writer records stay visible when the business store is closed and removed", async () => {
    const { options, root, storage } = setup();
    const composition = createModuleHealthComposition(options);
    if (composition === undefined) throw new Error("composition expected");
    await storage.close();
    // Leave no business DB on disk: a diagnostics source that consults the backend cannot answer.
    rmSync(root, { force: true, recursive: true });
    composition.reportRequestFailure(Cause.fail(new Error("after storage removal")));
    const records = composition.source().records();
    expect(records.filter((record) => record.code === "cause.fail")).toHaveLength(1);
  });

  it("overflow is bounded and exposes the loss counter without double-reporting", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "s421-capacity-"));
    roots.push(root);
    const options = {
      diagnostics: { calibration: { approved: true }, capacity: 1, enabled: true },
    };
    const composition = createModuleHealthComposition(options);
    if (composition === undefined) throw new Error("composition expected");
    composition.reportRequestFailure(Cause.die(new Error("first")));
    composition.reportRequestFailure(Cause.die(new Error("second")));
    const source = composition.source();
    expect(source.records().length).toBeLessThanOrEqual(1);
    expect(source.loss?.().dropped ?? 0).toBeGreaterThan(0);
    expect(source.records().filter((record) => record.code === "cause.die")).toHaveLength(1);
  });

  it("client-caused 4xx escapes remain excluded from module diagnostics", () => {
    const { options } = setup();
    const composition = createModuleHealthComposition(options);
    if (composition === undefined) throw new Error("composition expected");
    composition.reportRequestFailure({ statusCode: 404, error: "not found" });
    expect(composition.source().records()).toEqual([]);
  });
});
