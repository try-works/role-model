import { spawn, spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { createOpenTelemetryGenAiExport } from "@role-model-router/runtime-observability/otel";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");
const vendorRoot = path.join(repoRoot, "role-model-router", "vendor", "llama-swap");

export interface RuntimeHostValidationResult {
  readonly host_base_url: string;
  readonly model_count: number;
  readonly returned_model: string;
  readonly request_id: string;
  readonly output_text: string;
  readonly total_tokens: number;
  readonly structured_recent_count: number;
  readonly structured_endpoint_id: string;
  readonly structured_profile_sample_size: number;
  readonly otel_trace_id: string;
  readonly otel_request_id: string | undefined;
  readonly logs_contains_bridge: boolean;
  readonly capture_id: number;
  readonly capture_path: string;
  readonly request_capture_keys: readonly string[];
  readonly response_capture_type: string;
  readonly stdout_tail: string;
  readonly stderr_tail: string;
}

async function allocateLocalPort(): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Failed to allocate a local TCP port."));
        return;
      }
      const { port } = address;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(port);
      });
    });
  });
}

async function waitForOk(url: string, timeoutMs: number): Promise<Response> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return response;
      }
    } catch {
      // retry
    }
    await delay(250);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

export async function runRuntimeHostValidation(): Promise<RuntimeHostValidationResult> {
  const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-host-"));
  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];
  const requestId = "req-runtime-host-observability-001";
  const hostPort = await allocateLocalPort();
  const bridgePort = await allocateLocalPort();
  const hostAddress = `127.0.0.1:${hostPort}`;
  const hostBaseUrl = `http://${hostAddress}`;

  const hostProcess = spawn(
    "C:\\Program Files\\Go\\bin\\go.exe",
    ["run", ".", "-config", "config.role-model.yaml", "-listen", hostAddress],
    {
      cwd: vendorRoot,
      env: {
        ...process.env,
        ROLE_MODEL_BRIDGE_REPO_ROOT: repoRoot,
        ROLE_MODEL_BRIDGE_RUNTIME_STATE_ROOT: runtimeStateRoot,
        ROLE_MODEL_BRIDGE_PORT: String(bridgePort),
        ROLE_MODEL_BRIDGE_SCOPE_ID: "runtime-host-validation",
        ROLE_MODEL_BRIDGE_FIXTURE_ROOT: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  hostProcess.stdout.setEncoding("utf8");
  hostProcess.stderr.setEncoding("utf8");
  hostProcess.stdout.on("data", (chunk) => {
    stdoutChunks.push(chunk);
  });
  hostProcess.stderr.on("data", (chunk) => {
    stderrChunks.push(chunk);
  });

  try {
    await waitForOk(`${hostBaseUrl}/health`, 30000);
    const modelsResponse = await waitForOk(`${hostBaseUrl}/v1/models`, 10000);
    const models = (await modelsResponse.json()) as {
      object: string;
      data: Array<{ id: string }>;
    };

    const completionResponse = await fetch(`${hostBaseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-request-id": requestId,
      },
      body: JSON.stringify({
        model: "openai/gpt-4.1-mini-fast",
        messages: [
          { role: "system", content: "Be concise." },
          { role: "user", content: "Summarize the chosen endpoint." },
        ],
      }),
    });
    if (!completionResponse.ok) {
      throw new Error(
        `Host completion request failed: ${completionResponse.status} ${await completionResponse.text()}`,
      );
    }
    const completion = (await completionResponse.json()) as {
      model: string;
      choices: Array<{ message: { content: string } }>;
      usage: { total_tokens: number };
    };

    const recentRequestsResponse = await waitForOk(`${hostBaseUrl}/api/role-model/requests`, 10000);
    const recentRequests = (await recentRequestsResponse.json()) as Array<{
      requestId: string;
      endpointId: string;
    }>;
    const recentRequest = recentRequests.find((entry) => entry.requestId === requestId);
    if (!recentRequest) {
      throw new Error(`Structured request list did not include ${requestId}.`);
    }

    const requestDetailResponse = await waitForOk(
      `${hostBaseUrl}/api/role-model/requests/${requestId}`,
      10000,
    );
    const requestDetail = (await requestDetailResponse.json()) as {
      requestId: string;
      endpointId: string;
      capturePolicy: {
        structuredInspectionAvailable: boolean;
      };
      trace: {
        spans: Array<{ trace_id: string; span_id: string }>;
      };
      usageEvent: {
        model_id: string;
        tokens_in: number;
        tokens_out: number;
      };
      cacheObservability: {
        promptCacheUsed: boolean;
      };
    };
    if (!requestDetail.capturePolicy.structuredInspectionAvailable) {
      throw new Error("Structured request detail did not expose structured inspection availability.");
    }

    const endpointProfileResponse = await waitForOk(
      `${hostBaseUrl}/api/role-model/endpoints/${encodeURIComponent(recentRequest.endpointId)}/profile`,
      10000,
    );
    const endpointProfile = (await endpointProfileResponse.json()) as {
      endpointId: string;
      latestProfile: {
        endpoint_id: string;
        sample_size: number;
      } | null;
      recentSamples: Array<unknown>;
    };
    if (endpointProfile.endpointId !== recentRequest.endpointId) {
      throw new Error("Endpoint profile route returned the wrong endpoint id.");
    }
    if (!endpointProfile.latestProfile || endpointProfile.latestProfile.sample_size < 1) {
      throw new Error("Endpoint profile route did not expose a persisted observed-performance profile.");
    }

    const otelExport = createOpenTelemetryGenAiExport(requestDetail as never);

    const logsResponse = await waitForOk(`${hostBaseUrl}/logs`, 10000);
    const logs = await logsResponse.text();

    const metricsResponse = await waitForOk(`${hostBaseUrl}/api/metrics`, 10000);
    const metrics = (await metricsResponse.json()) as Array<{
      id: number;
      model: string;
      has_capture?: boolean;
    }>;
    const captureMetric = metrics.find((entry) => entry.has_capture);
    if (!captureMetric) {
      throw new Error("No capture-enabled metric was produced by the host validation request.");
    }

    const captureResponse = await waitForOk(
      `${hostBaseUrl}/api/captures/${captureMetric.id}`,
      10000,
    );
    const capture = (await captureResponse.json()) as {
      req_path: string;
      req_body: unknown;
      resp_body: unknown;
    };

    return {
      host_base_url: hostBaseUrl,
      model_count: models.data.length,
      returned_model: completion.model,
      request_id: requestId,
      output_text: completion.choices[0]?.message?.content ?? "",
      total_tokens: completion.usage.total_tokens,
      structured_recent_count: recentRequests.length,
      structured_endpoint_id: endpointProfile.endpointId,
      structured_profile_sample_size: endpointProfile.latestProfile?.sample_size ?? 0,
      otel_trace_id: otelExport.traceId,
      otel_request_id:
        typeof otelExport.attributes["gen_ai.request.id"] === "string"
          ? otelExport.attributes["gen_ai.request.id"]
          : undefined,
      logs_contains_bridge: logs.includes("role-model bridge"),
      capture_id: captureMetric.id,
      capture_path: capture.req_path,
      request_capture_keys:
        capture.req_body && typeof capture.req_body === "object"
          ? Object.keys(capture.req_body as Record<string, unknown>)
          : [],
      response_capture_type:
        capture.resp_body && typeof capture.resp_body === "object"
          ? "object"
          : typeof capture.resp_body,
      stdout_tail: stdoutChunks.join("").slice(-400),
      stderr_tail: stderrChunks.join("").slice(-400),
    };
  } finally {
    hostProcess.kill("SIGTERM");
    const exited = await Promise.race([
      new Promise<void>((resolve) => {
        hostProcess.once("exit", () => resolve());
      }),
      delay(5000).then(() => undefined),
    ]);
    if (!exited && hostProcess.pid) {
      spawnSync("taskkill", ["/PID", String(hostProcess.pid), "/T", "/F"], {
        stdio: "ignore",
      });
    }
    await rm(runtimeStateRoot, { recursive: true, force: true });
  }
}

if (process.argv[1] === __filename) {
  console.log(JSON.stringify(await runRuntimeHostValidation(), null, 2));
  process.exit(0);
}
