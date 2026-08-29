import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { stageTrackBRuntimeDistribution } from "../src/track-b-runtime.js";

describe("Run 95 graph registry contract", () => {
  test("SP0 rejects an incomplete graph registry before an extension can consume it", async () => {
    const host = await import("../../../packages/extension-host/index.mjs");
    expect(host.validateGraphRegistry).toBeTypeOf("function");
    expect(() =>
      host.validateGraphRegistry({ version: 1, kinds: [{ id: "core.message", version: 1 }] }),
    ).toThrow(/incomplete/i);
  });

  test("SP0 refuses an N distribution that omits its graph registry", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "run95-registry-stage-"));
    try {
      const bytes = Buffer.from("export async function run(){return {available:true}}\n");
      const artifactSha256 = createHash("sha256").update(bytes).digest("hex");
      const extensions = Array.from({ length: 13 }, (_, index) => ({
        descriptor: { id: `extension-${index}`, protocolVersion: "1.1.0", capabilities: ["health"] },
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
          sidecar: { modulePath: "sidecar.mjs", artifactSha256 },
          extensions,
        }),
      );
      await expect(
        stageTrackBRuntimeDistribution({ sourceRoot: root, releaseDir: path.join(root, "release") }),
      ).rejects.toThrow(/graph registry/i);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("SP0 refuses a graph registry descriptor whose digest does not bind its contents", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "run95-registry-digest-"));
    try {
      const bytes = Buffer.from("export async function run(){return {available:true}}\n");
      const artifactSha256 = createHash("sha256").update(bytes).digest("hex");
      const extensions = Array.from({ length: 13 }, (_, index) => ({
        descriptor: { id: `extension-${index}`, protocolVersion: "1.1.0", capabilities: ["health"] },
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
          graphRegistry: {
            version: 1,
            artifactSha256: "0".repeat(64),
            kinds: [{ id: "core.message", version: 1, category: "message", fields: [] }],
          },
          sidecar: { modulePath: "sidecar.mjs", artifactSha256 },
          extensions,
        }),
      );
      await expect(
        stageTrackBRuntimeDistribution({ sourceRoot: root, releaseDir: path.join(root, "release") }),
      ).rejects.toThrow(/graph registry.*digest/i);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
