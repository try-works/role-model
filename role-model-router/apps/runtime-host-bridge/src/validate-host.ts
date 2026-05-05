import { spawn, spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");
const vendorRoot = path.join(repoRoot, "role-model-router", "vendor", "llama-swap");
const hostAddress = "127.0.0.1:18081";
const hostBaseUrl = `http://${hostAddress}`;

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

async function main(): Promise<void> {
  const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-host-"));
  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];

  const hostProcess = spawn(
    "C:\\Program Files\\Go\\bin\\go.exe",
    ["run", ".", "-config", "config.role-model.yaml", "-listen", hostAddress],
    {
      cwd: vendorRoot,
      env: {
        ...process.env,
        ROLE_MODEL_BRIDGE_REPO_ROOT: repoRoot,
        ROLE_MODEL_BRIDGE_RUNTIME_STATE_ROOT: runtimeStateRoot,
        ROLE_MODEL_BRIDGE_PORT: "8091",
        ROLE_MODEL_BRIDGE_SCOPE_ID: "runtime-host-validation",
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

    console.log(
      JSON.stringify(
        {
          host_base_url: hostBaseUrl,
          model_count: models.data.length,
          returned_model: completion.model,
          output_text: completion.choices[0]?.message?.content ?? "",
          total_tokens: completion.usage.total_tokens,
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
        },
        null,
        2,
      ),
    );
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

await main();
process.exit(0);
