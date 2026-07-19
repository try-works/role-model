import { createServer } from "node:net";
import { performance } from "node:perf_hooks";

const baseUrl = process.env.RUN77_PHASE5_BASE_URL;
if (!baseUrl) throw new Error("RUN77_PHASE5_BASE_URL is required");

function percentile(values: readonly number[], fraction: number): number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.ceil(sorted.length * fraction) - 1] ?? 0;
}

function summary(values: readonly number[]) {
  return {
    samplesMs: values.map((value) => Number(value.toFixed(3))),
    p50Ms: Number(percentile(values, 0.5).toFixed(3)),
    p95Ms: Number(percentile(values, 0.95).toFixed(3)),
    maxMs: Number(Math.max(...values).toFixed(3)),
  };
}

async function timedFetch(url: string, init?: RequestInit) {
  const startedAt = performance.now();
  const response = await fetch(url, init);
  const body = await response.arrayBuffer();
  return { status: response.status, bytes: body.byteLength, elapsedMs: performance.now() - startedAt };
}

const upstream = createServer((socket) => {
  socket.once("data", (requestBytes) => {
    const requestLine = requestBytes.toString("utf8").split("\r\n", 1)[0] ?? "";
    if (requestLine.includes("/models")) {
      const body = '{"data":[{"id":"k3","object":"model"}]}';
      socket.end(
        `HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: ${Buffer.byteLength(body)}\r\nConnection: close\r\n\r\n${body}`,
      );
      return;
    }
    if (requestLine.includes("/chat/completions")) {
      const chunk =
        'data: {"id":"chatcmpl-run77-k3","object":"chat.completion.chunk","created":1,"model":"k3","choices":[{"index":0,"delta":{"content":"partial"},"finish_reason":null}]}\n\n';
      socket.write(
        "HTTP/1.1 200 OK\r\nContent-Type: text/event-stream\r\nTransfer-Encoding: chunked\r\nConnection: close\r\n\r\n",
      );
      socket.write(`${Buffer.byteLength(chunk).toString(16)}\r\n${chunk}\r\n`);
      setTimeout(() => socket.end("ZZ\r\n"), 25);
      return;
    }
    socket.end("HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n");
  });
});
await new Promise<void>((resolve) => upstream.listen(0, "127.0.0.1", resolve));
const address = upstream.address();
if (!address || typeof address === "string") throw new Error("Mock upstream did not bind");
const upstreamBaseUrl = `http://127.0.0.1:${address.port}/v1`;

