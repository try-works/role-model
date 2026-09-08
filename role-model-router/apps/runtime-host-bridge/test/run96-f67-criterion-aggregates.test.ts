import { createServer } from "node:http";

import { afterEach, describe, expect, test } from "vitest";

import {
  buildGraphEvidenceFromCapture,
  buildLegacyTerminalFailureRecoveryCapture,
  buildProviderEvidenceFromObservation,
  createTrackBOperations,
} from "../src/track-b-operations.js";
import {
  createRouterReplayAdapter,
  createTrackBProductionRuntime,
} from "../src/track-b-runtime.js";

const servers: ReturnType<typeof createServer>[] = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve) => {
          if (!server.listening) {
            resolve();
            return;
          }
          server.close(() => resolve());
        }),
    ),
  );
});

const dispatchReceipt = {
  dispatchReceiptId: "dispatch:run96-f67-aggregate",
  routerDecisionId: "decision:run96-f67-aggregate",
  providerResultRef: "artifact:provider-result-run96-f67-aggregate",
  observedCostMicros: 0,
  observedResponseBytes: 0,
};

function baseEnvelope(): Record<string, unknown> {
  return {
    schemaVersion: "role-model.replay-dispatch.v1",
    channel: "development",
    scope: "run96:f67:aggregate",
    replayJobId: "replay:run96-f67-aggregate",
    sourceGeneration: 1,
    sourceDecisionId: "decision:source-run96-f67-aggregate",
    normalizedRequestRef: "artifact:request-run96-f67-aggregate",
    candidateEndpointId: "endpoint:counterfactual-run96-f67-aggregate",
    dispatchIdempotencyKey: "a".repeat(64),
    candidatePackage: {
      endpointId: "endpoint:counterfactual-run96-f67-aggregate",
      modelId: "model:run96-f67-aggregate",
      reasoningEffort: null,
      promptAdapterId: "prompt:stable-v1",
      toolPolicy: "deny",
      experiencePackId: "experience:none",
      samplingProfileId: "sampling:stable-v1",
    },
    budget: {
      maxCandidates: 1,
      maxProviderCalls: 1,
      maxCostMicros: 5_000,
      maxBytes: 16_384,
      deadlineMs: 10_000,
    },
    toolPolicy: "deny",
    authorizationEpoch: 96,
    nonce: "run96-f67-aggregate-nonce",
    capability: "replay:provider-dispatch",
  };
}

function createReplayAdapter() {
  return createRouterReplayAdapter({
    channel: "development",
    scope: "run96:f67:aggregate",
    authorizationEpoch: 96,
    authorizationSecret: "run96-f67-aggregate-authorization-secret",
    dispatch: async () => dispatchReceipt,
  });
}

