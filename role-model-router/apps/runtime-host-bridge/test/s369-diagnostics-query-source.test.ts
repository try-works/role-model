import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { Cause } from "effect";
import { describe, expect, it } from "vitest";

import { bindBackendStorageRef, composeBackendStorage } from "../src/composition-dag.js";
import { createModuleHealthComposition } from "../src/index.js";
import { MAX_DIAGNOSTICS_RECORDS } from "../src/local-diagnostics-read.js";

/** S421 (R20/R21): diagnostics source is the module-health writer's owner-local ring buffer. */

const setup = (capacity?: number) => {
  const root = mkdtempSync(path.join(os.tmpdir(), "s369-diagnostics-"));
  const storage = composeBackendStorage({
    channel: "development",
    runtimeStateRoot: root,
    scopeId: "scope-s369",
    trackBOperationsEndpoint: undefined,
    useFixtures: false,
  });
  const options = {
    diagnostics: {
      calibration: { approved: true },
      enabled: true,
      capacity,
    },
  };
  bindBackendStorageRef(options, { current: storage });
  return { options, storage };
};

describe("S421 production diagnostics source is writer-owned", () => {
  it("reads the writer ring buffer and never exposes backend telemetry access", async () => {
    const { options, storage } = setup();
    const composition = createModuleHealthComposition(options);
    if (composition === undefined) throw new Error("composition expected");
    composition.reportRequestFailure(Cause.die(new Error("injected")));
    expect("diagnosticRecords" in storage).toBe(false);
    const records = composition.source().records();
    expect(records.filter((record) => record.code === "cause.die")).toHaveLength(1);
    await storage.close();
  });

  it("bounds the writer records by its capacity and the read contract", async () => {
    const { options, storage } = setup(2);
    const composition = createModuleHealthComposition(options);
    if (composition === undefined) throw new Error("composition expected");
    composition.reportRequestFailure(Cause.die(new Error("one")));
    composition.reportRequestFailure(Cause.die(new Error("two")));
    composition.reportRequestFailure(Cause.die(new Error("three")));
    const records = composition.source().records();
    expect(records.length).toBeLessThanOrEqual(2);
    expect(records.length).toBeLessThanOrEqual(MAX_DIAGNOSTICS_RECORDS);
    expect(composition.source().loss?.().dropped ?? 0).toBeGreaterThan(0);
    await storage.close();
  });

  it("uses calibrated defaults; explicit enable still requires calibration approval", () => {
    expect(createModuleHealthComposition({})).toBeDefined();
    expect(createModuleHealthComposition({ diagnostics: { enabled: true } })).toBeUndefined();
    expect(
      createModuleHealthComposition({ diagnostics: { calibration: { approved: true } } }),
    ).toBeUndefined();
  });

  it("a fresh backend composition has no diagnostic records and the writer starts empty", async () => {
    const { options, storage } = setup();
    const composition = createModuleHealthComposition(options);
    if (composition === undefined) throw new Error("composition expected");
    expect(composition.source().records()).toEqual([]);
    await storage.close();
  });
});
