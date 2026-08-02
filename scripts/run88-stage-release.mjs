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

export async function bindRun88StageManifest({
  manifestPath,
  releaseId,
  privateDistributionSha256,
} = {}) {
  if (typeof manifestPath !== "string" || !path.isAbsolute(manifestPath))
    throw new Error("absolute packaged manifest path is required");
  if (!/^sha256:[0-9a-f]{64}$/.test(releaseId ?? ""))
    throw new Error("Run 88 release id is invalid");
  requireDigest(privateDistributionSha256, "private distribution sha256");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (
    manifest.channel !== "stage" ||
    manifest.name !== "role-model-stage" ||
    manifest.host !== "127.0.0.1" ||
    manifest.port !== 3457 ||
    manifest.endpoint !== "http://127.0.0.1:3457" ||
    manifest.state_root_name !== "role-model-runtime-stage" ||
    manifest.scope_id !== "standalone-runtime-stage" ||
    !/^[0-9a-f]{40}$/.test(manifest.source_tree ?? "") ||
    !/^[0-9a-f]{64}$/.test(manifest.executable_sha256 ?? "") ||
    !/^[0-9a-f]{64}$/.test(manifest.core_payload_sha256 ?? "")
  )
    throw new Error("only a complete isolated stage package may be Run 88-bound");
  if (manifest.track_b_runtime?.manifest_sha256 !== privateDistributionSha256)
    throw new Error("package/private distribution mismatch");
  if (manifest.release_id && manifest.release_id !== releaseId)
    throw new Error("package release identity is already bound differently");
  if (
    manifest.private_distribution_sha256 &&
    manifest.private_distribution_sha256 !== privateDistributionSha256
  )
    throw new Error("package private distribution identity is already bound differently");
  const bound = {
    ...manifest,
    release_id: releaseId,
    private_distribution_sha256: privateDistributionSha256,
  };
  await writeFile(manifestPath, `${JSON.stringify(bound, null, 2)}\n`, "utf8");
  return Object.freeze({
    releaseId,
    privateDistributionSha256,
    manifestSha256: createHash("sha256")
      .update(await readFile(manifestPath))
      .digest("hex"),
  });
}

function cliArg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

if (import.meta.url === pathToFileURL(path.resolve(process.argv[1] ?? "")).href) {
  const manifestPath = path.resolve(cliArg("--manifest") ?? "");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  bindRun88StageManifest({
    manifestPath,
    releaseId: cliArg("--release-id"),
    privateDistributionSha256: manifest.track_b_runtime?.manifest_sha256,
  })
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
