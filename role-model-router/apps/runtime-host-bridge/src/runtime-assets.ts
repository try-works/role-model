import { access, chmod, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getRawAsset, isSea } from "node:sea";
import { gunzipSync } from "node:zlib";

export {
  readLlamaSwapAssetDefinition,
  type LlamaSwapAssetDefinition,
} from "@role-model-router/vendor-llama-swap";
import { readLlamaSwapAssetDefinition } from "@role-model-router/vendor-llama-swap";

export interface RuntimeAssetReader {
  readonly isSea: boolean;
  getRawAsset(assetKey: string): ArrayBuffer | Buffer | undefined;
}

export interface ResolveLlamaSwapCommandOptions {
  readonly repoRoot: string;
  readonly runtimeStateRoot: string;
  readonly platform?: NodeJS.Platform;
  readonly arch?: string;
  readonly assetReader?: RuntimeAssetReader;
}

const DEFAULT_ASSET_READER: RuntimeAssetReader = {
  isSea: isSea(),
  getRawAsset(assetKey: string): ArrayBuffer | Buffer | undefined {
    return getRawAsset(assetKey);
  },
};

function asBuffer(value: ArrayBuffer | Buffer): Buffer {
  return Buffer.isBuffer(value) ? value : Buffer.from(value);
}

async function accessIfExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function resolveLlamaSwapCommand(
  options: ResolveLlamaSwapCommandOptions,
): Promise<string | null> {
  const platform = options.platform ?? process.platform;
  const arch = options.arch ?? process.arch;
  const definition = readLlamaSwapAssetDefinition(platform, arch);
  if (!definition) {
    return null;
  }

  const assetReader = options.assetReader ?? DEFAULT_ASSET_READER;
  if (assetReader.isSea) {
    const rawAsset =
      assetReader.getRawAsset(definition.assetKey) ??
      (() => {
        const compressed = assetReader.getRawAsset(`${definition.assetKey}.gz`);
        return compressed ? gunzipSync(asBuffer(compressed)) : undefined;
      })();
    if (rawAsset) {
      const extractedPath = path.join(
        options.runtimeStateRoot,
        "sea-assets",
        definition.relativeAssetPath,
      );
      await mkdir(path.dirname(extractedPath), { recursive: true });
      await writeFile(extractedPath, asBuffer(rawAsset));
      if (platform !== "win32") {
        await chmod(extractedPath, 0o755);
      }
      return extractedPath;
    }
  }

  const filesystemPath = path.join(
    options.repoRoot,
    "role-model-router",
    definition.relativeAssetPath,
  );
  return (await accessIfExists(filesystemPath)) ? filesystemPath : null;
}
