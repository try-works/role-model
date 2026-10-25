/**
 * Run 115 S3d harness - resolves and loads every built browser entry of the three first-party
 * wrappers so a test (or a plain `node` run) can assert the runtime graph, not just the bytes.
 *
 * The graph-closure test proves the BUILT dist contains no `node:*` or `@effect/platform-node`
 * specifier. This harness answers the next question: does each entry actually LOAD, and does every
 * bare `effect/<subpath>` it externalises resolve against the built `effect` wrapper?
 *
 * No DOM is required to resolve modules; DOM-only APIs are exercised by the smoke test.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const WRAPPERS = [
  { name: "@role-model-router/effect-platform-browser", dir: "../../effect-platform-browser" },
  { name: "@role-model-router/foldkit", dir: "../../foldkit" },
  { name: "@role-model-router/foldkit-ui", dir: "../../foldkit-ui" },
];

/** The manifest's export map is the published browser surface; `./package.json` is not code. */
export async function entryTargets(dir, baseDir = import.meta.dirname) {
  const manifestPath = path.resolve(baseDir, dir, "package.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  return Object.entries(manifest.exports)
    .filter(([subpath]) => subpath !== "./package.json")
    .map(([subpath, target]) => {
      // A string export target or an object; `?? target` keeps the string form without a typeof.
      const relative = target.import ?? target.default ?? target;
      return { subpath, file: path.resolve(path.dirname(manifestPath), relative) };
    });
}

/**
 * Imports every entry and reports what loaded. A failure names the wrapper, the subpath and the
 * resolution error so the missing module (for example an `effect/dist/*.js` entry the effect
 * wrapper did not publish) is visible instead of being summarised away.
 */
export async function probeRuntimeGraph(baseDir = import.meta.dirname) {
  const result = { total: 0, loaded: 0, emptyNamespaces: [], failures: [] };
  for (const wrapper of WRAPPERS) {
    for (const entry of await entryTargets(wrapper.dir, baseDir)) {
      result.total += 1;
      try {
        const module = await import(pathToFileURL(entry.file).href);
        if (Object.keys(module).length === 0) {
          result.emptyNamespaces.push(wrapper.name + entry.subpath);
          continue;
        }
        result.loaded += 1;
      } catch (error) {
        result.failures.push(wrapper.name + entry.subpath + ": " + String(error?.message ?? error));
      }
    }
  }
  return result;
}
