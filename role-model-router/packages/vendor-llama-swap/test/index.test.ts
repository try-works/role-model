import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import {
  type ManagedVendor,
  type ManagedVendorStatus,
  ProcessSupervisor,
  type StartVendorOptions,
} from "@role-model-router/process-supervisor";

import {
  renderLlamaSwapConfig,
  resolveProvisionedLlamaSwapCommand,
  startLlamaSwapVendor,
} from "../src/index.js";

const tempRoots: string[] = [];
const supervisors: ProcessSupervisor[] = [];

class RecordingSupervisor extends ProcessSupervisor {
  capturedOptions: StartVendorOptions | null = null;

  override async startVendor(options: StartVendorOptions): Promise<ManagedVendor> {
    this.capturedOptions = options;
    return {
      vendorId: options.vendorId,
      pid: 1,
      port: 0,
      healthStatus: "healthy",
      restartCount: 0,
      logs: [],
      async stop(): Promise<void> {},
    };
  }

  override getVendorStatus(_vendorId: string): ManagedVendorStatus | undefined {
    return {
      vendorId: "llama-swap",
      pid: 1,
      port: 0,
      healthStatus: "healthy",
      restartCount: 0,
      logs: [],
    };
  }

  override async stopVendor(_vendorId: string): Promise<void> {}
}

afterEach(async () => {
  while (supervisors.length > 0) {
    await supervisors.pop()?.shutdown();
  }
  await Promise.all(
    tempRoots.splice(0).map(async (tempRoot) => {
      await rm(tempRoot, { recursive: true, force: true });
    }),
  );
});

