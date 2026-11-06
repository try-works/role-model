/**
 * Run 115 R28/R29 packaged lockstep (S650 wave 2).
 *
 * The public package embeds a private Track-B distribution. Two failures used to
 * surface only after a long build:
 *   - "package/private distribution identity mismatch" when the distribution was
 *     rebuilt from a different public tree than the package, and
 *   - a protocol-routing declaration mismatch when a clean checkout inherited
 *     copied `dist` trees from an earlier build.
 *
 * This module is the small, total check the build workflow should run BEFORE
 * package-sea, and a helper that removes copied package `dist` trees so every
 * declaration is emitted from the current source.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const SHA256 = /^[a-f0-9]{64}$/;
const TREE = /^[a-f0-9]{40}$/;

const requireField = (value, name, pattern) => {
  if (typeof value !== "string" || !pattern.test(value)) {
    throw new Error(`distribution manifest is missing ${name}`);
  }
  return value;
};

export function distributionIdentityOf(distribution) {
  return {
    publicCommit: requireField(distribution?.publicCommit, "publicCommit", TREE),
    publicSourceTree: requireField(distribution?.publicSourceTree, "publicSourceTree", TREE),
    sidecarSha256: requireField(distribution?.sidecar?.artifactSha256, "sidecar.artifactSha256", SHA256),
    publicRuntimeAdapterSha256: requireField(
      distribution?.publicRuntimeAdapter?.artifactSha256,
      "publicRuntimeAdapter.artifactSha256",
      SHA256,
    ),
  };
}

export function assertLockstepIdentity({
  publicTree,
  distribution,
  packageManifest,
  distributionManifestSha256,
}) {
  requireField(publicTree, "publicTree", TREE);
  requireField(distributionManifestSha256, "distributionManifestSha256", SHA256);
  const identity = distributionIdentityOf(distribution);
  if (identity.publicSourceTree !== publicTree) {
    throw new Error(
      `public source tree mismatch: expected ${publicTree}, distribution ${identity.publicSourceTree}. Rebuild the private distribution from this public worktree before packaging.`,
    );
  }
  const embedded = packageManifest?.track_b_runtime;
  if (!embedded || typeof embedded !== "object") {
    throw new Error("package manifest does not embed a private distribution");
  }
  if (embedded.public_source_tree !== publicTree) {
    throw new Error(
      `package public source tree mismatch: expected ${publicTree}, package ${String(embedded.public_source_tree)}. Package the distribution built from this tree.`,
    );
  }
  if (embedded.manifest_sha256 !== distributionManifestSha256) {
    throw new Error(
      `private distribution identity mismatch: package embeds ${String(embedded.manifest_sha256)}, distribution manifest is ${distributionManifestSha256}. Do not rebuild the private distribution after packaging; rebuild both in lockstep.`,
    );
  }
  if (embedded.sidecar_sha256 !== identity.sidecarSha256) {
    throw new Error(
      `private distribution sidecar identity mismatch: package embeds ${String(embedded.sidecar_sha256)}, distribution sidecar is ${identity.sidecarSha256}.`,
    );
  }
  return { publicSourceTree: identity.publicSourceTree, distributionManifestSha256 };
}

export function sha256OfFile(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

/**
 * Remove `dist` from every direct workspace package and the host bridge. The
 * distribution builder/package-sea rebuilds these; deleting first prevents a
 * stale copied declaration tree (seen as a protocol-routing declaration
 * mismatch) from being mistaken for the current build.
 */
export function removeCopiedDeclarationDists({ publicWorktree, rm = rmSync }) {
  const packageRoot = path.join(publicWorktree, "role-model-router", "packages");
  const roots = [];
  for (const entry of readdirSync(packageRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dist = path.join(packageRoot, entry.name, "dist");
    if (existsSync(dist)) roots.push(dist);
  }
  const hostDist = path.join(publicWorktree, "role-model-router", "apps", "runtime-host-bridge", "dist");
  if (existsSync(hostDist)) roots.push(hostDist);
  for (const root of roots) rm(root, { recursive: true, force: true });
  return roots;
}

const flag = (name) => {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : (process.argv[index + 1] ?? null);
};
const has = (name) => process.argv.includes(name);

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const publicWorktree = path.resolve(flag("--public") ?? process.cwd());
  const distributionRoot = path.resolve(
    flag("--distribution") ??
      process.env.ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT ??
      "dist/run00-dev",
  );
  const releaseRoot = path.resolve(flag("--release") ?? "role-model-router/dist/release/win32-x64");
  if (has("--clean")) {
    const removed = removeCopiedDeclarationDists({ publicWorktree });
    console.log(JSON.stringify({ status: "PASS", removed }, null, 2));
    process.exit(0);
  }
  const distributionManifestPath = path.join(distributionRoot, "track-b-runtime-manifest.json");
  const packageManifestPath = path.join(releaseRoot, "manifest.json");
  if (!existsSync(distributionManifestPath) || !existsSync(packageManifestPath)) {
    console.error(
      JSON.stringify(
        {
          status: "FAILED",
          reason: "missing-manifest",
          distributionManifestPath,
          packageManifestPath,
        },
        null,
        2,
      ),
    );
    process.exit(2);
  }
  const publicTree = execFileSync("git", ["rev-parse", "HEAD^{tree}"], {
    cwd: publicWorktree,
    encoding: "utf8",
  }).trim();
  const result = assertLockstepIdentity({
    publicTree,
    distribution: JSON.parse(readFileSync(distributionManifestPath, "utf8")),
    packageManifest: JSON.parse(readFileSync(packageManifestPath, "utf8")),
    distributionManifestSha256: sha256OfFile(distributionManifestPath),
  });
  console.log(JSON.stringify({ status: "PASS", ...result }, null, 2));
}
