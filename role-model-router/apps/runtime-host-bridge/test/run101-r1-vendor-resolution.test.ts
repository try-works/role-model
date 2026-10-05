import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
/**
 * Run 101 / R1 - the vendored Effect v4 and effect-mq trees must be consumable
 * by both bundle pipelines.
 *
 * RED at the frozen baseline (public `8e09a870`): the vendored trees are not
 * workspace packages, so `effect` and `effect-mq` do not resolve and the first
 * assertion fails with MODULE_NOT_FOUND; the export and single-instance
 * assertions never run.
 *
 * The wrappers carry the upstream package names on purpose: effect-mq imports
 * `effect` by name, so publishing the vendored tree under that name is what
 * makes the single-instance property hold by construction.
 *
 * GREEN once the workspace packages exist and both pipelines resolve them.
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, "..", "..", "..", "..");

const EFFECT_WRAPPER = "effect";
const EFFECT_MQ_WRAPPER = "effect-mq";

/**
 * The wrapper packages ship built entry points that are gitignored like every
 * other package's `dist/`, so a targeted test run (without the root build) must
 * build them first rather than reporting a resolution failure that is really a
 * missing artefact.
 */
function ensureWrapperBuilt(packageDirName: string): void {
  const packageDir = path.join(repoRoot, "role-model-router", "packages", packageDirName);
  if (existsSync(path.join(packageDir, "dist", "index.js"))) {
    return;
  }
  execFileSync(process.execPath, ["build.mjs"], { cwd: packageDir, stdio: "pipe" });
}

ensureWrapperBuilt("effect");
ensureWrapperBuilt("effect-mq");

async function importSpecifier<T = Record<string, unknown>>(specifier: string): Promise<T> {
  return (await import(/* @vite-ignore */ specifier)) as T;
}

describe("@recursive:101-effect-mq-queue-rebuild @sp1 R1 vendored Effect resolution", () => {
  it("resolves both vendored wrappers from the host bridge", () => {
    expect(() => require.resolve(EFFECT_WRAPPER)).not.toThrow();
    expect(() => require.resolve(`${EFFECT_WRAPPER}/unstable/persistence`)).not.toThrow();
    expect(() => require.resolve(EFFECT_MQ_WRAPPER)).not.toThrow();
  });

  it("loads the Effect runtime and PersistedQueue through the wrapper", async () => {
    const effect = await importSpecifier<{ Effect?: unknown; Schema?: unknown }>(EFFECT_WRAPPER);
    expect(typeof effect.Effect).toBe("object");
    expect(typeof effect.Schema).toBe("object");

    const persistence = await importSpecifier<{
      PersistedQueue?: { make?: unknown };
    }>(`${EFFECT_WRAPPER}/unstable/persistence`);
    expect(typeof persistence.PersistedQueue?.make).toBe("function");
  });

  it("loads effect-mq job, worker, flow and schedule surfaces through the wrapper", async () => {
    const mq = await importSpecifier<{
      Job?: { make?: unknown };
      Worker?: { layer?: unknown };
      Flow?: { make?: unknown };
      JobSchedules?: { layer?: unknown };
    }>(EFFECT_MQ_WRAPPER);
    expect(typeof mq.Job?.make).toBe("function");
    expect(typeof mq.Worker?.layer).toBe("function");
    expect(typeof mq.Flow?.make).toBe("function");
    expect(typeof mq.JobSchedules?.layer).toBe("function");
  });

  it("bundles exactly one copy of the Effect runtime into one output", async () => {
    const result = await build({
      stdin: {
        contents: [
          `import * as Effect from "${EFFECT_WRAPPER}";`,
          `import * as PersistedQueue from "${EFFECT_WRAPPER}/unstable/persistence";`,
          `import * as Mq from "${EFFECT_MQ_WRAPPER}";`,
          "export const probe = [Effect.Effect, PersistedQueue.PersistedQueue, Mq.Job];",
        ].join("\n"),
        resolveDir: process.cwd(),
        sourcefile: "run101-r1-single-instance-probe.ts",
        loader: "ts",
      },
      bundle: true,
      write: false,
      platform: "node",
      format: "esm",
      target: "node24",
      conditions: ["runtime"],
      metafile: true,
      logLevel: "silent",
    });

    const inputs = Object.keys(result.metafile.inputs).map((input) => input.replaceAll("\\", "/"));

    // Exactly one module provides the Effect runtime to the whole graph: the
    // wrapped package's built entry (its shared chunks are its own). effect-mq
    // keeps `effect` external, so a second provider can only appear if someone
    // re-adds a source-level copy - which is what the next two assertions catch.
    const runtimeProviders = inputs.filter((input) =>
      /packages\/effect\/dist\/index\.js$/.test(input),
    );
    expect(runtimeProviders).toHaveLength(1);

    // The vendored sources must not be pulled in beside the built wrapper, and
    // effect-mq must not embed its own copy of the runtime.
    expect(inputs.filter((input) => input.includes("vendor/effect/"))).toHaveLength(0);
    expect(
      inputs.filter((input) => /vendor\/effect-mq\/.*\/src\/.*\.ts$/.test(input)),
    ).toHaveLength(0);

    const bundled = result.outputFiles?.[0]?.text ?? "";
    expect(bundled).toContain("PersistedQueue");
    expect(bundled).toContain("Job");
  });
});
