/**
 * Run 115 R6 (S650 wave 3 repair): generate the packaged wrapper-closure receipt FROM the
 * packaged release, not from the local wrapper alone. It copies the small release identity
 * artifacts (manifest, executable .sha256, client bundle) into evidence so the test can
 * recompute them without a 100 MB executable in git.
 *
 * Usage: node scripts/generate-packaged-closure-receipt.mjs --release <release-dir> [--evidence <dir>]
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const flag = (name) => {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : (process.argv[index + 1] ?? null);
};
const repoRoot = process.cwd();
const wrapper = path.join(repoRoot, "role-model-router/packages/foldkit-ui");
const releaseRoot = path.resolve(flag("--release") ?? "");
if (!flag("--release")) throw new Error("--release <release-dir> is required");
const evidenceRoot = path.resolve(
  flag("--evidence") ??
    path.join(repoRoot, ".recursive/run/115-effect-foldkit-runtime-migration/evidence/logs"),
);
const evidenceRelease = path.join(evidenceRoot, "r6-packaged-release");
mkdirSync(evidenceRelease, { recursive: true });

const sha256 = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");
const executableSlice = (file) => {
  const bytes = readFileSync(file);
  const width = Math.min(65536, bytes.length);
  const head = bytes.subarray(0, width);
  const tail = bytes.subarray(Math.max(width, bytes.length - width));
  return { head, tail, digest: createHash("sha256").update(head).update(tail).digest("hex") };
};
const sliceSha256 = (file) => executableSlice(file).digest;
const manifestPath = path.join(releaseRoot, "manifest.json");
if (!existsSync(manifestPath)) throw new Error(`packaged release manifest missing: ${manifestPath}`);
const releaseManifest = JSON.parse(readFileSync(manifestPath, "utf8"));
if (!/^[0-9a-f]{64}$/.test(releaseManifest.executable_sha256 ?? "")) {
  throw new Error("release manifest has no executable_sha256");
}
if (!/^[0-9a-f]{40}$/.test(releaseManifest.source_tree ?? "") || !/^[0-9a-f]{40}$/.test(releaseManifest.commit ?? "")) {
  throw new Error("release manifest has no source_tree/commit");
}
const publicCommit = releaseManifest.commit;
const executablePath = path.join(releaseRoot, releaseManifest.executable);
const executableSha = sha256(executablePath);
if (executableSha !== releaseManifest.executable_sha256) {
  throw new Error("release manifest executable_sha256 does not match the packaged executable bytes");
}
const clientBundlePath = path.join(releaseRoot, "build/client/assets/main.js");
if (!existsSync(clientBundlePath)) throw new Error(`packaged client bundle missing: ${clientBundlePath}`);
const clientBundleText = readFileSync(clientBundlePath, "utf8");
if (!clientBundleText.includes("foldkit-ui")) {
  throw new Error("packaged client bundle does not identify the foldkit-ui wrapper");
}
const wrapperMarker = "foldkit-ui";
const entries = Object.entries(
  JSON.parse(readFileSync(path.join(wrapper, "package.json"), "utf8")).exports,
)
  .filter(([subpath]) => subpath !== "./package.json")
  .map(([subpath, target]) => {
    const importFile = path.join(wrapper, target.import.replace(/^\.\//, ""));
    const typesFile = path.join(wrapper, target.types.replace(/^\.\//, ""));
    if (!existsSync(importFile) || !existsSync(typesFile)) throw new Error(`${subpath} wrapper artifact missing`);
    return {
      subpath,
      importSha256: sha256(importFile),
      typesSha256: sha256(typesFile),
    };
  });
if (entries.length !== 30) throw new Error(`expected 30 wrapper entries, found ${entries.length}`);

copyFileSync(manifestPath, path.join(evidenceRelease, "manifest.json"));
copyFileSync(clientBundlePath, path.join(evidenceRelease, "main.js"));
const executableShaPath = `${executablePath}.sha256`;
if (!existsSync(executableShaPath)) throw new Error("packaged executable .sha256 sidecar is missing");
copyFileSync(executableShaPath, path.join(evidenceRelease, "executable.sha256"));
const executableSliceArtifacts = executableSlice(executablePath);
writeFileSync(path.join(evidenceRelease, "executable.head.bin"), executableSliceArtifacts.head);
writeFileSync(path.join(evidenceRelease, "executable.tail.bin"), executableSliceArtifacts.tail);

const receipt = {
  schemaVersion: "role-model.foldkit-ui.packaged-closure.v2",
  claim: "packaged-release-identity-plus-local-wrapper-entry-hashes",
  packagedClientEntryEmbedding: "not-claimed",
  fullExecutableRecomputeRequiresReleaseRoot: true,
  reviewedHead: execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim(),
  releaseCommit: releaseManifest.commit,
  releaseSourceTree: releaseManifest.source_tree,
  releaseWrapperTree: execFileSync("git", ["rev-parse", `${releaseManifest.commit}:role-model-router/packages/foldkit-ui`], { cwd: repoRoot, encoding: "utf8" }).trim(),
  publicCommit,
  publicSourceTree: releaseManifest.source_tree,
  releaseRoot,
  releaseManifestPath: manifestPath,
  releaseManifestSha256: sha256(manifestPath),
  executablePath,
  executableSha256: executableSha,
  executableSize: statSync(executablePath).size,
  executableSliceSha256: sliceSha256(executablePath),
  executableSliceBytes: 65536,
  clientBundlePath,
  clientBundleSha256: sha256(clientBundlePath),
  evidence: {
    releaseManifestPath: "r6-packaged-release/manifest.json",
    releaseManifestSha256: sha256(manifestPath),
    clientBundlePath: "r6-packaged-release/main.js",
    clientBundleSha256: sha256(clientBundlePath),
    executableSha256Path: "r6-packaged-release/executable.sha256",
  },
  wrapperMarker,
  entries,
};
const receiptPath = path.join(evidenceRoot, "r6-packaged-wrapper-closure.json");
writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ status: "PASS", receiptPath, entries: entries.length, executableSha256: executableSha }, null, 2));
