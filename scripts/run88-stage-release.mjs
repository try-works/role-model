import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SHA256 = /^[0-9a-f]{64}$/;
const GIT_REF = /^[0-9a-f]{40}$/;
const canonical = (value) =>
  JSON.stringify(value, (_key, candidate) =>
    candidate && typeof candidate === "object" && !Array.isArray(candidate)
      ? Object.fromEntries(Object.entries(candidate).sort(([a], [b]) => a.localeCompare(b)))
      : candidate,
  );

function requireDigest(value, field) {
  if (!SHA256.test(value ?? "")) throw new Error(`${field} must be a sha256 digest`);
}

export function validatePublicStageIdentity(input) {
  if (input?.schemaVersion !== "run88-public-stage-identity.v1")
    throw new Error("unsupported public stage identity schemaVersion");
  if (input.channel !== "stage" || input.name !== "role-model-stage" || input.port !== 3457)
    throw new Error("public release identity must target stage");
  if (!GIT_REF.test(input.publicSource ?? "") || !GIT_REF.test(input.publicSourceTree ?? ""))
    throw new Error("public source identity is incomplete");
  if (!input.privateDistribution) throw new Error("private distribution identity is incomplete");
  if (!new Set(["N", "N-1"]).has(input.privateDistribution.generation))
    throw new Error("unsupported private distribution generation");
  requireDigest(input.privateDistribution.manifestSha256, "private distribution manifest sha256");
  requireDigest(input.privateDistribution.sidecarSha256, "private distribution sidecar sha256");
  requireDigest(input.package?.executableSha256, "package executable sha256");
  requireDigest(input.package?.corePayloadSha256, "package core payload sha256");
  requireDigest(
    input.package?.embeddedPrivateManifestSha256,
    "package embedded private manifest sha256",
  );
  if (input.package.embeddedPrivateManifestSha256 !== input.privateDistribution.manifestSha256)
    throw new Error("package/private distribution mismatch");
  const identitySha256 = createHash("sha256").update(canonical(input)).digest("hex");
  return Object.freeze({ ...input, identitySha256 });
}

export function validatePublicRollbackTarget(target) {
  if (target?.channel !== "stage") throw new Error("public rollback target must be stage");
  if (!GIT_REF.test(target.ref ?? "") || !GIT_REF.test(target.sourceTree ?? ""))
    throw new Error("public rollback ref/source identity is invalid");
  requireDigest(target.packageSha256, "public rollback package sha256");
  if (!new Set(["N", "N-1"]).has(target.compatibilityGeneration))
    throw new Error("public rollback generation is incompatible");
  return Object.freeze({ ok: true, ...target });
}

const RELEASE_PROFILES = Object.freeze({
  stage: Object.freeze({
    name: "role-model-stage",
    host: "127.0.0.1",
    port: 3457,
    endpoint: "http://127.0.0.1:3457",
    stateRootName: "role-model-runtime-stage",
    scopeId: "standalone-runtime-stage",
  }),
  production: Object.freeze({
    name: "role-model",
    host: "127.0.0.1",
    port: 3456,
    endpoint: "http://127.0.0.1:3456",
    stateRootName: "role-model-runtime",
    scopeId: "standalone-runtime",
  }),
});

function validateReleasePackage(manifest) {
  const profile = RELEASE_PROFILES[manifest?.channel];
  if (
    !profile ||
    manifest.name !== profile.name ||
    manifest.host !== profile.host ||
    manifest.port !== profile.port ||
    manifest.endpoint !== profile.endpoint ||
    manifest.state_root_name !== profile.stateRootName ||
    manifest.scope_id !== profile.scopeId ||
    !GIT_REF.test(manifest.source_tree ?? "") ||
    !SHA256.test(manifest.executable_sha256 ?? "") ||
    !SHA256.test(manifest.core_payload_sha256 ?? "")
  )
    throw new Error("only a complete isolated stage or production package may be Run 88-bound");
  const trackB = manifest.track_b_runtime;
  requireDigest(trackB?.manifest_sha256, "private distribution manifest sha256");
  requireDigest(trackB?.sidecar_sha256, "private distribution sidecar sha256");
  if (!new Set(["N", "N-1"]).has(trackB?.compatibility_generation))
    throw new Error("private distribution compatibility generation is invalid");
  if (trackB?.extension_count !== 13)
    throw new Error("complete thirteen-extension private distribution is required");
  return manifest;
}

