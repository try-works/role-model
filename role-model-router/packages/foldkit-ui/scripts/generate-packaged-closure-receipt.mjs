/**
 * Run 115 R6 (S650 wave 3): write the packaged wrapper-closure receipt the
 * foldkit-ui entry test requires. Run AFTER package-sea, with
 * ROLE_MODEL_RELEASE_ROOT pointing at the release directory.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const wrapper = path.resolve(here, "..");
const manifest = JSON.parse(readFileSync(path.join(wrapper, "package.json"), "utf8"));
const releaseRoot = process.env.ROLE_MODEL_RELEASE_ROOT?.trim();
if (!releaseRoot) throw new Error("ROLE_MODEL_RELEASE_ROOT is required");
const clientRoot = path.join(releaseRoot, "build", "client", "assets");
if (!existsSync(clientRoot)) throw new Error(`packaged client assets missing at ${clientRoot}`);

const sha = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");
const entries = Object.entries(manifest.exports)
  .filter(([subpath]) => subpath !== "./package.json")
  .map(([subpath, target]) => {
    const importFile = path.join(wrapper, target.import.replace(/^\.\//, ""));
    const typesFile = path.join(wrapper, target.types.replace(/^\.\//, ""));
    if (!existsSync(importFile) || !existsSync(typesFile)) {
      throw new Error(`${subpath} wrapper artifact is missing`);
    }
    return { subpath, importSha256: sha(importFile), typesSha256: sha(typesFile) };
  });
const assetCount = readdirSync(clientRoot).filter((name) => name.endsWith(".js")).length;
if (assetCount === 0) throw new Error("packaged client has no JS assets");

const receiptPath = path.join(
  process.env.ROLE_MODEL_EVIDENCE_DIR ??
    path.join(wrapper, "..", "..", "..", ".recursive/run/115-effect-foldkit-runtime-migration/evidence/logs"),
  "r6-packaged-wrapper-closure.json",
);
writeFileSync(
  receiptPath,
  `${JSON.stringify(
    {
      schemaVersion: "role-model.foldkit-ui.packaged-closure.v1",
      releaseRoot: path.resolve(releaseRoot),
      packagedClient: { assetCount },
      entries,
    },
    null,
    2,
  )}\n`,
  "utf8",
);
console.log(JSON.stringify({ status: "PASS", receiptPath, entries: entries.length, assetCount }, null, 2));
