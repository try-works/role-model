import { Cause } from "effect";
import { describe, expect, it } from "vitest";

import { createBridgeRequestListener, createModuleHealthComposition, wireModuleHealth } from "../src/index.js";

/**
 * S365a (R20): calibrated module-health edge. The transport report edge records CAUSE classification
 * (Fail/Die/Interrupt) via recordCause, excludes client-caused 4xx escapes, requires the explicit
 * enabled flag AND calibration approval, and reports each rejected handler exactly once.
 */

type DiagnosticsProbe = { readonly enabled?: boolean; readonly calibration?: { readonly approved?: boolean } };

const baseOptions = (diagnostics: DiagnosticsProbe) => ({ diagnostics });

const flush = (): Promise<void> => new Promise<void>((resolve) => setImmediate(resolve));

const codesOf = (composition: ReturnType<typeof createModuleHealthComposition>) =>
  composition?.source().records().map((record) => record.code) ?? [];

describe("S365a calibrated module-health edge", () => {
  it("requires enabled AND calibration approval (no silent default-on)", () => {
    expect(createModuleHealthComposition({})).toBeUndefined();
    expect(createModuleHealthComposition(baseOptions({ enabled: false, calibration: { approved: true } }))).toBeUndefined();
    expect(createModuleHealthComposition(baseOptions({ enabled: true }))).toBeUndefined();
    expect(createModuleHealthComposition(baseOptions({ calibration: { approved: true } }))).toBeUndefined();
    const enabled = createModuleHealthComposition(baseOptions({ enabled: true, calibration: { approved: true } }));
    expect(enabled).toBeDefined();
  });

  it("records Fail/Die/Interrupt as cause classifications, not the coarse error code", () => {
    const composition = createModuleHealthComposition(baseOptions({ enabled: true, calibration: { approved: true } }));
    if (composition === undefined) throw new Error("composition expected");
    composition.reportRequestFailure(Cause.fail(new Error("business failure")));
    composition.reportRequestFailure(Cause.die(new Error("defect")));
    composition.reportRequestFailure(Cause.interrupt(7));
    expect(codesOf(composition)).toEqual(["cause.interrupt", "cause.die", "cause.fail"]);
  });

  it("excludes client-caused 4xx escapes from module-failure counts while a genuine failure counts", () => {
    const composition = createModuleHealthComposition(baseOptions({ enabled: true, calibration: { approved: true } }));
    if (composition === undefined) throw new Error("composition expected");
    composition.reportRequestFailure({ statusCode: 404, error: "not found" });
    composition.reportRequestFailure({ statusCode: 422, error: "invalid" });
    expect(codesOf(composition)).toEqual([]);
    composition.reportRequestFailure(new Error("provider exploded"));
    expect(codesOf(composition)).toEqual(["cause.fail"]);
  });

  it("reports each rejected handler exactly once at the listener edge", async () => {
    const options = baseOptions({ enabled: true, calibration: { approved: true } });
    const composition = createModuleHealthComposition(options);
    if (composition === undefined) throw new Error("composition expected");
    const listener = createBridgeRequestListener(
      options,
      () => async () => {
        throw new Error("route exploded");
      },
      () => composition,
      () => true,
    );
    // SAFETY: the injected handler rejects before touching either object; only the wiring is exercised.
    listener({} as never, {} as never);
    await flush();
    expect(composition.source().records()).toHaveLength(1);
    // SAFETY: the injected handler rejects before touching either object; only the wiring is exercised.
    listener({} as never, {} as never);
    await flush();
    expect(composition.source().records()).toHaveLength(2);
  });
});
