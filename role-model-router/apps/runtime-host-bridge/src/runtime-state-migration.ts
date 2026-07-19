import { constants } from "node:fs";
import { copyFile, mkdir, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

export interface LegacyProductionStateMigrationReceipt {
  readonly copied: string[];
  readonly skipped: string[];
  readonly conflicts: string[];
}

interface MigrationInput {
  readonly legacyRoot: string;
  readonly destinationRoot: string;
}

async function listFiles(root: string): Promise<string[]> {
  const info = await stat(root).catch(() => null);
  if (!info) return [];
  if (info.isFile()) return [""];
  if (!info.isDirectory()) return [];
  const result: string[] = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const relativeChildren = await listFiles(path.join(root, entry.name));
    for (const child of relativeChildren) {
      result.push(path.join(entry.name, child));
    }
  }
  return result;
}

export async function migrateLegacyProductionState(
  input: MigrationInput,
): Promise<LegacyProductionStateMigrationReceipt> {
  const copied: string[] = [];
  const skipped: string[] = [];
  const conflicts: string[] = [];
  const copiedThisRun = new Set<string>();

  const mappings = [
    ["runtime-config.yaml", "state/runtime-config.yaml"],
    ["role-policy.json", "role-policy.json"],
    ["local-policy.json", "local-policy.json"],
    ["model-overrides.json", "model-overrides.json"],
    ["peers.json", "peers.json"],
    ["standalone-runtime/credentials", "standalone-runtime/credentials"],
    ["standalone-runtime/codex-subscription", "standalone-runtime/codex-subscription"],
    ["standalone-runtime/memory", "standalone-runtime/memory"],
    ["standalone-runtime/operator-intent.json", "standalone-runtime/operator-intent.json"],
    ["state/runtime-config.yaml", "state/runtime-config.yaml"],
    ["state/role-policy.json", "role-policy.json"],
    ["state/local-policy.json", "local-policy.json"],
    ["state/model-overrides.json", "model-overrides.json"],
    ["state/peers.json", "peers.json"],
    ["state/runtime-host-bridge/credentials", "standalone-runtime/credentials"],
    ["state/runtime-host-bridge/codex-subscription", "standalone-runtime/codex-subscription"],
    ["state/runtime-host-bridge/memory", "standalone-runtime/memory"],
    ["state/runtime-host-bridge/operator-intent.json", "standalone-runtime/operator-intent.json"],
  ] as const;

  for (const [sourceRelative, destinationRelative] of mappings) {
    const sourceRoot = path.join(input.legacyRoot, sourceRelative);
    for (const child of await listFiles(sourceRoot)) {
      const sourcePath = path.join(sourceRoot, child);
      const targetRelative = path.normalize(path.join(destinationRelative, child));
      const receiptRelative = targetRelative.split(path.sep).join("/");
      const targetPath = path.join(input.destinationRoot, targetRelative);
      const targetInfo = await stat(targetPath).catch(() => null);
      if (targetInfo) {
        if (copiedThisRun.has(targetRelative)) {
          const [sourceBytes, targetBytes] = await Promise.all([
            readFile(sourcePath),
            readFile(targetPath),
          ]);
          if (!sourceBytes.equals(targetBytes)) conflicts.push(receiptRelative);
        } else {
          skipped.push(receiptRelative);
        }
        continue;
      }
      await mkdir(path.dirname(targetPath), { recursive: true });
      await copyFile(sourcePath, targetPath, constants.COPYFILE_EXCL);
      copiedThisRun.add(targetRelative);
      copied.push(receiptRelative);
    }
  }

  return { copied, skipped, conflicts };
}
