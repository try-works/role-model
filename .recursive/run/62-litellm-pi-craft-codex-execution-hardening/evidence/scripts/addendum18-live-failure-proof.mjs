import http from "node:http";

const runtimeBaseUrl = process.env.ROLE_MODEL_ENDPOINT ?? "http://127.0.0.1:3456";
const providerAccountId = "deepseek.personal.addendum18-failure-capture";
const modelId = "deepseek/addendum18-failure-capture";
const requestId = `req-addendum18-controlled-failure-${Date.now()}`;

async function requestJson(method, path, body, headers = {}) {
  const response = await fetch(`${runtimeBaseUrl}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let json = null;
  try {
    json = text.length > 0 ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: response.status, json };
}

async function startMockProvider() {
  const seenRequests = [];
  const server = http.createServer((request, response) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => {
      seenRequests.push({
        method: request.method,
        url: request.url,
        authorization: request.headers.authorization ? "present" : "missing",
        body: Buffer.concat(chunks).toString("utf8"),
      });
      if (request.method === "POST" && request.url === "/v1/chat/completions") {
        response.writeHead(503, { "content-type": "application/json" });
        response.end(
          JSON.stringify({
            error: {
              message: "Addendum 18 controlled provider failure",
              type: "server_error",
              code: "controlled_failure",
            },
          }),
        );
        return;
      }
      response.writeHead(404, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: { message: "not found" } }));
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("mock provider did not bind a TCP port");
  }
  return {
    baseUrl: `http://127.0.0.1:${address.port}/v1`,
    seenRequests,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

async function main() {
  const mock = await startMockProvider();
  try {
    const upsert = await requestJson("POST", "/api/role-model/accounts", {
      providerAccountId,
      providerId: "deepseek",
      providerKind: "provider-openai",
      orgScope: "personal",
      accountScope: "workspace-default",
      credentialRef: {
        backend: "env",
        ref: "DEEPSEEK_API_KEY",
      },
      authMode: "api-key-static",
      regionPolicy: {
        mode: "prefer",
        regions: ["global"],
      },
      baseUrlOverride: mock.baseUrl,
      allowedModels: [modelId],
      modelRoleBindings: [
        {
          modelId,
          roleAssignmentMode: "all",
          roleIds: [],
          enabledRoleIds: [],
          disabledRoleIds: [],
        },
      ],
      deniedModels: [],
      entitlementTags: ["chat"],
      budgetPolicyRef: "budget.default",
      quotaPolicyRef: "quota.default",
      status: "active",
      healthStatus: "healthy",
      rotationState: "stable",
    });
    if (upsert.status !== 200) {
      throw new Error(`account upsert failed: ${JSON.stringify(upsert)}`);
    }

    const activation = await requestJson("POST", "/api/role-model/endpoints", {
      providerAccountId,
      modelId,
      region: "global",
    });
    if (activation.status !== 200 || !activation.json?.endpointId) {
      throw new Error(`endpoint activation failed: ${JSON.stringify(activation)}`);
    }
    const endpointId = activation.json.endpointId;

    const completion = await requestJson(
      "POST",
      "/v1/chat/completions",
      {
        model: modelId,
        messages: [{ role: "user", content: "Trigger controlled failure." }],
      },
      { "x-request-id": requestId },
    );
    if (completion.status < 400) {
      throw new Error(`expected provider failure response, got ${JSON.stringify(completion)}`);
    }

    const telemetry = await requestJson("GET", "/api/role-model/telemetry/requests");
    const row = telemetry.json.find((record) => record.clientRequestId === requestId);
    if (!row) {
      throw new Error(`telemetry row not found for client request ${requestId}`);
    }
    if (row.endpointId !== endpointId) {
      throw new Error(`expected endpoint ${endpointId}, got ${row.endpointId}`);
    }
    if (row.endpointId === "routing.failed.pre-execution") {
      throw new Error("failure row collapsed to routing.failed.pre-execution");
    }
    if (row.providerId !== "deepseek" || row.providerFamily !== "deepseek") {
      throw new Error(`provider identity missing: ${JSON.stringify(row)}`);
    }
    if (row.adapterFamily !== "ai-sdk-openai-compatible") {
      throw new Error(`adapter identity missing: ${JSON.stringify(row)}`);
    }
    if (row.structuredInspectionAvailable !== true) {
      throw new Error(`structured inspection missing: ${JSON.stringify(row)}`);
    }

    const detail = await requestJson("GET", `/api/role-model/requests/${row.requestId}`);
    if (detail.status !== 200) {
      throw new Error(`request detail unavailable: ${JSON.stringify(detail)}`);
    }
    if (detail.json.endpointId !== endpointId) {
      throw new Error(`detail endpoint mismatch: ${JSON.stringify(detail.json)}`);
    }
    if (detail.json.observationAvailability?.structuredInspectionAvailable !== true) {
      throw new Error(`detail structured inspection missing: ${JSON.stringify(detail.json)}`);
    }
    if (detail.json.executionSemantics?.adapterFamily !== "ai-sdk-openai-compatible") {
      throw new Error(`detail adapter identity missing: ${JSON.stringify(detail.json)}`);
    }

    const cleanup = await requestJson(
      "DELETE",
      `/api/role-model/accounts/${encodeURIComponent(providerAccountId)}/models/${encodeURIComponent(
        modelId,
      )}`,
    );

    console.log(
      JSON.stringify(
        {
          ok: true,
          requestId: row.requestId,
          clientRequestId: requestId,
          endpointId,
          statusCode: row.statusCode,
          errorClass: row.errorClass,
          providerId: row.providerId,
          providerFamily: row.providerFamily,
          vendorId: row.vendorId ?? null,
          adapterFamily: row.adapterFamily,
          executionFamily: row.executionFamily,
          structuredInspectionAvailable: row.structuredInspectionAvailable,
          observationSource: detail.json.observationAvailability?.source ?? null,
          mockRequests: mock.seenRequests.map((seen) => ({
            method: seen.method,
            url: seen.url,
            authorization: seen.authorization,
          })),
          cleanupStatus: cleanup.status,
        },
        null,
        2,
      ),
    );
  } finally {
    await mock.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
