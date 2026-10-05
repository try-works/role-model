#!/usr/bin/env node
/**
 * Vendoring tool for the pinned upstream source drops under `vendor/`.
 *
 *   node scripts/vendor-upstream.mjs --name effect --verify
 *   node scripts/vendor-upstream.mjs --name effect-mq --sync
 *   node scripts/vendor-upstream.mjs --name effect --sync --tag effect@4.0.0-rc.118 --commit <40-hex>
 *
 * `--verify` recomputes the content digest of a vendored tree and compares it with its `VENDORED.json`, so drift (an
 * edited vendored file, a half-applied sync) fails loudly. `--sync` re-clones the pinned upstream tag, exports the
 * payload from the object database with eol conversion disabled, swaps it in, and rewrites `VENDORED.json` +
 * `PROVENANCE.md` from the tree it just wrote.
 *
 * Every upstream is described in `UPSTREAMS` below: the pin, the payload paths, the licence and the reason the tree
 * is vendored. Adding an upstream means adding one entry.
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

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const UPSTREAMS = {
  effect: {
    url: "https://github.com/Effect-TS/effect",
    tag: "effect@4.0.0-rc.117",
    commit: "14a3f140095fdebbff9162944fe7d4ea83e054e6",
    dir: "vendor/effect",
    license: "MIT (Copyright (c) 2023 Effectful Technologies Inc)",
    packageGroups: "`effect`, `platform`, `sql`, `ai`, `atom`, `opentelemetry`, `vitest`, `tools`",
    payload: ["packages", "LICENSE", "README.md", "MIGRATION.md"],
    excludes: [
      ".git",
      "node_modules",
      "*.tsbuildinfo",
      "ai-docs/**",
      "scripts/**",
      ".github/**",
      "patches/**",
    ],
    reason:
      "Effect v4 is the runtime/effect-system library the router is being aligned to. Vendoring keeps the exact " +
      "reviewed source in-repo (offline builds, no network resolution, an auditable pin) instead of a floating " +
      "semver range.",
  },
  "effect-mq": {
    url: "https://github.com/TeamWarp/effect-mq",
    tag: "v0.7.0",
    commit: "5fea694188ee33c132bed27e1f97c40533276511",
    dir: "vendor/effect-mq",
    license: "MIT (Copyright (c) 2026 Adam Rankin)",
    packageGroups: "`effect-mq`",
    payload: ["packages", "docs", "LICENSE", "README.md", "CHANGELOG.md", "ROADMAP.md"],
    excludes: [
      ".git",
      "node_modules",
      "*.tsbuildinfo",
      "examples/**",
      "designs/**",
      "tools/**",
      ".github/**",
    ],
    reason:
      "effect-mq is the Effect-native background-jobs library (schema-first job definitions, storage-agnostic queue " +
      "core, worker runtime and a drizzle/Postgres store) the durable-work lane is being aligned to. It targets the " +
      "same Effect v4 line vendored under `vendor/effect`.",
  },
};

const args = process.argv.slice(2);
const flag = (name) => {
  const index = args.indexOf(name);
  return index === -1 ? null : (args[index + 1] ?? null);
};
const has = (name) => args.includes(name);

const fail = (message) => {
  console.error(`vendor-upstream: ${message}`);
  process.exit(1);
};

const name = flag("--name") ?? "effect";
const upstream = UPSTREAMS[name];
if (!upstream) fail(`unknown upstream "${name}"; known: ${Object.keys(UPSTREAMS).join(", ")}`);
const vendorDir = path.join(REPO_ROOT, upstream.dir);
const MANIFEST_FILES = ["VENDORED.json", "PROVENANCE.md"];

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
  const files = walk(vendorDir).sort();
  let bytes = 0;
  const lines = [];
  for (const file of files) {
    const relative = path.relative(vendorDir, file).split(path.sep).join("/");
    if (MANIFEST_FILES.includes(relative)) continue;
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

const repoName = JSON.parse(readFileSync(path.join(REPO_ROOT, "package.json"), "utf8")).name;

const writeProvenance = ({ tag, commit, commitDate, digest }) => {
  const manifest = {
    schemaVersion: "role-model.vendored-upstream.v1",
    upstream: { name, url: upstream.url, tag, commit, commitDate, license: upstream.license },
    vendoredInto: repoName,
    vendoredAt: new Date().toISOString(),
    payload: {
      root: upstream.dir,
      includes: upstream.payload.map((p) => `${p}${p.includes(".") ? "" : "/**"}`),
      excludes: upstream.excludes,
    },
    fileCount: digest.fileCount,
    byteCount: digest.byteCount,
    contentDigest: digest.contentDigest,
    wiring:
      "not a workspace package and not imported by any build; a lint-ignored source drop only",
  };
  writeFileSync(path.join(vendorDir, "VENDORED.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(
    path.join(vendorDir, "PROVENANCE.md"),
    `# Vendored upstream: ${name}

This directory is a **verbatim copy of upstream ${name} source**, not first-party code. It is not a workspace
package, is not imported by any build, and is excluded from linting by the repository's \`**/vendor/**\` ignore.

| field | value |
| --- | --- |
| upstream | ${upstream.url} |
| tag | \`${tag}\` |
| commit | \`${commit}\` |
| commit date | ${commitDate} |
| vendored into | ${repoName} |
| vendored at | ${manifest.vendoredAt} |
| license | ${upstream.license} — see \`LICENSE\` |
| payload | ${upstream.payload.map((p) => `\`${p}\``).join(", ")} |
| file count | ${digest.fileCount} |
| size | ${(digest.byteCount / 1024 / 1024).toFixed(1)} MB |
| content digest | \`sha256:${digest.contentDigest}\` |

## Why it is here

${upstream.reason}

## What was copied, and what was not

Copied verbatim: ${upstream.packageGroups}, plus the upstream licence and top-level documentation named in the
payload row above.

Deliberately not copied: ${upstream.excludes.join(", ")}. Nothing in this tree has been modified: the content digest
above is computed over every file exactly as shipped.

## Licence and attribution

\`${name}\` is MIT-licensed; the upstream licence text is retained verbatim in \`LICENSE\`. This repository's own
licence (BUSL-1.1 with an Additional Use Grant) does not relicense the vendored tree: the files here remain under the
MIT terms and the upstream copyright notice, as required by \`CONTRIBUTING.md\` § "Third-party material".

## Verifying or refreshing the pin

\`\`\`bash
node scripts/vendor-upstream.mjs --name ${name} --verify          # recompute the content digest against VENDORED.json
node scripts/vendor-upstream.mjs --name ${name} --sync            # re-clone the pinned tag and re-copy the payload
node scripts/vendor-upstream.mjs --name ${name} --sync --tag <tag> --commit <sha>   # move the pin deliberately
\`\`\`

Moving the pin is a reviewed change: update \`VENDORED.json\`, \`PROVENANCE.md\` and the vendored files in the same
commit so the digest always matches the tree.
`,
  );
};

if (has("--verify")) {
  const recorded = JSON.parse(readFileSync(path.join(vendorDir, "VENDORED.json"), "utf8"));
  const actual = digestTree();
  if (actual.contentDigest !== recorded.contentDigest || actual.fileCount !== recorded.fileCount) {
    fail(
      `${name}: vendored tree does not match VENDORED.json (recorded ${recorded.fileCount} files ` +
        `${recorded.contentDigest.slice(0, 16)}…, actual ${actual.fileCount} files ${actual.contentDigest.slice(0, 16)}…)`,
    );
  }
  console.log(
    `vendor-upstream: ${name} verified ${actual.fileCount} files, ${(actual.byteCount / 1024 / 1024).toFixed(1)} MB, ` +
      `sha256:${actual.contentDigest}`,
  );
  process.exit(0);
}

if (has("--sync")) {
  const tag = flag("--tag") ?? upstream.tag;
  const commit = flag("--commit") ?? upstream.commit;
  if (!/^[0-9a-f]{40}$/.test(commit))
    fail(`--commit must be a 40-character commit, saw "${commit}"`);
  const temp = mkdtempSync(path.join(tmpdir(), `vendor-${name}-`));
  try {
    const clone = spawnSync("git", ["clone", "--depth", "1", "--branch", tag, upstream.url, temp], {
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
     * Export from the object database with eol conversion disabled. A working-tree copy would pick up the host's
     * `core.autocrlf` (true on Windows checkouts), so the vendored bytes would be CRLF while the committed blobs are
     * LF - and the recorded content digest would then fail on any other checkout. `git archive` with
     * `core.autocrlf=false` writes the exact upstream bytes, and `cpSync` preserves them.
     */
    const archive = path.join(temp, "payload.tar");
    const extract = path.join(temp, "payload-extract");
    mkdirSync(extract, { recursive: true });
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
        ...upstream.payload,
      ],
      { stdio: "pipe", encoding: "utf8" },
    );
    if (exported.status !== 0)
      fail(`git archive failed: ${exported.stderr?.trim() ?? exported.status}`);
    const unpacked = spawnSync("tar", ["-xf", archive, "-C", extract], {
      stdio: "pipe",
      encoding: "utf8",
    });
    if (unpacked.status !== 0)
      fail(`tar extraction failed: ${unpacked.stderr?.trim() ?? unpacked.status}`);

    /**
     * Swap only after the export is on disk: the trees are large, and a failed export must not leave the vendored
     * directory half-written.
     */
    for (const payload of upstream.payload) {
      const destination = path.join(vendorDir, payload);
      const source = path.join(extract, payload);
      const isDirectory = readdirSync(extract).includes(payload) && statSync(source).isDirectory();
      if (isDirectory) rmSync(destination, { recursive: true, force: true });
      mkdirSync(path.dirname(destination), { recursive: true });
      cpSync(source, destination, { recursive: isDirectory });
    }
    writeProvenance({ tag, commit, commitDate, digest: digestTree() });
    console.log(
      `vendor-upstream: ${name} synced ${tag} (${commit}) into ${upstream.dir} (LF bytes)`,
    );
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
  process.exit(0);
}

console.log(
  `vendor-upstream: nothing to do. Use --verify or --sync with --name <${Object.keys(UPSTREAMS).join("|")}> ` +
    `(default ${name}).`,
);
