/**
 * Run 115 S15a (R21 server half): the authorized bounded local diagnostics read path.
 *
 * No server and no port: every case calls the exported handler directly with a structural request
 * object. The auth cases reuse the ONE operator gate (local read credential + loopback device-owner
 * trust + operator context headers), which is the same code the /api/role-model/operator/* gate runs.
 */
import { describe, expect, it } from "vitest";

import { handleLocalDiagnosticsRead } from "../src/index.js";
import {
  DIAGNOSTICS_STALENESS_MS,
  MAX_DIAGNOSTICS_RECORDS,
  MAX_DIAGNOSTICS_RESPONSE_BYTES,
  type LocalDiagnosticRecord,
  type LocalDiagnosticsSource,
} from "../src/local-diagnostics-read.js";
import {
  collectObservabilitySnapshot,
  createObservabilityScope,
  recordReplayAdmission,
  recordRouterDecision,
} from "../src/run108-observability.js";

const DIAGNOSTICS_PATH = "/api/role-model/operator/diagnostics";
const NOW = 1_000_000_000;
const context = { channel: "development" as const, scope: "run115:s15a", authorizationEpoch: 115 };
const tokenHeaders = {
  authorization: "Bearer diagnostics-secret",
  "x-role-model-channel": context.channel,
  "x-role-model-scope": context.scope,
  "x-role-model-authorization-epoch": String(context.authorizationEpoch),
};
const baseOptions = {
  host: "127.0.0.1",
  deviceOwnerTrust: "off" as const,
  operatorAuthToken: "diagnostics-secret",
  operatorContext: context,
  now: () => NOW,
};

const record = (index: number, overrides: Partial<LocalDiagnosticRecord> = {}): LocalDiagnosticRecord => ({
  atMs: NOW - index,
  level: "info",
  code: `diag.${index}`,
  count: 1,
  ...overrides,
});

const source = (
  records: readonly LocalDiagnosticRecord[],
  extra: Partial<LocalDiagnosticsSource> = {},
): LocalDiagnosticsSource => ({
  instanceId: "instance-a",
  buildId: "build-b",
  records: () => records,
  loss: () => ({ dropped: 0, windowMs: 60_000 }),
  lastRecordAtMs: () => records[0]?.atMs ?? null,
  ...extra,
});

const request = (
  headers: Readonly<Record<string, string | string[] | undefined>>,
  remoteAddress = "127.0.0.1",
  search = "",
) => ({
  method: "GET",
  url: DIAGNOSTICS_PATH + search,
  headers,
  socket: { remoteAddress },
});

const offline = { host: "0.0.0.0", deviceOwnerTrust: "off" as const };

