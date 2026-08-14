import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer as createHttpServer } from "node:http";
import { createServer } from "node:net";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { canonicalTaxonomy, taxonomyManifest } from "@role-model-router/core";

import { packageSeaRuntime } from "./package-sea.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");
const packagingValidationCredentialRef = "SP7_MOONSHOT_API_KEY";
const packagingValidationCredentialValue = "packaging-validation-key";
const packagingValidationModelId = "moonshot/kimi-k2.5";
const packagingValidationAccountId = "moonshot.personal.primary";

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

async function fetchJson<TValue>(url: string, init?: RequestInit): Promise<TValue> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`Request to ${url} failed with ${response.status}: ${await response.text()}`);
  }
  return (await response.json()) as TValue;
}

async function stopProcessTree(child: ChildProcess): Promise<void> {
  if (child.pid == null || child.exitCode !== null) {
    return;
  }

  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
  } else {
    child.kill("SIGTERM");
  }

  const deadline = Date.now() + 10_000;
  while (child.exitCode === null && Date.now() < deadline) {
    await delay(100);
  }

  if (child.exitCode === null && child.pid != null) {
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
    } else {
      child.kill("SIGKILL");
    }
  }
}

function extractChatOutputText(payload: unknown): string {
  if (
    !payload ||
    typeof payload !== "object" ||
    !("choices" in payload) ||
    !Array.isArray(payload.choices)
  ) {
    return "";
  }
  const choice = payload.choices[0];
  if (
    !choice ||
    typeof choice !== "object" ||
    !("message" in choice) ||
    !choice.message ||
    typeof choice.message !== "object" ||
    !("content" in choice.message) ||
    typeof choice.message.content !== "string"
  ) {
    return "";
  }
  return choice.message.content;
}

function extractResponsesOutputText(payload: unknown): string {
  if (
    !payload ||
    typeof payload !== "object" ||
    !("output" in payload) ||
    !Array.isArray(payload.output)
  ) {
    return "";
  }
  const message = payload.output.find(
    (entry): entry is { content?: unknown } => Boolean(entry) && typeof entry === "object",
  );
  if (!message || !Array.isArray(message.content)) {
    return "";
  }
  const outputTextPart = message.content.find(
    (entry): entry is { text?: unknown } =>
      Boolean(entry) && typeof entry === "object" && "text" in entry,
  );
  return typeof outputTextPart?.text === "string" ? outputTextPart.text : "";
}

function assertEqual(actual: unknown, expected: unknown, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label} mismatch: expected ${String(expected)}, got ${String(actual)}`);
  }
}

function assertArrayIncludes<TValue>(
  values: readonly TValue[],
  expected: TValue,
  label: string,
): void {
  if (!values.includes(expected)) {
    throw new Error(`${label} is missing ${String(expected)}`);
  }
}

function assertArrayEqual<TValue>(
  actual: readonly TValue[],
  expected: readonly TValue[],
  label: string,
): void {
  if (
    actual.length !== expected.length ||
    actual.some((value, index) => value !== expected[index])
  ) {
    throw new Error(
      `${label} mismatch: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}

async function startMockOpenAICompatibleServer(): Promise<{
  readonly baseUrl: string;
  close(): Promise<void>;
}> {
  const port = await allocateLocalPort();
  const server = createHttpServer(async (request, response) => {
    const unauthorized =
      request.headers.authorization !== `Bearer ${packagingValidationCredentialValue}`;
    if (unauthorized) {
      response.writeHead(401, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "missing bearer credential" }));
      return;
    }

    if (request.method === "POST" && request.url === "/v1/chat/completions") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          id: "chatcmpl-packaged-validation",
          object: "chat.completion",
          model: packagingValidationModelId,
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: "packaged env endpoint summary",
              },
              finish_reason: "stop",
            },
          ],
          usage: {
            prompt_tokens: 11,
            completion_tokens: 4,
            total_tokens: 15,
          },
        }),
      );
      return;
    }

    if (request.method === "POST" && request.url === "/v1/responses") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          id: "resp-packaged-validation",
          object: "response",
          created_at: 1,
          status: "completed",
          model: packagingValidationModelId,
          output: [
            {
              type: "message",
              id: "msg_packaged_validation",
              status: "completed",
              role: "assistant",
              content: [
                {
                  type: "output_text",
                  text: "packaged env endpoint summary",
                },
              ],
            },
          ],
          usage: {
            input_tokens: 11,
            output_tokens: 4,
            total_tokens: 15,
          },
        }),
      );
      return;
    }

    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "not found" }));
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve());
  });

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    async close(): Promise<void> {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    },
  };
}

