/**
 * Run 115 S10b (R20): the module-health writer wired at ONE composition edge, default OFF.
 *
 * These tests use the REAL diagnostics read path: createModuleHealthComposition (the same function
 * startBridgeServer calls once) plus handleLocalDiagnosticsRead (the same authorized handler the
 * operator route dispatches to). No server and no port.
 *
 * The writer's PLACEHOLDER limits (capacity 64, code 96 bytes) are not calibrated here; R20 requires
 * calibration and approval before enablement, so "disabled" is the default and the enabled cases are
 * explicit calibration decisions made by the test.
 */
import { Effect, Exit } from "effect";
import { describe, expect, it } from "vitest";

import { createModuleHealthComposition, handleLocalDiagnosticsRead } from "../src/index.js";
import type { ModuleHealthComposition } from "../src/index.js";

const DIAGNOSTICS_PATH = "/api/role-model/operator/diagnostics";
const context = { channel: "development" as const, scope: "run115:s10b", authorizationEpoch: 115 };
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

const requireComposition = (options: {
  readonly diagnostics?: { readonly enabled?: boolean; readonly instanceId?: string; readonly buildId?: string };
}): ModuleHealthComposition => {
  const composition = createModuleHealthComposition(options);
  if (composition === undefined) {
    throw new Error("expected the module-health composition to be enabled");
  }
  return composition;
};

const recordCodes = (body: Record<string, unknown>): ReadonlyArray<string> => {
  const records = body.records;
  if (!Array.isArray(records)) return [];
  return records.flatMap((entry) => {
    if (entry === null || typeof entry !== "object") return [];
    const code = (entry as { code?: unknown }).code;
    return typeof code === "string" ? [code] : [];
  });
};

describe("S10b module-health writer composition", () => {
  it("enabled: a recorded failure appears through the real diagnostics read and business values are unchanged", () => {
    const composition = requireComposition({
      diagnostics: { buildId: "build-s10b", enabled: true, instanceId: "inst-s10b" },
    });

    // Business behaviour unchanged: the observer returns the success value untouched...
    expect(Effect.runSync(composition.writer.observe(Effect.succeed(42)))).toBe(42);
    // ...and a failure is still the same failure Exit, classified without replacing it.
    const failedExit = Effect.runSyncExit(composition.writer.observe(Effect.fail("boom")));
    expect(Exit.isFailure(failedExit)).toBe(true);

    // The request-edge reporter (what the transport catch calls) does not consume the error either.
    const businessError = new Error("provider exploded");
    composition.reportRequestFailure(businessError);
    expect(businessError.message).toBe("provider exploded");

    const result = handleLocalDiagnosticsRead(request(authHeaders), {
      ...baseOptions,
      source: composition.source(),
    });

    expect(result.status).toBe(200);
    expect(result.body.state).toBe("ok");
    expect(result.body.identity).toEqual({ instanceId: "inst-s10b", buildId: "build-s10b" });
    const codes = recordCodes(result.body);
    expect(codes).toContain("cause.fail");
    expect(codes).toContain("error");
    expect(result.body.recordCount).toBe(2);
  });

  it("default: absent or disabled enablement leaves the read path answering disabled", () => {
    expect(createModuleHealthComposition({})).toBeUndefined();
    expect(createModuleHealthComposition({ diagnostics: {} })).toBeUndefined();
    expect(createModuleHealthComposition({ diagnostics: { enabled: false } })).toBeUndefined();

    const result = handleLocalDiagnosticsRead(request(authHeaders), {
      ...baseOptions,
      source: undefined,
    });
    expect(result.status).toBe(200);
    expect(result.body.state).toBe("disabled");
  });
});