describe("S15a R21.1 bounded diagnostics query", () => {
  it("returns identity, loss, cursor, staleness rule and records bounded by the record cap", () => {
    const records = Array.from({ length: 60 }, (_, index) => record(index));
    const result = handleLocalDiagnosticsRead(
      request(tokenHeaders, "203.0.113.9", "?limit=1000"),
      { ...baseOptions, ...offline, source: source(records) },
    );

    expect(result.status).toBe(200);
    expect(result.body.schemaVersion).toBe("role-model.local-diagnostics-read.v1");
    expect(result.body.state).toBe("ok");
    expect(result.body.identity).toEqual({ instanceId: "instance-a", buildId: "build-b" });
    expect(result.body.loss).toEqual({ dropped: 0, windowMs: 60_000 });
    expect(result.body.staleness).toMatchObject({ ruleMs: DIAGNOSTICS_STALENESS_MS, stale: false });
    expect(result.body.recordCount).toBe(MAX_DIAGNOSTICS_RECORDS);
    expect(result.body.totalAvailable).toBe(60);
    expect(result.body.truncated).toBe(true);
    expect(result.body.cursor).toEqual(expect.any(String));
    expect(result.body.records?.[0]).toEqual(record(0));
    expect("fibers" in result.body).toBe(false);
  });

  it("pages with the opaque cursor and stops at the end", () => {
    const records = Array.from({ length: 3 }, (_, index) => record(index));
    const options = { ...baseOptions, ...offline, source: source(records) };
    const firstPage = handleLocalDiagnosticsRead(request(tokenHeaders, "203.0.113.9", "?limit=2"), options);
    expect(firstPage.body.recordCount).toBe(2);
    expect(firstPage.body.truncated).toBe(true);
    const cursor = firstPage.body.cursor ?? "";
    expect(cursor).not.toBe("");
    const secondPage = handleLocalDiagnosticsRead(
      request(tokenHeaders, "203.0.113.9", `?limit=2&cursor=${encodeURIComponent(cursor)}`),
      options,
    );
    expect(secondPage.body.recordCount).toBe(1);
    expect(secondPage.body.truncated).toBe(false);
    expect(secondPage.body.cursor).toBeNull();
  });

  it("applies the byte cap before the record cap", () => {
    const records = Array.from({ length: MAX_DIAGNOSTICS_RECORDS }, (_, index) =>
      record(index, { code: `${"x".repeat(1000)}-${index}` }),
    );
    const result = handleLocalDiagnosticsRead(request(tokenHeaders, "203.0.113.9"), {
      ...baseOptions,
      ...offline,
      source: source(records),
    });
    expect(result.status).toBe(200);
    expect(result.body.recordCount).toBeGreaterThan(0);
    expect(result.body.recordCount).toBeLessThan(MAX_DIAGNOSTICS_RECORDS);
    expect(result.body.truncated).toBe(true);
    expect(JSON.stringify(result.body).length).toBeLessThanOrEqual(MAX_DIAGNOSTICS_RESPONSE_BYTES);
  });
});

describe("S15a R21.2 reused authorization, forwarded-owner rejection and CORS", () => {
  it("denies a non-loopback request without the existing read credential", () => {
    const result = handleLocalDiagnosticsRead(request({}, "203.0.113.9"), {
      ...baseOptions,
      ...offline,
      source: source([record(0)]),
    });
    expect(result.status).toBe(401);
    expect(result.body).toMatchObject({ error: "operator_authentication_required" });
  });

  it("accepts the existing operator bearer credential from a remote peer", () => {
    const result = handleLocalDiagnosticsRead(request(tokenHeaders, "203.0.113.9"), {
      ...baseOptions,
      ...offline,
      source: source([record(0)]),
    });
    expect(result.status).toBe(200);
    expect(result.body.state).toBe("ok");
  });

  it("rejects a spoofed forwarded owner header instead of trusting it", () => {
    const result = handleLocalDiagnosticsRead(
      request({ ...tokenHeaders, "x-forwarded-for": "127.0.0.1", "x-role-model-device-owner": "on" }, "203.0.113.9"),
      { ...baseOptions, ...offline, source: source([record(0)]) },
    );
    expect(result.status).toBe(403);
    expect(result.body).toMatchObject({ error: "diagnostics_owner_header_forbidden" });
  });

  it("does not grant device-owner trust from a spoofed Host header", () => {
    const result = handleLocalDiagnosticsRead(
      request({ host: "127.0.0.1:3456" }, "203.0.113.9"),
      { ...baseOptions, ...offline, source: source([record(0)]) },
    );
    expect(result.status).toBe(401);
  });

  it("never emits wildcard or reflected CORS, even with an Origin header", () => {
    const result = handleLocalDiagnosticsRead(
      request({ ...tokenHeaders, origin: "https://evil.example" }, "127.0.0.1"),
      { ...baseOptions, deviceOwnerTrust: "on", source: source([record(0)]) },
    );
    expect(result.status).toBe(200);
    expect(result.body.state).toBe("ok");
    expect(result.body.recordCount).toBe(1);
    for (const [name, value] of Object.entries(result.headers)) {
      expect(name.toLowerCase().startsWith("access-control-")).toBe(false);
      expect(value).not.toBe("*");
      expect(value).not.toContain("evil.example");
    }
  });
});

