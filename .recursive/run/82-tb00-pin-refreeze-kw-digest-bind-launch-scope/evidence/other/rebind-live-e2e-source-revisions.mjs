#!/usr/bin/env node
/**
 * Proof-only live-e2e source-revision rebind (FD12 / run 82).
 *
 * Updates private/public revision fields in the validator-coupled live-e2e JSON
 * receipts to match `evidence/source-set/tb00-release-source-lock.json`, then
 * refreshes sha256 inventory entries for rewritten files.
 *
 * Does NOT re-run Playwright or rebuild hop proofs. Prefer
 * `assemble-run00-live-e2e.mjs` when a full live packaged hop refresh is required.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const liveRoot = path.join(root, "evidence/live-e2e");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const readJson = (target) => JSON.parse(readFileSync(target, "utf8"));
const writeJson = (target, value) => writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);

const sourceLock = readJson(path.join(root, "evidence/source-set/tb00-release-source-lock.json"));
const privatePin = sourceLock.sources.find((s) => s.repositoryId === "private")?.revision;
const publicPin = sourceLock.sources.find((s) => s.repositoryId === "public")?.revision;
if (!/^[a-f0-9]{40}$/.test(privatePin ?? "") || !/^[a-f0-9]{40}$/.test(publicPin ?? "")) {
  throw new Error("source lock private/public revisions missing");
}

const manifestPath = path.join(liveRoot, "run00-live-e2e-manifest.json");
const buildPath = path.join(liveRoot, "build-and-test.json");
const checkoutPath = path.join(liveRoot, "clean-checkout-reconstruction.json");

const setRepoRevision = (rows, repositoryId, revision) => {
  for (const row of rows ?? []) {
    if (row.repositoryId === repositoryId) row.revision = revision;
  }
};

const manifest = readJson(manifestPath);
const build = readJson(buildPath);
const checkout = readJson(checkoutPath);

setRepoRevision(manifest.builds, "private", privatePin);
setRepoRevision(manifest.builds, "public", publicPin);
setRepoRevision(build.builds, "private", privatePin);
setRepoRevision(build.builds, "public", publicPin);
if (build.private) build.private.revision = privatePin;
if (build.public) build.public.revision = publicPin;
if (checkout.private) checkout.private.revision = privatePin;
if (checkout.public) checkout.public.revision = publicPin;

writeJson(buildPath, build);
writeJson(checkoutPath, checkout);

for (const artifact of manifest.artifacts ?? []) {
  artifact.sha256 = sha256(readFileSync(path.join(root, artifact.path)));
}
writeJson(manifestPath, manifest);

console.log(
  JSON.stringify(
    {
      status: "PASS",
      mode: "proof-only-source-revision-rebind",
      privatePin,
      publicPin,
      rewritten: [
        "evidence/live-e2e/run00-live-e2e-manifest.json",
        "evidence/live-e2e/build-and-test.json",
        "evidence/live-e2e/clean-checkout-reconstruction.json",
      ],
    },
    null,
    2,
  ),
);
