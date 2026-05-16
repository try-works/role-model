import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { type ExportCatalogArtifactsResult, exportCatalogArtifacts } from "./index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface RunCatalogExportCliOptions {
  readonly repoRoot?: string;
  readonly outputDir?: string;
}

function resolveTrackedCatalogDataDir(repoRoot: string): string {
  return path.join(repoRoot, "role-model-router", "packages", "catalog", "data");
}

export async function runCatalogExportCli(
  options: RunCatalogExportCliOptions = {},
): Promise<ExportCatalogArtifactsResult> {
  const repoRoot = options.repoRoot ?? path.resolve(__dirname, "..", "..", "..", "..");
  const outputDir = options.outputDir ?? path.join(repoRoot, "runtime-output", "router-catalog");
  const result = await exportCatalogArtifacts({
    snapshotPath: path.join(repoRoot, "testdata", "catalog", "models-dev-snapshot.json"),
    overridesPath: path.join(repoRoot, "testdata", "catalog", "models-dev-local-overrides.json"),
    outputDir,
  });

  const trackedCatalogDataDir = resolveTrackedCatalogDataDir(repoRoot);
  if (path.resolve(outputDir) !== path.resolve(trackedCatalogDataDir)) {
    await mkdir(trackedCatalogDataDir, { recursive: true });
    await copyFile(
      result.normalizedCatalogPath,
      path.join(trackedCatalogDataDir, "normalized-catalog.json"),
    );
    await copyFile(
      result.vendorLedgerPath,
      path.join(trackedCatalogDataDir, "vendor-version-ledger.json"),
    );
  }

  return result;
}

if (process.argv[1] === __filename) {
  const result = await runCatalogExportCli();
  console.log(result.normalizedCatalogPath);
  console.log(result.vendorLedgerPath);
}