describe("S15a R21.3 diagnostics cannot contaminate business/live aggregates", () => {
  it("leaves the observability aggregate and the source unchanged after a read", () => {
    const scope = createObservabilityScope("run115:s15a:aggregates");
    recordRouterDecision("baseline_retained", scope);
    recordReplayAdmission("replay", true, scope);
    const before = collectObservabilitySnapshot(scope);
    const records = [record(0), record(1)];
    const options = { ...baseOptions, ...offline, source: source(records) };
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const read = handleLocalDiagnosticsRead(request(tokenHeaders, "203.0.113.9"), options);
      expect(read.status).toBe(200);
      expect(read.body.state).toBe("ok");
      expect(read.body.recordCount).toBe(2);
    }
    expect(collectObservabilitySnapshot(scope)).toEqual(before);
    expect(records).toEqual([record(0), record(1)]);
  });
});

describe("S15a R21.4 disabled/denied/stale/dropped/empty are distinct states", () => {
  it("disabled is an explicit 200 state, not an error", () => {
    const absent = handleLocalDiagnosticsRead(request(tokenHeaders, "203.0.113.9"), {
      ...baseOptions,
      ...offline,
    });
    expect(absent.status).toBe(200);
    expect(absent.body.state).toBe("disabled");

    const switchedOff = handleLocalDiagnosticsRead(request(tokenHeaders, "203.0.113.9"), {
      ...baseOptions,
      ...offline,
      source: source([record(0)], { enabled: false }),
    });
    expect(switchedOff.status).toBe(200);
    expect(switchedOff.body.state).toBe("disabled");
  });

  it("stale reports its age against the stated rule", () => {
    const staleAt = NOW - DIAGNOSTICS_STALENESS_MS - 1;
    const result = handleLocalDiagnosticsRead(request(tokenHeaders, "203.0.113.9"), {
      ...baseOptions,
      ...offline,
      source: source([record(0, { atMs: staleAt, code: "diag.stale" })], {
        lastRecordAtMs: () => staleAt,
      }),
    });
    expect(result.status).toBe(200);
    expect(result.body.state).toBe("stale");
    expect(result.body.staleness).toMatchObject({
      ruleMs: DIAGNOSTICS_STALENESS_MS,
      ageMs: DIAGNOSTICS_STALENESS_MS + 1,
      stale: true,
    });
  });

  it("dropped reports the loss counters as its own state", () => {
    const result = handleLocalDiagnosticsRead(request(tokenHeaders, "203.0.113.9"), {
      ...baseOptions,
      ...offline,
      source: source([record(0)], { loss: () => ({ dropped: 7, windowMs: 60_000 }) }),
    });
    expect(result.status).toBe(200);
    expect(result.body.state).toBe("dropped");
    expect(result.body.loss).toEqual({ dropped: 7, windowMs: 60_000 });
  });

  it("empty is a successful read with zero records", () => {
    const result = handleLocalDiagnosticsRead(request(tokenHeaders, "203.0.113.9"), {
      ...baseOptions,
      ...offline,
      source: source([]),
    });
    expect(result.status).toBe(200);
    expect(result.body.state).toBe("empty");
    expect(result.body.recordCount).toBe(0);
  });

  it("ok is fresh records without loss", () => {
    const result = handleLocalDiagnosticsRead(request(tokenHeaders, "203.0.113.9"), {
      ...baseOptions,
      ...offline,
      source: source([record(0)]),
    });
    expect(result.status).toBe(200);
    expect(result.body.state).toBe("ok");
  });
});

