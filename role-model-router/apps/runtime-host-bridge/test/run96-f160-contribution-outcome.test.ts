import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import { deriveRuntimeContributionOutcome } from "../src/contribution-outcome.js";
import { createRuntimeBridgeBackend } from "../src/index.js";
import {
  createOwnedTrackBSidecarSpec,
  createTrackBBridgeServerOptions,
  runTrackBPostObservationWithContribution,
} from "../src/track-b-runtime.js";

type ContributionOutcome =
  | { readonly success: true }
  | { readonly success: false; readonly failureClass: string }
  | null;

type OutcomeDeriver = (input: {
  readonly responseStatusCode?: unknown;
  readonly usageErrorClass?: unknown;
  readonly normalizedErrorClass?: unknown;
  readonly executionFailure?: unknown;
  readonly cancelled?: unknown;
}) => ContributionOutcome;

const deriveOutcome = (): OutcomeDeriver => deriveRuntimeContributionOutcome as OutcomeDeriver;

describe("run 96 F160 contribution outcome", () => {
  test("records a successful contribution only for a 2xx response with no error metadata", () => {
    expect(
      deriveOutcome()({
        responseStatusCode: 200,
      }),
    ).toEqual({ success: true });
    expect(
      deriveOutcome()({
        responseStatusCode: 204,
      }),
    ).toEqual({ success: true });
  });

  test("records an explicit provider error even when the response status is 2xx", () => {
    expect(
      deriveOutcome()({
        responseStatusCode: 200,
        usageErrorClass: "provider_auth_error",
      }),
    ).toEqual({ success: false, failureClass: "provider_auth_error" });
    expect(
      deriveOutcome()({
        responseStatusCode: 200,
        normalizedErrorClass: "provider_timeout",
      }),
    ).toEqual({ success: false, failureClass: "provider_timeout" });
  });

  test("classifies cancellation and execution failure metadata without using raw messages", () => {
    expect(
      deriveOutcome()({
        responseStatusCode: 499,
        cancelled: true,
      }),
    ).toEqual({ success: false, failureClass: "request_cancelled" });
    expect(
      deriveOutcome()({
        responseStatusCode: 499,
      }),
    ).toEqual({ success: false, failureClass: "request_cancelled" });
    expect(
      deriveOutcome()({
        executionFailure: { name: "AbortError" },
      }),
    ).toEqual({ success: false, failureClass: "request_cancelled" });
    expect(
      deriveOutcome()({
        executionFailure: { errorClass: "upstream_timeout" },
      }),
    ).toEqual({ success: false, failureClass: "upstream_timeout" });
    expect(
      deriveOutcome()({
        executionFailure: { errorClass: "provider_5xx" },
      }),
    ).toEqual({ success: false, failureClass: "provider_5xx" });
    expect(
      deriveOutcome()({
        executionFailure: {
          error: { code: "no_eligible_target", statusCode: 400 },
        },
      }),
    ).toEqual({ success: false, failureClass: "no_eligible_target" });
    expect(
      deriveOutcome()({
        executionFailure: { statusCode: 504 },
      }),
    ).toEqual({ success: false, failureClass: "upstream_timeout" });
    expect(
      deriveOutcome()({
        executionFailure: { success: false },
      }),
    ).toEqual({ success: false, failureClass: "execution_failed" });
    expect(
      deriveOutcome()({
        executionFailure: { message: "secret provider response body" },
      }),
    ).toBeNull();
    expect(
      deriveOutcome()({
        responseStatusCode: 200,
        executionFailure: { message: "secret provider response body" },
      }),
    ).toBeNull();
  });

  test("classifies non-2xx response statuses into bounded failure classes", () => {
    expect(
      deriveOutcome()({
        responseStatusCode: 503,
      }),
    ).toEqual({ success: false, failureClass: "upstream_error" });
    expect(
      deriveOutcome()({
        responseStatusCode: 429,
      }),
    ).toEqual({ success: false, failureClass: "rate_limited" });
    expect(
      deriveOutcome()({
        responseStatusCode: 401,
      }),
    ).toEqual({ success: false, failureClass: "provider_auth_error" });
    expect(
      deriveOutcome()({
        responseStatusCode: 402,
      }),
    ).toEqual({ success: false, failureClass: "quota_exhausted" });
  });

  test("skips an ambiguous or missing outcome rather than inventing a failure", () => {
    expect(deriveOutcome()({})).toBeNull();
    expect(
      deriveOutcome()({
        responseStatusCode: "200",
      }),
    ).toBeNull();
    expect(
      deriveOutcome()({
        responseStatusCode: 200,
        usageErrorClass: "provider error leaked with a long message",
      }),
    ).toEqual({ success: false, failureClass: "execution_failed" });
  });

  test("bounds valid failure classes and does not expose oversized or malformed values", () => {
    expect(
      deriveOutcome()({
        normalizedErrorClass: "a".repeat(200),
      }),
    ).toEqual({ success: false, failureClass: "execution_failed" });
    expect(
      deriveOutcome()({
        normalizedErrorClass: "provider_auth_error\nsecret-body",
      }),
    ).toEqual({ success: false, failureClass: "execution_failed" });
  });

  /**
   * Run 98 addendum 04 §7 (`L2`), measured on real dsh traffic: the post-observation rejected the
   * observation whenever the *contribution upload* failed at the transport layer
   * (`read ECONNRESET` → `fetch failed`). The pipeline had already completed, so the whole
   * observation was retried forever and the outbox never drained.
   */
  test("a transport failure on the contribution upload does not discard the completed post-observation", async () => {
    const runtime = createFixtureTrackBRuntime();
    const input = {
      scope: "tenant:run96",
      channel: "development" as const,
      authorizationEpoch: 96,
    };
    const reset = Object.assign(new Error("fetch failed"), {
      cause: Object.assign(new Error("read ECONNRESET"), { code: "ECONNRESET" }),
    });
    const result = (await runTrackBPostObservationWithContribution(
      runtime,
      createFixtureObservation("contribution-reset", {
        responseStatusCode: 200,
        usageEvent: { tokens_in: 1, tokens_out: 2 },
      }),
      input,
      async () => {
        throw reset;
      },
    )) as unknown as {
      readonly extensionClosure?: { readonly schemaVersion?: unknown; readonly requestId?: unknown };
      readonly contribution?: unknown;
      readonly contributionFailure?: { readonly message?: string };
    };
    // The pipeline's own result survives: the observation can be marked delivered.
    expect(result.extensionClosure?.schemaVersion).toBe(
      "role-model.track-b-extension-closure.v1",
    );
    expect(result.extensionClosure?.requestId).toBe("contribution-reset");
    expect(result.contribution).toBeNull();
    expect(String(result.contributionFailure?.message ?? "")).toContain("fetch failed");
  });

  test("integration: post-observation contribution follows the observed outcome exactly once", async () => {
    const contributionInputs: Record<string, unknown>[] = [];
    const runtime = createFixtureTrackBRuntime();
    const input = {
      scope: "tenant:run96",
      channel: "development" as const,
      authorizationEpoch: 96,
    };

    const failed = await runTrackBPostObservationWithContribution(
      runtime,
      createFixtureObservation("provider-failed", {
        responseStatusCode: 503,
        usageEvent: {
          tokens_in: 11,
          tokens_out: 7,
          error_class: "provider_5xx",
        },
      }),
      input,
      async (contribution) => {
        contributionInputs.push(contribution);
        return { status: "accepted" };
      },
    );
    const succeeded = await runTrackBPostObservationWithContribution(
      runtime,
      createFixtureObservation("successful", {
        responseStatusCode: 200,
        usageEvent: { tokens_in: 13, tokens_out: 9 },
      }),
      input,
      async (contribution) => {
        contributionInputs.push(contribution);
        return { status: "accepted" };
      },
    );
    const ambiguous = await runTrackBPostObservationWithContribution(
      runtime,
      createFixtureObservation("ambiguous", {
        usageEvent: { tokens_in: 17, tokens_out: 5 },
      }),
      input,
      async (contribution) => {
        contributionInputs.push(contribution);
        return { status: "accepted" };
      },
    );

    expect(contributionInputs).toHaveLength(2);
    expect(contributionInputs).toEqual([
      expect.objectContaining({
        requestId: "provider-failed",
        success: false,
        failureClass: "provider_5xx",
      }),
      expect.objectContaining({ requestId: "successful", success: true }),
    ]);
    expect(JSON.stringify(contributionInputs)).not.toContain("raw provider secret");
    expect(failed).toMatchObject({ contribution: { status: "accepted" } });
    expect(succeeded).toMatchObject({ contribution: { status: "accepted" } });
    expect(ambiguous).not.toHaveProperty("contribution");
  });

  test("integration: owned sidecar forwards the authorization epoch to the private runtime", async () => {
    const root = await createRun96TempDirectory("run96-f160-sidecar-");
    const artifactPath = path.join(root, "sidecar.mjs");
    const argsPath = path.join(root, "argv.json");
    const source = `
import { writeFileSync } from "node:fs";
writeFileSync(process.env.RUN96_F160_ARGS_PATH, JSON.stringify(process.argv));
process.stdout.write(JSON.stringify({ type: "ready", endpoint: "http://127.0.0.1:1" }) + "\\n");
process.on("SIGTERM", () => process.exit(0));
setInterval(() => {}, 1000);
`;
    await writeFile(artifactPath, source, "utf8");
    const previousArgsPath = process.env.RUN96_F160_ARGS_PATH;
    const previousNodeExecutable = process.env.ROLE_MODEL_TRACK_B_NODE_EXECUTABLE;
    process.env.RUN96_F160_ARGS_PATH = argsPath;
    process.env.ROLE_MODEL_TRACK_B_NODE_EXECUTABLE = process.execPath;
    try {
      const sidecar = createOwnedTrackBSidecarSpec({
        artifactPath,
        artifactSha256: createHash("sha256").update(source).digest("hex"),
        stateRoot: root,
        channel: "stage",
        authorizationEpoch: 96,
        startupTimeoutMs: 2_000,
      });
      const child = await sidecar.launch();
      try {
        const argv = JSON.parse(await readFile(argsPath, "utf8")) as string[];
        const epochFlag = argv.indexOf("--authorization-epoch");
        expect(epochFlag).toBeGreaterThanOrEqual(0);
        expect(argv[epochFlag + 1]).toBe("96");
      } finally {
        await child.stop();
      }
    } finally {
      if (previousArgsPath === undefined) delete process.env.RUN96_F160_ARGS_PATH;
      else process.env.RUN96_F160_ARGS_PATH = previousArgsPath;
      if (previousNodeExecutable === undefined)
        delete process.env.ROLE_MODEL_TRACK_B_NODE_EXECUTABLE;
      else process.env.ROLE_MODEL_TRACK_B_NODE_EXECUTABLE = previousNodeExecutable;
      await rm(root, { recursive: true, force: true });
    }
  });

  test("integration: both production launchers bind supervised replay through the shared bridge helper", async () => {
    const replay = async (body: Record<string, unknown>) => ({ status: "accepted", body });
    const backend = { runTrackBSupervisedReplay: replay } as Record<string, unknown>;
    const bridgeOptions = createTrackBBridgeServerOptions(backend as never) as Record<
      string,
      unknown
    >;

    expect(bridgeOptions.runTrackBSupervisedReplay).toBe(replay);
    for (const launcher of ["start.ts", "prod-launcher.ts"]) {
      const source = await readFile(path.join(TEST_DIR, "..", "scripts", launcher), "utf8");
      expect(source).toContain("...createTrackBBridgeServerOptions(backend)");
    }
  });

  test("integration: the real bridge records a pre-execution no-eligible-target outcome once", async () => {
    const runtimeRoot = await createRun96TempDirectory("run96-f160-bridge-");
    const contributionInputs: Record<string, unknown>[] = [];
    const trackBRuntime = createFixtureTrackBRuntime();
    const postObservation = (observation: Readonly<Record<string, unknown>>) =>
      runTrackBPostObservationWithContribution(
        trackBRuntime,
        observation,
        {
          scope: "tenant:run96",
          channel: "development",
          authorizationEpoch: 96,
        },
        async (contribution) => {
          contributionInputs.push(contribution);
          return { status: "accepted" };
        },
      );
    const backend = await createRuntimeBridgeBackend({
      repoRoot: path.resolve(TEST_DIR, "..", "..", "..", ".."),
      fixtureRoot: path.join(TEST_DIR, "fixtures"),
      runtimeStateRoot: runtimeRoot,
      scopeId: "run96-f160-no-eligible",
      runtimeVendorStartup: "disabled",
      trackBPostObservation: postObservation,
    });
    try {
      await expect(
        backend.executeChatCompletions(
          {
            model: "run96/no-eligible-target",
            messages: [{ role: "user", content: "must not execute" }],
          },
          "req-run96-f160-no-eligible",
        ),
      ).rejects.toMatchObject({ statusCode: 400 });
      expect(contributionInputs).toHaveLength(1);
      expect(contributionInputs[0]).toEqual(
        expect.objectContaining({
          requestId: "req-run96-f160-no-eligible",
          success: false,
          failureClass: "no_eligible_target",
        }),
      );
      await expect(
        backend.executeResponses(
          {
            model: "run96/no-eligible-target",
            input: [{ role: "user", content: "responses must not execute" }],
          },
          "req-run96-f160-no-eligible-responses",
        ),
      ).rejects.toMatchObject({ statusCode: 400 });
      expect(contributionInputs).toHaveLength(2);
      expect(contributionInputs[1]).toEqual(
        expect.objectContaining({
          requestId: "req-run96-f160-no-eligible-responses",
          success: false,
          failureClass: "no_eligible_target",
        }),
      );
      expect(JSON.stringify(contributionInputs)).not.toContain("must not execute");
      expect(JSON.stringify(contributionInputs)).not.toContain("responses must not execute");
    } finally {
      await backend.shutdown();
      await rm(runtimeRoot, { recursive: true, force: true });
    }
  });

  test("integration: the real bridge records a successful direct-path contribution once", async () => {
    const runtimeRoot = await createRun96TempDirectory("run96-f160-direct-");
    const aggregateRequests: Record<string, unknown>[] = [];
    const server = createServer(async (request, response) => {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      const body = chunks.length > 0 ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
      if (request.url?.endsWith("/contribution/aggregate")) {
        aggregateRequests.push(body as Record<string, unknown>);
      }
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify(
          request.url?.endsWith("/capture/route")
            ? {
                status: "accepted",
                scope: "tenant:run96",
                rootArtifactId: "artifact:run96-direct",
                rootArtifactDigest: "a".repeat(64),
                messageArtifactIds: [],
                responseArtifactId: "response:run96-direct",
                edgeCount: 0,
              }
            : { status: "accepted" },
        ),
      );
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("direct test server did not bind");
    const backend = await createRuntimeBridgeBackend({
      repoRoot: path.resolve(TEST_DIR, "..", "..", "..", ".."),
      fixtureRoot: path.join(TEST_DIR, "fixtures"),
      runtimeStateRoot: runtimeRoot,
      scopeId: "run96-f160-direct",
      runtimeVendorStartup: "disabled",
      trackBOperationsEndpoint: `http://127.0.0.1:${address.port}/`,
      trackBOperationsToken: "run96-direct-token-000000000000",
    });
    try {
      await expect(
        backend.executeChatCompletions(
          {
            model: "deepseek/chat-capture-v1",
            messages: [{ role: "user", content: "direct contribution" }],
          },
          "req-run96-f160-direct",
        ),
      ).resolves.toMatchObject({
        model: "deepseek/chat-capture-v1",
        endpointId: "test.capture.chat-v1",
      });
      expect(aggregateRequests).toHaveLength(1);
      expect(aggregateRequests[0]).toEqual(
        expect.objectContaining({
          requestId: "req-run96-f160-direct",
          success: true,
        }),
      );
      expect(JSON.stringify(aggregateRequests)).not.toContain("direct contribution");
    } finally {
      await backend.shutdown();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      await rm(runtimeRoot, { recursive: true, force: true });
    }
  });
});

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));

