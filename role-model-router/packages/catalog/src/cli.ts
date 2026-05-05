import path from "node:path";
import { fileURLToPath } from "node:url";

import { exportCatalogArtifacts, type ExportCatalogArtifactsResult } from "./index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface RunCatalogExportCliOptions {
  readonly repoRoot?: string;
  readonly outputDir?: string;
}

export async function runCatalogExportCli(
  options: RunCatalogExportCliOptions = {},
): Promise<ExportCatalogArtifactsResult> {
  const repoRoot = options.repoRoot ?? path.resolve(__dirname, "..", "..", "..", "..");
  const outputDir = options.outputDir ?? path.join(repoRoot, "runtime-output", "router-catalog");

  return exportCatalogArtifacts({
    snapshotPath: path.join(repoRoot, "testdata", "catalog", "models-dev-snapshot.json"),
    overridesPath: path.join(repoRoot, "testdata", "catalog", "models-dev-local-overrides.json"),
    outputDir,
  });
}

if (process.argv[1] === __filename) {
  const result = await runCatalogExportCli();
  console.log(result.normalizedCatalogPath);
  console.log(result.vendorLedgerPath);
}