async function exercisePackagedExecutionValidation(input: {
  readonly baseUrl: string;
  readonly apiBaseUrl: string;
  readonly credentialRef: string;
}): Promise<{
  readonly endpointId: string;
  readonly latestRequestIds: readonly string[];
  readonly modelCount: number;
  readonly roleDefinitionCount: number;
  readonly chatOutputText: string;
  readonly responsesOutputText: string;
}> {
  await fetchJson(`${input.baseUrl}/api/role-model/accounts`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      providerAccountId: packagingValidationAccountId,
      providerId: "moonshot",
      providerKind: "provider-openai",
      orgScope: "personal",
      accountScope: "workspace-default",
      credentialRef: {
        backend: "env",
        ref: input.credentialRef,
      },
      authMode: "api-key-static",
      regionPolicy: {
        mode: "prefer",
        regions: ["global"],
      },
      baseUrlOverride: input.apiBaseUrl,
      allowedModels: [packagingValidationModelId],
      modelRoleBindings: [
        {
          modelId: packagingValidationModelId,
          roleIds: ["general.chat"],
        },
      ],
      deniedModels: [],
      entitlementTags: ["chat"],
      budgetPolicyRef: "budget.default",
      quotaPolicyRef: "quota.default",
      status: "active",
      healthStatus: "healthy",
      rotationState: "stable",
    }),
  });

  const activatedEndpoint = await fetchJson<{
    endpointId: string;
  }>(`${input.baseUrl}/api/role-model/endpoints`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      providerAccountId: packagingValidationAccountId,
      modelId: packagingValidationModelId,
      region: "global",
    }),
  });

  const rolePolicy = await fetchJson<{
    roleDefinitions: unknown[];
    taskDefinitions: unknown[];
  }>(`${input.baseUrl}/api/role-model/role-policy`);
  const models = await fetchJson<{ data: unknown[] }>(`${input.baseUrl}/v1/models`);
  const latestRequestIds = await fetchJson<readonly string[]>(
    `${input.baseUrl}/api/role-model/requests/latest-ids?limit=10`,
  );
  const chatResponse = await fetchJson(`${input.baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: packagingValidationModelId,
      messages: [{ role: "user", content: "Summarize the chosen endpoint." }],
    }),
  });
  const responsesResponse = await fetchJson(`${input.baseUrl}/v1/responses`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: packagingValidationModelId,
      input: "Summarize the chosen endpoint.",
    }),
  });

  return {
    endpointId: activatedEndpoint.endpointId,
    latestRequestIds,
    modelCount: models.data.length,
    roleDefinitionCount: rolePolicy.roleDefinitions.length,
    chatOutputText: extractChatOutputText(chatResponse),
    responsesOutputText: extractResponsesOutputText(responsesResponse),
  };
}

async function exercisePackagedTaxonomyValidation(input: {
  readonly baseUrl: string;
}): Promise<{
  readonly taxonomyVersion: string;
  readonly contentRevision: string;
  readonly securityTaskCount: number;
}> {
  const manifest = await fetchJson<{
    schemaVersion: string;
    taxonomyVersion: string;
    databaseVersion: string;
    contentRevision: string;
    classificationContractVersion: string;
    entryCounts: Record<string, number>;
    contentHashes: Record<string, string>;
  }>(`${input.baseUrl}/api/role-model/taxonomy/manifest`);
  const version = await fetchJson<{
    schemaVersion: string;
    taxonomyVersion: string;
    databaseVersion: string;
    contentRevision: string;
    classificationContractVersion: string;
  }>(`${input.baseUrl}/api/role-model/taxonomy/version`);
  const summary = await fetchJson<{
    entryCounts: Record<string, number>;
  }>(`${input.baseUrl}/api/role-model/taxonomy/summary`);
  const securityTasks = await fetchJson<{
    roleId: string;
    tasks: {
      id: string;
      description?: string;
      classifier?: { useWhen?: string; doNotUseWhen?: string };
      requiredCapabilities?: string[];
      preferredCapabilities?: string[];
      requiredModalities?: string[];
      toolClasses?: string[];
    }[];
  }>(`${input.baseUrl}/api/role-model/taxonomy/roles/security/tasks.compact`);

  assertEqual(manifest.schemaVersion, taxonomyManifest.schemaVersion, "taxonomy schemaVersion");
  assertEqual(manifest.taxonomyVersion, taxonomyManifest.taxonomyVersion, "taxonomyVersion");
  assertEqual(
    manifest.databaseVersion,
    taxonomyManifest.databaseVersion,
    "taxonomy databaseVersion",
  );
  assertEqual(
    manifest.contentRevision,
    taxonomyManifest.contentRevision,
    "taxonomy contentRevision",
  );
  assertEqual(
    manifest.classificationContractVersion,
    taxonomyManifest.classificationContractVersion,
    "taxonomy classificationContractVersion",
  );
  assertEqual(version.taxonomyVersion, taxonomyManifest.taxonomyVersion, "version taxonomyVersion");
  assertEqual(version.contentRevision, taxonomyManifest.contentRevision, "version contentRevision");

  for (const [key, expected] of Object.entries(taxonomyManifest.entryCounts)) {
    assertEqual(manifest.entryCounts[key], expected, `manifest entryCounts.${key}`);
    assertEqual(summary.entryCounts[key], expected, `summary entryCounts.${key}`);
  }
  for (const [key, expected] of Object.entries(taxonomyManifest.contentHashes)) {
    assertEqual(manifest.contentHashes[key], expected, `manifest contentHashes.${key}`);
  }

  assertEqual(securityTasks.roleId, "security", "security task chunk roleId");
  if (securityTasks.tasks.length < 10) {
    throw new Error(
      `security task chunk expected at least 10 tasks, got ${securityTasks.tasks.length}`,
    );
  }
  const securityAudit = securityTasks.tasks.find((task) => task.id === "security.audit");
  const canonicalSecurityAudit = canonicalTaxonomy.tasks.find(
    (task) => task.id === "security.audit",
  );
  if (!securityAudit) {
    throw new Error("security task chunk is missing security.audit");
  }
  if (!canonicalSecurityAudit) {
    throw new Error("canonical taxonomy is missing security.audit");
  }
  assertArrayIncludes(
    securityAudit.requiredCapabilities ?? [],
    "security.analysis",
    "security.audit requiredCapabilities",
  );
  assertArrayEqual(
    securityAudit.preferredCapabilities ?? [],
    canonicalSecurityAudit.preferredCapabilities,
    "security.audit preferredCapabilities",
  );
  assertArrayEqual(
    securityAudit.requiredModalities ?? [],
    canonicalSecurityAudit.requiredModalities,
    "security.audit modalities",
  );
  assertArrayEqual(
    securityAudit.toolClasses ?? [],
    canonicalSecurityAudit.toolClasses,
    "security.audit tools",
  );
  if (
    typeof securityAudit.description !== "string" ||
    typeof securityAudit.classifier?.useWhen !== "string" ||
    typeof securityAudit.classifier.doNotUseWhen !== "string"
  ) {
    throw new Error("security.audit packaged task chunk is missing classifier guidance");
  }

  const canonicalSecurityTaskCount = canonicalTaxonomy.tasks.filter(
    (task) => task.primaryRole === "security",
  ).length;
  assertEqual(
    securityTasks.tasks.length,
    canonicalSecurityTaskCount,
    "security compact task count",
  );

  return {
    taxonomyVersion: manifest.taxonomyVersion,
    contentRevision: manifest.contentRevision,
    securityTaskCount: securityTasks.tasks.length,
  };
}

async function exercisePackagedExtensionCatalogValidation(input: {
  readonly baseUrl: string;
}): Promise<{ readonly extensionCount: number }> {
  const extensions = await fetchJson<
    readonly {
      readonly id?: unknown;
    }[]
  >(`${input.baseUrl}/api/role-model/extensions`);
  if (!Array.isArray(extensions)) {
    throw new Error("packaged extension catalog must be an array");
  }
  if (!extensions.some((extension) => extension.id === "evaluation-core")) {
    throw new Error("packaged extension catalog is missing evaluation-core");
  }
  return { extensionCount: extensions.length };
}

export async function runRuntimePackagingValidation(): Promise<{
  readonly packagedExecutable: string;
  readonly healthStatus: string;
  readonly latestRequestIds: readonly string[];
  readonly modelCount: number;
  readonly roleDefinitionCount: number;
  readonly taxonomyVersion: string;
  readonly contentRevision: string;
  readonly securityTaskCount: number;
  readonly extensionCount: number;
  readonly endpointId: string;
  readonly chatOutputText: string;
  readonly responsesOutputText: string;
}> {
  const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-sea-"));
  const port = await allocateLocalPort();
  const packaged = await packageSeaRuntime();
  const packagedRepoRoot = path.dirname(packaged.outputPath);
  const mockUpstream = await startMockOpenAICompatibleServer();

  const child = spawn(
    packaged.outputPath,
    [
      "--repo-root",
      packagedRepoRoot,
      "--runtime-state-root",
      runtimeStateRoot,
      "--scope-id",
      "runtime-sea-validation",
      "--host",
      "127.0.0.1",
      "--port",
      String(port),
      "--fixture-root",
      path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
      "--static-root",
      path.join(packagedRepoRoot, "build", "client"),
    ],
    {
      cwd: packagedRepoRoot,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        [packagingValidationCredentialRef]: packagingValidationCredentialValue,
      },
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
        readonly latestRequestIds: readonly string[];
        readonly modelCount: number;
        readonly roleDefinitionCount: number;
        readonly taxonomyVersion: string;
        readonly contentRevision: string;
        readonly securityTaskCount: number;
        readonly extensionCount: number;
        readonly endpointId: string;
        readonly chatOutputText: string;
        readonly responsesOutputText: string;
      }
    | undefined;
  let validationError: unknown;

  try {
    const health = await waitForOk(`http://127.0.0.1:${port}/healthz`, 20000);
    const healthJson = (await health.json()) as { status: string };
    await waitForOk(`http://127.0.0.1:${port}/api/role-model/runtime/summary`, 20000);
    const packagedExecution = await exercisePackagedExecutionValidation({
      baseUrl: `http://127.0.0.1:${port}`,
      apiBaseUrl: `${mockUpstream.baseUrl}/v1`,
      credentialRef: packagingValidationCredentialRef,
    });
    const packagedTaxonomy = await exercisePackagedTaxonomyValidation({
      baseUrl: `http://127.0.0.1:${port}`,
    });
    const packagedExtensions = await exercisePackagedExtensionCatalogValidation({
      baseUrl: `http://127.0.0.1:${port}`,
    });
    return {
      packagedExecutable: packaged.outputPath,
      healthStatus: healthJson.status,
      latestRequestIds: packagedExecution.latestRequestIds,
      modelCount: packagedExecution.modelCount,
      roleDefinitionCount: packagedExecution.roleDefinitionCount,
      taxonomyVersion: packagedTaxonomy.taxonomyVersion,
      contentRevision: packagedTaxonomy.contentRevision,
      securityTaskCount: packagedTaxonomy.securityTaskCount,
      extensionCount: packagedExtensions.extensionCount,
      endpointId: packagedExecution.endpointId,
      chatOutputText: packagedExecution.chatOutputText,
      responsesOutputText: packagedExecution.responsesOutputText,
    };
  } catch (error) {
    validationError = error;
  } finally {
    try {
      await stopProcessTree(child);
    } finally {
      try {
        await mockUpstream.close();
      } finally {
        await rm(runtimeStateRoot, { recursive: true, force: true });
      }
    }
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
