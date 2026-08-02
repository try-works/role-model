import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { validateRun88PrivateDistributionIdentity } from "../src/kw-private-loader.js";
import * as runtimeVersion from "../src/runtime-version.js";
import * as trackBRuntime from "../src/track-b-runtime.js";
import {
  publicRuntimeAcceptanceProbes,
  runPublicRuntimeAcceptanceProbe,
} from "./run88-public-runtime-probes.js";

const { resolveRuntimeVersionInfo } = runtimeVersion;
const {
  createRun88RuntimeCorrelation,
  createTrackBPostObservationOutbox,
  normalizeRun88RuntimeCorrelation,
} = trackBRuntime;

const roots: string[] = [];
afterEach(async () =>
  Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))),
);

describe("Run 88 stage release boundary", () => {
  it("public runtime probes are criterion-specific at every required layer", () => {
    const expected = [
      "R2-AC02",
      "R2-AC03",
      "R2-AC04",
      "R4-AC05",
      "R4-AC06",
      "R5-AC01",
      "R6-AC06",
      "R7-AC03",
      "R8-AC03",
      "R8-AC05",
      "R9-AC01",
      "R9-AC02",
      "R9-AC03",
      "R9-AC04",
      "R9-AC05",
      "R9-AC06",
      "R10-AC01",
      "R10-AC02",
      "R10-AC03",
      "R10-AC04",
      "R10-AC05",
      "R11-AC04",
      "R11-AC05",
      "R14-AC06",
    ];
    expect(Object.keys(publicRuntimeAcceptanceProbes).sort()).toEqual(expected.sort());
    for (const layer of ["unit", "integration", "regression"] as const) {
      const probes = expected.map((id) => publicRuntimeAcceptanceProbes[id]?.[layer]);
      expect(probes.every((probe) => typeof probe === "function")).toBe(true);
      expect(new Set(probes).size).toBe(expected.length);
    }
  });
  const fullCorrelation = () => ({
    schemaVersion: "run88-correlation.v1",
    eventId: "event-1",
    correlationId: "corr-1",
    traceId: "1".repeat(32),
    spanId: "2".repeat(16),
    causalParentId: "root",
    service: "runtime-host-bridge",
    operation: "private-distribution.invoke",
    runtimeChannel: "staging",
    scopeHash: `sha256:${"3".repeat(64)}`,
    cohort: "stage-1pct",
    releaseId: `sha256:${"a".repeat(64)}`,
    sourceId: "4".repeat(40),
    deploymentId: "local-stage-runtime",
    attempt: 1,
    outcome: "accepted",
    timestamp: "2026-08-02T00:00:00.000Z",
    durationMs: 1,
  });
  it("RUN88-U-PUB-R10-AC01 accepts N/N and N/N-1, degrades when private is absent, and refuses mixed identity", () => {
    expect(typeof validateRun88PrivateDistributionIdentity).toBe("function");
    const expected = {
      channel: "stage",
      manifestSha256: "a".repeat(64),
      publicGeneration: "N" as const,
    };
    expect(
      validateRun88PrivateDistributionIdentity(
        { generation: "N", manifestSha256: "a".repeat(64), channel: "stage" },
        expected,
      ).compatible,
    ).toBe(true);
    expect(
      validateRun88PrivateDistributionIdentity(
        { generation: "N-1", manifestSha256: "a".repeat(64), channel: "stage" },
        expected,
      ).compatible,
    ).toBe(true);
    expect(validateRun88PrivateDistributionIdentity(null, expected)).toEqual({
      available: false,
      compatible: false,
      degradation: "public-routing-only",
    });
    expect(() =>
      validateRun88PrivateDistributionIdentity(
        { generation: "N+1", manifestSha256: "a".repeat(64), channel: "stage" },
        expected,
      ),
    ).toThrow(/generation/i);
    expect(() =>
      validateRun88PrivateDistributionIdentity(
        { generation: "N", manifestSha256: "b".repeat(64), channel: "stage" },
        expected,
      ),
    ).toThrow(/manifest/i);
  });

  it("RUN88-U-PUB-R2-AC03 rejects every partial packaged stage identity field", () => {
    expect(typeof runtimeVersion.validateRun88PackagedStageIdentity).toBe("function");
    const complete = {
      channel: "stage",
      name: "role-model-stage",
      host: "127.0.0.1",
      port: 3457,
      endpoint: "http://127.0.0.1:3457",
      state_root_name: "role-model-runtime-stage",
      scope_id: "standalone-runtime-stage",
      source_tree: "1".repeat(40),
      executable_sha256: "2".repeat(64),
      core_payload_sha256: "3".repeat(64),
      release_id: `sha256:${"4".repeat(64)}`,
      private_distribution_sha256: "5".repeat(64),
      track_b_runtime: { manifest_sha256: "5".repeat(64) },
    };
    expect(runtimeVersion.validateRun88PackagedStageIdentity(complete).endpoint).toBe(
      complete.endpoint,
    );
    for (const field of [
      "channel",
      "name",
      "host",
      "port",
      "endpoint",
      "state_root_name",
      "scope_id",
      "source_tree",
      "executable_sha256",
      "core_payload_sha256",
      "release_id",
      "private_distribution_sha256",
      "track_b_runtime",
    ] as const) {
      const partial = { ...complete } as Record<string, unknown>;
      delete partial[field];
      expect(() => runtimeVersion.validateRun88PackagedStageIdentity(partial)).toThrow(
        /stage|identity|missing|invalid|distribution/i,
      );
    }
  });

  it("RUN88-U-PUB-R8-AC04 derives one immutable backend identity from the validated package", () => {
    const manifest = {
      channel: "stage",
      name: "role-model-stage",
      host: "127.0.0.1",
      port: 3457,
      endpoint: "http://127.0.0.1:3457",
      state_root_name: "role-model-runtime-stage",
      scope_id: "standalone-runtime-stage",
      source_tree: "1".repeat(40),
      executable_sha256: "2".repeat(64),
      core_payload_sha256: "3".repeat(64),
      release_id: `sha256:${"4".repeat(64)}`,
      private_distribution_sha256: "5".repeat(64),
      track_b_runtime: { manifest_sha256: "5".repeat(64) },
    };
    const identity = runtimeVersion.resolveRun88StageRuntimeIdentity("stage", manifest);
    expect(identity).toEqual({
      releaseId: manifest.release_id,
      sourceId: manifest.source_tree,
      executableSha256: manifest.executable_sha256,
    });
    expect(Object.isFrozen(identity)).toBe(true);
    expect(runtimeVersion.resolveRun88StageRuntimeIdentity("production", manifest)).toBeUndefined();
  });

  it("RUN88-R-PUB-R8-AC04 refuses to derive a stage backend identity from incomplete metadata", () => {
    expect(() =>
      runtimeVersion.resolveRun88StageRuntimeIdentity("stage", {
        channel: "stage",
        release_id: `sha256:${"4".repeat(64)}`,
      }),
    ).toThrow(/stage|identity|endpoint|state|scope/i);
  });

  it("RUN88-U-PUB-R7-AC03 refuses provider success without signed Pi CLI process proof", () => {
    const validate = (
      trackBRuntime as unknown as {
        validateRun88ProviderResponseObservation: (
          observation: Readonly<Record<string, unknown>>,
          provenance: Readonly<Record<string, unknown>>,
        ) => unknown;
      }
    ).validateRun88ProviderResponseObservation;
    expect(() =>
      validate(
        {
          requestId: "api-only-request",
          clientRequestId: "api-only-client-request",
          routingDecisionId: "decision-1",
          endpointId: "provider-endpoint",
          executionTelemetry: { providerFamily: "openai" },
          inspection: {
            request: {
              requestId: "api-only-request",
              clientRequestId: "api-only-client-request",
              routingDecisionId: "decision-1",
              requestCapture: { headers: {}, body: { model: "gpt" } },
              responseCapture: { statusCode: 200, body: { output: "provider output" } },
            },
          },
        },
        { source: "routed-execution-callback" },
      ),
    ).toThrow(/Pi|invocation|proof|authority/i);
  });

  it("RUN88-U-PUB-R5-AC01 preserves the versioned correlation envelope at the public/private boundary", () => {
    expect(typeof normalizeRun88RuntimeCorrelation).toBe("function");
    const envelope = fullCorrelation();
    expect(normalizeRun88RuntimeCorrelation(envelope, envelope.releaseId)).toEqual(envelope);
    expect(() =>
      normalizeRun88RuntimeCorrelation({ ...envelope, prompt: "raw" }, envelope.releaseId),
    ).toThrow(/field/i);
    expect(() =>
      normalizeRun88RuntimeCorrelation(
        { ...envelope, releaseId: `sha256:${"b".repeat(64)}` },
        envelope.releaseId,
      ),
    ).toThrow(/release/i);
    for (const field of [
      "eventId",
      "service",
      "operation",
      "scopeHash",
      "cohort",
      "deploymentId",
      "attempt",
      "outcome",
      "timestamp",
      "durationMs",
    ]) {
      const incomplete = { ...envelope } as Record<string, unknown>;
      delete incomplete[field];
      expect(() => normalizeRun88RuntimeCorrelation(incomplete, envelope.releaseId)).toThrow(
        new RegExp(field, "i"),
      );
    }
  });

  it("RUN88-U-PUB-R8-AC04 constructs recommendation-specific stage correlation", () => {
    expect(
      createRun88RuntimeCorrelation({
        requestId: "recommendation-request-1",
        routingDecisionId: "recommendation-resolve-1",
        releaseId: `sha256:${"a".repeat(64)}`,
        sourceId: "b".repeat(40),
        deploymentId: `local-stage:${"c".repeat(64)}`,
        scope: "run88-stage-scope",
        timestamp: "2026-08-02T00:00:00.000Z",
        operation: "recommendation.resolve",
        outcome: "requested",
      }),
    ).toMatchObject({
      schemaVersion: "run88-correlation.v1",
      service: "runtime-host-bridge",
      operation: "recommendation.resolve",
      runtimeChannel: "staging",
      outcome: "requested",
    });
  });

  it("stage runtime constructs correlation at actual ingress and the durable outbox preserves it", async () => {
    const createRun88RuntimeCorrelation = (
      trackBRuntime as unknown as {
        createRun88RuntimeCorrelation?: (input: Record<string, unknown>) => Record<string, unknown>;
      }
    ).createRun88RuntimeCorrelation;
    expect(typeof createRun88RuntimeCorrelation).toBe("function");
    const correlation = createRun88RuntimeCorrelation?.({
      requestId: "request-1",
      routingDecisionId: "decision-1",
      releaseId: `sha256:${"a".repeat(64)}`,
      sourceId: "b".repeat(40),
      deploymentId: "local-stage-runtime",
      scope: "synthetic-stage-scope",
      timestamp: "2026-08-02T00:00:00.000Z",
    });
    const root = path.join(os.tmpdir(), `run88-outbox-${process.pid}-${Date.now()}`);
    roots.push(root);
    await mkdir(root, { recursive: true });
    const outbox = createTrackBPostObservationOutbox({ filePath: path.join(root, "outbox.json") });
    await outbox.enqueue({
      requestId: "request-1",
      routingDecisionId: "decision-1",
      endpointId: "endpoint-1",
      run88Correlation: correlation,
    });
    let observed: Readonly<Record<string, unknown>> | undefined;
    await outbox.drain(async (item) => {
      observed = item;
      return { status: "observed" };
    });
    expect(observed?.run88Correlation).toEqual(correlation);
  });

  it("packaged stage identity fails closed when release or private-distribution binding is missing", () => {
    const validateRun88PackagedStageIdentity = (
      runtimeVersion as unknown as {
        validateRun88PackagedStageIdentity?: (
          manifest: Record<string, unknown>,
        ) => Readonly<Record<string, unknown>>;
      }
    ).validateRun88PackagedStageIdentity;
    expect(typeof validateRun88PackagedStageIdentity).toBe("function");
    expect(() =>
      validateRun88PackagedStageIdentity?.({
        channel: "stage",
        name: "role-model-stage",
        port: 3457,
      }),
    ).toThrow(/release|distribution|endpoint|state|scope/i);
    expect(
      validateRun88PackagedStageIdentity?.({
        channel: "stage",
        name: "role-model-stage",
        host: "127.0.0.1",
        port: 3457,
        endpoint: "http://127.0.0.1:3457",
        state_root_name: "role-model-runtime-stage",
        scope_id: "standalone-runtime-stage",
        release_id: `sha256:${"a".repeat(64)}`,
        private_distribution_sha256: "b".repeat(64),
        source_tree: "c".repeat(40),
        executable_sha256: "d".repeat(64),
        core_payload_sha256: "e".repeat(64),
        track_b_runtime: { manifest_sha256: "b".repeat(64) },
      }),
    ).toMatchObject({ channel: "stage" });
  });

  it("reports release and private-distribution identity through runtime version metadata", async () => {
    const root = path.join(os.tmpdir(), `run88-version-${process.pid}-${Date.now()}`);
    roots.push(root);
    await mkdir(root, { recursive: true });
    await writeFile(
      path.join(root, "manifest.json"),
      JSON.stringify({
        version: "1.1.0",
        commit: "a".repeat(40),
        build_date: "2026-08-02T00:00:00.000Z",
        release_id: `sha256:${"b".repeat(64)}`,
        private_distribution_sha256: "c".repeat(64),
      }),
    );
    const value = await resolveRuntimeVersionInfo({ repoRoot: root });
    expect(value.release_id).toBe(`sha256:${"b".repeat(64)}`);
    expect(value.private_distribution_sha256).toBe("c".repeat(64));
  });

  {
    const acceptances = [
      "R4-AC06",
      "R7-AC03",
      "R8-AC03",
      "R10-AC03",
      "R10-AC04",
      "R10-AC05",
      "R11-AC05",
    ];
    for (const acceptanceId of acceptances) {
      it(`RUN88-U-PUB-${acceptanceId}`, () =>
        runPublicRuntimeAcceptanceProbe(acceptanceId, "unit"));
    }
  }
});
