#!/usr/bin/env node
/**
 * Vendoring tool for the Effect v4 source drop under `vendor/effect/`.
 *
 *   node scripts/vendor-effect.mjs --verify
 *   node scripts/vendor-effect.mjs --sync
 *   node scripts/vendor-effect.mjs --sync --tag effect@4.0.0-rc.118 --commit <40-hex>
 *
 * `--verify` recomputes the content digest of the vendored tree and compares it with `VENDORED.json`, so drift (an
 * edited vendored file, a half-applied sync) fails loudly. `--sync` re-clones the pinned upstream tag into a temp
 * directory, copies the payload, and rewrites `VENDORED.json` + `PROVENANCE.md` from the tree it just wrote.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const UPSTREAM_URL = "https://github.com/Effect-TS/effect";
const DEFAULT_TAG = "effect@4.0.0-rc.117";
const DEFAULT_COMMIT = "14a3f140095fdebbff9162944fe7d4ea83e054e6";
const PAYLOAD_FILES = ["LICENSE", "README.md", "MIGRATION.md"];
const VENDOR_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "vendor",
  "effect",
);

const args = process.argv.slice(2);
const flag = (name) => {
  const index = args.indexOf(name);
  return index === -1 ? null : (args[index + 1] ?? null);
};
const has = (name) => args.includes(name);

const fail = (message) => {
  console.error(`vendor-effect: ${message}`);
  process.exit(1);
};

const walk = (dir, out = []) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      walk(full, out);
      continue;
    }
    if (entry.isFile() && !entry.name.endsWith(".tsbuildinfo")) out.push(full);
  }
  return out;
};

const digestTree = () => {
  const files = walk(VENDOR_DIR).sort();
  let bytes = 0;
  const lines = [];
  for (const file of files) {
    const relative = path.relative(VENDOR_DIR, file).split(path.sep).join("/");
    if (relative === "VENDORED.json" || relative === "PROVENANCE.md") continue;
    const size = statSync(file).size;
    bytes += size;
    const digest = createHash("sha256").update(readFileSync(file)).digest("hex");
    lines.push(`${relative}\u0000${size}\u0000${digest}`);
  }
  return {
    fileCount: lines.length,
    byteCount: bytes,
    contentDigest: createHash("sha256").update(lines.join("\n")).digest("hex"),
  };
};

const writeProvenance = ({ tag, commit, commitDate, digest, repoName }) => {
  const manifest = {
    schemaVersion: "role-model.vendored-upstream.v1",
    upstream: { name: "effect", url: UPSTREAM_URL, tag, commit, commitDate, license: "MIT" },
    vendoredInto: repoName,
    vendoredAt: new Date().toISOString(),
    payload: {
      root: "vendor/effect",
      includes: ["packages/**", ...PAYLOAD_FILES],
      excludes: [".git", "node_modules", "*.tsbuildinfo", "ai-docs/**", "scripts/**", ".github/**"],
    },
    fileCount: digest.fileCount,
    byteCount: digest.byteCount,
    contentDigest: digest.contentDigest,
    wiring:
      "not a workspace package and not imported by any build; a lint-ignored source drop only",
  };
  writeFileSync(path.join(VENDOR_DIR, "VENDORED.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(
    path.join(VENDOR_DIR, "PROVENANCE.md"),
    `# Vendored upstream: Effect v4

This directory is a **verbatim copy of upstream Effect v4 source**, not first-party code. It is not a workspace
package, is not imported by any build, and is excluded from linting by the repository's \`**/vendor/**\` ignore.

| field | value |
| --- | --- |
| upstream | ${UPSTREAM_URL} |
| tag | \`${tag}\` |
| commit | \`${commit}\` |
| commit date | ${commitDate} |
| vendored into | ${repoName} |
| vendored at | ${manifest.vendoredAt} |
| license | MIT (Copyright (c) 2023 Effectful Technologies Inc) — see \`LICENSE\` |
| payload | \`packages/**\`, ${PAYLOAD_FILES.map((file) => `\`${file}\``).join(", ")} |
| file count | ${digest.fileCount} |
| size | ${(digest.byteCount / 1024 / 1024).toFixed(1)} MB |
| content digest | \`sha256:${digest.contentDigest}\` |

## Why it is here

Effect v4 is the runtime/effect-system library the router is being aligned to. Vendoring keeps the exact reviewed
source in-repo (offline builds, no network resolution, an auditable pin) instead of a floating semver range.

## What was copied, and what was not

Copied verbatim: the upstream \`packages/\` tree (all package groups: \`effect\`, \`platform\`, \`sql\`, \`ai\`,
\`atom\`, \`opentelemetry\`, \`vitest\`, \`tools\`), plus the upstream \`LICENSE\`, \`README.md\` and the v3→v4
\`MIGRATION.md\`.

Deliberately not copied: \`.git\`, \`node_modules\`, \`*.tsbuildinfo\`, the upstream \`ai-docs/\`, \`scripts/\`,
\`.github/\`, \`patches/\` and the upstream lockfile/workspace files. Nothing in this tree has been modified: the
content digest above is computed over every file exactly as shipped.

## Licence and attribution

Effect is MIT-licensed; the upstream licence text is retained verbatim in \`LICENSE\`. This repository's own licence
(BUSL-1.1 with an Additional Use Grant) does not relicense the vendored tree: the files here remain under the MIT
terms and the upstream copyright notice, as required by \`CONTRIBUTING.md\` § "Third-party material".

## Verifying or refreshing the pin

\`\`\`bash
node scripts/vendor-effect.mjs --verify          # recompute the content digest against VENDORED.json
node scripts/vendor-effect.mjs --sync            # re-clone the pinned tag and re-copy the payload
node scripts/vendor-effect.mjs --sync --tag <tag> --commit <sha>   # move the pin deliberately
\`\`\`

Moving the pin is a reviewed change: update \`VENDORED.json\`, \`PROVENANCE.md\` and the vendored files in the same
commit so the digest always matches the tree.
`,
  );
};

const repoName = JSON.parse(
  readFileSync(path.join(VENDOR_DIR, "..", "..", "package.json"), "utf8"),
).name;

if (has("--verify")) {
  const recorded = JSON.parse(readFileSync(path.join(VENDOR_DIR, "VENDORED.json"), "utf8"));
  const actual = digestTree();
  if (actual.contentDigest !== recorded.contentDigest || actual.fileCount !== recorded.fileCount) {
    fail(
      `vendored tree does not match VENDORED.json (recorded ${recorded.fileCount} files ` +
        `${recorded.contentDigest.slice(0, 16)}…, actual ${actual.fileCount} files ${actual.contentDigest.slice(0, 16)}…)`,
    );
  }
  console.log(
    `vendor-effect: verified ${actual.fileCount} files, ${(actual.byteCount / 1024 / 1024).toFixed(1)} MB, ` +
      `sha256:${actual.contentDigest}`,
  );
  process.exit(0);
}

if (has("--sync")) {
  const tag = flag("--tag") ?? DEFAULT_TAG;
  const commit = flag("--commit") ?? DEFAULT_COMMIT;
  if (!/^[0-9a-f]{40}$/.test(commit))
    fail(`--commit must be a 40-character commit, saw "${commit}"`);
  const temp = mkdtempSync(path.join(tmpdir(), "effect-vendor-"));
  try {
    const clone = spawnSync("git", ["clone", "--depth", "1", "--branch", tag, UPSTREAM_URL, temp], {
      stdio: "pipe",
      encoding: "utf8",
    });
    if (clone.status !== 0) fail(`git clone failed: ${clone.stderr?.trim() ?? clone.status}`);
    const head = spawnSync("git", ["-C", temp, "rev-parse", "HEAD"], {
      encoding: "utf8",
    }).stdout.trim();
    if (head !== commit) fail(`tag ${tag} resolves to ${head}, expected ${commit}`);
    const commitDate = spawnSync("git", ["-C", temp, "log", "-1", "--format=%cI"], {
      encoding: "utf8",
    }).stdout.trim();

    /**
     * Export from the object database with eol conversion disabled. A working-tree copy picks up the host's
     * `core.autocrlf` (true on Windows checkouts), so the vendored bytes would be CRLF while the committed blobs are
     * LF - and the recorded content digest would then fail on any other checkout. `git archive` with
     * `core.autocrlf=false` writes the exact upstream bytes, and `cpSync` preserves them.
     */
    const archive = path.join(temp, "payload.tar");
    const extract = path.join(temp, "payload-extract");
    const exported = spawnSync(
      "git",
      [
        "-C",
        temp,
        "-c",
        "core.autocrlf=false",
        "-c",
        "core.eol=lf",
        "archive",
        "--format=tar",
        "--output",
        archive,
        commit,
        "packages",
        ...PAYLOAD_FILES,
      ],
      { stdio: "pipe", encoding: "utf8" },
    );
    if (exported.status !== 0)
      fail(`git archive failed: ${exported.stderr?.trim() ?? exported.status}`);
    mkdirSync(extract, { recursive: true });
    const unpacked = spawnSync("tar", ["-xf", archive, "-C", extract], {
      stdio: "pipe",
      encoding: "utf8",
    });
    if (unpacked.status !== 0)
      fail(`tar extraction failed: ${unpacked.stderr?.trim() ?? unpacked.status}`);

    /**
     * Swap only after the export is on disk: the tree is large, and a failed export must not leave the vendored
     * directory half-written.
     */
    rmSync(path.join(VENDOR_DIR, "packages"), { recursive: true, force: true });
    cpSync(path.join(extract, "packages"), path.join(VENDOR_DIR, "packages"), { recursive: true });
    for (const file of PAYLOAD_FILES) cpSync(path.join(extract, file), path.join(VENDOR_DIR, file));
    writeProvenance({ tag, commit, commitDate, digest: digestTree(), repoName });
    console.log(
      `vendor-effect: synced ${tag} (${commit}) into vendor/effect (LF bytes from the object database)`,
    );
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
  process.exit(0);
}

console.log(`vendor-effect: nothing to do. Use --verify or --sync (pinned ${DEFAULT_TAG}).`);
