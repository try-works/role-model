import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import {
  createPackagedRuntimeArtifactClosure,
  verifyPackagedRuntimeArtifactClosure,
} from "../src/package-sea.js";
import { stageTrackBRuntimeDistribution } from "../src/track-b-runtime.js";

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

async function writeArtifact(root: string, relativePath: string, content: string): Promise<string> {
  const filePath = path.join(root, ...relativePath.split("/"));
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
  return sha256(content);
}

async function createReleaseFixture(): Promise<{ releaseDir: string }> {
  const root = await mkdtemp(path.join(os.tmpdir(), "run96-runtime-distribution-"));
  temporaryRoots.push(root);
  const releaseDir = path.join(root, "release");

  await writeArtifact(releaseDir, "build/client/index.html", "runtime-ui");
  await writeArtifact(releaseDir, "build/client/assets/app.js", "runtime-ui-app");

  const sidecar = "track-b-runtime/sidecar.mjs";
  const adapter = "track-b-runtime/public-runtime-adapter.mjs";
  const extensionHost = "track-b-runtime/public-extension-host.mjs";
  const worker = "track-b-runtime/worker-runtime.mjs";
  const routerAsset = "track-b-runtime/router-assets/migration.mjs";
  const sidecarSha256 = await writeArtifact(releaseDir, sidecar, "sidecar");
  const adapterSha256 = await writeArtifact(releaseDir, adapter, "adapter");
  const extensionHostSha256 = await writeArtifact(releaseDir, extensionHost, "extension-host");
  const workerSha256 = await writeArtifact(releaseDir, worker, "worker");
  const routerAssetSha256 = await writeArtifact(releaseDir, routerAsset, "router-asset");

  const extensions = [];
  for (let index = 0; index < 13; index += 1) {
    const modulePath = `extensions/extension-${index + 1}.mjs`;
    const artifactSha256 = await writeArtifact(
      releaseDir,
      `track-b-runtime/${modulePath}`,
      `extension-${index + 1}`,
    );
    extensions.push({
      descriptor: {
        id: `extension-${index + 1}`,
        protocolVersion: "1",
        capabilities: ["test"],
      },
      modulePath,
      artifactSha256,
    });
  }

  const manifest = {
    schemaVersion: "role-model.track-b-runtime-distribution.v2",
    publicSourceTree: "0123456789abcdef0123456789abcdef01234567",
    sidecar: { modulePath: "sidecar.mjs", artifactSha256: sidecarSha256 },
    publicRuntimeAdapter: {
      modulePath: "public-runtime-adapter.mjs",
      artifactSha256: adapterSha256,
      routerRoot: "router-assets",
      routerAssets: [
        { modulePath: "router-assets/migration.mjs", artifactSha256: routerAssetSha256 },
      ],
    },
    publicExtensionHost: {
      modulePath: "public-extension-host.mjs",
      artifactSha256: extensionHostSha256,
      workerModulePath: "worker-runtime.mjs",
      workerArtifactSha256: workerSha256,
    },
    extensions,
  };
  const manifestBytes = JSON.stringify(manifest, null, 2);
  await writeFile(
    path.join(releaseDir, "track-b-runtime", "track-b-runtime-manifest.json"),
    manifestBytes,
  );

  return { releaseDir };
}

