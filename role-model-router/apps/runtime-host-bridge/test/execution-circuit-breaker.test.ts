import { describe, expect, test } from "vitest";

import {
  type ExecutionCircuitState,
  claimExecutionCircuitProbe,
  clearExecutionCircuitEndpoint,
  createEmptyExecutionCircuitState,
  evaluateExecutionCircuitEligibility,
  migrateLegacyExecutionCooldownState,
  normalizeExecutionCircuitStateForRestart,
  parseExecutionCircuitState,
  parseRetryAfterMs,
  recordExecutionCircuitFailure,
  releaseExecutionCircuitProbe,
  resolveExecutionCircuitRefusal,
  serializeExecutionCircuitState,
  toExecutionCircuitReceipt,
} from "../src/execution-circuit-breaker.js";

const ENDPOINT_ID = "deepseek.personal.deepseek-api-key.global.deepseek-v4-pro";
const START_MS = Date.parse("2026-08-14T08:00:00.000Z");

function fail(
  state: ExecutionCircuitState,
  input: {
    errorClass: string;
    nowMs: number;
    statusCode?: number;
    retryAfterMs?: number;
    trafficClass?: "live" | "benchmark" | "health" | "synthetic";
  },
): ExecutionCircuitState {
  return recordExecutionCircuitFailure({
    state,
    endpointId: ENDPOINT_ID,
    errorClass: input.errorClass,
    nowMs: input.nowMs,
    trafficClass: input.trafficClass ?? "live",
    ...(input.statusCode === undefined ? {} : { statusCode: input.statusCode }),
    ...(input.retryAfterMs === undefined ? {} : { retryAfterMs: input.retryAfterMs }),
    source: {
      providerId: "deepseek",
      providerFamily: "deepseek",
      executionFamily: "remote-service",
      adapterFamily: "ai-sdk-openai-compatible",
    },
  }).state;
}

function requiredRecord(state: ExecutionCircuitState, endpointId = ENDPOINT_ID) {
  const record = state.endpoints[endpointId];
  if (!record) {
    throw new Error(`missing execution circuit record for ${endpointId}`);
  }
  return record;
}

