import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, test } from "vitest";

import { resolvePackagedRuntimeSourceTree } from "../src/package-sea.js";
import {
  stageTrackBRuntimeDistribution,
  trackBDistributionRequiresSQLiteMaintenance,
} from "../src/track-b-runtime.js";
import { queuePolicyFixture } from "./fixtures/queue-policy.js";

const graphRegistryKinds = [{ id: "core.message", version: 1, category: "message", fields: [] }];
const graphRegistry = {
  version: 1,
  artifactSha256: createHash("sha256")
    .update(JSON.stringify({ version: 1, kinds: graphRegistryKinds }))
    .digest("hex"),
  kinds: graphRegistryKinds,
};
const registryBindings = {
  graphRegistry: {
    schemaVersion: "role-model.graph-registry.v1",
    version: 1,
    path: "shared/graph/registry.json",
  },
  storageRegistry: {
    schemaVersion: "role-model.storage-registry.v1",
    modulePath: "shared/retention/index.mjs",
  },
};

test("AR6 refuses a package provenance stamp when the public source tree is dirty", () => {
  expect(() =>
    resolvePackagedRuntimeSourceTree({
      statusPorcelain: " M apps/runtime-host-bridge/src/package-sea.ts\\n",
      sourceTree: "a".repeat(40),
    }),
  ).toThrow(/clean public worktree/i);

  expect(
    resolvePackagedRuntimeSourceTree({
      statusPorcelain: "",
      sourceTree: "a".repeat(40),
    }),
  ).toBe("a".repeat(40));
});

test("SP7 runs startup SQLite maintenance only for adapter-capable distributions", () => {
  expect(
    trackBDistributionRequiresSQLiteMaintenance({
      schemaVersion: "role-model.track-b-runtime-distribution.v1",
    }),
  ).toBe(false);
  expect(
    trackBDistributionRequiresSQLiteMaintenance({
      schemaVersion: "role-model.track-b-runtime-distribution.v2",
      publicRuntimeAdapter: {
        modulePath: "public-runtime-adapter.mjs",
        artifactSha256: "a".repeat(64),
        routerRoot: "public-router",
      },
    }),
  ).toBe(true);
});

