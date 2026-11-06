import { Cause } from "effect";
import { describe, expect, it } from "vitest";

import {
  createModuleHealthComposition,
  handleLocalDiagnosticsRead,
} from "../src/index.js";
import { MODULE_HEALTH_CALIBRATED_LIMITS } from "../src/module-health-writer.js";

/** S650 (R20/R21): calibrated writer through the authorized diagnostics read path. */

const path = "/api/role-model/operator/diagnostics";
const context = { channel: "development" as const, scope: "run115:s650", authorizationEpoch: 650 };
const auth = {
  authorization: "Bearer s650-diagnostics",
  "x-role-model-channel": context.channel,
  "x-role-model-scope": context.scope,
  "x-role-model-authorization-epoch": String(context.authorizationEpoch),
};
const request = {
  method: "GET",
  url: path,
  headers: auth,
  socket: { remoteAddress: "127.0.0.1" },
};
const options = {
  deviceOwnerTrust: "off" as const,
  host: "127.0.0.1",
  operatorAuthToken: "s650-diagnostics",
  operatorContext: context,
};

describe("S650 calibrated diagnostics live read", () => {
  it("enables by default with the approved limits and reports a real stale+loss defect honestly", () => {
    const composition = createModuleHealthComposition({
      diagnostics: { capacity: 2, buildId: "", instanceId: "s650-live" },
    });
    expect(composition).toBeDefined();
    if (!composition) throw new Error("composition expected");
    expect(composition.source().enabled).toBe(true);
    for (let index = 0; index < 3; index += 1) {
      composition.writer.recordCause(Cause.fail(new Error("real defect")));
    }

    const now = Date.now() + MODULE_HEALTH_CALIBRATED_LIMITS.ttlMs + 1;
    const result = handleLocalDiagnosticsRead(request, {
      ...options,
      now: () => now,
      source: composition.source(),
    });

    expect(result.status).toBe(200);
    expect(result.body.identity).toEqual({ buildId: "unknown", instanceId: "s650-live" });
    expect(result.body.conditions).toEqual({ dropped: true, stale: true });
    expect(result.body.state).toBe("stale");
    expect(result.body.loss?.dropped).toBe(1);
    // The writer's TTL uses its own collector clock (tested separately with an injected clock), so
    // an injected READ clock still pages the two retained records while reporting staleness.
    expect(result.body.records).toHaveLength(2);
    expect(result.body.bounds?.maxRecords).toBe(50);
  });

  it("keeps an explicit disabled state honest even with a calibrated source", () => {
    expect(createModuleHealthComposition({ diagnostics: { enabled: false } })).toBeUndefined();
  });
});
