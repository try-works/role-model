import path from "node:path";
import os from "node:os";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";

import { describe, expect, test } from "vitest";

import { readLlamaSwapAssetDefinition, resolveLlamaSwapCommand } from "../src/runtime-assets.js";

describe("runtime asset packaging", () => {
  test("maps the supported release platforms to deterministic llama-swap asset keys", () => {
    expect(readLlamaSwapAssetDefinition("linux", "x64")).toEqual({
      assetKey: "vendor/llama-swap/linux-x64/llama-swap",
      executableName: "llama-swap",
      relativeAssetPath: path.join(
        "vendor",
        "llama-swap",
        "dist-assets",
        "linux-x64",
        "llama-swap",
      ),
      releaseArchiveName: "llama-swap_{VERSION}_linux_amd64.tar.gz",
    });
    expect(readLlamaSwapAssetDefinition("darwin", "arm64")).toEqual({
      assetKey: "vendor/llama-swap/darwin-arm64/llama-swap",
      executableName: "llama-swap",
      relativeAssetPath: path.join(
        "vendor",
        "llama-swap",
        "dist-assets",
        "darwin-arm64",
        "llama-swap",
      ),
      releaseArchiveName: "llama-swap_{VERSION}_darwin_arm64.tar.gz",
    });
    expect(readLlamaSwapAssetDefinition("win32", "x64")).toEqual({
      assetKey: "vendor/llama-swap/win32-x64/llama-swap.exe",
      executableName: "llama-swap.exe",
      relativeAssetPath: path.join(
        "vendor",
        "llama-swap",
        "dist-assets",
        "win32-x64",
        "llama-swap.exe",
      ),
      releaseArchiveName: "llama-swap_{VERSION}_windows_amd64.zip",
    });
    expect(readLlamaSwapAssetDefinition("linux", "arm64")).toBeNull();
  });

  test("resolves a staged filesystem asset when SEA embedding is not active", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-assets-"));
    const repoRoot = path.join(tempRoot, "repo");
    const runtimeStateRoot = path.join(tempRoot, "runtime");
    const assetPath = path.join(
      repoRoot,
      "role-model-router",
      "vendor",
      "llama-swap",
      "dist-assets",
      "win32-x64",
      "llama-swap.exe",
    );
    await mkdir(path.dirname(assetPath), { recursive: true });
    await writeFile(assetPath, "stub-binary", "utf8");

    await expect(
      resolveLlamaSwapCommand({
        repoRoot,
        runtimeStateRoot,
        platform: "win32",
        arch: "x64",
      }),
    ).resolves.toBe(assetPath);
  });

  test("extracts an embedded SEA asset into the runtime state root", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-assets-"));
    const extractedPath = await resolveLlamaSwapCommand({
      repoRoot: path.join(tempRoot, "repo"),
      runtimeStateRoot: path.join(tempRoot, "runtime"),
      platform: "linux",
      arch: "x64",
      assetReader: {
        isSea: true,
        getRawAsset(assetKey) {
          if (assetKey !== "vendor/llama-swap/linux-x64/llama-swap") {
            throw new Error(`Unexpected asset key: ${assetKey}`);
          }
          return Buffer.from("sea-asset");
        },
      },
    });

    expect(extractedPath).toBe(
      path.join(
        tempRoot,
        "runtime",
        "sea-assets",
        "vendor",
        "llama-swap",
        "dist-assets",
        "linux-x64",
        "llama-swap",
      ),
    );
    await expect(readFile(extractedPath ?? "", "utf8")).resolves.toBe("sea-asset");
  });
});
