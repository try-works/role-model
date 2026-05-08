import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import {
  ProcessSupervisor,
  type ManagedVendor,
  type ManagedVendorStatus,
  type StartVendorOptions,
} from "@role-model-router/process-supervisor";

import { ensureLiteLLMCommand, renderLiteLLMConfig, startLiteLLMVendor } from "../src/index.js";

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
      vendorId: "litellm",
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

describe("vendor-litellm", () => {
  test("renders LiteLLM provider inventory into a deterministic config document", () => {
    const rendered = renderLiteLLMConfig({
      providers: [
        {
          providerId: "openai",
          apiKeyRef: "${OPENAI_API_KEY}",
          modelMappings: [
            {
              modelId: "openai/gpt-4.1-mini-fast",
              litellmModel: "openai/gpt-4.1-mini",
            },
          ],
        },
      ],
    });

    expect(rendered).toContain("model_list:");
    expect(rendered).toContain("model_name: openai/gpt-4.1-mini-fast");
    expect(rendered).toContain("model: openai/gpt-4.1-mini");
    expect(rendered).toContain("api_key: ${OPENAI_API_KEY}");
  });

  test("renders advanced litellm params needed for a real proxy-backed upstream", () => {
    const rendered = renderLiteLLMConfig({
      providers: [
        {
          providerId: "openai",
          apiKeyRef: null,
          modelMappings: [
            {
              modelId: "openai/gpt-4.1-mini-fast",
              litellmModel: "openai/gpt-4.1-mini",
              litellmParams: {
                model: "openai/gpt-4.1-mini",
                api_base: "http://127.0.0.1:4010/v1",
                api_key: "none",
                temperature: 0,
              },
            },
          ],
        },
      ],
    });

    expect(rendered).toContain("api_base: http://127.0.0.1:4010/v1");
    expect(rendered).toContain("api_key: none");
    expect(rendered).toContain("temperature: 0");
  });

  test("installs litellm into a role-model-owned uv tool directory", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-litellm-provision-"));
    tempRoots.push(tempRoot);
    const runtimeStateRoot = path.join(tempRoot, "runtime");
    const toolDir = path.join(runtimeStateRoot, "vendors", "uv-tools");
    const toolBinDir = path.join(toolDir, "bin");
    const expectedCommand = path.join(
      toolDir,
      "litellm",
      process.platform === "win32" ? "Scripts" : "bin",
      process.platform === "win32" ? "litellm.exe" : "litellm",
    );

    const ensured = await ensureLiteLLMCommand({
      runtimeStateRoot,
      platform: process.platform,
      arch: process.arch,
      whichCommand: () =>
        process.platform === "win32" ? "C:\\tools\\uv.exe" : "/usr/local/bin/uv",
      runCommand: async (command, args, env) => {
        expect(command).toContain("uv");
        expect(args).toEqual(["tool", "install", "litellm[proxy]"]);
        expect(env.UV_TOOL_DIR).toBe(toolDir);
        expect(env.UV_TOOL_BIN_DIR).toBe(toolBinDir);
        await mkdir(path.dirname(expectedCommand), { recursive: true });
        await writeFile(expectedCommand, "litellm", "utf8");
      },
    });

    expect(ensured.command).toBe(expectedCommand);
    expect(ensured.toolDir).toBe(toolDir);
  });

  test("prefers uv already on PATH before downloading another copy", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-litellm-path-uv-"));
    tempRoots.push(tempRoot);
    const runtimeStateRoot = path.join(tempRoot, "runtime");
    const toolDir = path.join(runtimeStateRoot, "vendors", "uv-tools");
    const pathUv = path.join(tempRoot, process.platform === "win32" ? "uv.exe" : "uv");
    const expectedCommand = path.join(
      toolDir,
      "litellm",
      process.platform === "win32" ? "Scripts" : "bin",
      process.platform === "win32" ? "litellm.exe" : "litellm",
    );
    await writeFile(pathUv, "uv", "utf8");

    const originalPath = process.env.PATH;
    const originalWindowsPath = process.env.Path;
    process.env.PATH = tempRoot;
    process.env.Path = tempRoot;

      try {
        const ensured = await ensureLiteLLMCommand({
          runtimeStateRoot,
          runCommand: async (command, args, env) => {
            expect(command).toBe(pathUv);
            expect(args).toEqual(["tool", "install", "litellm[proxy]"]);
            expect(env.UV_TOOL_DIR).toBe(toolDir);
            expect(env.UV_TOOL_BIN_DIR).toBe(path.join(toolDir, "bin"));
            await mkdir(path.dirname(expectedCommand), { recursive: true });
            await writeFile(expectedCommand, "litellm", "utf8");
          },
        downloadArchive: async () => {
          throw new Error("should not download uv when PATH already provides it");
        },
      });

      expect(ensured.uvCommand).toBe(pathUv);
      expect(ensured.command).toBe(expectedCommand);
    } finally {
      process.env.PATH = originalPath;
      process.env.Path = originalWindowsPath;
    }
  });

  test("uses default litellm args when unified config does not provide any", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-litellm-default-args-"));
    tempRoots.push(tempRoot);
    const runtimeStateRoot = path.join(tempRoot, "runtime");
    const toolCommand = path.join(
      runtimeStateRoot,
      "vendors",
      "uv-tools",
      "litellm",
      process.platform === "win32" ? "Scripts" : "bin",
      process.platform === "win32" ? "litellm.exe" : "litellm",
    );
    await mkdir(path.dirname(toolCommand), { recursive: true });
    await writeFile(toolCommand, "litellm", "utf8");

    const supervisor = new RecordingSupervisor();

    await startLiteLLMVendor({
      runtimeStateRoot,
      supervisor,
      config: {
        providers: [
          {
            providerId: "openai",
            apiKeyRef: "none",
            modelMappings: [
              {
                modelId: "openai/gpt-4.1-mini-fast",
                litellmModel: "openai/gpt-4.1-mini",
              },
            ],
          },
        ],
        args: [],
      },
    });

    expect(supervisor.capturedOptions?.command).toBe(toolCommand);
    expect(supervisor.capturedOptions?.args?.[0]).toBe("--config");
    expect(supervisor.capturedOptions?.args?.[1]).toBe(
      path.join(runtimeStateRoot, "vendors", "litellm", "litellm.generated.yaml"),
    );
    expect(supervisor.capturedOptions?.args?.[2]).toBe("--port");
    expect(supervisor.capturedOptions?.args?.[3]).toMatch(/^\d+$/);
  });

  test("uses a longer default startup timeout for the real litellm proxy", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-litellm-startup-timeout-"));
    tempRoots.push(tempRoot);
    const runtimeStateRoot = path.join(tempRoot, "runtime");
    const toolCommand = path.join(
      runtimeStateRoot,
      "vendors",
      "uv-tools",
      "litellm",
      process.platform === "win32" ? "Scripts" : "bin",
      process.platform === "win32" ? "litellm.exe" : "litellm",
    );
    await mkdir(path.dirname(toolCommand), { recursive: true });
    await writeFile(toolCommand, "litellm", "utf8");

    const supervisor = new RecordingSupervisor();

    await startLiteLLMVendor({
      runtimeStateRoot,
      supervisor,
      config: {
        providers: [
          {
            providerId: "openai",
            apiKeyRef: "none",
            modelMappings: [
              {
                modelId: "openai/gpt-4.1-mini-fast",
                litellmModel: "openai/gpt-4.1-mini",
              },
            ],
          },
        ],
      },
    });

    expect(supervisor.capturedOptions?.startupTimeoutMs).toBe(30_000);
  });

  test("forces utf-8 python io for the real litellm proxy process", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-litellm-python-encoding-"));
    tempRoots.push(tempRoot);
    const runtimeStateRoot = path.join(tempRoot, "runtime");
    const toolCommand = path.join(
      runtimeStateRoot,
      "vendors",
      "uv-tools",
      "litellm",
      process.platform === "win32" ? "Scripts" : "bin",
      process.platform === "win32" ? "litellm.exe" : "litellm",
    );
    await mkdir(path.dirname(toolCommand), { recursive: true });
    await writeFile(toolCommand, "litellm", "utf8");

    const supervisor = new RecordingSupervisor();

    await startLiteLLMVendor({
      runtimeStateRoot,
      supervisor,
      config: {
        providers: [
          {
            providerId: "openai",
            apiKeyRef: "none",
            modelMappings: [
              {
                modelId: "openai/gpt-4.1-mini-fast",
                litellmModel: "openai/gpt-4.1-mini",
              },
            ],
          },
        ],
      },
    });

    expect(supervisor.capturedOptions?.env).toEqual(
      expect.objectContaining({
        PYTHONIOENCODING: "utf-8",
        PYTHONUTF8: "1",
      }),
    );
  });

  test("starts a managed LiteLLM vendor and captures cost plus cache metadata from responses", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-litellm-vendor-"));
    tempRoots.push(runtimeStateRoot);

    const supervisor = new ProcessSupervisor();
    supervisors.push(supervisor);

    const vendor = await startLiteLLMVendor({
      runtimeStateRoot,
      supervisor,
      config: {
        providers: [
          {
            providerId: "openai",
            apiKeyRef: "${OPENAI_API_KEY}",
            modelMappings: [
              {
                modelId: "openai/gpt-4.1-mini-fast",
                litellmModel: "openai/gpt-4.1-mini",
              },
            ],
          },
        ],
        command: "node",
        args: [
          "-e",
          `const http=require("node:http");const port=Number(process.env.PORT);const server=http.createServer((req,res)=>{if(req.url==="/health/liveliness"){res.statusCode=200;res.end("ok");return;}if(req.url==="/v1/chat/completions"){let body="";req.on("data",chunk=>body+=chunk);req.on("end",()=>{res.setHeader("content-type","application/json");res.end(JSON.stringify({id:"chatcmpl-remote",choices:[{message:{content:"remote litellm summary"},finish_reason:"stop"}],usage:{prompt_tokens:14,completion_tokens:5,prompt_tokens_details:{cached_tokens:9}},_hidden_params:{response_cost:0.0042,cache_hit:true}}));});return;}res.statusCode=404;res.end("missing");});server.listen(port,"127.0.0.1");const shutdown=()=>server.close(()=>process.exit(0));process.on("SIGTERM",shutdown);process.on("SIGINT",shutdown);`,
        ],
        env: {},
      },
    });

    const result = await vendor.execute({
      providerFamily: "ai-sdk-openai",
      endpointId: "openai.vendor.primary",
      url: "https://api.openai.com/v1/chat/completions",
      headers: {
        authorization: "Bearer OPENAI_API_KEY",
        "content-type": "application/json",
      },
      body: {
        model: "openai/gpt-4.1-mini-fast",
        messages: [{ role: "user", content: "Summarize the remote endpoint." }],
      },
    });
    expect(await vendor.healthCheck()).toEqual(
      expect.objectContaining({
        vendorId: "litellm",
        healthStatus: "healthy",
      }),
    );

    expect(vendor.readStatus()).toEqual(
      expect.objectContaining({
        vendorId: "litellm",
        healthStatus: "healthy",
        lastLatencyMs: expect.any(Number),
      }),
    );
    expect(result.statusCode).toBe(200);
    expect(result.metadata).toEqual(
      expect.objectContaining({
        vendorId: "litellm",
        resolvedModelId: "openai/gpt-4.1-mini-fast",
        costUsd: 0.0042,
        cacheUsed: true,
        cacheReadTokens: 9,
        latencyMs: expect.any(Number),
      }),
    );
    expect(result.body).toEqual(
      expect.objectContaining({
        id: "chatcmpl-remote",
      }),
    );
  });

  test("captures response cost from LiteLLM headers when the proxy strips hidden params", async () => {
    const runtimeStateRoot = await mkdtemp(
      path.join(os.tmpdir(), "role-model-litellm-vendor-header-cost-"),
    );
    tempRoots.push(runtimeStateRoot);

    const supervisor = new ProcessSupervisor();
    supervisors.push(supervisor);

    const vendor = await startLiteLLMVendor({
      runtimeStateRoot,
      supervisor,
      config: {
        providers: [
          {
            providerId: "openai",
            apiKeyRef: "${OPENAI_API_KEY}",
            modelMappings: [
              {
                modelId: "openai/gpt-4.1-mini-fast",
                litellmModel: "openai/gpt-4.1-mini",
              },
            ],
          },
        ],
        command: "node",
        args: [
          "-e",
          `const http=require("node:http");const port=Number(process.env.PORT);const server=http.createServer((req,res)=>{if(req.url==="/health/liveliness"){res.statusCode=200;res.end("ok");return;}if(req.url==="/v1/chat/completions"){let body="";req.on("data",chunk=>body+=chunk);req.on("end",()=>{res.setHeader("content-type","application/json");res.setHeader("x-litellm-response-cost","0.0042");res.end(JSON.stringify({id:"chatcmpl-remote",choices:[{message:{content:"remote litellm summary"},finish_reason:"stop"}],usage:{prompt_tokens:14,completion_tokens:5,prompt_tokens_details:{cached_tokens:9}}}));});return;}res.statusCode=404;res.end("missing");});server.listen(port,"127.0.0.1");const shutdown=()=>server.close(()=>process.exit(0));process.on("SIGTERM",shutdown);process.on("SIGINT",shutdown);`,
        ],
        env: {},
      },
    });

    const result = await vendor.execute({
      providerFamily: "ai-sdk-openai",
      endpointId: "openai.vendor.primary",
      url: "https://api.openai.com/v1/chat/completions",
      headers: {
        authorization: "Bearer OPENAI_API_KEY",
        "content-type": "application/json",
      },
      body: {
        model: "openai/gpt-4.1-mini-fast",
        messages: [{ role: "user", content: "Summarize the remote endpoint." }],
      },
    });

    expect(result.metadata).toEqual(
      expect.objectContaining({
        vendorId: "litellm",
        resolvedModelId: "openai/gpt-4.1-mini-fast",
        costUsd: 0.0042,
        cacheReadTokens: 9,
        latencyMs: expect.any(Number),
      }),
    );
  });

  test("captures cache status from LiteLLM headers when the proxy omits hidden cache markers", async () => {
    const runtimeStateRoot = await mkdtemp(
      path.join(os.tmpdir(), "role-model-litellm-vendor-header-cache-status-"),
    );
    tempRoots.push(runtimeStateRoot);

    const supervisor = new ProcessSupervisor();
    supervisors.push(supervisor);

    const vendor = await startLiteLLMVendor({
      runtimeStateRoot,
      supervisor,
      config: {
        providers: [
          {
            providerId: "openai",
            apiKeyRef: "${OPENAI_API_KEY}",
            modelMappings: [
              {
                modelId: "openai/gpt-4.1-mini-fast",
                litellmModel: "openai/gpt-4.1-mini",
              },
            ],
          },
        ],
        command: "node",
        args: [
          "-e",
          `const http=require("node:http");const port=Number(process.env.PORT);const server=http.createServer((req,res)=>{if(req.url==="/health/liveliness"){res.statusCode=200;res.end("ok");return;}if(req.url==="/v1/chat/completions"){let body="";req.on("data",chunk=>body+=chunk);req.on("end",()=>{res.setHeader("content-type","application/json");res.setHeader("x-litellm-cache-status","HIT");res.end(JSON.stringify({id:"chatcmpl-remote",choices:[{message:{content:"remote litellm summary"},finish_reason:"stop"}],usage:{prompt_tokens:14,completion_tokens:5}}));});return;}res.statusCode=404;res.end("missing");});server.listen(port,"127.0.0.1");const shutdown=()=>server.close(()=>process.exit(0));process.on("SIGTERM",shutdown);process.on("SIGINT",shutdown);`,
        ],
        env: {},
      },
    });

    const result = await vendor.execute({
      providerFamily: "ai-sdk-openai",
      endpointId: "openai.vendor.primary",
      url: "https://api.openai.com/v1/chat/completions",
      headers: {
        authorization: "Bearer OPENAI_API_KEY",
        "content-type": "application/json",
      },
      body: {
        model: "openai/gpt-4.1-mini-fast",
        messages: [{ role: "user", content: "Summarize the remote endpoint." }],
      },
    });

    expect(result.metadata).toEqual(
      expect.objectContaining({
        vendorId: "litellm",
        resolvedModelId: "openai/gpt-4.1-mini-fast",
        cacheStatus: "HIT",
        latencyMs: expect.any(Number),
      }),
    );
  });

  test("forwards fallback model ids into the LiteLLM request body", async () => {
    const runtimeStateRoot = await mkdtemp(
      path.join(os.tmpdir(), "role-model-litellm-vendor-fallbacks-"),
    );
    tempRoots.push(runtimeStateRoot);

    const supervisor = new ProcessSupervisor();
    supervisors.push(supervisor);
    let receivedBody: Record<string, unknown> | null = null;

    const vendor = await startLiteLLMVendor({
      runtimeStateRoot,
      supervisor,
      config: {
        providers: [
          {
            providerId: "openai",
            apiKeyRef: "${OPENAI_API_KEY}",
            modelMappings: [
              {
                modelId: "openai/gpt-4.1-mini-fast",
                litellmModel: "openai/gpt-4.1-mini",
              },
              {
                modelId: "openai/gpt-4.1-mini-slow",
                litellmModel: "openai/gpt-4.1-mini",
              },
            ],
          },
        ],
        command: "node",
        args: [
          "-e",
          `const http=require("node:http");const port=Number(process.env.PORT);const server=http.createServer((req,res)=>{if(req.url==="/health/liveliness"){res.statusCode=200;res.end("ok");return;}if(req.url==="/v1/chat/completions"){let body="";req.on("data",chunk=>body+=chunk);req.on("end",()=>{res.setHeader("content-type","application/json");res.end(JSON.stringify({received:JSON.parse(body||"{}"),id:"chatcmpl-remote",choices:[{message:{content:"remote litellm summary"},finish_reason:"stop"}],usage:{prompt_tokens:14,completion_tokens:5}}));});return;}res.statusCode=404;res.end("missing");});server.listen(port,"127.0.0.1");const shutdown=()=>server.close(()=>process.exit(0));process.on("SIGTERM",shutdown);process.on("SIGINT",shutdown);`,
        ],
        env: {},
      },
    });

    const result = await vendor.execute(
      {
        providerFamily: "ai-sdk-openai",
        endpointId: "openai.vendor.primary",
        url: "https://api.openai.com/v1/chat/completions",
        headers: {
          authorization: "Bearer OPENAI_API_KEY",
          "content-type": "application/json",
        },
        body: {
          model: "openai/gpt-4.1-mini-fast",
          messages: [{ role: "user", content: "Summarize the remote endpoint." }],
        },
      },
      {
        fallbackModelIds: ["openai/gpt-4.1-mini-slow"],
      },
    );

    if (result.body && typeof result.body === "object" && "received" in result.body) {
      receivedBody = result.body.received as Record<string, unknown>;
    }

    expect(receivedBody).toEqual(
      expect.objectContaining({
        model: "openai/gpt-4.1-mini-fast",
        fallbacks: ["openai/gpt-4.1-mini-slow"],
      }),
    );
  });

  test("streams chat-completions deltas through the managed LiteLLM vendor", async () => {
    const runtimeStateRoot = await mkdtemp(
      path.join(os.tmpdir(), "role-model-litellm-vendor-stream-"),
    );
    tempRoots.push(runtimeStateRoot);

    const supervisor = new ProcessSupervisor();
    supervisors.push(supervisor);
    const streamedChunks: Record<string, unknown>[] = [];

    const vendor = await startLiteLLMVendor({
      runtimeStateRoot,
      supervisor,
      config: {
        providers: [
          {
            providerId: "openai",
            apiKeyRef: "${OPENAI_API_KEY}",
            modelMappings: [
              {
                modelId: "openai/gpt-4.1-mini-fast",
                litellmModel: "openai/gpt-4.1-mini",
              },
            ],
          },
        ],
        command: "node",
        args: [
          "-e",
          `const http=require("node:http");const port=Number(process.env.PORT);const server=http.createServer((req,res)=>{if(req.url==="/health/liveliness"){res.statusCode=200;res.end("ok");return;}if(req.url==="/v1/chat/completions"){let body="";req.on("data",chunk=>body+=chunk);req.on("end",()=>{const parsed=JSON.parse(body||"{}");if(parsed.stream){res.writeHead(200,{"content-type":"text/event-stream; charset=utf-8"});res.write('data: {"id":"chatcmpl-remote","object":"chat.completion.chunk","created":1,"model":"openai/gpt-4.1-mini-fast","choices":[{"index":0,"delta":{"role":"assistant","content":"remote "},"finish_reason":null}]}'+"\\n\\n");setTimeout(()=>{res.write('data: {"id":"chatcmpl-remote","object":"chat.completion.chunk","created":1,"model":"openai/gpt-4.1-mini-fast","choices":[{"index":0,"delta":{"content":"litellm summary"},"finish_reason":null}]}'+"\\n\\n");setTimeout(()=>{res.end('data: {"id":"chatcmpl-remote","object":"chat.completion.chunk","created":1,"model":"openai/gpt-4.1-mini-fast","choices":[{"index":0,"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":14,"completion_tokens":5},"_hidden_params":{"response_cost":0.0042,"cache_hit":true}}'+"\\n\\n"+'data: [DONE]'+"\\n\\n");},10);},10);return;}res.setHeader("content-type","application/json");res.end(JSON.stringify({id:"chatcmpl-remote",choices:[{message:{content:"remote litellm summary"},finish_reason:"stop"}],usage:{prompt_tokens:14,completion_tokens:5,prompt_tokens_details:{cached_tokens:9}},_hidden_params:{response_cost:0.0042,cache_hit:true}}));});return;}res.statusCode=404;res.end("missing");});server.listen(port,"127.0.0.1");const shutdown=()=>server.close(()=>process.exit(0));process.on("SIGTERM",shutdown);process.on("SIGINT",shutdown);`,
        ],
        env: {},
      },
    });

    const result = await vendor.executeStream(
      {
        providerFamily: "ai-sdk-openai",
        endpointId: "openai.vendor.primary",
        url: "https://api.openai.com/v1/chat/completions",
        headers: {
          authorization: "Bearer OPENAI_API_KEY",
          "content-type": "application/json",
        },
        body: {
          model: "openai/gpt-4.1-mini-fast",
          stream: true,
          messages: [{ role: "user", content: "Stream the remote endpoint." }],
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
          expect.objectContaining({ delta: expect.objectContaining({ content: "remote " }) }),
        ],
      }),
      expect.objectContaining({
        object: "chat.completion.chunk",
        choices: [
          expect.objectContaining({
            delta: expect.objectContaining({ content: "litellm summary" }),
          }),
        ],
      }),
      expect.objectContaining({
        object: "chat.completion.chunk",
        choices: [expect.objectContaining({ finish_reason: "stop" })],
      }),
    ]);
    expect(typeof result.body).toBe("string");
    expect(result.body).toContain('"content":"remote "');
    expect(result.metadata).toEqual(
      expect.objectContaining({
        vendorId: "litellm",
        resolvedModelId: "openai/gpt-4.1-mini-fast",
        costUsd: 0.0042,
        latencyMs: expect.any(Number),
      }),
    );
    expect(vendor.readStatus()).toEqual(
      expect.objectContaining({
        vendorId: "litellm",
        healthStatus: "healthy",
        lastLatencyMs: expect.any(Number),
      }),
    );
  });
});
