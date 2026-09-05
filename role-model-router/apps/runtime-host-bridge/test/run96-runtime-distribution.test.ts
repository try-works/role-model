import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import {
  createPackagedRuntimeArtifactClosure,
  verifyPackagedRuntimeArtifactClosure,
} from "../src/package-sea.js";

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
});