test("SP7 stages N and N-1 distributions and refuses unsupported future versions", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "run87-compat-"));
  try {
    const bytes = Buffer.from("export async function run(){return {available:true}}\n");
    const artifactSha256 = createHash("sha256").update(bytes).digest("hex");
    const extensionHostBytes = Buffer.from(
      "export async function host(){return {available:true}}\n",
    );
    const extensionHostSha256 = createHash("sha256").update(extensionHostBytes).digest("hex");
    const extensions = Array.from({ length: 13 }, (_, index) => ({
      descriptor: {
        id: `extension-${index}`,
        protocolVersion: "1.1.0",
        capabilities: ["health"],
      },
      modulePath: `extensions/extension-${index}.mjs`,
      artifactSha256,
    }));
    await mkdir(path.join(root, "extensions"));
    await mkdir(path.join(root, "shared", "graph"), { recursive: true });
    await writeFile(
      path.join(root, "shared", "graph", "registry.json"),
      JSON.stringify({ version: graphRegistry.version, kinds: graphRegistry.kinds }),
    );
    // Run 99 R23: a real distribution always carries the activation policy config, and the
    // packaged host resolves the effective stage from it.
    await mkdir(path.join(root, "shared", "route-learning"), { recursive: true });
    await writeFile(
      path.join(root, "shared", "route-learning-activation-policy.json"),
      JSON.stringify({
        schemaVersion: "role-model.route-learning-activation-policy.v1",
        policyVersion: 1,
        global: { stage: "S1" },
        channels: {},
        scopes: {},
      }),
    );
    // Run 101 R3: the queue policy is a required boot document beside the activation policy.
    await writeFile(path.join(root, "shared", "queue-policy.json"), queuePolicyFixture());
    await writeFile(path.join(root, "sidecar.mjs"), bytes);
    await writeFile(path.join(root, "public-extension-host.mjs"), extensionHostBytes);
    await writeFile(path.join(root, "worker-runtime.mjs"), extensionHostBytes);
    await Promise.all(extensions.map((row) => writeFile(path.join(root, row.modulePath), bytes)));
    for (const [version, expectedGeneration] of [
      ["role-model.track-b-runtime-distribution.v1", "N-1"],
      ["role-model.track-b-runtime-distribution.v2", "N"],
    ] as const) {
      await writeFile(
        path.join(root, "track-b-runtime-manifest.json"),
        JSON.stringify({
          schemaVersion: version,
          ...(version === "role-model.track-b-runtime-distribution.v2"
            ? { graphRegistry, registryBindings }
            : {}),
          sidecar: { modulePath: "sidecar.mjs", artifactSha256 },
          ...(version === "role-model.track-b-runtime-distribution.v2"
            ? {
                publicExtensionHost: {
                  modulePath: "public-extension-host.mjs",
                  artifactSha256: extensionHostSha256,
                  workerModulePath: "worker-runtime.mjs",
                  workerArtifactSha256: extensionHostSha256,
                },
              }
            : {}),
          extensions,
        }),
      );
      const staged = await stageTrackBRuntimeDistribution({
        sourceRoot: root,
        releaseDir: path.join(root, `release-${expectedGeneration}`),
      });
      expect(staged.compatibilityGeneration).toBe(expectedGeneration);
      expect(staged.manifestSha256).toBe(
        createHash("sha256")
          .update(await readFile(path.join(root, "track-b-runtime-manifest.json")))
          .digest("hex"),
      );
    }
    await writeFile(
      path.join(root, "track-b-runtime-manifest.json"),
      JSON.stringify({
        schemaVersion: "role-model.track-b-runtime-distribution.v3",
        sidecar: { modulePath: "sidecar.mjs", artifactSha256 },
        extensions,
      }),
    );
    await expect(
      stageTrackBRuntimeDistribution({ sourceRoot: root, releaseDir: path.join(root, "future") }),
    ).rejects.toThrow(/unsupported|incomplete/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("SP7 refuses a current Track B distribution built from another public source tree", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "run87-source-binding-"));
  try {
    const bytes = Buffer.from("export async function run(){return {available:true}}\n");
    const artifactSha256 = createHash("sha256").update(bytes).digest("hex");
    const extensions = Array.from({ length: 13 }, (_, index) => ({
      descriptor: {
        id: `extension-${index}`,
        protocolVersion: "1.1.0",
        capabilities: ["health"],
      },
      modulePath: `extensions/extension-${index}.mjs`,
      artifactSha256,
    }));
    await mkdir(path.join(root, "extensions"));
    await writeFile(path.join(root, "sidecar.mjs"), bytes);
    await Promise.all(extensions.map((row) => writeFile(path.join(root, row.modulePath), bytes)));
    await writeFile(
      path.join(root, "track-b-runtime-manifest.json"),
      JSON.stringify({
        schemaVersion: "role-model.track-b-runtime-distribution.v2",
        publicSourceTree: "a".repeat(40),
        graphRegistry,
        registryBindings,
        sidecar: { modulePath: "sidecar.mjs", artifactSha256 },
        extensions,
      }),
    );

    await expect(
      (
        stageTrackBRuntimeDistribution as unknown as (options: {
          readonly sourceRoot: string;
          readonly releaseDir: string;
          readonly expectedPublicSourceTree: string;
        }) => ReturnType<typeof stageTrackBRuntimeDistribution>
      )({
        sourceRoot: root,
        releaseDir: path.join(root, "release"),
        expectedPublicSourceTree: "b".repeat(40),
      }),
    ).rejects.toThrow(/source tree/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