describe("vendor-llama-swap", () => {
  test("renders deterministic llama-swap config from the configured model inventory", () => {
    const rendered = renderLlamaSwapConfig({
      models: [
        {
          modelId: "local/llama-3.1-8b-instruct",
          path: "./models/llama-3.1-8b-instruct-q4.gguf",
          contextWindow: 8192,
        },
      ],
      upstreamBaseUrl: "http://127.0.0.1:9000/v1",
    });

    expect(rendered).toContain("models:");
    expect(rendered).toContain("local/llama-3.1-8b-instruct:");
    expect(rendered).toContain(
      "cmd: llama-server --port ${PORT} --model ./models/llama-3.1-8b-instruct-q4.gguf",
    );
    expect(rendered).toContain("./models/llama-3.1-8b-instruct-q4.gguf");
  });

  test("renders real llama-swap launch settings for spawned upstream servers", () => {
    const rendered = renderLlamaSwapConfig({
      models: [
        {
          modelId: "local/mock-llama",
          path: "./models/mock-llama.gguf",
          contextWindow: 8192,
          command: "node ./scripts/mock-llama-server.js --port ${PORT}",
          proxyBaseUrl: "http://127.0.0.1:${PORT}/v1",
          checkEndpoint: "/ready",
          useModelName: "mock/llama-upstream",
        },
      ],
      upstreamBaseUrl: "http://127.0.0.1:9000/v1",
    });

    expect(rendered).toContain("cmd: node ./scripts/mock-llama-server.js --port ${PORT}");
    expect(rendered).toContain("proxy: http://127.0.0.1:${PORT}/v1");
    expect(rendered).toContain("checkEndpoint: /ready");
    expect(rendered).toContain("useModelName: mock/llama-upstream");
    expect(rendered).not.toContain("proxy: http://127.0.0.1:9000/v1");
  });

  test("copies a repo-owned llama-swap binary into the role-model vendor cache", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-llama-provision-"));
    tempRoots.push(tempRoot);
    const repoRoot = path.join(tempRoot, "repo");
    const runtimeStateRoot = path.join(tempRoot, "runtime");
    const bundledBinaryPath = path.join(
      repoRoot,
      "role-model-router",
      "vendor",
      "llama-swap",
      "dist-assets",
      `${process.platform}-${process.arch}`,
      process.platform === "win32" ? "llama-swap.exe" : "llama-swap",
    );

    await mkdir(path.dirname(bundledBinaryPath), { recursive: true });
    await writeFile(bundledBinaryPath, "bundled-llama-swap", "utf8");

    const commandPath = await resolveProvisionedLlamaSwapCommand({
      repoRoot,
      runtimeStateRoot,
      platform: process.platform,
      arch: process.arch,
    });

    expect(commandPath).toBe(
      path.join(
        runtimeStateRoot,
        "vendors",
        "llama-swap",
        "bin",
        process.platform === "win32" ? "llama-swap.exe" : "llama-swap",
      ),
    );
  });

  test("does not export the bridge listen port into provisioned llama-swap process env", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-llama-env-"));
    tempRoots.push(tempRoot);
    const runtimeStateRoot = path.join(tempRoot, "runtime");
    const cachedBinaryPath = path.join(
      runtimeStateRoot,
      "vendors",
      "llama-swap",
      "bin",
      process.platform === "win32" ? "llama-swap.exe" : "llama-swap",
    );
    await mkdir(path.dirname(cachedBinaryPath), { recursive: true });
    await writeFile(cachedBinaryPath, "stub-binary", "utf8");

    const supervisor = new RecordingSupervisor();

    await startLlamaSwapVendor({
      repoRoot: path.join(tempRoot, "repo"),
      runtimeStateRoot,
      supervisor,
      config: {
        models: [
          {
            modelId: "local/mock-llama",
            path: "./models/mock-llama.gguf",
            contextWindow: null,
            command: "node ./scripts/mock-llama-server.js ${PORT}",
          },
        ],
      },
    });

    expect(supervisor.capturedOptions?.command).toBe(cachedBinaryPath);
    expect(supervisor.capturedOptions?.env.PORT).toBeUndefined();
  });

  test("uses default llama-swap args when unified config does not provide any", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-llama-default-args-"));
    tempRoots.push(tempRoot);
    const runtimeStateRoot = path.join(tempRoot, "runtime");
    const cachedBinaryPath = path.join(
      runtimeStateRoot,
      "vendors",
      "llama-swap",
      "bin",
      process.platform === "win32" ? "llama-swap.exe" : "llama-swap",
    );
    await mkdir(path.dirname(cachedBinaryPath), { recursive: true });
    await writeFile(cachedBinaryPath, "stub-binary", "utf8");

    const supervisor = new RecordingSupervisor();

    await startLlamaSwapVendor({
      repoRoot: path.join(tempRoot, "repo"),
      runtimeStateRoot,
      supervisor,
      config: {
        models: [
          {
            modelId: "local/mock-llama",
            path: "./models/mock-llama.gguf",
            contextWindow: null,
          },
        ],
        args: [],
      },
    });

    expect(supervisor.capturedOptions?.args?.[0]).toBe("-config");
    expect(supervisor.capturedOptions?.args?.[1]).toBe(
      path.join(runtimeStateRoot, "vendors", "llama-swap", "config.role-model.generated.yaml"),
    );
    expect(supervisor.capturedOptions?.args?.[2]).toBe("-listen");
    expect(supervisor.capturedOptions?.args?.[3]).toMatch(/^127\.0\.0\.1:\d+$/);
  });

  test("starts a managed llama-swap vendor and executes local openai-compatible requests through it", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-llama-vendor-"));
    tempRoots.push(runtimeStateRoot);

    const supervisor = new ProcessSupervisor();
    supervisors.push(supervisor);

    const vendor = await startLlamaSwapVendor({
      repoRoot: path.resolve(process.cwd(), "..", ".."),
      runtimeStateRoot,
      supervisor,
      config: {
        models: [
          {
            modelId: "local/llama-3.1-8b-instruct",
            path: "./models/llama-3.1-8b-instruct-q4.gguf",
            contextWindow: 8192,
          },
        ],
        command: "node",
        args: [
          "-e",
          `const http=require("node:http");const port=Number(process.env.PORT);const server=http.createServer((req,res)=>{if(req.url==="/health"){res.statusCode=200;res.end("ok");return;}if(req.url==="/v1/chat/completions"){let body="";req.on("data",chunk=>body+=chunk);req.on("end",()=>{res.setHeader("content-type","application/json");res.end(JSON.stringify({id:"chatcmpl-local",choices:[{message:{content:"local llama summary"},finish_reason:"stop"}],usage:{prompt_tokens:11,completion_tokens:4}}));});return;}res.statusCode=404;res.end("missing");});server.listen(port,"127.0.0.1");const shutdown=()=>server.close(()=>process.exit(0));process.on("SIGTERM",shutdown);process.on("SIGINT",shutdown);`,
        ],
        env: {},
      },
    });

    const result = await vendor.execute({
      providerFamily: "ai-sdk-openai-compatible",
      endpointId: "local.llama.primary",
      url: "local://runtime/chat/completions",
      headers: {
        "content-type": "application/json",
      },
      body: {
        model: "local/llama-3.1-8b-instruct",
        messages: [{ role: "user", content: "Summarize the local endpoint." }],
      },
    });
    expect(await vendor.healthCheck()).toEqual(
      expect.objectContaining({
        vendorId: "llama-swap",
        healthStatus: "healthy",
      }),
    );

    expect(vendor.readStatus()).toEqual(
      expect.objectContaining({
        vendorId: "llama-swap",
        healthStatus: "healthy",
        lastLatencyMs: expect.any(Number),
      }),
    );
    expect(result.statusCode).toBe(200);
    expect(result.metadata).toEqual(
      expect.objectContaining({
        resolvedModelId: "local/llama-3.1-8b-instruct",
        vendorId: "llama-swap",
        latencyMs: expect.any(Number),
      }),
    );
    expect(result.body).toEqual({
      id: "chatcmpl-local",
      choices: [
        {
          message: {
            content: "local llama summary",
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: 11,
        completion_tokens: 4,
      },
    });
  });

  test("streams chat-completions deltas through the managed llama-swap vendor", async () => {
    const runtimeStateRoot = await mkdtemp(
      path.join(os.tmpdir(), "role-model-llama-vendor-stream-"),
    );
    tempRoots.push(runtimeStateRoot);

    const supervisor = new ProcessSupervisor();
    supervisors.push(supervisor);
    const streamedChunks: Record<string, unknown>[] = [];

    const vendor = await startLlamaSwapVendor({
      repoRoot: path.resolve(process.cwd(), "..", ".."),
      runtimeStateRoot,
      supervisor,
      config: {
        models: [
          {
            modelId: "local/llama-3.1-8b-instruct",
            path: "./models/llama-3.1-8b-instruct-q4.gguf",
            contextWindow: 8192,
          },
        ],
        command: "node",
        args: [
          "-e",
          `const http=require("node:http");const port=Number(process.env.PORT);const server=http.createServer((req,res)=>{if(req.url==="/health"){res.statusCode=200;res.end("ok");return;}if(req.url==="/v1/chat/completions"){let body="";req.on("data",chunk=>body+=chunk);req.on("end",()=>{const parsed=JSON.parse(body||"{}");if(parsed.stream){res.writeHead(200,{"content-type":"text/event-stream; charset=utf-8"});res.write('data: {"id":"chatcmpl-local","object":"chat.completion.chunk","created":1,"model":"local/llama-3.1-8b-instruct","choices":[{"index":0,"delta":{"role":"assistant","content":"local "},"finish_reason":null}]}'+"\\n\\n");setTimeout(()=>{res.write('data: {"id":"chatcmpl-local","object":"chat.completion.chunk","created":1,"model":"local/llama-3.1-8b-instruct","choices":[{"index":0,"delta":{"content":"llama summary"},"finish_reason":null}]}'+"\\n\\n");setTimeout(()=>{res.end('data: {"id":"chatcmpl-local","object":"chat.completion.chunk","created":1,"model":"local/llama-3.1-8b-instruct","choices":[{"index":0,"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":11,"completion_tokens":4}}'+"\\n\\n"+'data: [DONE]'+"\\n\\n");},10);},10);return;}res.setHeader("content-type","application/json");res.end(JSON.stringify({id:"chatcmpl-local",choices:[{message:{content:"local llama summary"},finish_reason:"stop"}],usage:{prompt_tokens:11,completion_tokens:4}}));});return;}res.statusCode=404;res.end("missing");});server.listen(port,"127.0.0.1");const shutdown=()=>server.close(()=>process.exit(0));process.on("SIGTERM",shutdown);process.on("SIGINT",shutdown);`,
        ],
        env: {},
      },
    });

    const result = await vendor.executeStream(
      {
        providerFamily: "ai-sdk-openai-compatible",
        endpointId: "local.llama.primary",
        url: "local://runtime/chat/completions",
        headers: {
          "content-type": "application/json",
        },
        body: {
          model: "local/llama-3.1-8b-instruct",
          stream: true,
          messages: [{ role: "user", content: "Stream the local endpoint." }],
        },
      },
      async (chunk) => {
        streamedChunks.push(chunk);
      },
    );

    expect(streamedChunks).toEqual([
      expect.objectContaining({
        object: "chat.completion.chunk",
        choices: [
          expect.objectContaining({ delta: expect.objectContaining({ content: "local " }) }),
        ],
      }),
      expect.objectContaining({
        object: "chat.completion.chunk",
        choices: [
          expect.objectContaining({ delta: expect.objectContaining({ content: "llama summary" }) }),
        ],
      }),
      expect.objectContaining({
        object: "chat.completion.chunk",
        choices: [expect.objectContaining({ finish_reason: "stop" })],
      }),
    ]);
    expect(typeof result.body).toBe("string");
    expect(result.body).toContain('"content":"local "');
    expect(result.metadata).toEqual(
      expect.objectContaining({
        vendorId: "llama-swap",
        resolvedModelId: "local/llama-3.1-8b-instruct",
        latencyMs: expect.any(Number),
      }),
    );
    expect(vendor.readStatus()).toEqual(
      expect.objectContaining({
        vendorId: "llama-swap",
        healthStatus: "healthy",
        lastLatencyMs: expect.any(Number),
      }),
    );
  });
});
