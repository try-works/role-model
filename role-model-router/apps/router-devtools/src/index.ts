import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { detectAcpEndpoints } from "@role-model-router/provider-acp";
import { detectCliEndpoints } from "@role-model-router/provider-cli";
import { detectMcpEndpoints } from "@role-model-router/provider-mcp";
import { createStableConfigArtifact } from "@role-model/packaging";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");

export async function exportStableConfig(): Promise<string> {
  const samplePath = path.join(repoRoot, "testdata", "endpoint-metadata", "sample-endpoints.json");
  const declared = JSON.parse(await readFile(samplePath, "utf8")) as {
    acp: Array<{
      endpoint_id: string;
      model_id: string;
      capabilities: string[];
      modalities: string[];
    }>;
    cli: Array<{
      endpoint_id: string;
      model_id: string;
      capabilities: string[];
      modalities: string[];
    }>;
    mcp: Array<{
      endpoint_id: string;
      model_id: string;
      capabilities: string[];
      modalities: string[];
    }>;
  };
  const endpoints = [
    ...detectAcpEndpoints(declared.acp),
    ...detectCliEndpoints(declared.cli),
    ...detectMcpEndpoints(declared.mcp),
  ];
  const artifact = createStableConfigArtifact({
    artifactId: "router-devtools-config",
    generatedAtMs: Date.now(),
    endpoints: endpoints.map((endpoint) => ({
      endpointId: endpoint.identity.endpoint_id,
      endpointKind: endpoint.identity.endpoint_kind,
      providerKind: endpoint.identity.provider_kind,
      modelId: endpoint.identity.model_id,
      servingSource: endpoint.identity.serving_source,
      modalities: endpoint.declared.modalities,
      strategyTags: endpoint.declared.capabilities,
    })),
  });

  const outputDir = path.join(repoRoot, "runtime-output", "router-devtools");
  await mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, "config-export.json");
  await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  return outputPath;
}

if (process.argv[1] === __filename) {
  console.log(await exportStableConfig());
}