try {
  const account = {
    providerAccountId: "moonshot.run77.streamfail",
    providerId: "moonshot",
    providerKind: "provider-openai",
    orgScope: "personal",
    accountScope: "workspace-default",
    credentialRef: { backend: "env", ref: "RUN77_MOONSHOT_API_KEY" },
    authMode: "api-key-static",
    regionPolicy: { mode: "prefer", regions: ["global"] },
    baseUrlOverride: upstreamBaseUrl,
    allowedModels: ["moonshot/kimi-k3"],
    modelRoleBindings: [{ modelId: "moonshot/kimi-k3", roleIds: ["writer"] }],
    deniedModels: [],
    entitlementTags: ["chat"],
    budgetPolicyRef: "budget.default",
    quotaPolicyRef: "quota.default",
    status: "active",
    healthStatus: "healthy",
    rotationState: "stable",
  };
  const accountResponse = await fetch(`${baseUrl}/api/role-model/accounts`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(account),
  });
  if (!accountResponse.ok) throw new Error(`Account seed failed: ${accountResponse.status}`);
  const endpointResponse = await fetch(`${baseUrl}/api/role-model/endpoints`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      providerAccountId: account.providerAccountId,
      modelId: "moonshot/kimi-k3",
      region: "global",
    }),
  });
  const endpoint = (await endpointResponse.json()) as { endpointId: string };
  if (!endpointResponse.ok) throw new Error(`Endpoint seed failed: ${endpointResponse.status}`);

  for (let index = 0; index < 5; index += 1) {
    await Promise.all([
      timedFetch(`${baseUrl}/api/role-model/requests?limit=20`),
      timedFetch(`${baseUrl}/healthz`),
    ]);
  }
  const pairs = [];
  for (let index = 0; index < 30; index += 1) {
    pairs.push(
      await Promise.all([
        timedFetch(`${baseUrl}/api/role-model/requests?limit=20`),
        timedFetch(`${baseUrl}/healthz`),
      ]),
    );
  }

  const streamStartedAt = performance.now();
  let streamStatus = 0;
  let streamText = "";
  let streamError: string | null = null;
  try {
    const streamResponse = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: "moonshot/kimi-k3",
        messages: [{ role: "user", content: "Exercise the Run 77 committed-stream failure." }],
        stream: true,
      }),
      signal: AbortSignal.timeout(3_000),
    });
    streamStatus = streamResponse.status;
    const reader = streamResponse.body?.getReader();
    if (reader) {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        streamText += new TextDecoder().decode(chunk.value);
      }
    }
  } catch (error) {
    streamError = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  }
  const streamTerminationMs = performance.now() - streamStartedAt;

  const requestRowsResponse = await fetch(`${baseUrl}/api/role-model/requests?limit=20`);
  const requestRows = (await requestRowsResponse.json()) as Array<Record<string, unknown>>;
  const selectedFailure = requestRows.find(
    (row) => row.endpointId === endpoint.endpointId || row.selectedEndpointId === endpoint.endpointId,
  );
  const postFailureHealth = await timedFetch(`${baseUrl}/healthz`);
  const postFailureSummary = await timedFetch(`${baseUrl}/api/role-model/runtime/summary`);

  const malformedStartedAt = performance.now();
  const malformed = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: "/proc/1513/fd/63",
      messages: [{ role: "user", content: "negative control" }],
    }),
  });
  const malformedMs = performance.now() - malformedStartedAt;

  const eject = async (accountId: string, modelId: string) => {
    const response = await fetch(
      `${baseUrl}/api/role-model/accounts/${encodeURIComponent(accountId)}/models/${encodeURIComponent(modelId)}`,
      { method: "DELETE" },
    );
    return { status: response.status, body: await response.json() };
  };
  const streamEject = await eject(account.providerAccountId, "moonshot/kimi-k3");
  const streamRepeatEject = await eject(account.providerAccountId, "moonshot/kimi-k3");
  const modelsEject = await eject("moonshot.run77.phase5", "moonshot/kimi-k2.5");
  const modelsRepeatEject = await eject("moonshot.run77.phase5", "moonshot/kimi-k2.5");

  console.log(
    JSON.stringify(
      {
        requestList: {
          responseBytes: pairs[0]?.[0].bytes ?? 0,
          timing: summary(pairs.map((pair) => pair[0].elapsedMs)),
        },
        concurrentHealth: {
          responseBytes: pairs[0]?.[1].bytes ?? 0,
          timing: summary(pairs.map((pair) => pair[1].elapsedMs)),
        },
        committedStreamFailure: {
          endpointId: endpoint.endpointId,
          modelId: "moonshot/kimi-k3",
          upstreamWireModel: "k3",
          streamStatus,
          streamText,
          streamError,
          streamTerminationMs: Number(streamTerminationMs.toFixed(3)),
          selectedFailure: selectedFailure ?? null,
          postFailureHealth,
          postFailureSummary,
        },
        malformedNegativeControl: {
          modelId: "/proc/1513/fd/63",
          status: malformed.status,
          elapsedMs: Number(malformedMs.toFixed(3)),
          postRequestHealthStatus: (await timedFetch(`${baseUrl}/healthz`)).status,
        },
        ejectOutcomes: { streamEject, streamRepeatEject, modelsEject, modelsRepeatEject },
      },
      null,
      2,
    ),
  );
} finally {
  await new Promise<void>((resolve, reject) =>
    upstream.close((error) => (error ? reject(error) : resolve())),
  );
}
