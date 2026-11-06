import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { listRuntimeTelemetryRecords } from "@role-model-router/sqlite-memory";
import { Cause } from "effect";
import { describe, expect, it } from "vitest";

import { bindBackendStorageRef, composeBackendStorage } from "../src/composition-dag.js";
import { createModuleHealthComposition, handleLocalDiagnosticsRead } from "../src/index.js";
import { MAX_DIAGNOSTICS_RECORDS } from "../src/local-diagnostics-read.js";

/** S421 (R20/R21): injected Cause -> module-health writer -> authorized diagnostics read. */

const DIAGNOSTICS_PATH = "/api/role-model/operator/diagnostics";
const context = { channel: "development" as const, scope: "run115:s374", authorizationEpoch: 374 };
const authHeaders = {
  authorization: "Bearer diagnostics-secret",
  "x-role-model-channel": context.channel,
  "x-role-model-scope": context.scope,
  "x-role-model-authorization-epoch": String(context.authorizationEpoch),
};
const baseOptions = {
  deviceOwnerTrust: "off" as const,
  host: "0.0.0.0",
  operatorAuthToken: "diagnostics-secret",
  operatorContext: context,
};
const request = (headers: Readonly<Record<string, string | string[] | undefined>>) => ({
  headers,
  method: "GET",
  socket: { remoteAddress: "203.0.113.9" },
  url: DIAGNOSTICS_PATH,
});

const storageAndOptions = () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "s374-defect-"));
  const storage = composeBackendStorage({
    channel: "development",
    runtimeStateRoot: root,
    scopeId: "scope-s374",
    trackBOperationsEndpoint: undefined,
    useFixtures: false,
  });
  const options = { diagnostics: { calibration: { approved: true }, enabled: true } };
  bindBackendStorageRef(options, { current: storage });
  return { options, storage };
};

const readBodyRecords = (
  source: ReturnType<NonNullable<ReturnType<typeof createModuleHealthComposition>>["source"]>,
) => {
  const result = handleLocalDiagnosticsRead(request(authHeaders), { ...baseOptions, source });
  return { records: result.body.records, state: result.body.state, result };
};

describe("S421 authorized defect readback (edge -> writer -> authorized read)", () => {
  it("an injected genuine defect is classified and reads back without touching business telemetry", async () => {
    const { options, storage } = storageAndOptions();
    const composition = createModuleHealthComposition(options);
    if (composition === undefined) throw new Error("composition expected");
    composition.reportRequestFailure(Cause.die(new Error("injected runtime defect")));

    const businessRows = listRuntimeTelemetryRecords({
      databasePath: storage.initialization.databasePath,
      limit: 50,
    });
    expect(businessRows.some((row) => (row.errorClass ?? "").includes("cause.die"))).toBe(false);

    const { records, state } = readBodyRecords(composition.source());
    expect(state).not.toBe("disabled");
    const visible = records ?? [];
    expect(visible.filter((record) => record.code === "cause.die")).toHaveLength(1);
    expect(visible.some((record) => record.code === "cause.die" && record.level === "error")).toBe(
      true,
    );
    expect(visible.length).toBeLessThanOrEqual(MAX_DIAGNOSTICS_RECORDS);
    await storage.close();
  });

  it("client-caused 4xx escapes are still excluded end-to-end", async () => {
    const { options, storage } = storageAndOptions();
    const composition = createModuleHealthComposition(options);
    if (composition === undefined) throw new Error("composition expected");
    composition.reportRequestFailure({ statusCode: 404, error: "not found" });
    composition.reportRequestFailure({ statusCode: 422, error: "invalid" });
    const { records, result } = readBodyRecords(composition.source());
    expect(result.status).toBe(200);
    expect(records ?? []).toEqual([]);
    await storage.close();
  });

  it("caps the authorized records at the read contract bound", () => {
    const options = { diagnostics: { calibration: { approved: true }, enabled: true } };
    bindBackendStorageRef(options, { current: undefined });
    const composition = createModuleHealthComposition(options);
    if (composition === undefined) throw new Error("composition expected");
    for (let index = 0; index < MAX_DIAGNOSTICS_RECORDS + 10; index += 1) {
      composition.reportRequestFailure(Cause.fail(new Error(`defect ${String(index)}`)));
    }
    const { records } = readBodyRecords(composition.source());
    expect((records ?? []).length).toBeLessThanOrEqual(MAX_DIAGNOSTICS_RECORDS);
  });

  it("denies an unauthorized read without exposing records", () => {
    const options = { diagnostics: { calibration: { approved: true }, enabled: true } };
    bindBackendStorageRef(options, { current: undefined });
    const composition = createModuleHealthComposition(options);
    if (composition === undefined) throw new Error("composition expected");
    composition.reportRequestFailure(Cause.fail(new Error("defect")));
    const denied = handleLocalDiagnosticsRead(
      request({ ...authHeaders, authorization: "Bearer wrong" }),
      {
        ...baseOptions,
        source: composition.source(),
      },
    );
    expect(denied.status).toBe(401);
    expect(denied.body.records).toBeUndefined();
  });

  it("uses calibrated defaults; an explicit unapproved enable stays disabled", () => {
    expect(createModuleHealthComposition({})).toBeDefined();
    expect(createModuleHealthComposition({ diagnostics: { enabled: true } })).toBeUndefined();
  });
});