describe("execution circuit breaker policy", () => {
  test("keeps the first connection failure in probation then uses 5s, 15s, 60s, and 5m opens", () => {
    let state = fail(createEmptyExecutionCircuitState(), {
      errorClass: "upstream_connection_error",
      nowMs: START_MS,
    });
    expect(state.endpoints[ENDPOINT_ID]).toMatchObject({
      circuitState: "probation",
      failureCategory: "connection",
      failureCount: 1,
    });
    expect(evaluateExecutionCircuitEligibility(state, ENDPOINT_ID, START_MS)).toMatchObject({
      eligible: true,
      probeRequired: false,
    });

    state = fail(state, { errorClass: "upstream_connection_error", nowMs: START_MS + 1_000 });
    expect(state.endpoints[ENDPOINT_ID]).toMatchObject({
      circuitState: "open",
      failureCount: 2,
      nextProbeAtMs: START_MS + 6_000,
    });

    state = fail(state, { errorClass: "upstream_connection_error", nowMs: START_MS + 2_000 });
    expect(state.endpoints[ENDPOINT_ID]?.nextProbeAtMs).toBe(START_MS + 17_000);
    state = fail(state, { errorClass: "upstream_connection_error", nowMs: START_MS + 3_000 });
    expect(state.endpoints[ENDPOINT_ID]?.nextProbeAtMs).toBe(START_MS + 63_000);
    state = fail(state, { errorClass: "upstream_connection_error", nowMs: START_MS + 4_000 });
    expect(state.endpoints[ENDPOINT_ID]?.nextProbeAtMs).toBe(START_MS + 304_000);
    state = fail(state, { errorClass: "upstream_connection_error", nowMs: START_MS + 5_000 });
    expect(state.endpoints[ENDPOINT_ID]?.nextProbeAtMs).toBe(START_MS + 305_000);
  });

  test("resets a connection sequence outside 60 seconds and every sequence after five quiet minutes", () => {
    let state = fail(createEmptyExecutionCircuitState(), {
      errorClass: "upstream_connection_error",
      nowMs: START_MS,
    });
    state = fail(state, {
      errorClass: "upstream_connection_error",
      nowMs: START_MS + 60_001,
    });
    expect(state.endpoints[ENDPOINT_ID]).toMatchObject({
      circuitState: "probation",
      failureCount: 1,
    });

    state = fail(state, {
      errorClass: "upstream_error",
      statusCode: 503,
      nowMs: START_MS + 61_000,
    });
    expect(state.endpoints[ENDPOINT_ID]).toMatchObject({
      failureCategory: "provider_5xx",
      failureCount: 1,
      nextProbeAtMs: START_MS + 63_000,
    });
    state = fail(state, {
      errorClass: "upstream_error",
      statusCode: 503,
      nowMs: START_MS + 363_001,
    });
    expect(state.endpoints[ENDPOINT_ID]).toMatchObject({
      failureCount: 1,
      nextProbeAtMs: START_MS + 365_001,
    });
  });

  test("uses the provider 5xx 2s, 10s, 30s, and 2m capped ladder", () => {
    let state = createEmptyExecutionCircuitState();
    const expectedDurations = [2_000, 10_000, 30_000, 120_000, 120_000];
    let nowMs = START_MS;
    for (const durationMs of expectedDurations) {
      state = fail(state, { errorClass: "upstream_error", statusCode: 503, nowMs });
      expect(state.endpoints[ENDPOINT_ID]?.nextProbeAtMs).toBe(nowMs + durationMs);
      nowMs += durationMs;
    }
  });

  test("honors bounded Retry-After and otherwise uses a 30 second rate-limit open", () => {
    let state = fail(createEmptyExecutionCircuitState(), {
      errorClass: "rate_limited",
      statusCode: 429,
      nowMs: START_MS,
      retryAfterMs: 90_000,
    });
    expect(state.endpoints[ENDPOINT_ID]).toMatchObject({
      failureCategory: "rate_limit",
      nextProbeAtMs: START_MS + 90_000,
    });
    state = fail(state, {
      errorClass: "rate_limited",
      statusCode: 429,
      nowMs: START_MS + 90_000,
      retryAfterMs: 900_000,
    });
    expect(state.endpoints[ENDPOINT_ID]?.nextProbeAtMs).toBe(START_MS + 390_000);
    state = fail(createEmptyExecutionCircuitState(), {
      errorClass: "rate_limited",
      statusCode: 429,
      nowMs: START_MS,
    });
    expect(state.endpoints[ENDPOINT_ID]?.nextProbeAtMs).toBe(START_MS + 30_000);
  });

  test("blocks auth and quota explicitly but ignores invalid and non-live failures", () => {
    const auth = fail(createEmptyExecutionCircuitState(), {
      errorClass: "provider_auth_error",
      statusCode: 401,
      nowMs: START_MS,
    });
    expect(auth.endpoints[ENDPOINT_ID]).toMatchObject({ circuitState: "blocked_auth" });
    const quota = fail(createEmptyExecutionCircuitState(), {
      errorClass: "quota_exhausted",
      statusCode: 402,
      nowMs: START_MS,
    });
    expect(quota.endpoints[ENDPOINT_ID]).toMatchObject({ circuitState: "blocked_quota" });
    const invalid = fail(createEmptyExecutionCircuitState(), {
      errorClass: "invalid_request",
      statusCode: 400,
      nowMs: START_MS,
    });
    expect(invalid.endpoints[ENDPOINT_ID]).toBeUndefined();
    const benchmark = fail(createEmptyExecutionCircuitState(), {
      errorClass: "upstream_error",
      statusCode: 503,
      nowMs: START_MS,
      trafficClass: "benchmark",
    });
    expect(benchmark.endpoints[ENDPOINT_ID]).toBeUndefined();
  });

  test("admits exactly one half-open probe and success clears the circuit", () => {
    let state = fail(createEmptyExecutionCircuitState(), {
      errorClass: "upstream_error",
      statusCode: 503,
      nowMs: START_MS,
    });
    expect(evaluateExecutionCircuitEligibility(state, ENDPOINT_ID, START_MS + 2_000)).toEqual({
      eligible: true,
      probeRequired: true,
    });
    const firstClaim = claimExecutionCircuitProbe({
      state,
      endpointId: ENDPOINT_ID,
      nowMs: START_MS + 2_000,
      probeOwnerId: "req-one",
    });
    expect(firstClaim.claimed).toBe(true);
    state = firstClaim.state;
    expect(state.endpoints[ENDPOINT_ID]).toMatchObject({
      circuitState: "half_open",
      probeOwnerId: "req-one",
    });
    expect(
      claimExecutionCircuitProbe({
        state,
        endpointId: ENDPOINT_ID,
        nowMs: START_MS + 2_001,
        probeOwnerId: "req-two",
      }).claimed,
    ).toBe(false);
    expect(
      releaseExecutionCircuitProbe({
        state,
        endpointId: ENDPOINT_ID,
        probeOwnerId: "req-two",
        nowMs: START_MS + 2_002,
      }).state,
    ).toEqual(state);
    expect(
      clearExecutionCircuitEndpoint(state, ENDPOINT_ID).endpoints[ENDPOINT_ID],
    ).toBeUndefined();
  });

  test("recovers an abandoned half-open claim as an immediately probeable open circuit", () => {
    let state = fail(createEmptyExecutionCircuitState(), {
      errorClass: "upstream_error",
      statusCode: 503,
      nowMs: START_MS,
    });
    state = claimExecutionCircuitProbe({
      state,
      endpointId: ENDPOINT_ID,
      nowMs: START_MS + 2_000,
      probeOwnerId: "crashed-request",
    }).state;
    const recovered = normalizeExecutionCircuitStateForRestart(state, START_MS + 3_000);
    expect(recovered.endpoints[ENDPOINT_ID]).toMatchObject({
      circuitState: "open",
      nextProbeAtMs: START_MS + 3_000,
    });
    expect(recovered.endpoints[ENDPOINT_ID]?.probeOwnerId).toBeUndefined();
  });

  test("retires legacy v1 cooldowns without carrying their long bans into v2", () => {
    const legacy = JSON.stringify({
      [ENDPOINT_ID]: {
        endpointId: ENDPOINT_ID,
        failureCount: 6,
        cooldownUntilMs: START_MS + 20 * 60 * 60 * 1_000,
        lastFailureAtMs: START_MS,
        lastErrorClass: "upstream_connection_error",
      },
    });
    const migrated = migrateLegacyExecutionCooldownState(undefined, legacy, START_MS + 1);
    expect(migrated).toMatchObject({
      schemaVersion: 2,
      endpoints: {},
      migratedFromV1AtMs: START_MS + 1,
      retiredLegacyEndpointCount: 1,
    });
  });

  test("bounds persisted input and emits safe receipts with retry metadata", () => {
    const endpoints = Object.fromEntries(
      Array.from({ length: 600 }, (_, index) => [
        `endpoint-${String(index).padStart(3, "0")}`,
        {
          endpointId: `endpoint-${String(index).padStart(3, "0")}`,
          circuitState: "open",
          failureCategory: "provider_5xx",
          failureCount: 1,
          sequenceStartedAtMs: START_MS,
          lastFailureAtMs: START_MS,
          nextProbeAtMs: START_MS + 2_000,
          lastErrorClass: "upstream_error",
        },
      ]),
    );
    const parsed = parseExecutionCircuitState(JSON.stringify({ schemaVersion: 2, endpoints }));
    expect(Object.keys(parsed.endpoints)).toHaveLength(512);
    const roundTrip = parseExecutionCircuitState(serializeExecutionCircuitState(parsed));
    const receipt = toExecutionCircuitReceipt(
      requiredRecord(roundTrip, "endpoint-000"),
      START_MS + 500,
    );
    expect(receipt).toMatchObject({
      schemaVersion: 2,
      endpointId: "endpoint-000",
      circuitState: "open",
      failureCategory: "provider_5xx",
      active: true,
      retryAfterMs: 1_500,
      nextProbeAtMs: START_MS + 2_000,
      cooldownUntilMs: START_MS + 2_000,
    });
    expect(parseExecutionCircuitState("{broken")).toEqual(createEmptyExecutionCircuitState());
  });

  test("parses Retry-After seconds and HTTP dates with a five-minute cap", () => {
    expect(parseRetryAfterMs("2.5", START_MS)).toBe(2_500);
    expect(parseRetryAfterMs(new Date(START_MS + 60_000).toUTCString(), START_MS)).toBe(60_000);
    expect(parseRetryAfterMs("900", START_MS)).toBe(300_000);
    expect(parseRetryAfterMs("invalid", START_MS)).toBeUndefined();
  });

  test("resets failure sequences exactly at the quiet-window boundaries", () => {
    const probation = fail(createEmptyExecutionCircuitState(), {
      errorClass: "upstream_connection_error",
      nowMs: START_MS,
    });
    expect(
      fail(probation, {
        errorClass: "upstream_connection_error",
        nowMs: START_MS + 60_000,
      }).endpoints[ENDPOINT_ID],
    ).toMatchObject({ circuitState: "probation", failureCount: 1 });

    const open = fail(createEmptyExecutionCircuitState(), {
      errorClass: "upstream_error",
      statusCode: 503,
      nowMs: START_MS,
    });
    expect(
      fail(open, {
        errorClass: "upstream_error",
        statusCode: 503,
        nowMs: START_MS + 300_000,
      }).endpoints[ENDPOINT_ID],
    ).toMatchObject({ circuitState: "open", failureCount: 1 });
  });

  test("uses 503 only for timed cooldowns and reports configuration blocks separately", () => {
    expect(resolveExecutionCircuitRefusal([], START_MS)).toBeUndefined();
    const timedReceipt = toExecutionCircuitReceipt(
      requiredRecord(
        fail(createEmptyExecutionCircuitState(), {
          errorClass: "upstream_error",
          statusCode: 503,
          nowMs: START_MS,
        }),
      ),
      START_MS,
    );
    expect(resolveExecutionCircuitRefusal([timedReceipt], START_MS)).toEqual({
      statusCode: 503,
      code: "endpoint_temporarily_unavailable",
      nextProbeAtMs: START_MS + 2_000,
      retryAfterMs: 2_000,
    });

    const authReceipt = toExecutionCircuitReceipt(
      requiredRecord(
        fail(createEmptyExecutionCircuitState(), {
          errorClass: "provider_auth_error",
          statusCode: 401,
          nowMs: START_MS,
        }),
      ),
      START_MS,
    );
    expect(resolveExecutionCircuitRefusal([authReceipt], START_MS)).toEqual({
      statusCode: 400,
      code: "endpoint_configuration_blocked",
    });
  });
});
