import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { backendStorageRefOf, bindBackendStorageRef, composeBackendStorage } from "../src/composition-dag.js";
import type { BackendStorageContract } from "../src/composition-dag.js";
import { createModuleHealthComposition } from "../src/index.js";
import { MAX_DIAGNOSTICS_RECORDS } from "../src/local-diagnostics-read.js";
import type { LocalDiagnosticRecord } from "../src/local-diagnostics-read.js";

/**
 * S365b' (R20): the production diagnostics query source is the backend-owned storage. The composition
 * root resolves the SAME BackendStorage the backend composed (via the storage ref), reads its bounded
 * diagnosticRecords(), and keeps the calibration gate and the read contract's caps authoritative.
 */

/**
 * SAFETY: the composition root reads only diagnosticRecords from this stub; the remaining
 * BackendStorageContract members are unused here, so this is a single test-boundary cast.
 */
const storageStub = (
  diagnosticRecords: () => readonly LocalDiagnosticRecord[],
): BackendStorageContract => ({ diagnosticRecords }) as BackendStorageContract;
const diagnosticsOptions = (records: () => readonly LocalDiagnosticRecord[]) => {
  const options = {
    diagnostics: { calibration: { approved: true }, enabled: true },
  };
  // SAFETY: the ref starts empty and is filled with the typed stub below; only the undefined case needs the predicate.
  const storageRef = { current: undefined as BackendStorageContract | undefined };
  const fakeStorage = storageStub(records);
  bindBackendStorageRef(options, storageRef);
  storageRef.current = fakeStorage;
  return { fakeStorage, options };
};

describe("S365b' production diagnostics query source", () => {
  it("resolves the SAME backend storage instance and reads its bounded records (identity, no second construction)", () => {
    const recordsSpy = vi.fn(() => [
      { atMs: 1000, code: "telemetry.failure", count: 1, level: "error" as const },
    ]);
    const { fakeStorage, options } = diagnosticsOptions(recordsSpy);
    const composition = createModuleHealthComposition(options);
    if (composition === undefined) throw new Error("composition expected");
    const records = composition.source().records();
    expect(recordsSpy).toHaveBeenCalledTimes(1);
    expect(records).toEqual([{ atMs: 1000, code: "telemetry.failure", count: 1, level: "error" }]);
    expect(backendStorageRefOf(options)?.current).toBe(fakeStorage);
  });

  it("caps the supplied records at the read contract bound", () => {
    const many = Array.from({ length: MAX_DIAGNOSTICS_RECORDS + 10 }, (_, index) => ({
      atMs: index,
      code: "telemetry.failure",
      count: 1,
      level: "error" as const,
    }));
    const { options } = diagnosticsOptions(() => many);
    const composition = createModuleHealthComposition(options);
    if (composition === undefined) throw new Error("composition expected");
    expect(composition.source().records().length).toBeLessThanOrEqual(MAX_DIAGNOSTICS_RECORDS);
  });

  it("stays disabled without the enabled flag AND calibration approval", () => {
    expect(createModuleHealthComposition({})).toBeUndefined();
    expect(createModuleHealthComposition({ diagnostics: { enabled: true } })).toBeUndefined();
    expect(
      createModuleHealthComposition({ diagnostics: { calibration: { approved: true } } }),
    ).toBeUndefined();
  });

  it("implements diagnosticRecords over the backend-owned telemetry store (fresh store -> empty, bounded)", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "s369-diagnostics-"));
    const storage = composeBackendStorage({
      channel: "development",
      runtimeStateRoot: root,
      scopeId: "scope-s369",
      trackBOperationsEndpoint: undefined,
      useFixtures: false,
    });
    const records = storage.diagnosticRecords();
    expect(Array.isArray(records)).toBe(true);
    expect(records.length).toBeLessThanOrEqual(MAX_DIAGNOSTICS_RECORDS);
    await storage.close();
  });
});