async function startOperatorFixture(
  response: Record<string, unknown>,
  expectedToken: string,
): Promise<string> {
  const server = createServer((request, responseStream) => {
    const authorized = request.headers.authorization === `Bearer ${expectedToken}`;
    responseStream.setHeader("content-type", "application/json");
    if (!authorized) {
      responseStream.statusCode = 401;
      responseStream.end(JSON.stringify({ error: "operator_authentication_required" }));
      return;
    }
    responseStream.statusCode = 200;
    responseStream.end(JSON.stringify(response));
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("operator fixture did not bind");
  return `http://127.0.0.1:${address.port}`;
}

async function startCapturingOperatorFixture(
  response: Record<string, unknown>,
  expectedToken: string,
  received: Array<{ path: string; body: Record<string, unknown> }>,
): Promise<string> {
  const server = createServer(async (request, responseStream) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const body = chunks.length
      ? (JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>)
      : {};
    received.push({ path: request.url ?? "", body });
    const authorized = request.headers.authorization === `Bearer ${expectedToken}`;
    responseStream.setHeader("content-type", "application/json");
    if (!authorized) {
      responseStream.statusCode = 401;
      responseStream.end(JSON.stringify({ error: "operator_authentication_required" }));
      return;
    }
    responseStream.statusCode = 200;
    responseStream.end(JSON.stringify(response));
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("operator fixture did not bind");
  return `http://127.0.0.1:${address.port}`;
}

describe("Run 96 Addendum 26 F67 criterion-owned production aggregates", () => {
  test("AC-R24-01 aggregate: one authenticated IPC conjunction enforces version, capability, channel, scope, epoch, size, paths, secrets, authorization, and replay", async () => {
    const adapter = createReplayAdapter();
    const envelope = baseEnvelope();
    const authorization = await adapter.authorize({ envelope });

    expect(authorization).toMatchObject({
      schemaVersion: "role-model.replay-adapter-authorization.v1",
      channel: "development",
      scope: "run96:f67:aggregate",
      authorizationEpoch: 96,
    });
    await expect(adapter.verifyAuthorization({ envelope, authorization })).resolves.toEqual({
      verified: true,
    });
    await expect(adapter.dispatch(envelope, { authorization })).resolves.toMatchObject(
      dispatchReceipt,
    );

    const rejected = [
      {
        label: "version",
        envelope: { ...baseEnvelope(), schemaVersion: "role-model.replay-dispatch.v0" },
      },
      {
        label: "capability",
        envelope: { ...baseEnvelope(), capability: "filesystem:read" },
      },
      {
        label: "caller path",
        envelope: { ...baseEnvelope(), callerFilesystemPath: "C:\\private\\prompt.txt" },
      },
      {
        label: "secret",
        envelope: { ...baseEnvelope(), apiKey: "sk-live-run96-f67" },
      },
      {
        label: "size",
        envelope: { ...baseEnvelope(), replayJobId: `replay:${"x".repeat(1_100_000)}` },
      },
    ];
    for (const [index, item] of rejected.entries()) {
      const candidate = { ...item.envelope, nonce: `run96-f67-aggregate-reject-${index}` };
      const candidateAdapter = createReplayAdapter();
      const candidateAuthorization = await candidateAdapter.authorize({ envelope: candidate });
      await expect(
        candidateAdapter.dispatch(candidate, { authorization: candidateAuthorization }),
      ).rejects.toThrow();
      expect(item.label).toBeTruthy();
    }

    const bindingAdapter = createReplayAdapter();
    const bindingEnvelope = baseEnvelope();
    const bindingAuthorization = await bindingAdapter.authorize({ envelope: bindingEnvelope });
    for (const mutated of [
      { ...bindingEnvelope, channel: "stage" },
      { ...bindingEnvelope, scope: "run96:f67:other-scope" },
      { ...bindingEnvelope, authorizationEpoch: 95 },
    ]) {
      await expect(
        bindingAdapter.dispatch(mutated, { authorization: bindingAuthorization }),
      ).rejects.toThrow(/channel|scope|epoch|authorization/i);
    }

    const replayAdapter = createReplayAdapter();
    const replayEnvelope = baseEnvelope();
    const replayAuthorization = await replayAdapter.authorize({ envelope: replayEnvelope });
    await expect(
      replayAdapter.dispatch(replayEnvelope, { authorization: replayAuthorization }),
    ).resolves.toMatchObject(dispatchReceipt);
    await expect(
      replayAdapter.dispatch(replayEnvelope, { authorization: replayAuthorization }),
    ).rejects.toThrow(/replay/i);
  });

  test("AC-R30-02 aggregate: every public privileged boundary rejects unauthenticated, stale, revoked, cross-scope, cross-channel, and ID-only access while preserving authorized routing", async () => {
    const adapter = createReplayAdapter();
    const envelope = baseEnvelope();
    const authorization = await adapter.authorize({ envelope });

    await expect(adapter.dispatch(envelope)).rejects.toThrow(/authorization/i);
    await expect(
      adapter.dispatch(envelope, {
        authorization: { ...authorization, mac: "0".repeat(64) },
      }),
    ).rejects.toThrow(/authorization/i);
    await expect(
      adapter.dispatch({ ...envelope, authorizationEpoch: 95 }, { authorization }),
    ).rejects.toThrow(/epoch|authorization/i);
    await expect(
      adapter.dispatch({ ...envelope, channel: "stage" }, { authorization }),
    ).rejects.toThrow(/channel|authorization/i);
    await expect(
      adapter.dispatch({ ...envelope, scope: "run96:f67:other-scope" }, { authorization }),
    ).rejects.toThrow(/scope|authorization/i);
    await expect(
      adapter.dispatch(
        { ...envelope, callerFilesystemPath: "C:\\private\\prompt.txt" },
        {
          authorization,
        },
      ),
    ).rejects.toThrow(/path|filesystem/i);

    const revokedAdapter = createRouterReplayAdapter({
      channel: "development",
      scope: "run96:f67:aggregate",
      authorizationEpoch: 96,
      authorize: async ({ envelope: authorizedEnvelope }) => ({
        schemaVersion: "role-model.replay-adapter-authorization.v1",
        algorithm: "hmac-sha256",
        keyId: "revoked-run96-f67-key",
        nonce: String(authorizedEnvelope.nonce),
        channel: "development",
        scope: "run96:f67:aggregate",
        authorizationEpoch: 96,
        mac: "a".repeat(64),
      }),
      verifyAuthorization: async () => ({ verified: false }),
      dispatch: async () => dispatchReceipt,
    });
    const revokedAuthorization = await revokedAdapter.authorize({ envelope });
    await expect(
      revokedAdapter.dispatch(envelope, { authorization: revokedAuthorization }),
    ).rejects.toThrow(/authorization/i);

    const authorized = await adapter.dispatch(envelope, { authorization });
    expect(authorized).toMatchObject(dispatchReceipt);
    await expect(adapter.dispatch(envelope, { authorization })).rejects.toThrow(/replay/i);

    const expectedToken = "run96-f67-operator-token-0123456789";
    const operationsEndpoint = await startOperatorFixture(
      { overall: "available", capabilities: { replay: "available" } },
      expectedToken,
    );
    const noToken = createTrackBOperations({
      statePath: "run96-f67-no-token.json",
      catalog: [],
      operationsEndpoint,
      operationsToken: undefined,
    });
    await expect(noToken.readOperatorStatus()).rejects.toThrow(/launcher-issued/i);
    await expect(noToken.readReplayJob("job:known-to-attacker")).rejects.toThrow(
      /launcher-issued/i,
    );
    const wrongToken = createTrackBOperations({
      statePath: "run96-f67-wrong-token.json",
      catalog: [],
      operationsEndpoint,
      operationsToken: "run96-f67-wrong-token-0123456789",
    });
    await expect(wrongToken.readOperatorStatus()).rejects.toThrow(
      /401|authentication_required|operation/i,
    );
    const validToken = createTrackBOperations({
      statePath: "run96-f67-valid-token.json",
      catalog: [],
      operationsEndpoint,
      operationsToken: expectedToken,
    });
    await expect(validToken.readOperatorStatus()).resolves.toMatchObject({ overall: "available" });

    const productionRuntime = createTrackBProductionRuntime({
      stateRoot: "run96-f67-routing-state",
      sidecar: {
        artifactPath: "run96-f67-sidecar.mjs",
        artifactSha256: "a".repeat(64),
        async launch() {
          throw new Error("not required for routing authorization assertion");
        },
      },
    });
    expect(productionRuntime.health()).toMatchObject({ routingAvailable: true });
    await productionRuntime.stop();
  });

  test("AC-R30-05 aggregate: production projections and receipts expose durable identities without secrets or raw private payloads", async () => {
    const sensitivePrompt = "private prompt run96-f67 must never cross a metadata boundary";
    const sensitiveSecret = "sk-live-run96-f67-secret";
    const graph = buildGraphEvidenceFromCapture({
      rootArtifactId: "artifact:run96-f67-privacy",
      edgeCount: 1,
      messages: [
        { nodeId: "node:user", role: "user", content: sensitivePrompt, apiKey: sensitiveSecret },
      ],
      response: { nodeId: "node:assistant", content: "private response" },
      tools: [{ nodeId: "node:tool", arguments: "private tool arguments" }],
    });
    const provider = buildProviderEvidenceFromObservation({
      requestId: "request:run96-f67-privacy",
      endpointId: "endpoint:run96-f67-privacy",
      modelId: "model:run96-f67-privacy",
      statusFamily: "failure",
      failure: {
        errorClass: "provider_unavailable",
        message: sensitivePrompt,
        apiKey: sensitiveSecret,
      },
      usageEvent: { model_id: "model:run96-f67-privacy", content: sensitivePrompt },
    });
    const legacy = buildLegacyTerminalFailureRecoveryCapture({
      requestId: "request:run96-f67-privacy",
      routingDecisionId: "decision:run96-f67-privacy",
      endpointId: "endpoint:run96-f67-privacy",
      modelId: "model:run96-f67-privacy",
      statusFamily: "failure",
      failure: {
        errorClass: "provider_unavailable",
        statusCode: 503,
        message: sensitivePrompt,
        secret: sensitiveSecret,
      },
    });
    for (const projection of [graph, provider, legacy]) {
      const serialized = JSON.stringify(projection);
      expect(serialized).not.toContain(sensitivePrompt);
      expect(serialized).not.toContain(sensitiveSecret);
    }

    const adapter = createRouterReplayAdapter({
      channel: "development",
      scope: "run96:f67:privacy",
      authorizationEpoch: 96,
      authorizationSecret: "run96-f67-privacy-authorization-secret",
      dispatch: async () => ({
        ...dispatchReceipt,
        outputText: sensitivePrompt,
        secret: sensitiveSecret,
      }),
    });
    const envelope = { ...baseEnvelope(), scope: "run96:f67:privacy" };
    const authorization = await adapter.authorize({ envelope });
    await expect(adapter.dispatch(envelope, { authorization })).rejects.toThrow(
      /credential|secret/i,
    );

    const expectedToken = "run96-f67-privacy-operator-token-0123456789";
    const operationsEndpoint = await startOperatorFixture(
      {
        overall: "available",
        rawSecret: sensitiveSecret,
        rawContent: sensitivePrompt,
        graphMetadata: { content: sensitivePrompt },
        compactTelemetry: { message: sensitivePrompt },
        eventLog: { body: sensitivePrompt },
        jobRecord: { prompt: sensitivePrompt },
        cloudPayload: { apiKey: sensitiveSecret },
        receipt: { response: sensitivePrompt },
        ui: { output: sensitivePrompt },
        logs: { input: sensitivePrompt },
        committedEvidence: { content: sensitivePrompt },
        capabilities: { graph: "available" },
      },
      expectedToken,
    );
    const operations = createTrackBOperations({
      statePath: "run96-f67-privacy-state.json",
      catalog: [],
      operationsEndpoint,
      operationsToken: expectedToken,
    });
    const operatorProjection = await operations.readOperatorStatus();
    expect(operatorProjection).toMatchObject({
      graphMetadata: { content: "[redacted]" },
      compactTelemetry: { message: "[redacted]" },
      eventLog: { body: "[redacted]" },
      jobRecord: { prompt: "[redacted]" },
      cloudPayload: { apiKey: "[redacted]" },
      receipt: { response: "[redacted]" },
      ui: { output: "[redacted]" },
      logs: { input: "[redacted]" },
      committedEvidence: { content: "[redacted]" },
    });
    const serializedOperatorProjection = JSON.stringify(operatorProjection);
    expect(serializedOperatorProjection).not.toContain(sensitivePrompt);
    expect(serializedOperatorProjection).not.toContain(sensitiveSecret);

    const received: Array<{ path: string; body: Record<string, unknown> }> = [];
    const cloudEndpoint = await startCapturingOperatorFixture(
      {
        status: "accepted",
        jobRecord: { prompt: sensitivePrompt },
        cloudPayload: { apiKey: sensitiveSecret },
        receipt: { content: sensitivePrompt },
      },
      expectedToken,
      received,
    );
    const cloudOperations = createTrackBOperations({
      statePath: "run96-f67-cloud-state.json",
      catalog: [],
      operationsEndpoint: cloudEndpoint,
      operationsToken: expectedToken,
    });
    await expect(
      cloudOperations.createReplayJob({
        jobId: "job:run96-f67",
        prompt: sensitivePrompt,
        nested: { apiKey: sensitiveSecret },
      }),
    ).resolves.toMatchObject({
      status: "accepted",
      jobRecord: { prompt: "[redacted]" },
      cloudPayload: { apiKey: "[redacted]" },
      receipt: { content: "[redacted]" },
    });
    await expect(
      cloudOperations.recordContributionAggregate({
        requestId: "request:run96-f67",
        content: sensitivePrompt,
        apiKey: sensitiveSecret,
      }),
    ).resolves.toMatchObject({
      status: "accepted",
      jobRecord: { prompt: "[redacted]" },
      cloudPayload: { apiKey: "[redacted]" },
      receipt: { content: "[redacted]" },
    });
    expect(received).toHaveLength(2);
    const serializedCloudBoundary = JSON.stringify(received);
    expect(serializedCloudBoundary).not.toContain(sensitivePrompt);
    expect(serializedCloudBoundary).not.toContain(sensitiveSecret);
  });
});
