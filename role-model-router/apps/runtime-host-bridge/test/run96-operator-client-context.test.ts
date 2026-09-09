import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { type IncomingMessage, type ServerResponse, createServer } from "node:http";
import path from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import { createTrackBOperations } from "../src/track-b-operations.js";

const testRoots: string[] = [];
const operatorContext = {
  channel: "development" as const,
  scope: "scope:run96-operator-client",
  authorizationEpoch: 7,
};

async function createTestRoot(): Promise<string> {
  const parent = process.env.ROLE_MODEL_TEST_TEMP_ROOT ?? "E:\\role-model-temp";
  await mkdir(parent, { recursive: true });
  const root = await mkdtemp(path.join(parent, "run96-public-operator-client-"));
  testRoots.push(root);
  return root;
}

async function listen(server: ReturnType<typeof createServer>): Promise<number> {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("operator fixture did not bind");
  return address.port;
}

async function close(server: ReturnType<typeof createServer>): Promise<void> {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
}

function respondJson(
  response: ServerResponse,
  payload: Record<string, unknown> = { ok: true },
): void {
  response.writeHead(200, { "content-type": "application/json" });
  response.end(JSON.stringify(payload));
}

async function readRequestBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

afterEach(async () => {
  await Promise.all(testRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("Run 96 public operator context binding", () => {
  test("binds production backend and CLI operator clients to the authoritative runtime context", async () => {
    const [backendSource, cliSource] = await Promise.all([
      readFile(new URL("../src/index.ts", import.meta.url), "utf8"),
      readFile(new URL("../src/cli.ts", import.meta.url), "utf8"),
    ]);

    expect(backendSource).toMatch(
      /createTrackBOperationsFromState\(\{[\s\S]*?runtimeChannel,[\s\S]*?scope: options\.scopeId,[\s\S]*?authorizationEpoch: 1,/,
    );
    expect(cliSource).toMatch(
      /createTrackBOperations\(\{[\s\S]*?runtimeChannel: packagedProfile\?\.channel \?\? "development",[\s\S]*?scope: options\.scopeId,[\s\S]*?authorizationEpoch: 1,/,
    );
  });

  test("sends exact channel, scope, epoch, and route capability to every operator call", async () => {
    const received: Array<{
      readonly method: string;
      readonly url: string;
      readonly headers: Record<string, string | undefined>;
      readonly body: string;
    }> = [];
    const server = createServer(async (request, response) => {
      received.push({
        method: request.method ?? "",
        url: request.url ?? "",
        headers: {
          channel: request.headers["x-role-model-channel"],
          scope: request.headers["x-role-model-scope"],
          epoch: request.headers["x-role-model-authorization-epoch"],
          capability: request.headers["x-role-model-capability"],
        },
        body: await readRequestBody(request),
      });
      respondJson(response);
    });
    const port = await listen(server);
    const root = await createTestRoot();

    try {
      const operations = createTrackBOperations({
        statePath: path.join(root, "state.json"),
        catalog: [],
        runtimeChannel: operatorContext.channel,
        operationsEndpoint: `http://127.0.0.1:${port}`,
        operationsToken: "run96-operator-client-token-0123456789",
        scope: operatorContext.scope,
        authorizationEpoch: operatorContext.authorizationEpoch,
      });

      await operations.readOperatorStatus();
      await operations.listOperatorTraceRoots({ limit: "2" });
      await operations.createReplayJob({ jobId: "replay-1" });
      await operations.readEvaluationJob("evaluation-1");
      await operations.updateLearningMode({ mode: "shadow" });

      expect(received.map(({ method, url, headers }) => ({ method, url, ...headers }))).toEqual([
        {
          method: "GET",
          url: "/operator/status",
          channel: "development",
          scope: operatorContext.scope,
          epoch: "7",
          capability: "status",
        },
        {
          method: "GET",
          url: "/operator/trace-roots?limit=2",
          channel: "development",
          scope: operatorContext.scope,
          epoch: "7",
          capability: "trace",
        },
        {
          method: "POST",
          url: "/operator/replay/jobs",
          channel: "development",
          scope: operatorContext.scope,
          epoch: "7",
          capability: "replay",
        },
        {
          method: "GET",
          url: "/operator/evaluation/jobs/evaluation-1",
          channel: "development",
          scope: operatorContext.scope,
          epoch: "7",
          capability: "evaluation",
        },
        {
          method: "POST",
          url: "/operator/learning/mode",
          channel: "development",
          scope: operatorContext.scope,
          epoch: "7",
          capability: "learning",
        },
      ]);
    } finally {
      await close(server);
    }
  });

  test("does not issue an operator request without an authoritative scope and epoch", async () => {
    const server = createServer((_request, response) => respondJson(response));
    const port = await listen(server);
    const root = await createTestRoot();

    try {
      const operations = createTrackBOperations({
        statePath: path.join(root, "state.json"),
        catalog: [],
        operationsEndpoint: `http://127.0.0.1:${port}`,
        operationsToken: "run96-operator-client-token-0123456789",
      });
      await expect(operations.readOperatorStatus()).rejects.toThrow(
        /operator context.*scope.*authorization epoch/i,
      );
    } finally {
      await close(server);
    }
  });
});
