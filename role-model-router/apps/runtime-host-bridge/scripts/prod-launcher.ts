import { readFile } from "node:fs/promises";
import path from "node:path";
import { createCliServerOptions } from "../src/cli.js";
import { createRuntimeBridgeBackend, startBridgeServer } from "../src/index.js";
import {
  createOwnedTrackBSidecarSpec,
  createPackagedProductionRuntime,
  createProductionExtensionRuntime,
  createTrackBBridgeServerOptions,
} from "../src/track-b-runtime.js";

const repoRoot = "D:/DEV/role-model";
const runtimeStateRoot = "C:/Users/erikb/AppData/Local/Role Model Runtime/state";
const scopeId = "runtime-host-bridge";

const sidecarArtifactPath = process.env.ROLE_MODEL_TRACK_B_SIDECAR_PATH?.trim();
const sidecarArtifactSha256 = process.env.ROLE_MODEL_TRACK_B_SIDECAR_SHA256?.trim();
const extensionManifestPath = process.env.ROLE_MODEL_TRACK_B_RUNTIME_MANIFEST?.trim();
if (!sidecarArtifactPath || !sidecarArtifactSha256 || !extensionManifestPath) {
  throw new Error("packaged Track B sidecar and extension manifest are required");
}
const extensionManifest = JSON.parse(await readFile(extensionManifestPath, "utf8")) as {
  readonly schemaVersion: string;
  readonly extensions: readonly {
    readonly descriptor: {
      readonly id: string;
      readonly protocolVersion: string;
      readonly capabilities: readonly string[];
    };
    readonly modulePath: string;
    readonly artifactSha256: string;
  }[];
};
if (extensionManifest.schemaVersion !== "role-model.track-b-runtime-distribution.v1") {
  throw new Error("unsupported Track B runtime distribution manifest");
}
const extensionRuntime = await createProductionExtensionRuntime({
  stateRoot: path.join(runtimeStateRoot, scopeId, "extensions"),
  authorizationEpoch: 1,
  extensions: extensionManifest.extensions.map((extension) => ({
    ...extension,
    modulePath: path.resolve(path.dirname(extensionManifestPath), extension.modulePath),
  })),
});
const composed = await createPackagedProductionRuntime({
  stateRoot: path.join(runtimeStateRoot, scopeId, "track-b"),
  sidecar: createOwnedTrackBSidecarSpec({
    artifactPath: path.resolve(sidecarArtifactPath),
    artifactSha256: sidecarArtifactSha256,
    stateRoot: path.join(runtimeStateRoot, scopeId, "track-b"),
  }),
  createBackend: ({ trackBOperationsEndpoint }) =>
    createRuntimeBridgeBackend({
      repoRoot,
      runtimeStateRoot,
      scopeId,
      runtimeVendorStartup: "enabled",
      unifiedRuntimeConfigPath: `${runtimeStateRoot}/${scopeId}/runtime-config.yaml`,
      trackBOperationsEndpoint,
    }),
});
const backend = composed.backend;
let backendOwner: import("../src/composition-dag.js").BackendOwner | undefined;
const serverOptions = createCliServerOptions(
  {
    host: "127.0.0.1",
    port: 3456,
    staticRoot: path.join(repoRoot, "role-model-router", "apps", "runtime-ui", "build", "client"),
    runtimeStateRoot,
  },
  {
    getBackend: () => backend,
  },
  undefined,
  (owner) => {
    backendOwner = owner;
  },
);
const mergedOptions = { ...serverOptions, ...createTrackBBridgeServerOptions(backend) };
// The spread drops non-enumerable symbols; carry the backend-owner ref descriptor across the merge so the
// explicit backend owner and the owned options stay consistent (the explicit backend is still authoritative).
for (const symbol of Object.getOwnPropertySymbols(serverOptions)) {
  const descriptor = Object.getOwnPropertyDescriptor(serverOptions, symbol);
  if (descriptor !== undefined) Object.defineProperty(mergedOptions, symbol, descriptor);
}
// SAFETY: mergedOptions is the composed StartBridgeServerOptions plus the Track-B bridge overrides.
const server = await startBridgeServer(
  mergedOptions as never,
  backendOwner === undefined ? undefined : { backend: backendOwner },
);

console.log(`Production runtime on http://127.0.0.1:${server.port}`);
process.on("SIGINT", async () => {
  await server.close();
  await composed.close();
  await extensionRuntime.close();
  process.exit(0);
});
