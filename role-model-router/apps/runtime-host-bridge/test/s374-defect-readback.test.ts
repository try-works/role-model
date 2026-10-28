import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { Cause } from "effect";
import { describe, expect, it } from "vitest";

import { bindBackendStorageRef, composeBackendStorage } from "../src/composition-dag.js";
import { createModuleHealthComposition, handleLocalDiagnosticsRead } from "../src/index.js";
import { MAX_DIAGNOSTICS_RECORDS } from "../src/local-diagnostics-read.js";

/**
 * S365c (R20): a real injected defect flows end-to-end through the authorized diagnostics read path:
 * module-health edge (Cause classification) -> backend-owned telemetry store -> diagnosticRecords()
 * -> the composition source -> handleLocalDiagnosticsRead (the same handler the operator route uses).
 * No server and no port.
 */

const DIAGNOSTICS_PATH = "/api/role-model/operator/diagnostics";
const context = { channel: "development" as const, scope: "run115:s374", authorizationEpoch: 374 };
const authHeaders = {
  authorization: "Bearer diagnostics-secret",
  "x-role-model-channel": context.channel,
  "x-role-model-scope": context.scope,
  "x-role-model-authorization-epoch": String(context.authorizationEpoch),
};
const baseOptions = {
  host: "0.0.0.0",
  deviceOwnerTrust: "off" as const,
  operatorAuthToken: "diagnostics-secret",
  operatorContext: context,
};
const request = (headers: Readonly<Record<string, string | string[] | undefined>>) => ({
  method: "GET",
  url: DIAGNOSTICS_PATH,
  headers,
  socket: { remoteAddress: "203.0.113.9" },
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

const readBodyRecords = (source: ReturnType<NonNullable<ReturnType<typeof createModuleHealthComposition>>["source"]>) => {
  const result = handleLocalDiagnosticsRead(request(authHeaders), { ...baseOptions, source });
  return { records: result.body.records, state: result.body.state, result };
};

describe("S365c real defect readback (edge -> store -> authorized read)", () => {
  it("an injected genuine defect is classified by the edge, lands in the telemetry store and reads back through the authorized path", async () => {
    const { options, storage } = storageAndOptions();
    const composition = createModuleHealthComposition(options);
    if (composition === undefined) throw new Error("composition expected");
    const defect = new Error("injected runtime defect");
    composition.reportRequestFailure(Cause.die(defect));

    // Store leg: the edge's record is persisted in the backend-owned telemetry store.
    const stored = storage.diagnosticRecords();
    expect(stored.length).toBeGreaterThanOrEqual(1);
    expect(stored.filter((record) => record.code === "cause.die")).toHaveLength(1);
    expect(stored.some((record) => record.level === "error")).toBe(true);

    // Authorized read leg: composition source -> the real read contract.
    const { records, state } = readBodyRecords(composition.source());
    expect(state).not.toBe("disabled");
    const visible = records ?? [];
    expect(visible.filter((record) => record.code === "cause.die")).toHaveLength(1);
    expect(visible.some((record) => record.code === "cause.die" && record.level === "error")).toBe(true);
    expect(visible.length).toBeLessThanOrEqual(MAX_DIAGNOSTICS_RECORDS);
    await storage.close();
  });

  it("client-caused 4xx escapes are still excluded end-to-end", async () => {
    const { options, storage } = storageAndOptions();
    const composition = createModuleHealthComposition(options);
    if (composition === undefined) throw new Error("composition expected");
    composition.reportRequestFailure({ statusCode: 404, error: "not found" });
    composition.reportRequestFailure({ statusCode: 422, error: "invalid" });
    expect(storage.diagnosticRecords()).toEqual([]);
    const { records } = readBodyRecords(composition.source());
    expect(records ?? []).toEqual([]);
    await storage.close();
  });

  it("stays disabled without calibration (default-off unchanged)", () => {
    expect(createModuleHealthComposition({})).toBeUndefined();
    expect(createModuleHealthComposition({ diagnostics: { enabled: true } })).toBeUndefined();
  });
});
