/**
 * Run 115 R5 follow-up (S650): the Node platform/node-shared closure mirroring the browser closure.
 *
 * The Node surfaces are published by the existing `effect` wrapper (no second
 * workspace package and no lockfile churn): `effect/platform-node[/<Entry>]` and
 * `effect/platform-node-shared[/<Entry>]`. This test proves:
 *   - the vendored Node packages' public entries are all built,
 *   - the built bytes import only the Effect wrapper, declared optional peers
 *     (ws/undici/redis), and Node builtins - never a vendored path or the browser graph,
 *   - the browser wrappers never import a Node platform package, and
 *   - representative Node subpaths resolve through the wrapper export and import.
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  discoverPlatformEntries,
  platformVendored,
} from "../role-model-router/packages/effect/entries.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EFFECT_DIR = path.join(REPO_ROOT, "role-model-router/packages/effect");
const HOST_REQUIRE = createRequire(
  path.join(REPO_ROOT, "role-model-router/apps/runtime-host-bridge/package.json"),
);
const EXPECTED = { "platform-node": 29, "platform-node-shared": 17 };
const EXTERNALS = ["effect", "ws", "undici", "redis"];

function builtFiles(root) {
  const out = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      out.push(...builtFiles(full));
    } else if (entry.name.endsWith(".js")) out.push(full);
  }
  return out;
}

/** Static/dynamic import specifiers from built ESM, with comments and strings kept simple. */
function importSpecifiers(source) {
  const masked = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const specs = [];
  for (const match of masked.matchAll(/(?:import|export)\s+(?:[^"']*?\s+from\s+)?["']([^"']+)["']/g)) {
    specs.push(match[1]);
  }
  for (const match of masked.matchAll(/import\(\s*["']([^"']+)["']\s*\)/g)) specs.push(match[1]);
  return specs;
}

const isExternal = (specifier) =>
  specifier.startsWith(".") ||
  specifier.startsWith("node:") ||
  EXTERNALS.some((entry) => specifier === entry || specifier.startsWith(`${entry}/`));

test("every vendored Node platform entry is built and has a wrapper export path", async () => {
  const entries = await discoverPlatformEntries();
  for (const [prefix, count] of Object.entries(EXPECTED)) {
    const keys = Object.keys(entries).filter((key) => key === prefix || key.startsWith(`${prefix}/`));
    assert.equal(keys.length, count, `${prefix} entry count`);
    for (const key of keys) {
      assert.ok(
        existsSync(path.join(EFFECT_DIR, "dist", `${key}.js`)),
        `missing built entry dist/${key}.js`,
      );
      assert.ok(
        existsSync(path.join(EFFECT_DIR, "dist", "types", `${key}.d.ts`)),
        `missing declaration dist/types/${key}.d.ts`,
      );
      assert.ok(
        Object.hasOwn(JSON.parse(readFileSync(path.join(EFFECT_DIR, "package.json"), "utf8")).exports, "./*"),
        "the effect wrapper wildcard export must publish the Node subpath",
      );
    }
  }
});

test("the Node platform graph imports only the Effect wrapper, optional peers and Node builtins", () => {
  for (const prefix of Object.keys(platformVendored)) {
    const dist = path.join(EFFECT_DIR, "dist", prefix);
    assert.ok(existsSync(dist), `build output missing for ${prefix}: run node build.mjs in packages/effect`);
    for (const file of builtFiles(dist)) {
      for (const specifier of importSpecifiers(readFileSync(file, "utf8"))) {
        assert.ok(
          isExternal(specifier),
          `${prefix} built ${path.relative(dist, file)} imports ${specifier}; only effect/*, ws/undici/redis and node:* are allowed`,
        );
        assert.ok(!specifier.includes("/vendor/"), `${prefix} bundled a vendored module`);
        assert.ok(
          !specifier.includes("platform-browser") && !specifier.includes("effect-platform-browser"),
          `${prefix} imports the browser platform graph`,
        );
      }
    }
  }
});

test("the browser wrappers never import a Node platform package", () => {
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
          specifier.startsWith("@effect/platform-node-shared/") ||
          specifier.startsWith("effect/platform-node"),
      ),
      [],
      `browser wrapper built ${path.basename(file)} imports the Node platform graph`,
    );
  }
});

test("representative Node subpaths resolve through the wrapper and import a namespace", async () => {
  for (const subpath of ["effect/platform-node/NodePath", "effect/platform-node-shared/NodePath"]) {
    const resolved = HOST_REQUIRE.resolve(subpath);
    const namespace = await import(pathToFileURL(resolved).href);
    assert.ok(Object.keys(namespace).length > 0, `${subpath} root entry has no exports`);
  }
  for (const subpath of ["effect/platform-node", "effect/platform-node-shared"]) {
    assert.ok(HOST_REQUIRE.resolve(subpath), `${subpath} must resolve`);
    assert.ok(
      existsSync(path.join(EFFECT_DIR, "dist", `${subpath.replace("effect/", "")}.js`)),
      `${subpath} root build is missing`,
    );
  }
});