describe("S15c review defects (exact failing inputs)", () => {
  it("Defect A: the WHOLE serialized body is bounded in UTF-8 bytes with CJK identity and long codes", () => {
    const cjk = "实".repeat(512);
    const records = Array.from({ length: 14 }, (_, index) =>
      record(index, { code: "x".repeat(1000) }),
    );
    const result = handleLocalDiagnosticsRead(request(tokenHeaders, "203.0.113.9"), {
      ...baseOptions,
      ...offline,
      source: source(records, { instanceId: cjk, buildId: cjk }),
    });
    expect(result.status).toBe(200);
    const bytes = Buffer.byteLength(JSON.stringify(result.body), "utf8");
    expect(bytes).toBeLessThanOrEqual(MAX_DIAGNOSTICS_RESPONSE_BYTES);
    expect(result.body.recordCount).toBeGreaterThan(0);
    expect(
      Buffer.byteLength(String(result.body.identity?.instanceId ?? ""), "utf8"),
    ).toBeLessThanOrEqual(256);
  });

  it("Defect B: disabled answers before any query validation, while an invalid cursor still 400s with a source", () => {
    const disabled = handleLocalDiagnosticsRead(
      request(tokenHeaders, "203.0.113.9", "?cursor=zzz"),
      { ...baseOptions, ...offline },
    );
    expect(disabled.status).toBe(200);
    expect(disabled.body.state).toBe("disabled");

    const invalidCursor = handleLocalDiagnosticsRead(
      request(tokenHeaders, "203.0.113.9", "?cursor=zzz"),
      { ...baseOptions, ...offline, source: source([record(0)]) },
    );
    expect(invalidCursor.status).toBe(400);
    expect(invalidCursor.body.error).toBe("diagnostics_cursor_invalid");
  });

  it("Defect C: oldest-first records without lastRecordAtMs are not stale while the newest is 1s old", () => {
    const records = [
      record(1, { atMs: NOW - 400_000 }),
      record(0, { atMs: NOW - 1_000 }),
    ];
    const result = handleLocalDiagnosticsRead(request(tokenHeaders, "203.0.113.9"), {
      ...baseOptions,
      ...offline,
      source: source(records, { lastRecordAtMs: undefined }),
    });
    expect(result.body.staleness).toMatchObject({ stale: false, ageMs: 1_000 });
    expect(result.body.state).toBe("ok");
  });

  it("Defect D: loss is visible next to staleness instead of masked by it", () => {
    const staleAt = NOW - DIAGNOSTICS_STALENESS_MS - 1;
    const result = handleLocalDiagnosticsRead(request(tokenHeaders, "203.0.113.9"), {
      ...baseOptions,
      ...offline,
      source: source([record(0, { atMs: staleAt })], {
        lastRecordAtMs: () => staleAt,
        loss: () => ({ dropped: 7, windowMs: 60_000 }),
      }),
    });
    expect(result.body.state).toBe("stale");
    expect(result.body.loss).toEqual({ dropped: 7, windowMs: 60_000 });
    expect(result.body.conditions).toEqual({ stale: true, dropped: true });
  });

  it("a cursor past the end reads as empty, not ok", () => {
    const options = { ...baseOptions, ...offline, source: source([record(0), record(1)]) };
    const firstPage = handleLocalDiagnosticsRead(
      request(tokenHeaders, "203.0.113.9", "?limit=1"),
      options,
    );
    const cursor = firstPage.body.cursor ?? "";
    expect(cursor).not.toBe("");
    const shrunk = { ...baseOptions, ...offline, source: source([record(0)]) };
    const pastEnd = handleLocalDiagnosticsRead(
      request(tokenHeaders, "203.0.113.9", `?limit=1&cursor=${encodeURIComponent(cursor)}`),
      shrunk,
    );
    expect(pastEnd.status).toBe(200);
    expect(pastEnd.body.recordCount).toBe(0);
    expect(pastEnd.body.state).toBe("empty");
  });

  it("the diagnostics 401 carries the path headers (no-store/nosniff)", () => {
    const denied = handleLocalDiagnosticsRead(request({}, "203.0.113.9"), {
      ...baseOptions,
      ...offline,
      source: source([record(0)]),
    });
    expect(denied.status).toBe(401);
    expect(denied.headers["cache-control"]).toBe("no-store");
    expect(denied.headers["x-content-type-options"]).toBe("nosniff");
  });
});