async function createRun96TempDirectory(prefix: string): Promise<string> {
  const root = process.env.ROLE_MODEL_TEST_TEMP_ROOT?.trim() || "E:/role-model-temp";
  await mkdir(root, { recursive: true });
  return mkdtemp(path.join(root, prefix));
}

function createFixtureObservation(
  requestId: string,
  overrides: Record<string, unknown>,
): Readonly<Record<string, unknown>> {
  return {
    requestId,
    routingDecisionId: `decision:${requestId}`,
    endpointId: "endpoint:run96",
    modelId: "model:run96",
    reasoningEffort: "high",
    effortSource: "client",
    ...overrides,
  };
}

function createFixtureTrackBRuntime() {
  let workerPid = 10_000;
  return {
    async invoke(id: string, envelope: Record<string, unknown>) {
      const capability = String(envelope.capability ?? "unknown");
      const base = {
        workerPid: workerPid++,
        durableLocator: { extensionId: id, requestId: envelope.requestId, capability },
        evidenceRef: `evidence:${id}:${String(envelope.requestId ?? "")}`,
        businessOutput: { extensionId: id, capability },
      };
      if (id === "artifact-store") {
        return { ...base, id: `artifact:${String(envelope.requestId ?? "")}` };
      }
      if (id === "repository-context") {
        return {
          ...base,
          available: true,
          context: {
            scopeId: String(envelope.scope ?? ""),
            repoFingerprint: "a".repeat(64),
            packageId: null,
            fallbackLevel: "repo_task",
            branchCompatibility: "unknown",
            fingerprintEpoch: 1,
          },
          diagnostics: [],
        };
      }
      if (id === "knowledge-store" && capability === "knowledge:write") {
        return { ...base, id: `knowledge:${String(envelope.requestId ?? "")}` };
      }
      return base;
    },
  };
}
