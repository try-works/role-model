/**
 * Run 115 R5 follow-up (S650): the Node platform/node-shared closure mirroring the browser closure.
 *
 * The browser wrappers are proven closed by graph-closure/runtime-graph; this test is the Node half:
 *   - both first-party Node wrappers exist and publish exactly the vendored subpaths,
 *   - each built entry exists and every bare import is one of the explicit externals
 *     (`effect`, `effect/*`, the optional peers `ws`/`undici`/`redis`, and the sibling
 *     node-shared wrapper) with no vendored/relative leakage,
 *   - the Node wrappers never import the browser platform wrapper (and the browser wrappers never
 *     import a Node platform package), and
 *   - every entry resolves through its wrapper export and a representative namespace imports.
 *
 * RED at HEAD 8653daa2: neither Node wrapper package exists.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  assembleEntries,
  publishedSourcePaths,
  vendoredPackageDir as browserVendoredDir,
} from "../role-model-router/packages/effect-platform-browser/entries.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const NODE_PACKAGES = [
  {
    label: "@effect/platform-node-shared",
    dir: path.join(REPO_ROOT, "role-model-router/packages/effect-platform-node-shared"),
    vendored: path.join(REPO_ROOT, "vendor/effect/packages/platform/node-shared"),
    expectedSubpaths: 17,
    externals: ["effect", "ws"],
  },
  {
    label: "@effect/platform-node",
    dir: path.join(REPO_ROOT, "role-model-router/packages/effect-platform-node"),
    vendored: path.join(REPO_ROOT, "vendor/effect/packages/platform/node"),
    expectedSubpaths: 29,
    externals: ["effect", "@effect/platform-node-shared", "undici", "redis"],
  },
];

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const isExternal = (specifier, externals) =>
  externals.some((entry) => specifier === entry || specifier.startsWith(`${entry}/`));

function builtFiles(root) {
  const out = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "types") out.push(...builtFiles(full));
    } else if (entry.name.endsWith(".js")) out.push(full);
  }
  return out;
}

/** Static/dynamic import specifiers from a built ESM file, masked against strings/comments. */
function importSpecifiers(source) {
  const masked = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");
  const specs = [];
  for (const match of masked.matchAll(/(?:import|export)\s+(?:[^"']*?\s+from\s+)?["']([^"']+)["']/g)) {
    specs.push(match[1]);
  }
  for (const match of masked.matchAll(/import\(\s*["']([^"']+)["']\s*\)/g)) specs.push(match[1]);
  return specs;
}

test("both Node platform wrappers exist and publish exactly the vendored subpaths", async () => {
  for (const wrapper of NODE_PACKAGES) {
    assert.ok(
      existsSync(path.join(wrapper.dir, "package.json")),
      `missing Node platform wrapper ${wrapper.label} at ${wrapper.dir}`,
    );
    const manifest = readJson(path.join(wrapper.dir, "package.json"));
    assert.equal(manifest.name, wrapper.label);
    const { bySubpath } = await assembleEntries({ packageDir: wrapper.vendored });
    assert.equal(bySubpath.size, wrapper.expectedSubpaths, wrapper.label);
    for (const subpath of bySubpath.keys()) {
      assert.ok(
        Object.hasOwn(manifest.exports, subpath),
        `${wrapper.label} exports must publish ${subpath}`,
      );
    }
    const published = await publishedSourcePaths(wrapper.vendored);
    assert.deepEqual([...published.keys()].sort(), [...bySubpath.keys()].sort(), wrapper.label);
  }
});

test("the built Node graph externalises only the declared peers and never bundles vendor sources", () => {
  for (const wrapper of NODE_PACKAGES) {
    const dist = path.join(wrapper.dir, "dist");
    assert.ok(existsSync(dist), `build output missing for ${wrapper.label}: run node build.mjs`);
    const files = builtFiles(dist);
    assert.ok(files.length > 0, `no built JS for ${wrapper.label}`);
    for (const file of files) {
      for (const specifier of importSpecifiers(readFileSync(file, "utf8"))) {
        assert.ok(
          isExternal(specifier, wrapper.externals),
          `${wrapper.label} built ${path.relative(dist, file)} imports ${specifier}; only declared externals are allowed`,
        );
        assert.ok(!specifier.includes("/vendor/"), `${wrapper.label} bundled a vendored module`);
        assert.ok(
          !specifier.includes("platform-browser") &&
            !specifier.includes("effect-platform-browser"),
          `${wrapper.label} imports the browser platform graph`,
        );
      }
    }
  }
});

test("the browser wrappers never import a Node platform wrapper", () => {
  const browserDir = path.join(REPO_ROOT, "role-model-router/packages/effect-platform-browser/dist");
  assert.ok(existsSync(browserDir), "browser wrapper dist missing");
  for (const file of builtFiles(browserDir)) {
    const specs = importSpecifiers(readFileSync(file, "utf8"));
    assert.deepEqual(
      specs.filter(
        (specifier) =>
          specifier === "@effect/platform-node" ||
          specifier.startsWith("@effect/platform-node/") ||
          specifier === "@effect/platform-node-shared" ||
          specifier.startsWith("@effect/platform-node-shared/"),
      ),
      [],
      `browser wrapper built ${path.basename(file)} imports the Node platform graph`,
    );
  }
});

test("every Node wrapper entry resolves through its export and imports a namespace", async () => {
  for (const wrapper of NODE_PACKAGES) {
    const manifest = readJson(path.join(wrapper.dir, "package.json"));
    for (const [subpath, target] of Object.entries(manifest.exports)) {
      if (subpath === "./package.json") continue;
      const built = path.join(wrapper.dir, target.import.replace(/^\.\//, ""));
      assert.ok(existsSync(built), `${wrapper.label}${subpath.slice(1)} missing built ${built}`);
    }
    const manifestBuilt = path.join(wrapper.dir, "dist/index.js");
    const namespace = await import(`file://${manifestBuilt.replaceAll("\\", "/")}`);
    assert.ok(Object.keys(namespace).length > 0, `${wrapper.label} root entry has no exports`);
  }
});

test("the browser entry assembly still resolves its own vendored package", async () => {
  const { bySubpath } = await assembleEntries({ packageDir: browserVendoredDir });
  assert.equal(bySubpath.size, 18);
});