describe("Run 96 packaged runtime artifact closure", () => {
  test("pins UI, adapter, sidecar, host, worker, router assets, and all extensions", async () => {
    const { releaseDir } = await createReleaseFixture();

    const closure = await createPackagedRuntimeArtifactClosure({ releaseDir });

    expect(closure.schema_version).toBe(1);
    expect(closure.runtime_ui.path).toBe("build/client");
    expect(closure.runtime_ui.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(closure.track_b_runtime.manifest.path).toBe(
      "track-b-runtime/track-b-runtime-manifest.json",
    );
    expect(closure.track_b_runtime.public_runtime_adapter.path).toBe(
      "track-b-runtime/public-runtime-adapter.mjs",
    );
    expect(closure.track_b_runtime.public_extension_host.path).toBe(
      "track-b-runtime/public-extension-host.mjs",
    );
    expect(closure.track_b_runtime.worker.path).toBe("track-b-runtime/worker-runtime.mjs");
    expect(closure.track_b_runtime.extensions).toHaveLength(13);

    await expect(
      verifyPackagedRuntimeArtifactClosure({ releaseDir, closure }),
    ).resolves.toBeUndefined();

    await writeFile(path.join(releaseDir, "build", "client", "index.html"), "tampered", "utf8");
    await expect(verifyPackagedRuntimeArtifactClosure({ releaseDir, closure })).rejects.toThrow(
      /runtime UI|artifact closure/i,
    );
  });

  test("fails closed when a required UI or Track-B artifact is absent", async () => {
    const { releaseDir } = await createReleaseFixture();
    await rm(path.join(releaseDir, "build", "client"), { recursive: true, force: true });

    await expect(createPackagedRuntimeArtifactClosure({ releaseDir })).rejects.toThrow(
      /runtime UI|artifact/i,
    );
  });

  test("stages every manifest-bound v2 contract into the public package", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "run96-contract-stage-"));
    temporaryRoots.push(root);
    const sourceRoot = path.join(root, "source");
    const releaseDir = path.join(root, "release");
    await mkdir(sourceRoot, { recursive: true });
    const graphRegistry = {
      version: 1,
      kinds: [{ id: "core.message", version: 1 }],
    };
    const graphRegistrySha256 = sha256(JSON.stringify(graphRegistry));
    await writeArtifact(sourceRoot, "shared/graph/registry.json", JSON.stringify(graphRegistry));
    const contractFiles = [
      ["contracts/package-registry.json", "registry"],
      ["contracts/contract-registry.schema.json", "registry-schema"],
      ["contracts/runtime-channel-contracts.v1.json", "channel"],
      ["contracts/runtime-channel-contracts.schema.json", "channel-schema"],
      ["contracts/runtime-channel-source-matrix.json", "channel-matrix"],
      ["contracts/capacity-slo-contracts.v3.json", "capacity"],
      ["contracts/capacity-slo-contracts.v3.schema.json", "capacity-schema"],
    ] as const;
    const hashes = Object.fromEntries(
      await Promise.all(
        contractFiles.map(async ([relativePath, content]) => [
          relativePath,
          await writeArtifact(sourceRoot, relativePath, content),
        ]),
      ),
    );
    const sidecar = await writeArtifact(sourceRoot, "runtime-operations-server.mjs", "sidecar");
    const sourceAuthorityFixtures = await Promise.all(
      [
        ["capacity-slo-contracts.json", "capacity-fixture"],
        ["retention-policies.json", "retention-policies"],
      ].map(async ([fileName, content]) => ({
        modulePath: `fixtures/source-authority/crowdsourced-evals-docs/guidance/${fileName}`,
        artifactSha256: await writeArtifact(
          sourceRoot,
          `fixtures/source-authority/crowdsourced-evals-docs/guidance/${fileName}`,
          content,
        ),
      })),
    );
    const extensionHostSha256 = await writeArtifact(
      sourceRoot,
      "public-extension-host.mjs",
      "extension-host",
    );
    const workerSha256 = await writeArtifact(sourceRoot, "worker-runtime.mjs", "worker");
    const extensions = [];
    for (let index = 0; index < 13; index += 1) {
      const modulePath = `extensions/extension-${index + 1}.mjs`;
      extensions.push({
        descriptor: { id: `extension-${index + 1}`, protocolVersion: "1", capabilities: [] },
        modulePath,
        artifactSha256: await writeArtifact(sourceRoot, modulePath, `extension-${index + 1}`),
      });
    }
    await writeFile(
      path.join(sourceRoot, "track-b-runtime-manifest.json"),
      JSON.stringify({
        schemaVersion: "role-model.track-b-runtime-distribution.v2",
        publicSourceTree: "0123456789abcdef0123456789abcdef01234567",
        graphRegistry: {
          version: 1,
          artifactSha256: graphRegistrySha256,
          kinds: graphRegistry.kinds,
        },
        registryBindings: {
          graphRegistry: {
            schemaVersion: "role-model.graph-registry.v1",
            version: 1,
            path: "shared/graph/registry.json",
          },
          storageRegistry: {
            schemaVersion: "role-model.storage-registry.v1",
            modulePath: "shared/retention/index.mjs",
          },
          contractRegistry: {
            schemaVersion: "role-model.contract-registry.v1",
            registryPath: "contracts/package-registry.json",
            schemaPath: "contracts/contract-registry.schema.json",
            registrySha256: hashes["contracts/package-registry.json"],
            schemaSha256: hashes["contracts/contract-registry.schema.json"],
          },
          runtimeChannel: {
            contractPath: "contracts/runtime-channel-contracts.v1.json",
            schemaPath: "contracts/runtime-channel-contracts.schema.json",
            sourceMatrixPath: "contracts/runtime-channel-source-matrix.json",
            contractSha256: hashes["contracts/runtime-channel-contracts.v1.json"],
            schemaSha256: hashes["contracts/runtime-channel-contracts.schema.json"],
            sourceMatrixSha256: hashes["contracts/runtime-channel-source-matrix.json"],
          },
          capacitySlo: {
            contractPath: "contracts/capacity-slo-contracts.v3.json",
            schemaPath: "contracts/capacity-slo-contracts.v3.schema.json",
            contractSha256: hashes["contracts/capacity-slo-contracts.v3.json"],
            schemaSha256: hashes["contracts/capacity-slo-contracts.v3.schema.json"],
          },
        },
        sidecar: { modulePath: "runtime-operations-server.mjs", artifactSha256: sidecar },
        sourceAuthorityFixtures,
        publicExtensionHost: {
          modulePath: "public-extension-host.mjs",
          artifactSha256: extensionHostSha256,
          workerModulePath: "worker-runtime.mjs",
          workerArtifactSha256: workerSha256,
        },
        extensions,
      }),
    );

    await stageTrackBRuntimeDistribution({ sourceRoot, releaseDir });
    await expect(
      readFile(path.join(releaseDir, "..", "..", "shared", "graph", "registry.json"), "utf8"),
    ).resolves.toBe(JSON.stringify(graphRegistry));
    await expect(
      readFile(path.join(releaseDir, "..", "shared", "graph", "registry.json"), "utf8"),
    ).resolves.toBe(JSON.stringify(graphRegistry));
    for (const fixture of sourceAuthorityFixtures) {
      await expect(
        readFile(path.join(releaseDir, "..", "..", fixture.modulePath), "utf8"),
      ).resolves.toBeTypeOf("string");
    }
    await expect(
      readFile(path.join(releaseDir, "capacity-slo-contracts.v3.json"), "utf8"),
    ).resolves.toBe("capacity");
    await expect(
      readFile(path.join(releaseDir, "capacity-slo-contracts.v3.schema.json"), "utf8"),
    ).resolves.toBe("capacity-schema");
    for (const [relativePath] of contractFiles) {
      await expect(readFile(path.join(releaseDir, relativePath), "utf8")).resolves.toBeTypeOf(
        "string",
      );
    }
  });

  test("stages only the manifest-declared optional v2 bindings and fails closed when a declared fixture is wrong", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "run96-optional-binding-stage-"));
    temporaryRoots.push(root);
    const sourceRoot = path.join(root, "source");
    const releaseDir = path.join(root, "release");
    await mkdir(sourceRoot, { recursive: true });
    const graphRegistry = {
      version: 1,
      kinds: [{ id: "core.message", version: 1 }],
    };
    const graphRegistrySha256 = await writeArtifact(
      sourceRoot,
      "shared/graph/registry.json",
      JSON.stringify(graphRegistry),
    );
    const sidecar = await writeArtifact(sourceRoot, "runtime-operations-server.mjs", "sidecar");
    const extensionHostSha256 = await writeArtifact(
      sourceRoot,
      "public-extension-host.mjs",
      "extension-host",
    );
    const workerSha256 = await writeArtifact(sourceRoot, "worker-runtime.mjs", "worker");
    const extensions = [];
    for (let index = 0; index < 13; index += 1) {
      const modulePath = `extensions/extension-${index + 1}.mjs`;
      extensions.push({
        descriptor: { id: `extension-${index + 1}`, protocolVersion: "1", capabilities: [] },
        modulePath,
        artifactSha256: await writeArtifact(sourceRoot, modulePath, `extension-${index + 1}`),
      });
    }
    // An N-generation manifest that predates the run-96 contract bindings must
    // still stage: the staged closure is exactly what the manifest declares.
    const manifestPath = path.join(sourceRoot, "track-b-runtime-manifest.json");
    await writeFile(
      manifestPath,
      JSON.stringify({
        schemaVersion: "role-model.track-b-runtime-distribution.v2",
        publicSourceTree: "0123456789abcdef0123456789abcdef01234567",
        graphRegistry: {
          version: 1,
          artifactSha256: graphRegistrySha256,
          kinds: graphRegistry.kinds,
        },
        registryBindings: {
          graphRegistry: {
            schemaVersion: "role-model.graph-registry.v1",
            version: 1,
            path: "shared/graph/registry.json",
          },
          storageRegistry: {
            schemaVersion: "role-model.storage-registry.v1",
            modulePath: "shared/retention/index.mjs",
          },
        },
        sidecar: { modulePath: "runtime-operations-server.mjs", artifactSha256: sidecar },
        publicExtensionHost: {
          modulePath: "public-extension-host.mjs",
          artifactSha256: extensionHostSha256,
          workerModulePath: "worker-runtime.mjs",
          workerArtifactSha256: workerSha256,
        },
        extensions,
      }),
    );
    await expect(stageTrackBRuntimeDistribution({ sourceRoot, releaseDir })).resolves.toMatchObject(
      { compatibilityGeneration: "N", extensionCount: 13 },
    );
    await expect(
      readFile(path.join(releaseDir, "..", "..", "shared", "graph", "registry.json"), "utf8"),
    ).resolves.toBe(JSON.stringify(graphRegistry));

    const declaredFixturePath =
      "fixtures/source-authority/crowdsourced-evals-docs/guidance/retention-policies.json";
    const declaredFixtureSha256 = await writeArtifact(
      sourceRoot,
      declaredFixturePath,
      "retention-policies",
    );
    const declaredManifest = JSON.parse(await readFile(manifestPath, "utf8")) as Record<
      string,
      unknown
    >;
    declaredManifest.sourceAuthorityFixtures = [
      { modulePath: declaredFixturePath, artifactSha256: declaredFixtureSha256 },
    ];
    await writeFile(manifestPath, JSON.stringify(declaredManifest));
    const declaredRelease = path.join(root, "release-declared");
    await expect(
      stageTrackBRuntimeDistribution({ sourceRoot, releaseDir: declaredRelease }),
    ).resolves.toMatchObject({ compatibilityGeneration: "N" });
    await expect(
      readFile(path.join(declaredRelease, "..", "..", declaredFixturePath), "utf8"),
    ).resolves.toBe("retention-policies");

    declaredManifest.sourceAuthorityFixtures = [
      { modulePath: declaredFixturePath, artifactSha256: "f".repeat(64) },
    ];
    await writeFile(manifestPath, JSON.stringify(declaredManifest));
    await expect(
      stageTrackBRuntimeDistribution({
        sourceRoot,
        releaseDir: path.join(root, "release-tampered"),
      }),
    ).rejects.toThrow(/source-authority fixture/i);
  });
});