export async function bindRun88ReleaseManifest({
  manifestPath,
  releaseId,
  privateSourceCommit,
  privateDistributionSha256,
} = {}) {
  if (typeof manifestPath !== "string" || !path.isAbsolute(manifestPath))
    throw new Error("absolute packaged manifest path is required");
  if (!/^sha256:[0-9a-f]{64}$/.test(releaseId ?? ""))
    throw new Error("Run 88 release id is invalid");
  if (!GIT_REF.test(privateSourceCommit ?? ""))
    throw new Error("exact private source commit is required");
  requireDigest(privateDistributionSha256, "private distribution sha256");
  const manifest = validateReleasePackage(JSON.parse(await readFile(manifestPath, "utf8")));
  if (manifest.track_b_runtime?.manifest_sha256 !== privateDistributionSha256)
    throw new Error("package/private distribution mismatch");
  if (manifest.release_id && manifest.release_id !== releaseId)
    throw new Error("package release identity is already bound differently");
  if (
    manifest.private_distribution_sha256 &&
    manifest.private_distribution_sha256 !== privateDistributionSha256
  )
    throw new Error("package private distribution identity is already bound differently");
  if (manifest.private_source_commit && manifest.private_source_commit !== privateSourceCommit)
    throw new Error("package private source identity is already bound differently");
  const bound = {
    ...manifest,
    release_id: releaseId,
    private_source_commit: privateSourceCommit,
    private_distribution_sha256: privateDistributionSha256,
  };
  await writeFile(manifestPath, `${JSON.stringify(bound, null, 2)}\n`, "utf8");
  return Object.freeze({
    releaseId,
    privateSourceCommit,
    privateDistributionSha256,
    manifestSha256: createHash("sha256")
      .update(await readFile(manifestPath))
      .digest("hex"),
  });
}

export async function bindRun88StageManifest(input = {}) {
  return bindRun88ReleaseManifest(input);
}

export function validateRun88ProductionPromotion({ stage, production } = {}) {
  validateReleasePackage(stage);
  validateReleasePackage(production);
  if (stage.channel !== "stage" || production.channel !== "production")
    throw new Error("promotion requires one stage and one production package");
  if (!/^sha256:[0-9a-f]{64}$/.test(stage.release_id ?? ""))
    throw new Error("tested stage release identity is invalid");
  if (!GIT_REF.test(stage.private_source_commit ?? ""))
    throw new Error("tested stage private source identity is invalid");
  const comparisons = [
    ["source tree", stage.source_tree, production.source_tree],
    ["core payload", stage.core_payload_sha256, production.core_payload_sha256],
    ["release id", stage.release_id, production.release_id],
    ["private source", stage.private_source_commit, production.private_source_commit],
    [
      "private distribution",
      stage.private_distribution_sha256,
      production.private_distribution_sha256,
    ],
    [
      "private manifest",
      stage.track_b_runtime.manifest_sha256,
      production.track_b_runtime.manifest_sha256,
    ],
    [
      "private sidecar",
      stage.track_b_runtime.sidecar_sha256,
      production.track_b_runtime.sidecar_sha256,
    ],
    [
      "private compatibility generation",
      stage.track_b_runtime.compatibility_generation,
      production.track_b_runtime.compatibility_generation,
    ],
    [
      "extension count",
      stage.track_b_runtime.extension_count,
      production.track_b_runtime.extension_count,
    ],
  ];
  for (const [field, expected, actual] of comparisons) {
    if (expected !== actual)
      throw new Error(`production ${field} does not match the tested stage candidate`);
  }
  if (production.private_distribution_sha256 !== production.track_b_runtime.manifest_sha256)
    throw new Error("production private distribution binding is inconsistent");
  return Object.freeze({
    ok: true,
    releaseId: production.release_id,
    privateSourceCommit: production.private_source_commit,
    privateDistributionSha256: production.private_distribution_sha256,
    extensionCount: production.track_b_runtime.extension_count,
  });
}

function cliArg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

if (import.meta.url === pathToFileURL(path.resolve(process.argv[1] ?? "")).href) {
  const productionManifestPath = cliArg("--verify-production-manifest");
  const operation = productionManifestPath
    ? Promise.all([
        readFile(path.resolve(cliArg("--stage-manifest") ?? ""), "utf8"),
        readFile(path.resolve(productionManifestPath), "utf8"),
      ]).then(([stage, production]) =>
        validateRun88ProductionPromotion({
          stage: JSON.parse(stage),
          production: JSON.parse(production),
        }),
      )
    : (async () => {
        const manifestPath = path.resolve(cliArg("--manifest") ?? "");
        const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
        return bindRun88ReleaseManifest({
          manifestPath,
          releaseId: cliArg("--release-id"),
          privateSourceCommit: cliArg("--private-source"),
          privateDistributionSha256: manifest.track_b_runtime?.manifest_sha256,
        });
      })();
  operation
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
