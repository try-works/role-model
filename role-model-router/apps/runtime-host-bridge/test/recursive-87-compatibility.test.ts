import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, test } from "vitest";

import {
  stageTrackBRuntimeDistribution,
  trackBDistributionRequiresSQLiteMaintenance,
} from "../src/track-b-runtime.js";

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
    for (const [version, expectedGeneration] of [
      ["role-model.track-b-runtime-distribution.v1", "N-1"],
      ["role-model.track-b-runtime-distribution.v2", "N"],
    ] as const) {
      await writeFile(
        path.join(root, "track-b-runtime-manifest.json"),
        JSON.stringify({
          schemaVersion: version,
          sidecar: { modulePath: "sidecar.mjs", artifactSha256 },
          extensions,
        }),
      );
      const staged = await stageTrackBRuntimeDistribution({
        sourceRoot: root,
        releaseDir: path.join(root, `release-${expectedGeneration}`),
      });
      expect(staged.compatibilityGeneration).toBe(expectedGeneration);
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
