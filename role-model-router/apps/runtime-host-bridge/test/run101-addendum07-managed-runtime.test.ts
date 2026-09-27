/**
 * Run 101 addendum 07 - the store layer is built once per plane, not once per offer.
 *
 * Effect guidance D1: every offer used to run `Effect.runPromise(... .pipe(Effect.provide(layer),
 * Effect.scoped))`, which builds the SQLite client, runs the store's migrator and constructs its maps for
 * each enqueue and tears them down again. `ManagedRuntime.make` "builds the services from a layer, keeps
 * those services available for repeated effect runs, and releases acquired resources when it is disposed"
 * (`vendor/effect/packages/effect/src/ManagedRuntime.ts`).
 *
 * RED at the pre-repair revision (`26d78aa0`): `index.ts` has one `ManagedRuntime` at most and offers run
 * through `Effect.runPromise` with a per-call `Effect.provide(layer)`.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const readIndex = () =>
  readFile(
    path.join(
      repoRoot,
      "role-model-router",
      "apps",
      "runtime-host-bridge",
      "src",
      "queue-runtime",
      "index.ts",
    ),
    "utf8",
  );

describe("@recursive:101-effect-mq-queue-rebuild addendum07 store runtime reuse", () => {
  it("each of the three planes composes one ManagedRuntime and reuses it for its offers", async () => {
    const source = await readIndex();
    const runtimes = [...source.matchAll(/ManagedRuntime\.make\(/g)];
    expect(runtimes, "one store runtime per plane (replay, evaluation, learner)").toHaveLength(3);
    expect(source).not.toMatch(/return await Effect\.runPromise\(/);
    expect(source).not.toMatch(/\.pipe\(Effect\.provide\(layer\), Effect\.scoped\)/);
  });

  it("every plane disposes its store runtime when it stops", async () => {
    const source = await readIndex();
    const disposals = [...source.matchAll(/storeRuntime\.dispose\(\)/g)];
    expect(disposals).toHaveLength(3);
  });
});
