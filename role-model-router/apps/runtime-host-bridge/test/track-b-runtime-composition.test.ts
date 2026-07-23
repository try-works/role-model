import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { afterEach, describe, expect, test } from "vitest";

import {
  createOwnedTrackBSidecarSpec,
  createPackagedProductionRuntime,
  createProductionExtensionRuntime,
  createTrackBBridgeServerOptions,
  createTrackBProductionRuntime,
  resolveExtensionHostModuleUrl,
  stageTrackBRuntimeDistribution,
} from "../src/track-b-runtime.js";

const roots: string[] = [];

afterEach(async () => {
  delete process.env.ROLE_MODEL_TRACK_B_OPERATIONS_URL;
  delete process.env.EXPECTED_DIGEST_KEY;
  delete process.env.EXPECTED_ENCRYPTION_KEY;
  delete process.env.ROLE_MODEL_TRACK_B_NODE_EXECUTABLE;
  delete process.env.ROLE_MODEL_EXTENSION_WORKER_NODE;
  delete process.env.EXPECTED_TRUST_MATERIAL;
  delete process.env.EXPECTED_AGGREGATE_ENDPOINT;
  delete process.env.EXPECTED_AGGREGATE_SCOPE;
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("production Track B composition", () => {
  const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..", "..");

  test("owns and supervises the private operations sidecar without URL injection", async () => {
    const stateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-track-b-runtime-"));
    roots.push(stateRoot);
    const lifecycle: string[] = [];

    const runtime = createTrackBProductionRuntime({
      stateRoot,
      sidecar: {
        artifactPath: path.join(stateRoot, "runtime-operations-server.mjs"),
        artifactSha256: "a".repeat(64),
        launch: async () => {
          lifecycle.push("start");
          return {
            endpoint: "http://127.0.0.1:43123",
            operationsToken: "a".repeat(64),
            pid: 43123,
            exited: false,
            stop: async () => lifecycle.push("stop"),
          };
        },
      },
    });

    const started = await runtime.start();
    expect(started.operationsEndpoint).toBe("http://127.0.0.1:43123");
    expect(started.sidecar).toMatchObject({ ownedByLauncher: true, pid: 43123, supervised: true });
    expect(runtime.health()).toMatchObject({
      routingAvailable: true,
      sidecar: { status: "ready" },
    });
    expect(lifecycle).toEqual(["start"]);

    await runtime.stop();
    expect(lifecycle).toEqual(["start", "stop"]);
  });

  test("fails closed when an externally prestarted operations boundary is injected", () => {
    process.env.ROLE_MODEL_TRACK_B_OPERATIONS_URL = "http://127.0.0.1:9999";
    expect(() =>
      createTrackBProductionRuntime({
        stateRoot: os.tmpdir(),
        sidecar: {
          artifactPath: "runtime-operations-server.mjs",
          artifactSha256: "b".repeat(64),
          launch: async () => {
            throw new Error("must not launch");
          },
        },
      }),
    ).toThrow(/externally prestarted Track B operations boundary/i);
  });

  test("verifies and supervises the packaged sidecar process over a readiness protocol", async () => {
    const stateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-track-b-sidecar-"));
    roots.push(stateRoot);
    const artifactPath = path.join(stateRoot, "fake-sidecar.mjs");
    const digestKeyPath = path.join(stateRoot, "digest.key");
    const encryptionKeyPath = path.join(stateRoot, "encryption.key");
    await writeFile(digestKeyPath, Buffer.alloc(32, 7));
    await writeFile(encryptionKeyPath, Buffer.alloc(32, 9));
    const source = [
      'import http from "node:http";',
      'const required=["--channel","production","--artifact-digest-key-file",process.env.EXPECTED_DIGEST_KEY,"--artifact-encryption-key-file",process.env.EXPECTED_ENCRYPTION_KEY];',
      'if(required.some(value=>!process.argv.includes(value))){console.error("missing managed production arguments");process.exit(2)}',
      'if(!/^[a-f0-9]{64}$/i.test(process.env.ROLE_MODEL_TRACK_B_OPERATIONS_TOKEN||"")){console.error("missing ephemeral operations token");process.exit(3)}',
      'const server=http.createServer((_req,res)=>{res.end("ok")});',
      'server.listen(0,"127.0.0.1",()=>{',
      " const address=server.address();",
      ' process.stdout.write(JSON.stringify({type:"ready",endpoint:`http://127.0.0.1:${address.port}`})+"\\n");',
      "});",
      'process.on("SIGTERM",()=>server.close(()=>process.exit(0)));',
    ].join("\n");
    await writeFile(artifactPath, source, "utf8");
    const artifactSha256 = createHash("sha256").update(source).digest("hex");

    process.env.EXPECTED_DIGEST_KEY = digestKeyPath;
    process.env.EXPECTED_ENCRYPTION_KEY = encryptionKeyPath;
    const sidecar = createOwnedTrackBSidecarSpec({
      artifactPath,
      artifactSha256,
      stateRoot,
      channel: "production",
      artifactDigestKeyFile: digestKeyPath,
      artifactEncryptionKeyFile: encryptionKeyPath,
    });
    const child = await sidecar.launch();
    expect(child.pid).toBeGreaterThan(0);
    expect(child.endpoint).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
    expect(child.operationsToken).toMatch(/^[a-f0-9]{64}$/);
    expect(child.exited).toBe(false);
    await child.stop();

    const tampered = createOwnedTrackBSidecarSpec({
      artifactPath,
      artifactSha256: "0".repeat(64),
      stateRoot,
      channel: "production",
      artifactDigestKeyFile: digestKeyPath,
      artifactEncryptionKeyFile: encryptionKeyPath,
    });
    await expect(tampered.launch()).rejects.toThrow(/integrity/i);
    expect(() =>
      createOwnedTrackBSidecarSpec({
        artifactPath,
        artifactSha256,
        stateRoot,
        channel: "production",
      }),
    ).toThrow(/managed artifact keys/i);
  });

  test("passes cloud contribution trust and aggregate destination into the launcher-owned sidecar", async () => {
    const stateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-track-b-sidecar-cloud-"));
    roots.push(stateRoot);
    const artifactPath = path.join(stateRoot, "fake-cloud-sidecar.mjs");
    const digestKeyPath = path.join(stateRoot, "digest.key");
    const encryptionKeyPath = path.join(stateRoot, "encryption.key");
    const trustMaterialFile = path.join(stateRoot, "destination-trust.json");
    const aggregateEndpoint = "https://ingest-run00.role-model.dev";
    const aggregateScope = "run00-owned-sidecar-cloud";
    await writeFile(digestKeyPath, Buffer.alloc(32, 1));
    await writeFile(encryptionKeyPath, Buffer.alloc(32, 2));
    await writeFile(
      trustMaterialFile,
      JSON.stringify({ destinationPrivateKey: "redacted", destinationPublicKey: "redacted" }),
    );
    const source = [
      'import http from "node:http";',
      'const mustInclude=[["--trust-material-file",process.env.EXPECTED_TRUST_MATERIAL],["--aggregate-endpoint",process.env.EXPECTED_AGGREGATE_ENDPOINT],["--aggregate-scope",process.env.EXPECTED_AGGREGATE_SCOPE]];',
      "for(const [flag,value] of mustInclude){const index=process.argv.indexOf(flag); if(index<0 || process.argv[index+1]!==value){console.error(`missing ${flag}`); process.exit(4)}}",
      'const server=http.createServer((_req,res)=>{res.end("ok")});',
      'server.listen(0,"127.0.0.1",()=>{',
      " const address=server.address();",
      ' process.stdout.write(JSON.stringify({type:"ready",endpoint:`http://127.0.0.1:${address.port}`})+"\\n");',
      "});",
      'process.on("SIGTERM",()=>server.close(()=>process.exit(0)));',
    ].join("\n");
    await writeFile(artifactPath, source, "utf8");
    process.env.EXPECTED_TRUST_MATERIAL = trustMaterialFile;
    process.env.EXPECTED_AGGREGATE_ENDPOINT = aggregateEndpoint;
    process.env.EXPECTED_AGGREGATE_SCOPE = aggregateScope;

    const sidecar = createOwnedTrackBSidecarSpec({
      artifactPath,
      artifactSha256: createHash("sha256").update(source).digest("hex"),
      stateRoot,
      channel: "development",
      artifactDigestKeyFile: digestKeyPath,
      artifactEncryptionKeyFile: encryptionKeyPath,
      trustMaterialFile,
      aggregateEndpoint,
      aggregateScope,
    });
    const child = await sidecar.launch();
    expect(child.endpoint).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
    await child.stop();
  });

  test("fails closed when the packaged sidecar cannot launch the configured Node worker executable", async () => {
    const stateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-track-b-sidecar-node-"));
    roots.push(stateRoot);
    const artifactPath = path.join(stateRoot, "fake-sidecar.mjs");
    const source =
      'process.stdout.write(JSON.stringify({type:"ready",endpoint:"http://127.0.0.1:1"})+"\\n");\n';
    await writeFile(artifactPath, source, "utf8");
    process.env.ROLE_MODEL_TRACK_B_NODE_EXECUTABLE = path.join(stateRoot, "missing-node.exe");

    const sidecar = createOwnedTrackBSidecarSpec({
      artifactPath,
      artifactSha256: createHash("sha256").update(source).digest("hex"),
      stateRoot,
      channel: "development",
      startupTimeoutMs: 500,
    });
    await expect(sidecar.launch()).rejects.toThrow(/node worker executable|ENOENT|spawn/i);
  });

  test("starts the owned sidecar before constructing the public production backend", async () => {
    const stateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-track-b-composed-"));
    roots.push(stateRoot);
    const lifecycle: string[] = [];
    const sidecar = {
      artifactPath: path.join(stateRoot, "runtime-operations-server.mjs"),
      artifactSha256: "c".repeat(64),
      launch: async () => {
        lifecycle.push("sidecar:start");
        return {
          endpoint: "http://127.0.0.1:45678",
          operationsToken: "b".repeat(64),
          pid: 45678,
          exited: false,
          stop: async () => lifecycle.push("sidecar:stop"),
        };
      },
    };
    const composed = await createPackagedProductionRuntime({
      stateRoot,
      sidecar,
      createBackend: async (options) => {
        lifecycle.push(
          `backend:${options.trackBOperationsEndpoint}:${options.trackBOperationsToken ?? "missing"}`,
        );
        expect(options.trackBOperationsToken).toMatch(/^[a-f0-9]{64}$/);
        return { close: async () => lifecycle.push("backend:close") };
      },
    });

    expect(lifecycle).toEqual([
      "sidecar:start",
      expect.stringMatching(/^backend:http:\/\/127\.0\.0\.1:45678:[a-f0-9]{64}$/),
    ]);
    expect(composed.trackB.health()).toMatchObject({ sidecar: { status: "ready" } });
    await composed.close();
    expect(lifecycle).toEqual([
      "sidecar:start",
      expect.stringMatching(/^backend:http:\/\/127\.0\.0\.1:45678:[a-f0-9]{64}$/),
      "backend:close",
      "sidecar:stop",
    ]);
  });

  test("runs all thirteen canonical extensions through the real process host and supervisor", async () => {
    const stateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-extension-runtime-"));
    roots.push(stateRoot);
    const extensions = await Promise.all(
      Array.from({ length: 13 }, async (_, index) => {
        const id = `canonical-${String(index + 1).padStart(2, "0")}`;
        const modulePath = path.join(stateRoot, `${id}.mjs`);
        const source = `export async function run(envelope){return {available:true,id:${JSON.stringify(id)},requestId:envelope.requestId}}\n`;
        await writeFile(modulePath, source, "utf8");
        return {
          descriptor: { id, protocolVersion: "1.1.0", capabilities: ["health:probe"] },
          modulePath,
          artifactSha256: createHash("sha256").update(source).digest("hex"),
        };
      }),
    );

    const runtime = await createProductionExtensionRuntime({
      stateRoot,
      authorizationEpoch: 7,
      repoRoot,
      extensions,
    });
    expect(runtime.health()).toMatchObject({
      host: {
        available: true,
        enabled: true,
        extensions: extensions.map((row) => row.descriptor.id),
      },
      supervisor: { available: true, readyWorkers: 13 },
    });
    const results = await Promise.all(
      extensions.map((row) =>
        runtime.invoke(row.descriptor.id, {
          requestId: `probe:${row.descriptor.id}`,
          protocolVersion: "1.1.0",
          channel: "development",
          scope: "tenant:run00",
          authorizationEpoch: 7,
          capability: "health:probe",
          payload: {},
        }),
      ),
    );
    expect(new Set(results.map((result) => result.workerPid)).size).toBe(13);
    await runtime.close();
    expect(runtime.health().host.enabled).toBe(false);

    await expect(
      createProductionExtensionRuntime({
        stateRoot,
        authorizationEpoch: 8,
        repoRoot,
        extensions: extensions.map((row, index) =>
          index === 0 ? { ...row, artifactSha256: "0".repeat(64) } : row,
        ),
      }),
    ).rejects.toThrow(/integrity/i);
  });

  test("resolves the extension host from repo root when packaged CJS has no import.meta.url", async () => {
    const resolved = resolveExtensionHostModuleUrl({ moduleUrl: "", repoRoot });
    expect(resolved).toBe(
      pathToFileURL(
        path.join(repoRoot, "role-model-router/packages/extension-host/index.mjs"),
      ).href,
    );
    const hostModule = (await import(resolved)) as {
      ExtensionHost?: unknown;
      ExtensionSupervisor?: unknown;
    };
    expect(typeof hostModule.ExtensionHost).toBe("function");
    expect(typeof hostModule.ExtensionSupervisor).toBe("function");
  });

  test("fails closed when the extension host cannot launch the configured Node worker executable", async () => {
    const stateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-extension-worker-node-"));
    roots.push(stateRoot);
    const modulePath = path.join(stateRoot, "extension.mjs");
    await writeFile(modulePath, "export async function run(){return {ok:true}}\n", "utf8");
    process.env.ROLE_MODEL_EXTENSION_WORKER_NODE = path.join(stateRoot, "missing-node.exe");
    const hostModule = (await import(
      resolveExtensionHostModuleUrl({ moduleUrl: "", repoRoot })
    )) as {
      ExtensionHost: new (
        options: Record<string, unknown>,
      ) => {
        registerProcess(
          descriptor: ProductionExtensionDescriptor,
          modulePath: string,
        ): Promise<void>;
        shutdown(): Promise<void>;
      };
    };
    const host = new hostModule.ExtensionHost({
      protocolVersion: "1.1.0",
      compatibleProtocolVersions: ["1.0.0"],
      authorizationEpoch: 1,
      startupTimeoutMs: 500,
    });
    await expect(
      host.registerProcess(
        {
          id: "worker-node-contract",
          protocolVersion: "1.1.0",
          capabilities: ["health:probe"],
        },
        modulePath,
      ),
    ).rejects.toThrow(/node worker executable|ENOENT|spawn/i);
    await host.shutdown();
  });

  test("exposes every Track B mutation and recommendation operation to the production server", () => {
    const names = [
      "listExtensions",
      "readStorageRetention",
      "dryRunStorageRetention",
      "updateStorageRetentionPolicy",
      "executeStorageRetention",
      "cancelStorageRetentionJob",
      "rollbackStorageRetention",
      "readContributionState",
      "updateContributionState",
      "listRecommendations",
      "downloadRecommendations",
      "applyRecommendation",
      "readActivePack",
    ] as const;
    const backend = Object.fromEntries(names.map((name) => [name, async () => name]));
    const serverOptions = createTrackBBridgeServerOptions(backend);
    expect(Object.keys(serverOptions).sort()).toEqual([...names].sort());
    for (const name of names) expect(serverOptions[name]).toBe(backend[name]);
  });

  test("stages the integrity-verified private runtime beside the packaged launcher", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "role-model-track-b-package-"));
    roots.push(root);
    const sourceRoot = path.join(root, "source");
    const releaseDir = path.join(root, "release");
    await mkdir(path.join(sourceRoot, "extensions"), { recursive: true });
    const sidecar = 'console.log("sidecar")\n';
    await writeFile(path.join(sourceRoot, "runtime-operations-server.mjs"), sidecar);
    const extensions = await Promise.all(
      Array.from({ length: 13 }, async (_, index) => {
        const id = `extension-${index + 1}`;
        const bytes = `export const id=${JSON.stringify(id)}\n`;
        const modulePath = `extensions/${id}.mjs`;
        await writeFile(path.join(sourceRoot, modulePath), bytes);
        return {
          descriptor: { id, protocolVersion: "1.1.0", capabilities: [] },
          modulePath,
          artifactSha256: createHash("sha256").update(bytes).digest("hex"),
        };
      }),
    );
    const manifest = {
      schemaVersion: "role-model.track-b-runtime-distribution.v1",
      protocolVersion: "1.1.0",
      sidecar: {
        modulePath: "runtime-operations-server.mjs",
        artifactSha256: createHash("sha256").update(sidecar).digest("hex"),
      },
      extensions,
    };
    await writeFile(
      path.join(sourceRoot, "track-b-runtime-manifest.json"),
      JSON.stringify(manifest),
    );

    const staged = await stageTrackBRuntimeDistribution({ sourceRoot, releaseDir });
    expect(staged.extensionCount).toBe(13);
    expect(JSON.parse(await readFile(staged.manifestPath, "utf8"))).toEqual(manifest);
    await writeFile(path.join(sourceRoot, extensions[0].modulePath), "tampered");
    await expect(
      stageTrackBRuntimeDistribution({ sourceRoot, releaseDir: path.join(root, "bad") }),
    ).rejects.toThrow(/integrity/i);
  });
});
