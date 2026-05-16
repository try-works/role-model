import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { packageSeaRuntime } from "./package-sea.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");

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
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(address.port);
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

export async function runRuntimePackagingValidation(): Promise<{
  readonly packagedExecutable: string;
  readonly healthStatus: string;
  readonly modelCount: number;
}> {
  const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-sea-"));
  const port = await allocateLocalPort();
  const packaged = await packageSeaRuntime();

  const child = spawn(
    packaged.outputPath,
    [
      "--repo-root",
      repoRoot,
      "--runtime-state-root",
      runtimeStateRoot,
      "--scope-id",
      "runtime-sea-validation",
      "--host",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    stdoutChunks.push(chunk);
  });
  child.stderr.on("data", (chunk) => {
    stderrChunks.push(chunk);
  });

  let validationResult:
    | {
        readonly packagedExecutable: string;
        readonly healthStatus: string;
        readonly modelCount: number;
      }
    | undefined;
  let validationError: unknown;

  try {
    const health = await waitForOk(`http://127.0.0.1:${port}/healthz`, 20000);
    const healthJson = (await health.json()) as { status: string };
    const models = await waitForOk(`http://127.0.0.1:${port}/v1/models`, 10000);
    const modelJson = (await models.json()) as { data: unknown[] };
    validationResult = {
      packagedExecutable: packaged.outputPath,
      healthStatus: healthJson.status,
      modelCount: modelJson.data.length,
    };
  } catch (error) {
    validationError = error;
  } finally {
    child.kill("SIGTERM");
    await rm(runtimeStateRoot, { recursive: true, force: true });
  }

  const stderrOutput = stderrChunks.join("").trim();
  if (validationError) {
    throw validationError;
  }
  if (stderrOutput.length > 0 && !child.killed) {
    throw new Error(stderrOutput);
  }
  if (!validationResult) {
    throw new Error("Runtime packaging validation did not produce a result.");
  }

  return validationResult;
}

const result = await runRuntimePackagingValidation();
console.log(JSON.stringify(result, null, 2));
